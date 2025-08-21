import express from 'express';
import { Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ShopifyService } from '../services/shopify-service';
import { validateWebhook, generateAuthUrl } from '../graphql';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router = express.Router();

/**
 * GET /api/shopify/test-scopes
 * Test Shopify scopes configuration
 */
router.get('/test-scopes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const scopes = [
      'read_checkouts',
      'read_customers', 
      'read_draft_orders',
      'read_orders',
      'read_products',
      'write_products',
      'read_inventory',
      'write_inventory'
    ];
    
    return res.json({
      success: true,
      scopes,
      scopeString: scopes.join(','),
      message: 'These are the scopes being requested for Shopify OAuth'
    });
  } catch (error: any) {
    console.error('Error testing Shopify scopes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Shopify scopes'
    });
  }
});

/**
 * GET /api/shopify/test-config
 * Test Shopify API configuration
 */
router.get('/test-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const config = {
      apiKey: process.env.SHOPIFY_API_KEY ? 'SET' : 'NOT_SET',
      apiSecret: process.env.SHOPIFY_API_SECRET ? 'SET' : 'NOT_SET',
      appUrl: process.env.SHOPIFY_APP_URL ? 'SET' : 'NOT_SET',
      frontendUrl: process.env.FRONTEND_URL ? 'SET' : 'NOT_SET'
    };
    
    // Test if we can create a simple auth URL
    let authUrlTest = 'FAILED';
    try {
      const testShop = 'test-shop.myshopify.com';
      const mockReq = {
        query: {},
        headers: {},
        url: '/test'
      } as any;
      
      await ShopifyService.initiateAuth(testShop, 'test-user', mockReq);
      authUrlTest = 'SUCCESS';
    } catch (error: any) {
      authUrlTest = `FAILED: ${error.message}`;
    }
    
    // Test database connection
    let dbTest = 'FAILED';
    try {
      const connectionCount = await prisma.shopifyConnection.count();
      dbTest = `SUCCESS: ${connectionCount} connections found`;
    } catch (error: any) {
      dbTest = `FAILED: ${error.message}`;
    }
    
    return res.json({
      success: true,
      config,
      authUrlTest,
      dbTest,
      message: 'Check if all required environment variables are set'
    });
  } catch (error: any) {
    console.error('Error testing Shopify config:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Shopify configuration'
    });
  }
});

/**
 * GET /api/shopify/test-full-config
 * Test complete Shopify configuration including OAuth flow
 */
router.get('/test-full-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    
    // Test configuration
    const config = {
      apiKey: process.env.SHOPIFY_API_KEY ? 'SET' : 'NOT_SET',
      apiSecret: process.env.SHOPIFY_API_SECRET ? 'SET' : 'NOT_SET',
      appUrl: process.env.SHOPIFY_APP_URL ? 'SET' : 'NOT_SET',
      frontendUrl: process.env.FRONTEND_URL ? 'SET' : 'NOT_SET'
    };
    
    // Test scopes
    const scopes = [
      'read_checkouts',
      'read_customers', 
      'read_draft_orders',
      'read_orders',
      'read_products',
      'write_products',
      'read_inventory',
      'write_inventory'
    ];
    
    // Test auth URL generation
    let authUrlTest = 'FAILED';
    let authUrl = '';
    try {
      const testShop = 'test-shop.myshopify.com';
      const mockReq = {
        query: {},
        headers: {},
        url: '/test'
      } as any;
      
      const result = await ShopifyService.initiateAuth(testShop, userId, mockReq);
      authUrl = result.authUrl;
      authUrlTest = 'SUCCESS';
    } catch (error: any) {
      authUrlTest = `FAILED: ${error.message}`;
    }
    
    // Test database connection
    let dbTest = 'FAILED';
    try {
      const connectionCount = await prisma.shopifyConnection.count();
      dbTest = `SUCCESS: ${connectionCount} connections found`;
    } catch (error: any) {
      dbTest = `FAILED: ${error.message}`;
    }
    
    return res.json({
      success: true,
      config,
      scopes,
      scopeString: scopes.join(','),
      authUrlTest,
      authUrl,
      dbTest,
      apiVersion: '2024-07 (July23)',
      message: 'Complete Shopify configuration test'
    });
  } catch (error: any) {
    console.error('Error testing full Shopify config:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test full Shopify configuration'
    });
  }
});

/**
 * POST /api/shopify/auth/initiate
 * Initiate Shopify OAuth flow
 */
router.post('/auth/initiate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { shopDomain } = req.body;
    const userId = (req as any).user.userId; // Changed from .id to .userId

    if (!shopDomain) {
      return res.status(400).json({
        success: false,
        error: 'Shop domain is required'
      });
    }

    console.log('Initiating Shopify auth with scopes:', [
      'read_checkouts',
      'read_customers', 
      'read_draft_orders',
      'read_orders',
      'read_products',
      'write_products',
      'read_inventory',
      'write_inventory'
    ]);
    
    // Pass the request object to the service
    const result = await ShopifyService.initiateAuth(shopDomain, userId, req);
    
    console.log('✅ Auth URL generated:', result.authUrl);
    console.log('✅ Shop domain:', result.shopDomain);
    
    return res.json({
      success: true,
      authUrl: result.authUrl,
      shopDomain: result.shopDomain
    });
  } catch (error: any) {
    console.error('Error initiating Shopify auth:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to initiate Shopify authentication'
    });
  }
});

/**
 * GET /api/shopify/auth/callback
 * Handle Shopify OAuth callback (called by Shopify)
 */
router.get('/auth/callback', async (req: Request, res: Response) => {
  try {
    console.log('=== SHOPIFY GET CALLBACK RECEIVED ===');
    console.log('Query parameters:', req.query);
    console.log('Headers:', req.headers);
    console.log('URL:', req.url);
    
    const { shop, code, state } = req.query;
    
    if (!shop || !code) {
      console.error('❌ Missing required parameters:', { shop, code, state });
      return res.status(400).send('Missing required parameters from Shopify');
    }

    console.log('✅ Valid parameters received:', { shop, code: '***', state });

    // Extract userId from state parameter (you should encode this securely)
    // For now, we'll try to get it from the state or use a default approach
    let userId = req.query.userId as string;
    
    // If no userId in query, try to get it from the pending connection
    if (!userId) {
      try {
        console.log('🔍 Looking for pending connection for shop:', shop);
        const pendingConnection = await prisma.shopifyConnection.findFirst({
          where: {
            shopDomain: shop as string,
            status: 'pending'
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        if (pendingConnection) {
          userId = pendingConnection.userId;
          console.log('✅ Found pending connection with userId:', userId);
        } else {
          console.log('❌ No pending connection found for shop:', shop);
        }
      } catch (error) {
        console.error('❌ Error finding pending connection:', error);
      }
    }

    if (!userId) {
      console.error('❌ No userId found, redirecting to error page');
      // Redirect to frontend with error - user will need to re-authenticate
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/inventory?shopify_error=true&message=${encodeURIComponent('User ID not found. Please try connecting again.')}`);
    }

    console.log('🔄 Calling ShopifyService.completeAuth with userId:', userId);
    const result = await ShopifyService.completeAuth(req, res, userId);
    
    console.log('✅ Auth result:', { success: result.success, shop: result.connection?.shopDomain });
    
    if (result.success) {
      // Redirect to frontend with success message
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectUrl = `${frontendUrl}/inventory?shopify_connected=true&shop=${result.connection.shopDomain}`;
      console.log('🔄 Redirecting to success:', redirectUrl);
      return res.redirect(redirectUrl);
    } else {
      // Redirect to frontend with error
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      console.log('❌ Redirecting to error page');
      return res.redirect(`${frontendUrl}/inventory?shopify_error=true`);
    }
  } catch (error: any) {
    console.error('❌ Error handling Shopify auth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/inventory?shopify_error=true&message=${encodeURIComponent(error.message)}`);
  }
});

/**
 * POST /api/shopify/auth/callback
 * Handle frontend callback (for the callback page)
 */
router.post('/auth/callback', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('Shopify POST callback received:', req.body);
    const { code, shop, state } = req.body;
    const userId = (req as any).user.userId;

    if (!code || !shop) {
      console.error('Missing required parameters in POST callback:', { code, shop, state });
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // Create a mock request object with the required query parameters
    const mockReq = {
      ...req,
      query: { code, shop, state, userId }
    };

    const result = await ShopifyService.completeAuth(mockReq, res, userId);
    
    return res.json({
      success: result.success,
      connection: result.connection
    });
  } catch (error: any) {
    console.error('Error handling frontend Shopify auth callback:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to complete Shopify authentication'
    });
  }
});

/**
 * GET /api/shopify/test-callback
 * Test if the callback URL is accessible
 */
router.get('/test-callback', async (req: Request, res: Response) => {
  try {
    console.log('=== TESTING CALLBACK URL ===');
    console.log('Request received at:', req.url);
    console.log('Query params:', req.query);
    console.log('Headers:', req.headers);
    
    return res.json({
      success: true,
      message: 'Callback URL is accessible',
      timestamp: new Date().toISOString(),
      url: req.url,
      method: req.method
    });
  } catch (error: any) {
    console.error('Error testing callback:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/shopify/test-auth-url
 * Test auth URL generation
 */
router.get('/test-auth-url', async (req: Request, res: Response) => {
  try {
    console.log('=== TESTING AUTH URL GENERATION ===');
    
    const testShop = 'test-shop.myshopify.com';
    const mockReq = {
      query: {},
      headers: {},
      url: '/test'
    } as any;
    
    console.log('🔄 Generating auth URL for:', testShop);
    const authUrl = await generateAuthUrl(testShop, mockReq);
    
    console.log('✅ Auth URL generated successfully');
    
    return res.json({
      success: true,
      authUrl,
      testShop,
      message: 'Auth URL generation test completed'
    });
  } catch (error: any) {
    console.error('❌ Error testing auth URL generation:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test auth URL generation'
    });
  }
});

/**
 * GET /api/shopify/test-oauth-flow
 * Test the complete OAuth flow
 */
router.get('/test-oauth-flow', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId;
    console.log('=== TESTING COMPLETE OAUTH FLOW ===');
    
    // Test 1: Generate auth URL
    console.log('🔄 Step 1: Testing auth URL generation...');
    let authUrlTest = 'FAILED';
    let authUrl = '';
    try {
      const testShop = 'test-shop.myshopify.com';
      const mockReq = {
        query: {},
        headers: {},
        url: '/test'
      } as any;
      
      const result = await ShopifyService.initiateAuth(testShop, userId, mockReq);
      authUrl = result.authUrl;
      authUrlTest = 'SUCCESS';
      console.log('✅ Auth URL generated successfully');
    } catch (error: any) {
      authUrlTest = `FAILED: ${error.message}`;
      console.error('❌ Auth URL generation failed:', error.message);
    }
    
    // Test 2: Check callback URL accessibility
    console.log('🔄 Step 2: Testing callback URL accessibility...');
    let callbackTest = 'NOT_TESTED';
    try {
      const baseUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
      const response = await fetch(`${baseUrl}/api/shopify/test-callback`);
      callbackTest = response.status === 200 ? 'ACCESSIBLE' : `HTTP ${response.status}`;
      console.log('✅ Callback URL is accessible');
    } catch (error: any) {
      callbackTest = `ERROR: ${error.message}`;
      console.error('❌ Callback URL test failed:', error.message);
    }
    
    // Test 3: Check database connection
    console.log('🔄 Step 3: Testing database connection...');
    let dbTest = 'FAILED';
    try {
      const connectionCount = await prisma.shopifyConnection.count();
      dbTest = `SUCCESS: ${connectionCount} connections found`;
      console.log('✅ Database connection successful');
    } catch (error: any) {
      dbTest = `FAILED: ${error.message}`;
      console.error('❌ Database test failed:', error.message);
    }
    
    // Test 4: Check environment variables
    console.log('🔄 Step 4: Checking environment variables...');
    const envTest = {
      SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY ? 'SET' : 'NOT_SET',
      SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET ? 'SET' : 'NOT_SET',
      SHOPIFY_APP_URL: process.env.SHOPIFY_APP_URL ? 'SET' : 'NOT_SET',
      FRONTEND_URL: process.env.FRONTEND_URL ? 'SET' : 'NOT_SET'
    };
    
    const results = {
      authUrlTest,
      authUrl,
      callbackTest,
      dbTest,
      envTest,
      message: 'OAuth flow test completed'
    };
    
    console.log('=== OAUTH FLOW TEST RESULTS ===');
    console.log(JSON.stringify(results, null, 2));
    
    return res.json({
      success: true,
      ...results
    });
  } catch (error: any) {
    console.error('❌ Error testing OAuth flow:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test OAuth flow'
    });
  }
});

/**
 * GET /api/shopify/connections
 * Get user's Shopify connections
 */
router.get('/connections', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.userId; // Changed from .id to .userId
    const connections = await ShopifyService.getUserConnections(userId);
    
    return res.json({
      success: true,
      data: connections
    });
  } catch (error: any) {
    console.error('Error fetching Shopify connections:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Shopify connections'
    });
  }
});

/**
 * GET /api/shopify/products/:connectionId
 * Fetch products from Shopify store (without storing in database)
 */
router.get('/products/:connectionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = (req as any).user.userId;
    const { limit = 50, after } = req.query;

    if (!connectionId) {
      return res.status(400).json({
        success: false,
        error: 'Connection ID is required'
      });
    }

    const result = await ShopifyService.fetchProducts(userId, connectionId, Number(limit), after as string);
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error fetching Shopify products:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch Shopify products'
    });
  }
});

/**
 * POST /api/shopify/sync-products
 * Sync products from Shopify store
 */
router.post('/sync-products', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.body;
    const userId = (req as any).user.userId;

    if (!connectionId) {
      return res.status(400).json({
        success: false,
        error: 'Connection ID is required'
      });
    }

    const result = await ShopifyService.syncProducts(userId, connectionId);
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error syncing Shopify products:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to sync products'
    });
  }
});

/**
 * DELETE /api/shopify/connections/:connectionId
 * Disconnect Shopify store
 */
router.delete('/connections/:connectionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = (req as any).user.userId;

    const result = await ShopifyService.disconnectStore(userId, connectionId);
    
    return res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error disconnecting Shopify:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect Shopify'
    });
  }
});

/**
 * GET /api/shopify/test-connection/:connectionId
 * Test Shopify connection
 */
router.get('/test-connection/:connectionId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const userId = (req as any).user.userId;

    // Get user connections and find the specific connection
    const connections = await ShopifyService.getUserConnections(userId);
    const connection = connections.find(conn => conn.id === connectionId);
    
    if (!connection) {
      return res.status(404).json({
        success: false,
        error: 'Connection not found'
      });
    }
    
    return res.json({
      success: true,
      data: {
        connected: connection.status === 'connected',
        shopName: connection.shopName,
        shopDomain: connection.shopDomain
      }
    });
  } catch (error: any) {
    console.error('Error testing Shopify connection:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test connection'
    });
  }
});

/**
 * GET /api/shopify/test-urls
 * Test and display all required Shopify app URLs
 */
router.get('/test-urls', authenticateToken, async (req: Request, res: Response) => {
  try {
    const baseUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    
    const requiredUrls = {
      appUrl: baseUrl,
      callbackUrl: `${baseUrl}/api/shopify/auth/callback`,
      frontendCallbackUrl: `${frontendUrl}/auth/shopify/callback`,
      webhookUrl: `${baseUrl}/api/shopify/webhooks`,
      allowedRedirectUrls: [
        `${baseUrl}/api/shopify/auth/callback`,
        `${frontendUrl}/auth/shopify/callback`,
        `${frontendUrl}/inventory`
      ]
    };
    
    // Test if the callback URL is accessible
    let callbackTest = 'NOT_TESTED';
    try {
      const response = await fetch(`${baseUrl}/api/shopify/auth/callback`);
      callbackTest = response.status === 200 ? 'ACCESSIBLE' : `HTTP ${response.status}`;
    } catch (error: any) {
      callbackTest = `ERROR: ${error.message}`;
    }
    
    return res.json({
      success: true,
      requiredUrls,
      callbackTest,
      instructions: {
        step1: 'Copy these URLs to your Shopify Partner Dashboard',
        step2: 'Set App URL to: ' + requiredUrls.appUrl,
        step3: 'Add these to Allowed redirection URLs:',
        step4: requiredUrls.allowedRedirectUrls,
        step5: 'Set Webhook URL to: ' + requiredUrls.webhookUrl
      },
      message: 'Use these URLs to configure your Shopify app in the Partner Dashboard'
    });
  } catch (error: any) {
    console.error('Error testing Shopify URLs:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to test Shopify URLs'
    });
  }
});

/**
 * GET /api/shopify/setup-guide
 * Get complete setup guide for Shopify app configuration
 */
router.get('/setup-guide', authenticateToken, async (req: Request, res: Response) => {
  try {
    const baseUrl = process.env.SHOPIFY_APP_URL || 'http://localhost:3001';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    
    const setupGuide = {
      step1: {
        title: 'Shopify Partner Dashboard Setup',
        description: 'Configure your app in the Shopify Partner Dashboard',
        urls: {
          appUrl: baseUrl,
          allowedRedirectUrls: [
            `${baseUrl}/api/shopify/auth/callback`,
            `${frontendUrl}/auth/shopify/callback`,
            `${frontendUrl}/inventory`
          ],
          webhookUrl: `${baseUrl}/api/shopify/webhooks`
        }
      },
      step2: {
        title: 'Environment Variables',
        description: 'Set these environment variables in your .env file',
        variables: {
          SHOPIFY_API_KEY: 'Your Shopify API Key from Partner Dashboard',
          SHOPIFY_API_SECRET: 'Your Shopify API Secret from Partner Dashboard',
          SHOPIFY_APP_URL: baseUrl,
          FRONTEND_URL: frontendUrl
        }
      },
      step3: {
        title: 'Required Scopes',
        description: 'Make sure your app has these scopes enabled',
        scopes: [
          'read_checkouts',
          'read_customers',
          'read_draft_orders',
          'read_orders',
          'read_products',
          'write_products',
          'read_inventory',
          'write_inventory'
        ]
      },
      step4: {
        title: 'Testing',
        description: 'Test your configuration using these endpoints',
        testEndpoints: [
          'GET /api/shopify/test-config - Test basic configuration',
          'GET /api/shopify/test-urls - Test URL configuration',
          'GET /api/shopify/test-scopes - Test scope configuration',
          'GET /api/shopify/test-full-config - Test complete setup'
        ]
      }
    };
    
    return res.json({
      success: true,
      setupGuide,
      message: 'Follow this guide to properly configure your Shopify app'
    });
  } catch (error: any) {
    console.error('Error generating setup guide:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate setup guide'
    });
  }
});

/**
 * POST /api/shopify/webhooks/products/update
 * Handle Shopify product update webhook
 */
router.post('/webhooks/products/update', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.get('X-Shopify-Hmac-Sha256');
    const rawBody = req.body.toString();

    if (!signature || !(await validateWebhook(rawBody, req))) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized webhook'
      });
    }

    const productData = JSON.parse(rawBody);
    
    // TODO: Implement product update logic
    console.log('Received Shopify product update webhook:', productData);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error handling Shopify webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process webhook'
    });
  }
});

/**
 * POST /api/shopify/webhooks/products/create
 * Handle Shopify product create webhook
 */
router.post('/webhooks/products/create', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.get('X-Shopify-Hmac-Sha256');
    const rawBody = req.body.toString();

    if (!signature || !(await validateWebhook(rawBody, req))) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized webhook'
      });
    }

    const productData = JSON.parse(rawBody);
    
    // TODO: Implement product creation logic
    console.log('Received Shopify product create webhook:', productData);
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error handling Shopify webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process webhook'
    });
  }
});

export default router;