import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import axios from 'axios';

const router = Router();

// Validation schemas
const generateContentSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  type: z.enum(['text', 'image', 'video']),
  options: z.record(z.any()).optional()
});

const heygenGenerateSchema = z.object({
  templateId: z.string(),
  productId: z.string().optional(),
  instruction: z.string(),
  variables: z.record(z.string()).optional(), // Template variables
  formatSpecs: z.object({
    channel: z.string().optional(),
    format: z.string().optional()
  }).optional()
});

// OpenAI Integration
router.post('/openai/generate', async (req, res, next) => {
  try {
    const { prompt, type, options } = generateContentSchema.parse(req.body);
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    let result;
    
    if (type === 'text') {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7
      }, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      result = response.data.choices[0].message.content;
    } else if (type === 'image') {
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        prompt,
        n: 1,
        size: options?.size || '1024x1024'
      }, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      result = response.data.data[0].url;
    }

    // Store in generated assets
    const asset = await prisma.generatedAsset.create({
      data: {
        channel: 'social_media',
        format: type === 'image' ? 'png' : 'text',
        sourceSystem: 'openai',
        assetType: type,
        url: result,
        instruction: prompt
      }
    });

    res.json({
      success: true,
      data: {
        result,
        assetId: asset.id
      },
      message: 'Content generated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    next(error);
  }
});

// HeyGen Integration
router.post('/heygen/generate', async (req, res, next) => {
  try {
    const { templateId, productId, instruction, variables, formatSpecs } = heygenGenerateSchema.parse(req.body);
    
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    if (!heygenApiKey) {
      return res.status(500).json({
        success: false,
        error: 'HeyGen API key not configured'
      });
    }

    // Get product name if productId provided
    let productName = 'Product';
    if (productId) {
      const product = await prisma.inventory.findUnique({
        where: { id: productId },
        select: { name: true }
      });
      if (product) {
        productName = product.name;
      }
    }

    // Prepare the request body according to HeyGen API v2 template generation
    const requestBody: any = {
      test: false,
      aspect_ratio: "16:9"
    };

    // Add variables if provided - this is the key part for template-based generation
    if (variables && Object.keys(variables).length > 0) {
      // Convert simple string variables to HeyGen's expected format
      const formattedVariables: Record<string, any> = {};
      Object.entries(variables).forEach(([key, value]) => {
        formattedVariables[key] = {
          name: key,
          type: "text",
          properties: {
            content: value
          }
        };
      });
      requestBody.variables = formattedVariables;
    }

    // For v2 API, we don't need video_inputs for template-based generation
    // The template handles everything, and variables are passed directly
    // Only add video_inputs if we want to override template settings (which we don't for templates)

    console.log('HeyGen API Request Body:', JSON.stringify(requestBody, null, 2));
    console.log('HeyGen API Key Length:', heygenApiKey?.length || 0);
    console.log('Template ID:', templateId);
    console.log('Variables:', variables);

    // Create HeyGen video generation request using template
    // According to HeyGen API v2 documentation, use the template-specific endpoint
    console.log('Making request to HeyGen API v2...');
    const response = await axios.post(`https://api.heygen.com/v2/template/${templateId}/generate`, requestBody, {
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    const videoId = response.data.data.video_id;

    // Store generation request
    const asset = await prisma.generatedAsset.create({
      data: {
        inventoryId: productId,
        channel: formatSpecs?.channel || 'social_media',
        format: formatSpecs?.format || 'mp4',
        sourceSystem: 'heygen',
        assetType: 'video',
        url: `pending_${videoId}`,
        instruction
      }
    });

    // Also store in asset library
    await prisma.assetLibrary.create({
      data: {
        title: `HeyGen Video - ${productName}`,
        assetType: 'video',
        assetUrl: `pending_${videoId}`,
        instruction,
        sourceSystem: 'heygen',
        description: `Generated using HeyGen template ${templateId} for product: ${productName}`,
        originalAssetId: asset.id
      }
    });

    res.json({
      success: true,
      data: {
        videoId,
        assetId: asset.id,
        status: 'processing'
      },
      message: 'Video generation started successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    // Log the full error for debugging
    console.error('HeyGen API Error:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('HeyGen API Response:', error.response.data);
      console.error('HeyGen API Status:', error.response.status);
    }
    
    return res.status(500).json({
      success: false,
      error: `HeyGen API error: ${axios.isAxiosError(error) ? error.response?.status || 'Unknown' : 'Unknown'} - ${axios.isAxiosError(error) ? error.response?.data?.message || error.message : error instanceof Error ? error.message : 'Unknown error'}`,
      details: axios.isAxiosError(error) ? error.response?.data : null
    });
  }
});

// HeyGen Status Check
router.get('/heygen/status/:videoId', async (req, res, next) => {
  try {
    const { videoId } = req.params;
    
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    if (!heygenApiKey) {
      return res.status(500).json({
        success: false,
        error: 'HeyGen API key not configured'
      });
    }

    // Use the v1 status endpoint as per HeyGen documentation
    const response = await axios.get(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      headers: {
        'X-Api-Key': heygenApiKey
      }
    });

    const data = response.data.data;
    const status = data.status;
    const videoUrl = data.video_url;
    const errorMessage = data.error_message;
    
    // HeyGen doesn't provide progress percentage, so we'll estimate based on status
    let progress = 0;
    if (status === 'completed') {
      progress = 100;
    } else if (status === 'failed') {
      progress = 0;
    } else if (status === 'processing') {
      progress = 50; // Estimate 50% for processing state
    }

    // Update asset if video is ready
    if (status === 'completed' && videoUrl) {
      await prisma.generatedAsset.updateMany({
        where: { url: `pending_${videoId}` },
        data: { 
          url: videoUrl,
          status: 'completed'
        }
      });

      await prisma.assetLibrary.updateMany({
        where: { assetUrl: `pending_${videoId}` },
        data: { 
          assetUrl: videoUrl
        }
      });
    } else if (status === 'failed') {
      // Update status to failed
      await prisma.generatedAsset.updateMany({
        where: { url: `pending_${videoId}` },
        data: { status: 'failed' }
      });

      // Note: AssetLibrary doesn't have a status field, so we only update GeneratedAsset status
    }

    res.json({
      success: true,
      data: {
        status,
        progress,
        videoUrl: status === 'completed' ? videoUrl : null,
        errorMessage: status === 'failed' ? errorMessage : null
      }
    });
  } catch (error) {
    next(error);
  }
});

// RunwayML Integration
router.post('/runwayml/generate', async (req, res, next) => {
  try {
    const { prompt, options } = generateContentSchema.parse(req.body);
    
    const runwaymlApiKey = process.env.RUNWAYML_API_KEY;
    if (!runwaymlApiKey) {
      return res.status(500).json({
        success: false,
        error: 'RunwayML API key not configured'
      });
    }

    // This is a placeholder - RunwayML API integration would go here
    // The actual implementation depends on RunwayML's API structure
    
    const asset = await prisma.generatedAsset.create({
      data: {
        channel: 'social_media',
        format: 'mp4',
        sourceSystem: 'runwayml',
        assetType: 'video',
        url: 'pending_runwayml',
        instruction: prompt
      }
    });

    res.json({
      success: true,
      data: {
        assetId: asset.id,
        status: 'processing'
      },
      message: 'RunwayML generation started successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    next(error);
  }
});

// Bulk recovery endpoint for pending HeyGen videos
router.post('/heygen/recover-pending', async (req, res, next) => {
  try {
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    if (!heygenApiKey) {
      return res.status(500).json({
        success: false,
        error: 'HeyGen API key not configured'
      });
    }

    // Get all pending HeyGen videos from database
    const pendingAssets = await prisma.generatedAsset.findMany({
      where: {
        sourceSystem: 'heygen',
        url: { startsWith: 'pending_' }
      },
      include: {
        assetLibraries: true
      }
    });

    if (pendingAssets.length === 0) {
      return res.json({
        success: true,
        message: 'No pending videos found',
        data: []
      });
    }

    console.log(`Found ${pendingAssets.length} pending videos to check`);

    const results = [];
    
    for (const asset of pendingAssets) {
      try {
        // Extract video ID from pending URL
        const videoId = asset.url.replace('pending_', '');
        
        console.log(`Checking status for video: ${videoId}`);
        
        // Check status from HeyGen API
        const response = await axios.get(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
          headers: {
            'X-Api-Key': heygenApiKey
          }
        });

        const data = response.data.data;
        const status = data.status;
        const videoUrl = data.video_url;
        const errorMessage = data.error_message;

        let updateData = {};
        let message = '';

        if (status === 'completed' && videoUrl) {
          // Update both generated_assets and asset_library
          await prisma.generatedAsset.update({
            where: { id: asset.id },
            data: { 
              url: videoUrl,
              status: 'completed'
            }
          });

          // Update asset library entries
          for (const libraryAsset of asset.assetLibraries) {
            await prisma.assetLibrary.update({
              where: { id: libraryAsset.id },
              data: { assetUrl: videoUrl }
            });
          }

          updateData = { url: videoUrl, status: 'completed' };
          message = 'Video completed and updated';
        } else if (status === 'failed') {
          await prisma.generatedAsset.update({
            where: { id: asset.id },
            data: { status: 'failed' }
          });

          updateData = { status: 'failed' };
          message = `Video failed: ${errorMessage || 'Unknown error'}`;
        } else {
          message = `Video still processing: ${status}`;
        }

        results.push({
          assetId: asset.id,
          videoId,
          status,
          message,
          updated: status === 'completed' || status === 'failed'
        });

      } catch (error) {
        console.error(`Error checking video ${asset.url}:`, error);
        results.push({
          assetId: asset.id,
          videoId: asset.url.replace('pending_', ''),
          status: 'error',
          message: `Error checking status: ${error.message}`,
          updated: false
        });
      }
    }

    const updatedCount = results.filter(r => r.updated).length;
    
    res.json({
      success: true,
      message: `Recovery completed. ${updatedCount} videos updated.`,
      data: results
    });

  } catch (error) {
    console.error('Error in bulk recovery:', error);
    next(error);
  }
});

export default router; 