import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

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
router.get('/', async (req, res, next) => {
  try {
    const { page = '1', limit = '10', search, category, status } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

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

    const [inventory, total] = await Promise.all([
      prisma.inventory.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.inventory.count({ where })
    ]);

    res.json({
      success: true,
      data: inventory,
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

// Get single inventory item
router.get('/:id', async (req, res, next) => {
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

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
});

// Create new inventory item
router.post('/', async (req, res, next) => {
  try {
    const validatedData = createInventorySchema.parse(req.body);
    
    const inventory = await prisma.inventory.create({
      data: validatedData
    });

    res.status(201).json({
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
    next(error);
  }
});

// Update inventory item
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const validatedData = updateInventorySchema.parse(req.body);
    
    const inventory = await prisma.inventory.update({
      where: { id },
      data: validatedData
    });

    res.json({
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
    next(error);
  }
});

// Delete inventory item
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.inventory.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Inventory item deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// Bulk operations
router.post('/bulk', async (req, res, next) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: 'Items must be an array'
      });
    }

    const validatedItems = items.map(item => createInventorySchema.parse(item));
    
    const createdItems = await prisma.inventory.createMany({
      data: validatedItems
    });

    res.status(201).json({
      success: true,
      data: { count: createdItems.count },
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
    next(error);
  }
});

export default router; 