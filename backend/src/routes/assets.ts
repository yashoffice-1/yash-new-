import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

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

const updateAssetSchema = createAssetSchema.partial();

// Get all assets with pagination and filtering
router.get('/', async (req, res, next) => {
  try {
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

    const where: any = {};
    
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
        include: {
          profile: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true
            }
          },
          templateAccess: true
        }
      }),
      prisma.generatedAsset.count({ where })
    ]);

    // Transform the data to match frontend expectations
    const transformedAssets = assets.map(asset => ({
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
    }));

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
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const asset = await prisma.generatedAsset.findUnique({
      where: { id },
      include: {
        profile: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        templateAccess: true
      }
    });

    if (!asset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    // Transform the data to match frontend expectations
    const transformedAsset = {
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
    };

    return res.json({
      success: true,
      data: transformedAsset
    });
  } catch (error) {
    return next(error);
  }
});

// Create new asset
router.post('/', async (req, res, next) => {
  try {
    const validatedData = createAssetSchema.parse(req.body);
    
    // Filter out undefined optional fields and provide defaults for required fields
    const { channel, format, inventoryId, description, tags, ...requiredData } = validatedData;
    const createData = {
      ...requiredData,
      channel: channel || 'social_media', // Default channel
      format: format || 'mp4', // Default format
      ...(inventoryId && { inventoryId }),
      ...(description && { description }),
      ...(tags && { tags })
    };
    
    const asset = await prisma.generatedAsset.create({
      data: createData,
      include: {
        profile: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        templateAccess: true
      }
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
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateAssetSchema.parse(req.body);
    
    const asset = await prisma.generatedAsset.update({
      where: { id },
      data: validatedData,
      include: {
        profile: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        templateAccess: true
      }
    });

    return res.json({
      success: true,
      data: asset,
      message: 'Asset updated successfully'
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

// Delete asset
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
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
router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const currentAsset = await prisma.generatedAsset.findUnique({
      where: { id }
    });

    if (!currentAsset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    const asset = await prisma.generatedAsset.update({
      where: { id },
      data: { favorited: !currentAsset.favorited },
      include: {
        profile: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        },
        templateAccess: true
      }
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

// Get asset statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const [
      totalAssets,
      favoritedAssets,
      assetsByType,
      assetsBySource
    ] = await Promise.all([
      prisma.generatedAsset.count(),
      prisma.generatedAsset.count({ where: { favorited: true } }),
      prisma.generatedAsset.groupBy({
        by: ['assetType'],
        _count: { assetType: true }
      }),
      prisma.generatedAsset.groupBy({
        by: ['sourceSystem'],
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