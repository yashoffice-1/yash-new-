import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createSettingSchema = z.object({
  key: z.string().min(1, 'Setting key is required'),
  value: z.string().min(1, 'Setting value is required'),
  description: z.string().optional(),
  category: z.enum(['general', 'security', 'upload', 'email', 'system']).default('general'),
  isPublic: z.boolean().default(false),
});

const updateSettingSchema = z.object({
  value: z.string().min(1, 'Setting value is required'),
  description: z.string().optional(),
  category: z.enum(['general', 'security', 'upload', 'email', 'system']).optional(),
  isPublic: z.boolean().optional(),
});

// GET /api/settings - Get all settings (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.systemSettings.findMany({
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    return res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

// GET /api/settings/public - Get public settings (any authenticated user)
router.get('/public', authenticateToken, async (req, res) => {
  try {
    const publicSettings = await prisma.systemSettings.findMany({
      where: {
        isPublic: true
      },
      orderBy: [
        { category: 'asc' },
        { key: 'asc' }
      ]
    });

    return res.json({
      success: true,
      data: publicSettings
    });
  } catch (error) {
    console.error('Error fetching public settings:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch public settings'
    });
  }
});

// GET /api/settings/:key - Get a specific setting by key
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const { key } = req.params;
    
    const setting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (!setting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    // Check if user can access this setting
    if (!setting.isPublic && (req as any).user.role !== 'admin' && (req as any).user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    return res.json({
      success: true,
      data: setting
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch setting'
    });
  }
});

// POST /api/settings - Create a new setting (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const validatedData = createSettingSchema.parse(req.body);

    // Check if setting already exists
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key: validatedData.key }
    });

    if (existingSetting) {
      return res.status(400).json({
        success: false,
        error: 'Setting with this key already exists'
      });
    }

    const newSetting = await prisma.systemSettings.create({
      data: validatedData
    });

    return res.status(201).json({
      success: true,
      data: newSetting
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Error creating setting:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create setting'
    });
  }
});

// PUT /api/settings/:key - Update a setting (admin only)
router.put('/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const validatedData = updateSettingSchema.parse(req.body);

    // Check if setting exists
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (!existingSetting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    const updatedSetting = await prisma.systemSettings.update({
      where: { key },
      data: validatedData
    });

    return res.json({
      success: true,
      data: updatedSetting
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Error updating setting:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update setting'
    });
  }
});

// DELETE /api/settings/:key - Delete a setting (admin only)
router.delete('/:key', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;

    // Check if setting exists
    const existingSetting = await prisma.systemSettings.findUnique({
      where: { key }
    });

    if (!existingSetting) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }

    await prisma.systemSettings.delete({
      where: { key }
    });

    return res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting setting:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete setting'
    });
  }
});

export default router; 