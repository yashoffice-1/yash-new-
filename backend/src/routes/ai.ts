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
    const { templateId, productId, instruction, formatSpecs } = heygenGenerateSchema.parse(req.body);
    
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

    // Create HeyGen video generation request
    const response = await axios.post('https://api.heygen.com/v1/video.generate', {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: "DnDpLjqVDqOKVBhxJEn"
          },
          voice: {
            type: "text",
            input_text: instruction,
            voice_id: "sara"
          },
          background: {
            type: "color",
            value: "#000000"
          }
        }
      ],
      test: false,
      aspect_ratio: "16:9"
    }, {
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json'
      }
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
    next(error);
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

    const response = await axios.get(`https://api.heygen.com/v1/video.status.get?video_id=${videoId}`, {
      headers: {
        'X-Api-Key': heygenApiKey
      }
    });

    const status = response.data.data.status;
    const videoUrl = response.data.data.video_url;

    // Update asset if video is ready
    if (status === 'completed' && videoUrl) {
      await prisma.generatedAsset.updateMany({
        where: { url: `pending_${videoId}` },
        data: { url: videoUrl }
      });

      await prisma.assetLibrary.updateMany({
        where: { assetUrl: `pending_${videoId}` },
        data: { assetUrl: videoUrl }
      });
    }

    res.json({
      success: true,
      data: {
        status,
        videoUrl: status === 'completed' ? videoUrl : null
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

// Get AI generation statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [openaiCount, heygenCount, runwaymlCount] = await Promise.all([
      prisma.generatedAsset.count({ where: { sourceSystem: 'openai' } }),
      prisma.generatedAsset.count({ where: { sourceSystem: 'heygen' } }),
      prisma.generatedAsset.count({ where: { sourceSystem: 'runwayml' } })
    ]);

    res.json({
      success: true,
      data: {
        openai: openaiCount,
        heygen: heygenCount,
        runwayml: runwaymlCount,
        total: openaiCount + heygenCount + runwaymlCount
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router; 