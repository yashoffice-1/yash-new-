import express from 'express';
import { z } from 'zod';
import { prisma } from '../index';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { templateService } from '../services/template-service';
import axios from 'axios';

const router = express.Router();

// Validation schemas
const assignTemplateSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  templateId: z.string().min(1, 'Template ID is required'),
  templateName: z.string().min(1, 'Template name is required'),
  templateDescription: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  category: z.string().optional(),
  aspectRatio: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'image', 'number']),
    required: z.boolean().default(true),
    defaultValue: z.string().optional(),
    charLimit: z.number().optional(),
    customCharLimit: z.number().optional()
  })).optional(),
  expiresAt: z.string().datetime().optional()
});

const updateTemplateSchema = z.object({
  templateName: z.string().optional(),
  templateDescription: z.string().optional(),
  thumbnailUrl: z.string().url().optional(),
  category: z.string().optional(),
  aspectRatio: z.string().optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(['text', 'image', 'number']),
    required: z.boolean().default(true),
    defaultValue: z.string().optional(),
    charLimit: z.number().optional(),
    customCharLimit: z.number().optional()
  })).optional(),
  canUse: z.boolean().optional(),
  expiresAt: z.string().datetime().optional()
});

// GET /api/templates - Get user's assigned templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const templates = await templateService.getUserTemplates(userId);
    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching user templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
});

// GET /api/templates/client/default/templates - Get user's default templates (client endpoint)
router.get('/client/default/templates', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const templates = await templateService.getUserTemplates(userId);

    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching user default templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch default templates'
    });
  }
});

// GET /api/templates/heygen/list - Fetch HeyGen templates (admin only)
router.get('/heygen/list', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    if (!heygenApiKey) {
      return res.status(500).json({
        success: false,
        error: 'HeyGen API key not configured'
      });
    }

    // Fetch templates from HeyGen API
    const response = await axios.get('https://api.heygen.com/v2/templates', {
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json'
      }
    });

    const templates = response.data.data?.templates || [];

    return res.json({
      success: true,
      data: {
        source: 'heygen',
        templates,
        total: templates.length
      }
    });
  } catch (error) {
    console.error('Error fetching HeyGen templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch HeyGen templates'
    });
  }
});

// GET /api/templates/admin/all-available - Get all available templates from all sources (admin only)
router.get('/admin/all-available', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    let allTemplates: any[] = [];

    // Fetch HeyGen templates
    if (heygenApiKey) {
      try {
        const heygenResponse = await axios.get('https://api.heygen.com/v2/templates', {
          headers: {
            'X-Api-Key': heygenApiKey,
            'Content-Type': 'application/json'
          }
        });

        const heygenTemplates = (heygenResponse.data.data?.templates || []).map((template: any) => ({
          ...template,
          source: 'heygen'
        }));

        allTemplates = [...allTemplates, ...heygenTemplates];
      } catch (error) {
        console.error('Error fetching HeyGen templates:', error);
      }
    }

    // TODO: Add Runway templates when API is available
    // const runwayTemplates = await fetchRunwayTemplates();
    // allTemplates = [...allTemplates, ...runwayTemplates];

    return res.json({
      success: true,
      data: {
        templates: allTemplates,
        total: allTemplates.length,
        sources: ['heygen'] // Add 'runway' when available
      }
    });
  } catch (error) {
    console.error('Error fetching all available templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch all available templates'
    });
  }
});

// GET /api/templates/admin/fetch-external - Fetch templates from external APIs (admin only)
router.get('/admin/fetch-external', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { source } = req.query; // 'heygen' or 'runway'

    if (!source || (source !== 'heygen' && source !== 'runway')) {
      return res.status(400).json({
        success: false,
        error: 'Source must be "heygen" or "runway"'
      });
    }

    let templates = [];

    if (source === 'heygen') {
      const heygenApiKey = process.env.HEYGEN_API_KEY;
      if (!heygenApiKey) {
        return res.status(500).json({
          success: false,
          error: 'HeyGen API key not configured'
        });
      }

      // Fetch templates from HeyGen API
      const response = await axios.get('https://api.heygen.com/v2/templates', {
        headers: {
          'X-Api-Key': heygenApiKey,
          'Content-Type': 'application/json'
        }
      });

      templates = response.data.data?.templates || [];
    }

    return res.json({
      success: true,
      data: {
        source,
        templates,
        total: templates.length
      }
    });
  } catch (error) {
    console.error('Error fetching external templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch external templates'
    });
  }
});

// POST /api/templates/admin/assign - Assign template to user (admin only)
router.post('/admin/assign', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = assignTemplateSchema.parse(req.body);

    // Validate custom character limits don't exceed HeyGen limits
    if (data.variables) {
      for (const variable of data.variables) {
        if (variable.customCharLimit && variable.charLimit && variable.customCharLimit > variable.charLimit) {
          return res.status(400).json({
            success: false,
            error: `Custom character limit (${variable.customCharLimit}) cannot exceed HeyGen limit (${variable.charLimit}) for variable '${variable.name}'`
          });
        }
      }
    }

    // Convert expiresAt string to Date if provided
    const templateData = {
      userId: data.userId,
      sourceSystem: 'heygen', // Default to heygen for now
      externalId: data.templateId,
      templateName: data.templateName,
      templateDescription: data.templateDescription,
      thumbnailUrl: data.thumbnailUrl,
      category: data.category,
      aspectRatio: data.aspectRatio,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
    };

    const template = await templateService.grantTemplateAccess(templateData);

    // Store template variables if provided
    if (data.variables !== undefined) {
      // Always delete existing variables first (whether we're adding new ones or not)
      await prisma.templateVariable.deleteMany({
        where: { templateAccessId: template.id }
      });

      // Only create new variables if the array is not empty
      if (data.variables.length > 0) {
        await prisma.templateVariable.createMany({
          data: data.variables.map(variable => ({
            templateAccessId: template.id,
            name: variable.name,
            type: variable.type,
            required: variable.required,
            defaultValue: variable.defaultValue,
            charLimit: variable.customCharLimit || variable.charLimit // Use custom limit if provided (validated to not exceed HeyGen limit), otherwise use HeyGen limit
          }))
        });
      }
    }

    return res.status(201).json({
      success: true,
      data: template,
      message: 'Template assigned successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Error assigning template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to assign template'
    });
  }
});

// GET /api/templates/:id/variables - Get template variables
router.get('/:id/variables', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.userId;

    // Check if user has access to this template
    const template = await templateService.getTemplateAccess(id);
    if (!template || template.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Get template variables
    const variables = await prisma.templateVariable.findMany({
      where: { templateAccessId: id },
      orderBy: { name: 'asc' }
    });

    return res.json({
      success: true,
      data: variables
    });
  } catch (error) {
    console.error('Error fetching template variables:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch template variables'
    });
  }
});

// PUT /api/templates/:id - Update template (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateTemplateSchema.parse(req.body);

    // Convert expiresAt string to Date if provided
    const { variables, ...updateData } = data;
    const finalUpdateData = {
      ...updateData,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined
    };

    const updatedTemplate = await prisma.userTemplateAccess.update({
      where: { id },
      data: finalUpdateData
    });

    // Update variables if provided
    if (variables) {
      // Delete existing variables
      await prisma.templateVariable.deleteMany({
        where: { templateAccessId: id }
      });

      // Create new variables
      if (variables.length > 0) {
        await prisma.templateVariable.createMany({
          data: variables.map(variable => ({
            templateAccessId: id,
            name: variable.name,
            type: variable.type,
            required: variable.required,
            defaultValue: variable.defaultValue
          }))
        });
      }
    }

    return res.json({
      success: true,
      data: updatedTemplate,
      message: 'Template updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors
      });
    }

    console.error('Error updating template:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update template'
    });
  }
});

// DELETE /api/templates/:id - Revoke template access (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Get template to get user and template info
    const template = await templateService.getTemplateAccess(id);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    await templateService.revokeTemplateAccess(template.userId, template.sourceSystem, template.externalId);

    return res.json({
      success: true,
      message: 'Template access revoked successfully'
    });
  } catch (error) {
    console.error('Error revoking template access:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to revoke template access'
    });
  }
});

// GET /api/templates/admin/all - Get all template assignments (admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await prisma.userTemplateAccess.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        variables: {
          orderBy: { name: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    console.error('Error fetching all templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch all templates'
    });
  }
});

// GET /api/templates/heygen/variables/:templateId - Fetch variables for a HeyGen template (admin only)
router.get('/heygen/variables/:templateId', authenticateToken, requireAdmin, async (req, res) => {
  const { templateId } = req.params;
  try {
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    if (!heygenApiKey) {
      return res.status(500).json({
        success: false,
        error: 'HeyGen API key not configured'
      });
    }

    const response = await axios.get(`https://api.heygen.com/v2/template/${templateId}`, {
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json'
      }
    });

    const templateData = response.data?.data;
    const rawVariables = templateData?.variables || {};
    console.log("Response ->", response.data.data.variables);
    // Get system default character limit from settings
    const systemSettings = await prisma.systemSettings.findUnique({
      where: { key: 'default_char_limit' }
    });
    const defaultCharLimit = systemSettings ? parseInt(systemSettings.value) : 500;

    // Transform HeyGen variables to our format with character limits
    const processedVariables = Object.entries(rawVariables).map(([name, variable]: [string, any]) => {
      const baseVariable = {
        name,
        type: variable.type || 'text',
        required: variable.required !== false, // Default to true unless explicitly false
        defaultValue: variable.default_value || undefined
      };

      // Add character limit for text variables
      if (variable.type === 'text' || variable.type === 'string') {
        return {
          ...baseVariable,
          charLimit: variable.max_length || variable.char_limit || defaultCharLimit, // Use HeyGen limit or system default
          customCharLimit: undefined // Allow admin to set custom limit
        };
      }

      return baseVariable;
    });

    return res.json({
      success: true,
      data: {
        templateId,
        templateName: templateData?.name || 'Unknown Template',
        templateDescription: templateData?.description || '',
        thumbnailUrl: templateData?.thumbnail_url || templateData?.cover_url || '',
        category: templateData?.category || '',
        aspectRatio: templateData?.aspect_ratio || '',
        variables: processedVariables,
        systemDefaultCharLimit: defaultCharLimit
      }
    });
  } catch (error) {
    console.error('Error fetching HeyGen variables:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch variables' });
  }
});

// POST /api/templates/admin/cleanup-expired - Clean up expired templates (admin only)
router.post('/admin/cleanup-expired', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cleanedCount = await templateService.cleanupExpiredTemplates();
    return res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired templates`,
      cleanedCount
    });
  } catch (error) {
    console.error('Error cleaning up expired templates:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to clean up expired templates'
    });
  }
});

export default router; 