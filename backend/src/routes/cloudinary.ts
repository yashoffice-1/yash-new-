import { Router } from 'express';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth.js';
import { CloudinaryService } from '../services/cloudinary.js';

const router = Router();

// Schema for uploading assets to Cloudinary
const uploadAssetSchema = z.object({
  url: z.string().url('Valid URL is required'),
  assetType: z.enum(['image', 'video', 'content']),
  fileName: z.string().optional(),
  folder: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Upload asset to Cloudinary
router.post('/upload', authenticateToken, async (req, res, next) => {
  try {
    const validatedData = uploadAssetSchema.parse(req.body);
    const userId = (req as any).user.userId;

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return res.status(501).json({
        success: false,
        error: 'Cloudinary not configured'
      });
    }

    const result = await CloudinaryService.uploadFromUrl({
      url: validatedData.url,
      assetType: validatedData.assetType,
      fileName: validatedData.fileName || `${validatedData.assetType}_${Date.now()}`,
      folder: validatedData.folder || `users/${userId}/assets`,
      tags: [
        validatedData.assetType,
        'generated',
        ...(validatedData.tags || [])
      ]
    });

    return res.json({
      success: true,
      data: result,
      message: 'Asset uploaded to Cloudinary successfully'
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

// Delete asset from Cloudinary
router.delete('/:publicId', authenticateToken, async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(501).json({
        success: false,
        error: 'Cloudinary not configured'
      });
    }

    await CloudinaryService.deleteAsset(publicId, resourceType as 'image' | 'video');

    return res.json({
      success: true,
      message: 'Asset deleted from Cloudinary successfully',
      data: { publicId, resourceType }
    });
  } catch (error) {
    return next(error);
  }
});

// Get asset info from Cloudinary
router.get('/:publicId/info', authenticateToken, async (req, res, next) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(501).json({
        success: false,
        error: 'Cloudinary not configured'
      });
    }

    const info = await CloudinaryService.getAssetInfo(publicId, resourceType as 'image' | 'video');

    return res.json({
      success: true,
      data: info
    });
  } catch (error) {
    return next(error);
  }
});

export default router;

