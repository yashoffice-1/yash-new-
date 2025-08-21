// GraphQL modules for Shopify integration
export * from './shopify/auth';
export * from './shopify/queries';

// Types for Shopify integration
export interface ShopifySession {
  shop: string;
  accessToken: string;
  scope: string;
  expires?: Date;
  isOnline: boolean;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description?: string;
  handle: string;
  productType?: string;
  vendor?: string;
  tags: string[];
  status: 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
  createdAt: string;
  updatedAt: string;
  images: ShopifyImage[];
  variants: ShopifyVariant[];
}

export interface ShopifyImage {
  id: string;
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface ShopifyVariant {
  id: string;
  title: string;
  price: string;
  sku?: string;
  inventoryQuantity: number;
  weight?: number;
  weightUnit?: string;
}

export interface ShopifyShop {
  id: string;
  name: string;
  email: string;
  domain: string;
  myshopifyDomain: string;
  plan: {
    displayName: string;
    partnerDevelopment: boolean;
    shopifyPlus: boolean;
  };
  primaryDomain: {
    host: string;
    sslEnabled: boolean;
    url: string;
  };
}

export interface ShopifyAuthResponse {
  success: boolean;
  shop: string;
  accessToken: string;
  scope: string;
  error?: string;
}