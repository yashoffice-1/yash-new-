import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Validation schemas
const createInventorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  sku: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  metadata: z.record(z.any()).optional(),
  status: z.enum(['active', 'inactive', 'draft']).default('active')
});

const updateInventorySchema = createInventorySchema.partial();

// Get all inventory items
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const { page = '1', limit = '10', search, category, status, all } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = limit === 'all' ? undefined : parseInt(limit as string);
    const skip = limitNum ? (pageNum - 1) * limitNum : 0;

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { sku: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (category) {
      where.category = category;
    }
    
    if (status) {
      where.status = status;
    }

    // If 'all' parameter is provided or limit is 'all', fetch all products without pagination
    if (all === 'true' || limit === 'all') {
      const inventory = await prisma.inventory.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      return res.json({
        success: true,
        data: inventory,
        total: inventory.length
      });
    } else {
      const [inventory, total] = await Promise.all([
        prisma.inventory.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.inventory.count({ where })
      ]);

      return res.json({
        success: true,
        data: inventory,
        pagination: {
          page: pageNum,
          limit: limitNum || 0,
          total,
          pages: limitNum ? Math.ceil(total / limitNum) : 1
        }
      });
    }
  } catch (error) {
    return next(error);
  }
});

// Get unique categories from active products only
router.get('/categories', authenticateToken, async (req, res, next) => {
  try {
    // Define type for the category result
    type CategoryResult = {
      category: string | null;
    };

    const categories = await prisma.inventory.findMany({
      where: {
        status: 'active'
      },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    });

    const uniqueCategories = (categories as CategoryResult[])
      .map((item) => item.category)
      .filter(Boolean)
      .filter((category, index, arr) => arr.indexOf(category) === index);

    return res.json({
      success: true,
      data: uniqueCategories
    });
  } catch (error) {
    return next(error);
  }
});

// Get single inventory item
router.get('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const inventory = await prisma.inventory.findUnique({
      where: { id }
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: 'Inventory item not found'
      });
    }

    return res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    return next(error);
  }
});

// Create new inventory item
router.post('/', authenticateToken, async (req, res, next) => {
  try {
    const validatedData = createInventorySchema.parse(req.body);
    
    const inventory = await prisma.inventory.create({
      data: validatedData
    });

    return res.status(201).json({
      success: true,
      data: inventory,
      message: 'Inventory item created successfully'
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

// Update inventory item
router.put('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateInventorySchema.parse(req.body);
    
    const inventory = await prisma.inventory.update({
      where: { id },
      data: validatedData
    });

    return res.json({
      success: true,
      data: inventory,
      message: 'Inventory item updated successfully'
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

// Delete inventory item
router.delete('/:id', authenticateToken, async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.inventory.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
});

// Bulk create inventory items
router.post('/bulk', authenticateToken, async (req, res, next) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      });
    }

    const validatedItems = items.map((item: any) => createInventorySchema.parse(item));
    
    const createdItems = await prisma.inventory.createMany({
      data: validatedItems
    });

    return res.status(201).json({
      success: true,
      data: {
        count: createdItems.count
      },
      message: `${createdItems.count} inventory items created successfully`
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

export default router; 