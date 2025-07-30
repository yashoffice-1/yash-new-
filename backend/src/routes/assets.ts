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
  assetUrl: z.string().url('Valid URL is required'),
  gifUrl: z.string().url().optional(),
  content: z.string().optional(),
  instruction: z.string().min(1, 'Instruction is required'),
  sourceSystem: z.enum(['openai', 'runway', 'heygen']),
  favorited: z.boolean().default(false),
  originalAssetId: z.string().optional()
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
        { content: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (tags) {
      const tagArray = (tags as string).split(',').map(tag => tag.trim());
      where.tags = { hasSome: tagArray };
    }

    const [assets, total] = await Promise.all([
      prisma.assetLibrary.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          originalAsset: true
        }
      }),
      prisma.assetLibrary.count({ where })
    ]);

    // Transform the data to match frontend expectations
    const transformedAssets = assets.map(asset => ({
      id: asset.id,
      title: asset.title,
      description: asset.description,
      tags: asset.tags,
      asset_type: asset.assetType,
      asset_url: asset.assetUrl,
      gif_url: asset.gifUrl,
      content: asset.content,
      instruction: asset.instruction,
      source_system: asset.sourceSystem,
      favorited: asset.favorited,
      created_at: asset.createdAt.toISOString(),
      updated_at: asset.updatedAt.toISOString(),
      original_asset_id: asset.originalAssetId,
      originalAsset: asset.originalAsset
    }));

    res.json({
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
    next(error);
  }
});

// Get single asset
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const asset = await prisma.assetLibrary.findUnique({
      where: { id },
      include: {
        originalAsset: true
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
      asset_url: asset.assetUrl,
      gif_url: asset.gifUrl,
      content: asset.content,
      instruction: asset.instruction,
      source_system: asset.sourceSystem,
      favorited: asset.favorited,
      created_at: asset.createdAt.toISOString(),
      updated_at: asset.updatedAt.toISOString(),
      original_asset_id: asset.originalAssetId,
      originalAsset: asset.originalAsset
    };

    res.json({
      success: true,
      data: transformedAsset
    });
  } catch (error) {
    next(error);
  }
});

// Create new asset
router.post('/', async (req, res, next) => {
  try {
    const validatedData = createAssetSchema.parse(req.body);
    
    const asset = await prisma.assetLibrary.create({
      data: validatedData,
      include: {
        originalAsset: true
      }
    });

    res.status(201).json({
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
    next(error);
  }
});

// Update asset
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateAssetSchema.parse(req.body);
    
    const asset = await prisma.assetLibrary.update({
      where: { id },
      data: validatedData,
      include: {
        originalAsset: true
      }
    });

    res.json({
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
    next(error);
  }
});

// Delete asset
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.assetLibrary.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Asset deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Toggle favorite status
router.patch('/:id/favorite', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const currentAsset = await prisma.assetLibrary.findUnique({
      where: { id }
    });

    if (!currentAsset) {
      return res.status(404).json({
        success: false,
        error: 'Asset not found'
      });
    }

    const asset = await prisma.assetLibrary.update({
      where: { id },
      data: { favorited: !currentAsset.favorited }
    });

    res.json({
      success: true,
      data: asset,
      message: `Asset ${asset.favorited ? 'favorited' : 'unfavorited'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

// Get generated assets
router.get('/generated/all', async (req, res, next) => {
  try {
    const { 
      page = '1', 
      limit = '10', 
      assetType, 
      sourceSystem, 
      channel,
      approved 
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
    
    if (channel) {
      where.channel = channel;
    }
    
    if (approved !== undefined) {
      where.approved = approved === 'true';
    }

    const [assets, total] = await Promise.all([
      prisma.generatedAsset.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.generatedAsset.count({ where })
    ]);

    res.json({
      success: true,
      data: assets,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create generated asset
router.post('/generated', async (req, res, next) => {
  try {
    const { 
      inventoryId, 
      channel, 
      format, 
      sourceSystem, 
      assetType, 
      url, 
      instruction, 
      approved = false 
    } = req.body;

    const asset = await prisma.generatedAsset.create({
      data: {
        inventoryId,
        channel,
        format,
        sourceSystem,
        assetType,
        url,
        instruction,
        approved
      }
    });

    res.status(201).json({
      success: true,
      data: asset,
      message: 'Generated asset created successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Update generated asset approval status
router.patch('/generated/:id/approve', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved } = req.body;
    
    const asset = await prisma.generatedAsset.update({
      where: { id },
      data: { approved }
    });

    res.json({
      success: true,
      data: asset,
      message: `Asset ${approved ? 'approved' : 'unapproved'} successfully`
    });
  } catch (error) {
    next(error);
  }
});

// Get asset statistics
router.get('/stats/overview', async (req, res, next) => {
  try {
    const [
      totalAssets,
      totalGenerated,
      favoritedCount,
      assetsByType,
      assetsBySource
    ] = await Promise.all([
      prisma.assetLibrary.count(),
      prisma.generatedAsset.count(),
      prisma.assetLibrary.count({ where: { favorited: true } }),
      prisma.assetLibrary.groupBy({
        by: ['assetType'],
        _count: { assetType: true }
      }),
      prisma.assetLibrary.groupBy({
        by: ['sourceSystem'],
        _count: { sourceSystem: true }
      })
    ]);

    res.json({
      success: true,
      data: {
        totalAssets,
        totalGenerated,
        favoritedCount,
        assetsByType,
        assetsBySource
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router; 