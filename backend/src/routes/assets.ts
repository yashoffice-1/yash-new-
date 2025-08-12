import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';
import { CloudinaryService } from '../services/cloudinary.js';

const router = Router();

// Validation schemas
const createAssetSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  assetType: z.enum(['image', 'video', 'content']),
  url: z.string().url('Valid URL is required'),
  instruction: z.string().min(1, 'Instruction is required'),
  sourceSystem: z.enum(['openai', 'runway', 'heygen']),
  channel: z.string().optional(),
  format: z.string().optional(),
  inventoryId: z.string().optional(),
  favorited: z.boolean().default(false),
});

// Schema for initiating generation (minimal data)
const initiateGenerationSchema = z.object({
  assetType: z.enum(['image', 'video', 'content']),
  instruction: z.string().min(1, 'Instruction is required'),
  sourceSystem: z.enum(['openai', 'runway', 'heygen']),
  channel: z.string().optional(),
  format: z.string().optional(),
  inventoryId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Schema for updating asset status
const updateAssetStatusSchema = z.object({
  status: z.enum(['generating', 'processing', 'completed', 'failed', 'approved', 'rejected']),
  url: z.string().url('Valid URL is required').optional(),
  error: z.string().optional(),
});

// Schema for approving/rejecting assets
const approveAssetSchema = z.object({
  approved: z.boolean(),
  title: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// Asset status enum for reference
enum AssetStatus {
  _GENERATING = 'generating',
  _APPROVED = 'approved',
  _REJECTED = 'rejected'
}

// Helper function to transform asset data for frontend
const transformAssetForFrontend = (asset: any) => ({
  id: asset.id,
  title: asset.title,
  description: asset.description,
  tags: asset.tags,
  asset_type: asset.assetType,
  asset_url: asset.url,
  content: asset.instruction,
  instruction: asset.instruction,
  source_system: asset.sourceSystem,
  favorited: asset.favorited,
  created_at: asset.createdAt.toISOString(),
  updated_at: asset.updatedAt.toISOString(),
  profile: asset.profile,
  templateAccess: asset.templateAccess
});

// Helper function to get common include options
const getAssetIncludeOptions = () => ({
  profile: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true
    }
  },
  templateAccess: true
});

// Get asset type counts
router.get('/counts', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    
    const { 
      favorited,
      search,
      tags 
    } = req.query;

    const baseWhere: any = {
      profileId: userId // Filter by current user only
    };
    
    if (favorited !== undefined) {
      baseWhere.favorited = favorited === 'true';
    }
    
    if (search) {
      baseWhere.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { instruction: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (tags) {
      const tagArray = (tags as string).split(',').map(tag => tag.trim());
      baseWhere.tags = { hasSome: tagArray };
    }

    // Get counts for each asset type
    const [allCount, imageCount, videoCount, contentCount] = await Promise.all([
      prisma.generatedAsset.count({ where: baseWhere }),
      prisma.generatedAsset.count({ where: { ...baseWhere, assetType: 'image' } }),
      prisma.generatedAsset.count({ where: { ...baseWhere, assetType: 'video' } }),
      prisma.generatedAsset.count({ where: { ...baseWhere, assetType: 'content' } })
    ]);

    return res.json({
      success: true,
      data: {
        all: allCount,
        image: imageCount,
        video: videoCount,
        content: contentCount
      }
    });
  } catch (error) {
    return next(error);
  }
});

// Get all assets with pagination and filtering
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    
    const { 
      page = '1', 
      limit = '10', 
      assetType, 
      sourceSystem, 
      favorited,
      search,
      tags 
    } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      profileId: userId // Filter by current user only
    };
    
    if (assetType) {
      where.assetType = assetType;
    }
    
    if (sourceSystem) {
      where.sourceSystem = sourceSystem;
    }
    
    if (favorited !== undefined) {
      where.favorited = favorited === 'true';
    }
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { instruction: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (tags) {
      const tagArray = (tags as string).split(',').map(tag => tag.trim());
      where.tags = { hasSome: tagArray };
    }

    const [assets, total] = await Promise.all([
      prisma.generatedAsset.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: getAssetIncludeOptions()
      }),
      prisma.generatedAsset.count({ where })
    ]);

    const transformedAssets = assets.map(transformAssetForFrontend);

    return res.json({
      success: true,
      data: transformedAssets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    return next(error);
  }
});

// Get single asset
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    
    const asset = await prisma.generatedAsset.findFirst({
      where: {
        id,
        profileId: userId // Ensure user can only access their own assets
      },
      include: getAssetIncludeOptions()
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found or access denied'
      });
    }

    const transformedAsset = transformAssetForFrontend(asset);

    return res.json({
      success: true,
      data: transformedAsset
    });
  } catch (error) {
    return next(error);
  }
});

// Create new asset
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const validatedData = createAssetSchema.parse(req.body);
    const userId = (req as any).user?.userId || (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in request'
      });
    }

    // Upload to Cloudinary if Cloudinary is configured
    let cloudinaryUrl = validatedData.url;
    let cloudinaryPublicId = null;
    
    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
      try {
        console.log('Uploading asset to Cloudinary:', validatedData.url);
        
        const cloudinaryResult = await CloudinaryService.uploadFromUrl({
          url: validatedData.url,
          assetType: validatedData.assetType,
          fileName: `${validatedData.assetType}_${Date.now()}`,
          folder: `users/${userId}/assets`,
          tags: [
            validatedData.assetType,
            validatedData.sourceSystem,
            validatedData.channel || 'social_media',
            'generated',
            ...(validatedData.tags || [])
          ]
        });
        
        cloudinaryUrl = cloudinaryResult.secure_url;
        cloudinaryPublicId = cloudinaryResult.public_id;
        
        console.log('Asset uploaded to Cloudinary successfully:', cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed, using original URL:', cloudinaryError);
        // Continue with original URL if Cloudinary fails
      }
    }
    
    // Duplicate check - same final URL and user within last 5 minutes
    const existingAsset = await prisma.generatedAsset.findFirst({
      where: {
        url: cloudinaryUrl, // Check the final URL (Cloudinary or original)
        profileId: userId,
        createdAt: {
          gte: new Date(Date.now() - 300000) // 5 minutes
        }
      }
    });
    
    if (existingAsset) {
      return res.status(200).json({
        success: true,
        data: existingAsset,
        message: 'Asset already exists'
      });
    }
    
    // Create asset with Cloudinary URL if available
    const asset = await prisma.generatedAsset.create({
      data: {
        ...validatedData,
        url: cloudinaryUrl, // Use Cloudinary URL if available
        profileId: userId,
        channel: validatedData.channel || 'social_media',
        format: validatedData.format || 'mp4',
        // Store Cloudinary public ID for future reference
        ...(cloudinaryPublicId && { 
          description: `${validatedData.description || ''}\n\nCloudinary ID: ${cloudinaryPublicId}`.trim()
        })
      },
      include: getAssetIncludeOptions()
    });

    return res.status(201).json({
      success: true,
      data: asset,
      message: 'Asset created successfully',
      cloudinary: cloudinaryPublicId ? { publicId: cloudinaryPublicId } : null
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

// Initiate asset generation (hybrid architecture)
router.post('/initiate-generation', authenticateToken, async (req, res, next) => {
  try {
    const validatedData = initiateGenerationSchema.parse(req.body);
    const userId = (req as any).user?.userId || (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User ID not found in request'
      });
    }
    
    // Create asset with 'generating' status
    const asset = await prisma.generatedAsset.create({
      data: {
        profileId: userId,
        assetType: validatedData.assetType,
        sourceSystem: validatedData.sourceSystem,
        instruction: validatedData.instruction,
        channel: validatedData.channel || 'social_media',
        format: validatedData.format || (validatedData.assetType === 'image' ? 'png' : 'mp4'),
        url: '', // Empty initially
        status: AssetStatus._GENERATING,
        title: validatedData.title || `Generated ${validatedData.assetType}`,
        description: validatedData.description,
        tags: validatedData.tags || [],
        approved: false, // User needs to approve
        inventoryId: validatedData.inventoryId,
      },
      include: getAssetIncludeOptions()
    });

    return res.status(201).json({
      success: true,
      data: asset,
      message: 'Asset generation initiated'
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

// Update asset status during generation
router.patch('/:id/status', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateAssetStatusSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Verify the asset belongs to the user
    const existingAsset = await prisma.generatedAsset.findFirst({
      where: {
        id,
        profileId: userId
      }
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found or access denied'
      });
    }

    // Update the asset status
    const updateData: any = {
      status: validatedData.status
    };

    if (validatedData.url) {
      updateData.url = validatedData.url;
    }

    if (validatedData.error) {
      updateData.instruction = `${existingAsset.instruction}\n\nError: ${validatedData.error}`;
    }

    const updatedAsset = await prisma.generatedAsset.update({
      where: { id },
      data: updateData,
      include: getAssetIncludeOptions()
    });

    return res.json({
      success: true,
      data: updatedAsset,
      message: `Asset status updated to ${validatedData.status}`
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

// Approve or reject generated asset
router.patch('/:id/approve', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = approveAssetSchema.parse(req.body);
    const userId = (req as any).user.userId;

    // Verify the asset belongs to the user
    const existingAsset = await prisma.generatedAsset.findFirst({
      where: {
        id,
        profileId: userId
      }
    });

    if (!existingAsset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found or access denied'
      });
    }
    
    // Update the asset approval status
    const updateData: any = {
      approved: validatedData.approved,
      status: validatedData.approved ? AssetStatus._APPROVED : AssetStatus._REJECTED
    };

    if (validatedData.title) {
      updateData.title = validatedData.title;
    }

    if (validatedData.description) {
      updateData.description = validatedData.description;
    }

    if (validatedData.tags) {
      updateData.tags = validatedData.tags;
    }

    const updatedAsset = await prisma.generatedAsset.update({
      where: { id },
      data: updateData,
      include: getAssetIncludeOptions()
    });

    return res.json({
      success: true,
      data: updatedAsset,
      message: `Asset ${validatedData.approved ? 'approved' : 'rejected'} successfully`
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

// Get assets by status (for tracking generation progress)
router.get('/status/:status', authenticateToken, async (req, res, next) => {
  try {
    const { status } = req.params;
    const userId = (req as any).user.userId;
    
    const assets = await prisma.generatedAsset.findMany({
      where: {
        profileId: userId,
        status: status
      },
      orderBy: { createdAt: 'desc' },
      include: getAssetIncludeOptions()
    });

    const transformedAssets = assets.map(transformAssetForFrontend);

    return res.json({
      success: true,
      data: transformedAssets,
      count: transformedAssets.length
    });
  } catch (error) {
    return next(error);
  }
});

// Cleanup unapproved assets (admin endpoint)
router.delete('/cleanup', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    const { hours = 24 } = req.query;
    
    const cutoffTime = new Date(Date.now() - parseInt(hours as string) * 60 * 60 * 1000);
    
    const result = await prisma.generatedAsset.deleteMany({
      where: {
        profileId: userId,
        approved: false,
        createdAt: {
          lt: cutoffTime
        }
      }
    });

    return res.json({
      success: true,
      message: `${result.count} unapproved assets cleaned up`,
      count: result.count
    });
  } catch (error) {
    return next(error);
  }
});

// Toggle favorite status
router.patch('/:id/favorite', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;
    
    const currentAsset = await prisma.generatedAsset.findFirst({
      where: {
        id,
        profileId: userId
      }
    });

    if (!currentAsset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found or access denied'
      });
    }

    const asset = await prisma.generatedAsset.update({
      where: { id },
      data: { favorited: !currentAsset.favorited },
      include: getAssetIncludeOptions()
    });

    return res.json({
      success: true,
      data: asset,
      message: `Asset ${asset.favorited ? 'favorited' : 'unfavorited'} successfully`
    });
  } catch (error) {
    return next(error);
  }
});

// Get asset statistics (user-specific)
router.get('/stats/overview', authenticateToken, async (req, res, next) => {
  try {
    const userId = (req as any).user.userId;
    
    // Define types for groupBy results
    type AssetTypeGroup = {
      assetType: string;
      _count: {
        assetType: number;
      };
    };
    
    type AssetSourceGroup = {
      sourceSystem: string;
      _count: {
        sourceSystem: number;
      };
    };
    
    const [
      totalAssets,
      favoritedAssets,
      assetsByType,
      assetsBySource
    ] = await Promise.all([
      prisma.generatedAsset.count({ where: { profileId: userId } }),
      prisma.generatedAsset.count({ where: { profileId: userId, favorited: true } }),
      prisma.generatedAsset.groupBy({
        by: ['assetType'],
        where: { profileId: userId },
        _count: { assetType: true }
      }),
      prisma.generatedAsset.groupBy({
        by: ['sourceSystem'],
        where: { profileId: userId },
        _count: { sourceSystem: true }
      })
    ]);

    return res.json({
      success: true,
      data: {
        totalAssets,
        favoritedAssets,
        assetsByType: (assetsByType as AssetTypeGroup[]).map((item) => ({
          type: item.assetType,
          count: item._count.assetType
        })),
        assetsBySource: (assetsBySource as AssetSourceGroup[]).map((item) => ({
          source: item.sourceSystem,
          count: item._count.sourceSystem
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
});

// Delete asset (with Cloudinary cleanup)
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Find the asset and verify ownership
    const asset = await prisma.generatedAsset.findFirst({
      where: {
        id,
        profileId: userId
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found or access denied'
      });
    }

    // Extract Cloudinary public ID from description if available
    let cloudinaryPublicId = null;
    if (asset.description && asset.description.includes('Cloudinary ID:')) {
      const match = asset.description.match(/Cloudinary ID: ([^\s\n]+)/);
      if (match) {
        cloudinaryPublicId = match[1];
      }
    }

    // Delete from Cloudinary if we have the public ID
    if (cloudinaryPublicId && process.env.CLOUDINARY_CLOUD_NAME) {
      try {
        await CloudinaryService.deleteAsset(cloudinaryPublicId, asset.assetType === 'video' ? 'video' : 'image');
        console.log('Asset deleted from Cloudinary:', cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.error('Failed to delete from Cloudinary:', cloudinaryError);
        // Continue with database deletion even if Cloudinary fails
      }
    }

    // Delete from database
    await prisma.generatedAsset.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Asset deleted successfully',
      cloudinary: cloudinaryPublicId ? { deleted: true, publicId: cloudinaryPublicId } : null
    });
  } catch (error) {
    return next(error);
  }
});

export default router; 