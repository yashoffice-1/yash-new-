import { PrismaClient } from '@prisma/client';
import { Request } from 'express';
import { 
  generateAuthUrl, 
  handleAuthCallback, 
  fetchShopifyProducts,
  fetchShopInfo
} from '../graphql';

const prisma = new PrismaClient();

export class ShopifyService {
  /**
   * Initiate Shopify OAuth flow
   */
  static async initiateAuth(shopDomain: string, userId: string, req: Request) {
    try {
      console.log('=== SHOPIFY SERVICE: INITIATE AUTH ===');
      console.log('Shop domain:', shopDomain);
      console.log('User ID:', userId);
      
      // Validate shop domain
      const cleanShopDomain = this.validateShopDomain(shopDomain);
      console.log('Clean shop domain:', cleanShopDomain);
      
      // Generate auth URL with the actual request object
      console.log('🔄 Generating auth URL...');
      const authUrl = await generateAuthUrl(cleanShopDomain, req);
      console.log('✅ Auth URL generated:', authUrl);
      
      if (!authUrl) {
        throw new Error('Auth URL is undefined');
      }
      
      // Store pending auth request in database
      console.log('🔄 Storing pending connection in database...');
      await prisma.shopifyConnection.upsert({
        where: {
          userId_shopDomain: {
            userId,
            shopDomain: cleanShopDomain
          }
        },
        update: {
          status: 'pending',
          updatedAt: new Date()
        },
        create: {
          userId,
          shopDomain: cleanShopDomain,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      console.log('✅ Pending connection stored');
      
      return {
        success: true,
        authUrl,
        shopDomain: cleanShopDomain
      };
    } catch (error: any) {
      console.error('❌ Error initiating Shopify auth:', error);
      throw new Error(`Failed to initiate Shopify authentication: ${error.message}`);
    }
  }

  /**
   * Complete Shopify OAuth flow
   */
  static async completeAuth(req: any, res: any, userId: string) {
    try {
      console.log('Starting completeAuth with userId:', userId);
      console.log('Request query params:', req.query);
      
      const authResult = await handleAuthCallback(req, res);
      
      console.log('Auth result received:', {
        success: authResult.success,
        shop: authResult.shop,
        hasAccessToken: !!authResult.accessToken,
        scope: authResult.scope
      });
      
      if (!authResult.success) {
        throw new Error('Authentication failed');
      }

      if (!authResult.accessToken) {
        console.error('No access token received from Shopify');
        throw new Error('No access token received from Shopify');
      }

      console.log('Access token received, fetching shop info...');

      // Fetch shop information
      let shopInfo;
      try {
        const shopDomain = String(authResult.shop); // Ensure it's a string
        shopInfo = await fetchShopInfo(shopDomain, authResult.accessToken);
        console.log('Shop info fetched:', {
          name: shopInfo?.name || shopDomain,
          email: shopInfo?.email,
          plan: shopInfo?.plan?.displayName
        });
      } catch (shopInfoError) {
        console.error('Error fetching shop info:', shopInfoError);
        // Use default values if shop info fetch fails
        shopInfo = {
          name: String(authResult.shop),
          email: null,
          plan: { displayName: 'Unknown' }
        };
        console.log('Using fallback shop info:', shopInfo);
      }
      
      console.log('Storing connection in database...');
      
      // Store connection in database
      const shopDomain = String(authResult.shop); // Ensure it's a string
      const connection = await prisma.shopifyConnection.upsert({
        where: {
          userId_shopDomain: {
            userId,
            shopDomain: shopDomain
          }
        },
        update: {
          accessToken: authResult.accessToken,
          scope: authResult.scope,
          status: 'connected',
          shopName: shopInfo?.name || shopDomain,
          shopEmail: shopInfo?.email,
          shopPlan: shopInfo?.plan?.displayName || 'Unknown',
          updatedAt: new Date()
        },
        create: {
          userId,
          shopDomain: shopDomain,
          accessToken: authResult.accessToken,
          scope: authResult.scope,
          status: 'connected',
          shopName: shopInfo?.name || shopDomain,
          shopEmail: shopInfo?.email,
          shopPlan: shopInfo?.plan?.displayName || 'Unknown',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('Connection stored successfully:', connection.id);

      return {
        success: true,
        connection: {
          id: connection.id,
          shopDomain: connection.shopDomain,
          shopName: connection.shopName,
          shopEmail: connection.shopEmail,
          status: connection.status
        }
      };
    } catch (error) {
      console.error('Error completing Shopify auth:', error);
      throw new Error('Failed to complete Shopify authentication');
    }
  }

  /**
   * Get user's Shopify connections
   */
  static async getUserConnections(userId: string) {
    try {
      const connections = await prisma.shopifyConnection.findMany({
        where: {
          userId,
          status: 'connected'
        },
        select: {
          id: true,
          shopDomain: true,
          shopName: true,
          shopEmail: true,
          shopPlan: true,
          status: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return connections;
    } catch (error) {
      console.error('Error fetching user connections:', error);
      throw new Error('Failed to fetch Shopify connections');
    }
  }

  /**
   * Fetch products from Shopify store (without storing in database)
   */
  static async fetchProducts(userId: string, connectionId: string, limit: number = 50, after?: string) {
    try {
      // Get connection details
      const connection = await prisma.shopifyConnection.findFirst({
        where: {
          id: connectionId,
          userId,
          status: 'connected'
        }
      });

      if (!connection) {
        throw new Error('Shopify connection not found');
      }

      if (!connection.accessToken) {
        throw new Error('Shopify connection has no access token');
      }

      // Fetch products from Shopify
      const shopifyProducts = await fetchShopifyProducts(
        connection.shopDomain,
        connection.accessToken,
        limit,
        after
      );

      if (!shopifyProducts || !shopifyProducts.edges) {
        console.warn('No products found in Shopify response:', shopifyProducts);
        return {
          success: true,
          products: [],
          pageInfo: { hasNextPage: false, hasPreviousPage: false },
          shop: {
            domain: connection.shopDomain,
            name: connection.shopName
          }
        };
      }

      // Transform products to a more frontend-friendly format
      const products = shopifyProducts.edges.map((edge: any) => {
        const product = edge.node;
        return {
          id: product.id,
          title: product.title,
          description: product.description,
          handle: product.handle,
          productType: product.productType,
          vendor: product.vendor,
          tags: product.tags,
          status: product.status,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt,
          images: product.images.edges.map((imgEdge: any) => ({
            id: imgEdge.node.id,
            url: imgEdge.node.url,
            altText: imgEdge.node.altText,
            width: imgEdge.node.width,
            height: imgEdge.node.height
          })),
          variants: product.variants.edges.map((varEdge: any) => ({
            id: varEdge.node.id,
            title: varEdge.node.title,
            price: varEdge.node.price,
            sku: varEdge.node.sku,
            inventoryTracked: varEdge.node.inventoryItem?.tracked || false
          })),
          cursor: edge.cursor
        };
      });

      return {
        success: true,
        products,
        pageInfo: shopifyProducts.pageInfo,
        shop: {
          domain: connection.shopDomain,
          name: connection.shopName
        }
      };
    } catch (error) {
      console.error('Error fetching Shopify products:', error);
      throw new Error('Failed to fetch products from Shopify');
    }
  }

  /**
   * Sync products from Shopify store
   */
  static async syncProducts(userId: string, connectionId: string) {
    try {
      // Get connection details
      const connection = await prisma.shopifyConnection.findFirst({
        where: {
          id: connectionId,
          userId,
          status: 'connected'
        }
      });

      if (!connection) {
        throw new Error('Shopify connection not found');
      }

      if (!connection.accessToken) {
        throw new Error('Shopify connection has no access token');
      }

      // Fetch products from Shopify
      const shopifyProducts = await fetchShopifyProducts(
        connection.shopDomain,
        connection.accessToken,
        100 // Fetch up to 100 products
      );

      const syncedProducts = [];

      // Process each product
      for (const edge of shopifyProducts.edges) {
        const product = edge.node;
        
        // Convert Shopify product to our inventory format
        const inventoryData = this.convertShopifyProduct(product, userId, connectionId);
        
        // Upsert product in our inventory
        const inventoryItem = await prisma.inventoryItem.upsert({
          where: {
            shopifyProductId: product.id
          },
          update: {
            ...inventoryData,
            updatedAt: new Date()
          },
          create: {
            ...inventoryData,
            shopifyProductId: product.id,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        });

        syncedProducts.push(inventoryItem);
      }

      // Update last sync time
      await prisma.shopifyConnection.update({
        where: { id: connectionId },
        data: { 
          lastSyncAt: new Date(),
          updatedAt: new Date()
        }
      });

      return {
        success: true,
        syncedCount: syncedProducts.length,
        products: syncedProducts
      };
    } catch (error) {
      console.error('Error syncing Shopify products:', error);
      throw new Error('Failed to sync products from Shopify');
    }
  }

  /**
   * Disconnect Shopify store
   */
  static async disconnectStore(userId: string, connectionId: string) {
    try {
      await prisma.shopifyConnection.update({
        where: {
          id: connectionId,
          userId
        },
        data: {
          status: 'disconnected',
          accessToken: null,
          updatedAt: new Date()
        }
      });

      return { success: true };
    } catch (error) {
      console.error('Error disconnecting Shopify store:', error);
      throw new Error('Failed to disconnect Shopify store');
    }
  }

  /**
   * Validate and clean shop domain
   */
  private static validateShopDomain(shopDomain: string): string {
    // Remove protocol and trailing slashes
    let cleanDomain = shopDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    
    // If it doesn't end with .myshopify.com, add it
    if (!cleanDomain.endsWith('.myshopify.com')) {
      cleanDomain = `${cleanDomain}.myshopify.com`;
    }
    
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.myshopify\.com$/;
    if (!domainRegex.test(cleanDomain)) {
      throw new Error('Invalid shop domain format');
    }
    
    return cleanDomain;
  }

  /**
   * Convert Shopify product to our inventory format
   */
  private static convertShopifyProduct(shopifyProduct: any, userId: string, connectionId: string) {
    const images = shopifyProduct.images.edges.map((edge: any) => edge.node.url);
    const firstVariant = shopifyProduct.variants.edges[0]?.node;
    
    return {
      userId,
      name: shopifyProduct.title,
      description: shopifyProduct.description || null,
      price: firstVariant ? parseFloat(firstVariant.price) : null,
      sku: firstVariant?.sku || null,
      category: shopifyProduct.productType || null,
      brand: shopifyProduct.vendor || null,
      images: images,
      metadata: {
        shopifyId: shopifyProduct.id,
        shopifyHandle: shopifyProduct.handle,
        shopifyTags: shopifyProduct.tags,
        shopifyStatus: shopifyProduct.status,
        connectionId: connectionId,
        variants: shopifyProduct.variants.edges.map((edge: any) => edge.node)
      },
      status: 'active'
    };
  }
}