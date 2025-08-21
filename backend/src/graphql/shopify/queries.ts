import { shopify } from './auth';
import { Session } from '@shopify/shopify-api';

/**
 * GraphQL query to fetch products from Shopify
 * Note: weight and weightUnit fields have been removed as they're not available in newer API versions
 */
export const GET_PRODUCTS_QUERY = `
  query getProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          description
          handle
          productType
          vendor
          tags
          status
          createdAt
          updatedAt
          images(first: 10) {
            edges {
              node {
                id
                url
                altText
                width
                height
              }
            }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                sku
                inventoryItem {
                  tracked
                }
              }
            }
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

/**
 * GraphQL query to fetch a single product by ID
 * Note: weight and weightUnit fields have been removed as they're not available in newer API versions
 */
export const GET_PRODUCT_BY_ID_QUERY = `
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      description
      handle
      productType
      vendor
      tags
      status
      createdAt
      updatedAt
      images(first: 10) {
        edges {
          node {
            id
            url
            altText
            width
            height
          }
        }
      }
      variants(first: 10) {
        edges {
          node {
            id
            title
            price
            sku
            inventoryItem {
              tracked
            }
          }
        }
      }
    }
  }
`;

/**
 * GraphQL mutation to create a product
 */
export const CREATE_PRODUCT_MUTATION = `
  mutation productCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        description
        handle
        productType
        vendor
        tags
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL mutation to update a product
 */
export const UPDATE_PRODUCT_MUTATION = `
  mutation productUpdate($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        title
        description
        handle
        productType
        vendor
        tags
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * GraphQL query to fetch shop information
 */
export const GET_SHOP_INFO_QUERY = `
  query getShop {
    shop {
      id
      name
      email
      myshopifyDomain
      plan {
        displayName
        partnerDevelopment
        shopifyPlus
      }
      primaryDomain {
        host
        sslEnabled
        url
      }
    }
  }
`;

/**
 * Execute GraphQL query against Shopify Admin API
 */
export const executeShopifyQuery = async (
  shop: string,
  accessToken: string,
  query: string,
  variables?: any
): Promise<any> => {
  try {
    console.log('🔄 Executing Shopify GraphQL query for shop:', shop);
    console.log('Query:', query);
    console.log('Variables:', variables);
    
    const session = new Session({
      id: `${shop}_${Date.now()}`,
      shop,
      state: 'authenticated',
      isOnline: true,
      accessToken,
      scope: 'read_checkouts,read_customers,read_draft_orders,read_orders,read_products,write_products,read_inventory,write_inventory',
    });

    const client = new shopify.clients.Graphql({ session });

    const response = await client.query({
      data: {
        query,
        variables,
      },
    });

    console.log('✅ GraphQL response received:', response.body);
    return response.body;
  } catch (error: any) {
    console.error('❌ Error executing Shopify GraphQL query:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response,
      body: error.body
    });
    throw new Error('Failed to execute GraphQL query');
  }
};

/**
 * Fetch products from Shopify store
 */
export const fetchShopifyProducts = async (
  shop: string,
  accessToken: string,
  first: number = 50,
  after?: string
) => {
  const variables = { first, after };
  const response = await executeShopifyQuery(
    shop,
    accessToken,
    GET_PRODUCTS_QUERY,
    variables
  );
  
  return response?.data?.products;
};

/**
 * Fetch single product by ID from Shopify store
 */
export const fetchShopifyProduct = async (
  shop: string,
  accessToken: string,
  productId: string
) => {
  const variables = { id: productId };
  const response = await executeShopifyQuery(
    shop,
    accessToken,
    GET_PRODUCT_BY_ID_QUERY,
    variables
  );
  
  return response?.data?.product;
};

/**
 * Fetch shop information
 */
export const fetchShopInfo = async (
  shop: string,
  accessToken: string
) => {
  try {
    console.log('🔄 Fetching shop info for:', shop);
    const response = await executeShopifyQuery(
      shop,
      accessToken,
      GET_SHOP_INFO_QUERY
    );
    
    console.log('✅ Shop info response:', response);
    
    if (response?.data?.shop) {
      return response.data.shop;
    } else {
      console.warn('⚠️ No shop data in response, using fallback');
      return {
        name: shop,
        email: null,
        plan: { displayName: 'Unknown' }
      };
    }
  } catch (error) {
    console.error('❌ Error fetching shop info:', error);
    // Return fallback data instead of throwing
    return {
      name: shop,
      email: null,
      plan: { displayName: 'Unknown' }
    };
  }
};

/**
 * Create product in Shopify store
 */
export const createShopifyProduct = async (
  shop: string,
  accessToken: string,
  productData: any
) => {
  const variables = { input: productData };
  const response = await executeShopifyQuery(
    shop,
    accessToken,
    CREATE_PRODUCT_MUTATION,
    variables
  );
  
  return response?.data?.productCreate;
};

/**
 * Update product in Shopify store
 */
export const updateShopifyProduct = async (
  shop: string,
  accessToken: string,
  productData: any
) => {
  const variables = { input: productData };
  const response = await executeShopifyQuery(
    shop,
    accessToken,
    UPDATE_PRODUCT_MUTATION,
    variables
  );
  
  return response?.data?.productUpdate;
};