import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import axios from 'axios';
import { authenticateToken } from '../middleware/auth';
import { validateAndUpdateTemplateUsage } from '../middleware/template-access';
import { CloudinaryService } from '../services/cloudinary.js';
import { webhookSecurity } from '../middleware/webhook-security.js';

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
  instruction: z.string().optional(),
  variables: z.record(z.string()).optional(), // Template variables like {{name}}, {{company}}, etc.
  formatSpecs: z.object({
    channel: z.string().optional(),
    format: z.string().optional(),
    aspectRatio: z.string().optional(),
    backgroundColor: z.string().optional()
  }).optional()
});

const youtubeMetadataSchema = z.object({
  assetId: z.string().min(1, 'Asset ID is required'),
  instruction: z.string().optional(), // Original instruction used to generate the video
  productInfo: z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional()
  }).optional()
});
// OpenAI Integration
router.post('/openai/generate', authenticateToken, async (req, res, next) => {
  try {
    const { prompt, type, options } = generateContentSchema.parse(req.body);

    const openaiApiKey = process.env.OPENAI_API_KEY;
 
    if (!openaiApiKey) {
      return res.status(501).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    let result: string;
    
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
      // Clean and truncate prompt for image generation
      let cleanPrompt = prompt.trim();
      
      // Remove any text that might cause issues with image generation
      cleanPrompt = cleanPrompt
        .replace(/text overlay|text overlay|overlay text|typography|font|call-to-action|CTA|button|logo|brand|website|URL|link/gi, '')
        .replace(/Facebook|Instagram|social media|platform/gi, '')
        .replace(/pixels|px|size|dimensions/gi, '')
        .replace(/professional|business|marketing|advertising/gi, '')
        .replace(/engagement|sharing|viral|trending/gi, '');
      
      // Truncate to OpenAI's recommended length for image prompts
      if (cleanPrompt.length > 1000) {
        cleanPrompt = cleanPrompt.substring(0, 1000).trim();
      }
      
      // Ensure the prompt is not empty after cleaning
      if (!cleanPrompt) {
        cleanPrompt = "A professional product photograph";
      }
      

      
      const response = await axios.post('https://api.openai.com/v1/images/generations', {
        prompt: cleanPrompt,
        n: 1,
        size: options?.size || '1024x1024'
      }, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      result = response.data.data[0].url;
    } else {
      throw new Error(`Unsupported content type: ${type}`);
    }

    return res.json({
      success: true,
      data: {
        result,
        assetId: null // No asset created here, assets route will handle it
      },
      message: 'Content generated successfully'
    });
  } catch (error:any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    // Log the full error for debugging
    console.error('OpenAI API Error:', error);
    
    // If it's an axios error, extract the response data
    if (error.response) {
      console.error('OpenAI API Response Error:', error.response.data);
      return res.status(500).json({
        success: false,
        error: 'OpenAI API error',
        details: error.response.data
      });
    }
    
    return next(error);
  }
});

// HeyGen Integration
router.post('/heygen/generate', authenticateToken, validateAndUpdateTemplateUsage('heygen', 'templateId'), async (req, res, next) => {
  try {
    const { templateId, instruction, variables, formatSpecs } = heygenGenerateSchema.parse(req.body);
    const userId = (req as any).user?.userId || (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in request'
      });
    }
    
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    if (!heygenApiKey) {
      return res.status(500).json({
        success: false,
        error: 'HeyGen API key not configured'
      });
    }

    // Get the template access record to link the generation
    const templateAccess = await prisma.userTemplateAccess.findUnique({
      where: {
        userId_sourceSystem_externalId: {
          userId: userId,
          sourceSystem: 'heygen',
          externalId: templateId
        }
      }
    });

    if (!templateAccess) {
      return res.status(400).json({
        success: false,
        error: 'Template access not found or not granted'
      });
    }

    // Prepare the request body according to HeyGen API v2 template generation
    const requestBody: Record<string, any> = {
      test: false,
      aspect_ratio: formatSpecs?.aspectRatio || "16:9"
    };

    // Add webhook URL for real-time notifications
    // For local development with ngrok, use the WEBHOOK_URL environment variable
    // In production, this will be your hosted domain
    const webhookUrl = process.env.WEBHOOK_URL || 
      `${req.protocol}://${req.get('host')}/api/ai/heygen/webhook`;
    
    // Always use webhook URL - no fallback to polling
    requestBody.callback_url = webhookUrl;


    // Add variables if provided - this is the key part for template-based generation
    if (variables && Object.keys(variables).length > 0) {
      // Convert simple string variables to HeyGen's expected format
      const formattedVariables: Record<string, any> = {};
      Object.entries(variables).forEach(([key, value]) => {
        // Check if this is an image variable (contains 'image' in the name)
        const isImageVariable = key.toLowerCase().includes('image');
        
        if (isImageVariable) {
          // Format image variables according to HeyGen API v2 specification
          formattedVariables[key] = {
            name: key,
            type: "image",
            properties: {
              url: value,
              asset_id: null,
              fit: "contain"
            }
          };
        } else {
          // Format text variables
          formattedVariables[key] = {
            name: key,
            type: "text",
            properties: {
              content: value
            }
          };
        }
      });
      requestBody.variables = formattedVariables;
    }



    // Create HeyGen video generation request using template
    // According to HeyGen API v2 documentation, use the template-specific endpoint
    const response = await axios.post(`https://api.heygen.com/v2/template/${templateId}/generate`, requestBody, {
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json'
      },
      timeout: 30000 // 30 second timeout
    });

    const { video_id } = response.data.data;

    // Store in generated assets with pending status
    const asset = await prisma.generatedAsset.create({
      data: {
        profileId: userId,
        channel: 'social_media',
        format: 'mp4',
        sourceSystem: 'heygen',
        assetType: 'video',
        url: `pending_${video_id}`, // Mark as pending
        instruction: instruction || `Generate video using template: ${templateId}`,
        templateAccessId: templateAccess?.id, // Link to template access
        variables: variables || {}
      }
    });

    // Broadcast real-time update for video generation started
    broadcastUpdate(userId, {
      type: 'video_started',
      assetId: asset.id,
      videoId: video_id,
      templateId: templateId,
      message: 'Video generation started!',
      timestamp: new Date().toISOString()
    });

    return res.json({
      success: true,
      data: {
        videoId: video_id,
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

    
   return next(error);
  }
});

// DEPRECATED: Polling-based status check - Replaced by webhook system
// router.get('/heygen/status/:videoId', authenticateToken, async (req, res, next) => {
//   try {
//     const { videoId } = req.params;
    
//     const heygenApiKey = process.env.HEYGEN_API_KEY;
//     if (!heygenApiKey) {
//       return res.status(500).json({
//         success: false,
//         error: 'HeyGen API key not configured'
//       });
//     }

//     // Use the v1 status endpoint as per HeyGen documentation
//     const response = await axios.get(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
//       headers: {
//         'X-Api-Key': heygenApiKey
//       }
//     });

//     const data = response.data.data;
//     const status = data.status;
//     const videoUrl = data.video_url;
//     const errorMessage = data.error_message;
    
//     // HeyGen doesn't provide progress percentage, so we'll estimate based on status
//     let progress = 0;
//     if (status === 'completed') {
//       progress = 100;
//     } else if (status === 'failed') {
//       progress = 0;
//     } else if (status === 'processing') {
//       progress = 50; // Estimate 50% for processing state
//     }

//     // Update asset if video is ready
//     if (status === 'completed' && videoUrl) {
//       await prisma.generatedAsset.updateMany({
//         where: { url: `pending_${videoId}` },
//         data: { 
//           url: videoUrl,
//           status: 'completed'
//         }
//       });
//     } else if (status === 'failed') {
//       // Update status to failed
//       await prisma.generatedAsset.updateMany({
//         where: { url: `pending_${videoId}` },
//         data: { status: 'failed' }
//       });
//     }

//     return res.json({
//       success: true,
//       data: {
//         status,
//         progress,
//         videoUrl: status === 'completed' ? videoUrl : null,
//         errorMessage: status === 'failed' ? errorMessage : null
//       }
//     });
//   } catch (error) {
//     return next(error);
//   }
// });

// RunwayML Integration
router.post('/runwayml/generate', authenticateToken, async (req, res, next) => {
  try {
    const { prompt } = generateContentSchema.parse(req.body);
    
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
        profileId: (req as any).user.id,
        channel: 'social_media',
        format: 'mp4',
        sourceSystem: 'runwayml',
        assetType: 'video',
        url: 'pending_runwayml',
        instruction: prompt
      }
    });

    return res.json({
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
    return next(error);
  }
});

// DEPRECATED: Polling-based recovery - Replaced by webhook system
// router.post('/heygen/recover-pending', authenticateToken, async (req, res, next) => {
//   try {
//     const heygenApiKey = process.env.HEYGEN_API_KEY;
//     if (!heygenApiKey) {
//       return res.status(500).json({
//         success: false,
//         error: 'HeyGen API key not configured'
//       });
//     }

//     // Get all pending HeyGen videos from database
//     const pendingAssets = await prisma.generatedAsset.findMany({
//       where: {
//         sourceSystem: 'heygen',
//         url: { startsWith: 'pending_' }
//       },
//               include: {
//           profile: {
//             select: {
//               id: true,
//               email: true,
//               firstName: true,
//               lastName: true
//             }
//           }
//         }
//       });

//     if (pendingAssets.length === 0) {
//       return res.json({
//       success: true,
//         message: 'No pending videos found',
//         data: []
//       });
//     }



//     const results = [];
    
//     for (const asset of pendingAssets) {
//       try {
//         // Extract video ID from pending URL
//         const videoId = asset.url.replace('pending_', '');
        

        
//         // Check status from HeyGen API
//         const response = await axios.get(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
//           headers: {
//             'X-Api-Key': heygenApiKey
//           }
//         });

//         const data = response.data.data;
//         const status = data.status;
//         const videoUrl = data.video_url;
//         const errorMessage = data.error_message;

      
//         let message = '';

//         if (status === 'completed' && videoUrl) {
//           // Update both generated_assets and asset_library
//           await prisma.generatedAsset.update({
//             where: { id: asset.id },
//       data: {
//               url: videoUrl,
//               status: 'completed'
//             }
//           });

//           // Asset library entries are no longer needed since we unified under GeneratedAsset

         
//           message = 'Video completed and updated';
//         } else if (status === 'failed') {
//           await prisma.generatedAsset.update({
//             where: { id: asset.id },
//             data: { status: 'failed' }
//           });

        
//           message = `Video failed: ${errorMessage || 'Unknown error'}`;
//         } else {
//           message = `Video still processing: ${status}`;
//         }
//       } catch (error) {
//         console.error(`Error checking status for asset ${asset.id}:`, error);
//         message = `Error checking status: ${error.message}`;
//       }

//       results.push({
//         assetId: asset.id,
//         videoId: asset.url.replace('pending_', ''),
//         message,
//         updated: message.includes('completed') || message.includes('failed')
//       });
//     }

//     return res.json({
//       success: true,
//       message: `Checked ${results.length} pending videos`,
//       data: results
//     });
//   } catch (error) {
//     console.error('Error in recover-pending:', error);
//     return res.status(500).json({
//       success: false,
//       error: 'Failed to recover pending videos'
//     });
//   }
// });

router.post('/youtube/generate-metadata', authenticateToken, async (req, res, _next) => {
  try {
    const { assetId, instruction, productInfo } = youtubeMetadataSchema.parse(req.body);
    const userId = (req as any).user.userId;
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(501).json({
        success: false,
        error: 'OpenAI API key not configured'
      });
    }

    // Get the asset details from database
    const asset = await prisma.generatedAsset.findFirst({
      where: {
        id: assetId,
        profileId: userId
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    // Create a comprehensive prompt for YouTube metadata generation
    const prompt = `Generate YouTube video metadata for a product video. 

Video Details:
- Original Instruction: ${instruction || asset.instruction}
- Product: ${productInfo?.name || 'Product demonstration'}
- Category: ${productInfo?.category || 'Tools & Hardware'}
- Description: ${productInfo?.description || 'Product showcase video'}

Please generate:
1. A compelling YouTube title (max 100 characters) that includes relevant keywords and is engaging
2. A detailed description (max 5000 characters) that includes:
   - Product overview
   - Key features and benefits
   - Call-to-action
   - Relevant hashtags
   - Links placeholder
3. 10-15 relevant tags separated by commas that would help with YouTube SEO

Return only a JSON object like this (without nesting inside string or escaping quotes):
{
  "title": "Your generated title",
  "description": "Your generated description",
  "tags": "tag1, tag2, tag3, tag4, tag5"
}

Make it engaging, SEO-friendly, and optimized for YouTube's algorithm.`;

    // Call OpenAI to generate metadata
    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      }
    });

    const result = response.data.choices[0].message.content;
    
    // Parse the JSON response
    let metadata;
    try {
      metadata = JSON.parse(result);
    } catch (parseError) {
      console.log('JSON parsing failed', parseError);
      // If JSON parsing fails, create a structured response from the text
      const lines = result.split('\n');
      metadata = {
        title: lines.find((line:string) => line.includes('title') || line.includes('Title'))?.replace(/.*[:=]\s*/, '').replace(/['"]/g, '').trim() || 'Product Video',
        description: result.replace(/.*title.*\n?/i, '').replace(/.*tags.*\n?/i, '').trim(),
        tags: lines.find((line:string) => line.includes('tag') || line.includes('Tag'))?.replace(/.*[:=]\s*/, '').replace(/['"]/g, '').trim() || 'product, demonstration, showcase'
      };
    }

    // Clean and validate the generated metadata
    const cleanMetadata = {
      title: (metadata.title || 'Product Video').substring(0, 100),
      description: (metadata.description || '').substring(0, 5000),
      tags: (metadata.tags || '').split(',').map((tag:string) => tag.trim()).filter((tag:string) => tag.length > 0).slice(0, 15).join(', ')
    };

    return res.json({
      success: true,
      data: cleanMetadata,
      message: 'YouTube metadata generated successfully'
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }
    
    console.error('YouTube metadata generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate YouTube metadata'
    });
  }
});

// HeyGen Webhook Endpoint - OPTIONS for validation
router.options('/heygen/webhook', (req: any, res: any) => {
  // Handle CORS preflight requests for HeyGen webhook validation
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Heygen-Signature');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  res.status(200).end();
});

// HeyGen Webhook Endpoint with Cloudinary Integration
router.post('/heygen/webhook', webhookSecurity, async (req: any, res: any, _next: any) => {
  try {
    const webhookData = req.body;
    console.log('Received HeyGen webhook:', JSON.stringify(webhookData, null, 2));

    const { event_type, event_data } = webhookData;

    if (event_type === 'avatar_video.success') {
      const {
        video_id,
        url: video_url, // This is the video URL
        gif_download_url,
        video_share_page_url,
        folder_id,
        callback_id
      } = event_data;

      console.log('Processing successful video generation:', { video_id, video_url });

      // Find the asset using video_id
      const asset = await prisma.generatedAsset.findFirst({
        where: { url: `pending_${video_id}` }
      });

      if (!asset) {
        console.error('Asset not found for video_id:', video_id);
        return res.status(404).json({
          success: false,
          error: 'Asset not found',
          video_id
        });
      }

      // Upload video to Cloudinary
      let cloudinaryVideoUrl = video_url;
      let cloudinaryGifUrl = gif_download_url;
      let cloudinaryData: any = {};

      try {
        const videoUploadResult = await CloudinaryService.uploadFromUrl({
          url: video_url,
          fileName: `heygen-video-${video_id}`,
          assetType: 'video',
          folder: 'heygen-videos',
          tags: ['heygen', 'video', 'generated']
        });

        cloudinaryVideoUrl = videoUploadResult.secure_url;
        cloudinaryData = {
          video: {
            public_id: videoUploadResult.public_id,
            secure_url: videoUploadResult.secure_url,
            format: videoUploadResult.format,
            width: videoUploadResult.width,
            height: videoUploadResult.height,
            bytes: videoUploadResult.bytes
          }
        };

        // Upload GIF if available
        if (gif_download_url) {
          const gifUploadResult = await CloudinaryService.uploadFromUrl({
            url: gif_download_url,
            fileName: `heygen-gif-${video_id}`,
            assetType: 'image',
            folder: 'heygen-gifs',
            tags: ['heygen', 'gif', 'generated']
          });

          cloudinaryGifUrl = gifUploadResult.secure_url;
          cloudinaryData = {
            ...cloudinaryData,
            gif: {
              public_id: gifUploadResult.public_id,
              secure_url: gifUploadResult.secure_url,
              format: gifUploadResult.format,
              width: gifUploadResult.width,
              height: gifUploadResult.height,
              bytes: gifUploadResult.bytes
            }
          };
        }

      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed:', cloudinaryError);
        // Continue with original URLs if Cloudinary fails
        cloudinaryVideoUrl = video_url;
        cloudinaryGifUrl = gif_download_url;
      }

      // Update generated_assets table with Cloudinary URLs and metadata
      const updatedAsset = await prisma.generatedAsset.update({
        where: { id: asset.id },
        data: {
          url: cloudinaryVideoUrl,
          status: 'completed',
          metadata: {
            originalVideoUrl: video_url,
            originalGifUrl: gif_download_url,
            sharePageUrl: video_share_page_url,
            completedAt: new Date().toISOString(),
            webhookData: {
              video_id,
              callback_id,
              folder_id
            }
          },
          cloudinaryData: cloudinaryData
        }
      });

      // Broadcast real-time update to connected clients
      broadcastUpdate(updatedAsset.profileId, {
        type: 'video_completed',
        assetId: updatedAsset.id,
        videoUrl: cloudinaryVideoUrl,
        gifUrl: cloudinaryGifUrl,
        videoId: video_id,
        message: 'Video generation completed successfully!',
        timestamp: new Date().toISOString()
      });

    } else if (event_type === 'avatar_video.fail') {
      const { video_id, msg: failure_message, callback_id } = event_data;
      
      console.log('Processing failed video generation:', { video_id, failure_message });

      // Find and update the failed asset
      const asset = await prisma.generatedAsset.findFirst({
        where: { url: `pending_${video_id}` }
      });

      if (asset) {
        const failedAsset = await prisma.generatedAsset.update({
          where: { id: asset.id },
          data: {
            url: 'failed',
            status: 'failed',
            metadata: {
              error: failure_message,
              failedAt: new Date().toISOString(),
              webhookData: {
                video_id,
                callback_id
              }
            }
          }
        });

        // Broadcast real-time update for failed video
        broadcastUpdate(failedAsset.profileId, {
          type: 'video_failed',
          assetId: failedAsset.id,
          videoId: video_id,
          error: failure_message,
          message: 'Video generation failed',
          timestamp: new Date().toISOString()
        });
      } else {
        console.error('Asset not found for failed video_id:', video_id);
      }
    } else {
      console.log('Received unknown event type:', event_type);
    }

    return res.json({
      success: true,
      message: 'Webhook processed successfully',
      event_type,
      processed_at: new Date().toISOString()
    });

  } catch (error :any) {
    console.error('Error processing HeyGen webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Store connected SSE clients for broadcasting
const sseClients = new Map<string, { res: any; userId: string }>();

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Cloudinary configuration
    const cloudinaryConfig = {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET
    };
    
    const isCloudinaryConfigured = cloudinaryConfig.cloudName && 
                                  cloudinaryConfig.apiKey && 
                                  cloudinaryConfig.apiSecret;

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'connected',
        cloudinary: isCloudinaryConfigured ? 'configured' : 'not_configured',
        heygen: process.env.HEYGEN_API_KEY ? 'configured' : 'not_configured'
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };

    res.json(healthStatus);
  } catch (error:any) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: 'disconnected',
        cloudinary: 'unknown',
        heygen: 'unknown'
      }
    });
  }
});



// SSE endpoint for real-time updates
router.get('/heygen/updates', authenticateToken, (req, res) => {
  const userId = (req as any).user?.userId || (req as any).user?.id;
  
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control',
    'X-Accel-Buffering': 'no'
  });
  
  // Send initial connection message
  const initialMessage = `data: ${JSON.stringify({
    type: 'connection',
    message: 'Connected to real-time updates',
    timestamp: new Date().toISOString()
  })}\n\n`;
  
  res.write(initialMessage);
  res.flush();
  
  // Store client connection for broadcasting
  const clientId = `${userId}-${Date.now()}`;
  sseClients.set(clientId, { res, userId });

  // Handle client disconnect
  req.on('close', () => {
    sseClients.delete(clientId);
  });

  // Send ping every 30 seconds to keep connection alive
  // eslint-disable-next-line no-undef
  const keepAlive = setInterval(() => {
    try {
      if (sseClients.has(clientId)) {
        res.write(`data: ${JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        })}\n\n`);
      } else {
        // eslint-disable-next-line no-undef
        clearInterval(keepAlive);
      }
    } catch (error) {
      console.log('Error sending SSE to client', error);
      // eslint-disable-next-line no-undef
      clearInterval(keepAlive);
    }
  }, 30000);

  // Explicit return for TypeScript
  return;
});

// Helper function to broadcast updates to connected clients
const broadcastUpdate = (userId: string, data: any) => {
  const userClients = Array.from(sseClients.entries())
    .filter(([_, client]) => client.userId === userId);

  userClients.forEach(([clientId, client]) => {
    try {
      client.res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error(`Error sending SSE to client ${clientId}:`, error);
      sseClients.delete(clientId);
    }
  });
};

export default router;