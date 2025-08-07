import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';

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
  profileId: z.string()
});

// const _updateAssetSchema = createAssetSchema.partial();

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
    const userId = (req as any).user.userId;
    
    // Filter out undefined optional fields and provide defaults for required fields
    const { channel, format, inventoryId, description, tags, ...requiredData } = validatedData;
    const createData = {
      ...requiredData,
      profileId: userId, // Ensure asset belongs to current user
      channel: channel || 'social_media',
      format: format || 'mp4',
      ...(inventoryId && { inventoryId }),
      ...(description && { description }),
      ...(tags && { tags })
    };
    
    const asset = await prisma.generatedAsset.create({
      data: createData,
      include: getAssetIncludeOptions()
    });

    return res.status(201).json({
      success: true,
      data: asset,
      message: 'Asset created successfully'
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

// Update asset
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, status } = req.body;
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

    // Update the asset
    const updatedAsset = await prisma.generatedAsset.update({
      where: { id },
      data: {
        url: url || existingAsset.url,
        status: status || existingAsset.status
      }
    });

    return res.json({
      success: true,
      data: updatedAsset,
      message: 'Asset updated successfully'
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update asset'
    });
  }
});

// Delete asset
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
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
    
    await prisma.generatedAsset.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Asset deleted successfully'
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
        assetsByType: assetsByType.map(item => ({
          type: item.assetType,
          count: item._count.assetType
        })),
        assetsBySource: assetsBySource.map(item => ({
          source: item.sourceSystem,
          count: item._count.sourceSystem
        }))
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router; 