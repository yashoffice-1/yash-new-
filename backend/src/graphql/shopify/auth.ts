import { shopifyApi, ApiVersion } from '@shopify/shopify-api';
import '@shopify/shopify-api/adapters/node';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Initialize Shopify API with updated version and scopes
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY!,
  apiSecretKey: process.env.SHOPIFY_API_SECRET!,
  scopes: [
    'read_checkouts',
    'read_customers', 
    'read_draft_orders',
    'read_orders',
    'read_products',
    'write_products',
    'read_inventory',
    'write_inventory'
  ],
  hostName: process.env.SHOPIFY_APP_URL ? process.env.SHOPIFY_APP_URL.replace(/^https?:\/\//, '') : 'localhost:3001', // Remove protocol
  apiVersion: ApiVersion.July23, // Using stable API version
  isEmbeddedApp: false,
});

/**
 * Generate Shopify OAuth URL for store authentication
 */
export const generateAuthUrl = async (shop: string, _req: Request): Promise<string> => {
  try {
    console.log('=== GENERATING SHOPIFY AUTH URL ===');
    console.log('Shop:', shop);
    console.log('SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY ? 'SET' : 'NOT_SET');
    console.log('SHOPIFY_APP_URL:', process.env.SHOPIFY_APP_URL);
    
    // Try a simpler approach - manually construct the auth URL
    const apiKey = process.env.SHOPIFY_API_KEY;
    const appUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
    const callbackUrl = `${appUrl}/api/shopify/auth/callback`;
    const scopes = [
      'read_checkouts',
      'read_customers', 
      'read_draft_orders',
      'read_orders',
      'read_products',
      'write_products',
      'read_inventory',
      'write_inventory'
    ].join(',');
    
    // Generate a random state parameter
    const state = Math.random().toString(36).substring(2, 15);
    
    const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
    
    console.log('✅ Manually constructed auth URL:', authUrl);
    
    return authUrl;
  } catch (error: any) {
    console.error('❌ Error generating Shopify auth URL:', error);
    throw new Error(`Failed to generate authentication URL: ${error.message}`);
  }
};

/**
 * Handle Shopify OAuth callback
 */
export const handleAuthCallback = async (req: Request, _res: Response) => {
  try {
    console.log('=== HANDLING SHOPIFY AUTH CALLBACK ===');
    const { shop, code, state } = req.query;
    
    console.log('Query parameters:', { shop, code: code ? '***' : 'MISSING', state });
    
    if (!shop || !code) {
      console.error('❌ Missing required parameters');
      throw new Error('Missing required parameters');
    }

    console.log('✅ Valid parameters received, exchanging code for access token...');

    // Manually exchange the authorization code for an access token
    const apiKey = process.env.SHOPIFY_API_KEY;
    const apiSecret = process.env.SHOPIFY_API_SECRET;
    const appUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
    const callbackUrl = `${appUrl}/api/shopify/auth/callback`;

    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: apiKey,
        client_secret: apiSecret,
        code: code,
        redirect_uri: callbackUrl
      })
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('❌ Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokenData = await tokenResponse.json() as { access_token: string; scope: string };
    console.log('✅ Access token received:', {
      accessToken: tokenData.access_token ? '***TOKEN***' : 'NO_TOKEN',
      scope: tokenData.scope
    });

    // Store session in database
    console.log('🔄 Storing session in database...');
    await storeShopifySession({
      shop,
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
      id: `${shop}_${Date.now()}`
    });
    console.log('✅ Session stored successfully');
    
    return {
      success: true,
      shop: shop,
      accessToken: tokenData.access_token,
      scope: tokenData.scope,
    };
  } catch (error: any) {
    console.error('❌ Error handling Shopify auth callback:', error);
    throw new Error(`Authentication failed: ${error.message}`);
  }
};

/**
 * Store Shopify session in database
 */
const storeShopifySession = async (session: any) => {
  try {
    console.log('Storing Shopify session in database:', {
      shop: session.shop,
      accessToken: session.accessToken ? '***TOKEN***' : 'NO_TOKEN',
      scope: session.scope,
    });

    // Find the pending connection for this shop
    const pendingConnection = await prisma.shopifyConnection.findFirst({
      where: {
        shopDomain: session.shop,
        status: 'pending'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (pendingConnection) {
      // Update the existing connection with the session data
      await prisma.shopifyConnection.update({
        where: { id: pendingConnection.id },
        data: {
          accessToken: session.accessToken,
          scope: session.scope,
          status: 'connected',
          updatedAt: new Date()
        }
      });
      console.log('Updated existing connection:', pendingConnection.id);
    } else {
      console.log('No pending connection found for shop:', session.shop);
    }
  } catch (error) {
    console.error('Error storing Shopify session:', error);
    throw error;
  }
};

/**
 * Validate Shopify webhook
 */
export const validateWebhook = async (rawBody: string, rawRequest: any, rawResponse?: any): Promise<boolean> => {
  try {
    const result = await shopify.webhooks.validate({
      rawBody,
      rawRequest,
      rawResponse,
    });
    return result.valid;
  } catch (error) {
    console.error('Error validating Shopify webhook:', error);
    return false;
  }
};

export { shopify };