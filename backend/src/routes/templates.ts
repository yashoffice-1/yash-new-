import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createClientConfigSchema = z.object({
  clientId: z.string().min(1, 'Client ID is required'),
  clientName: z.string().min(1, 'Client name is required')
});

const assignTemplateSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  templateName: z.string().optional(),
  isActive: z.boolean().default(true)
});

// Get all client configurations
router.get('/clients', async (req, res, next) => {
  try {
    const clients = await prisma.clientConfig.findMany({
      include: {
        templateAssignments: true
      }
    });

    res.json({
      success: true,
      data: clients
    });
  } catch (error) {
    next(error);
  }
});

// Create client configuration
router.post('/clients', async (req, res, next) => {
  try {
    const validatedData = createClientConfigSchema.parse(req.body);
    
    const client = await prisma.clientConfig.create({
      data: validatedData,
      include: {
        templateAssignments: true
      }
    });

    res.status(201).json({
      success: true,
      data: client,
      message: 'Client configuration created successfully'
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

// Get template assignments for a client
router.get('/clients/:clientId/assignments', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    const client = await prisma.clientConfig.findUnique({
      where: { clientId },
      include: {
        templateAssignments: true
      }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    res.json({
      success: true,
      data: client.templateAssignments
    });
  } catch (error) {
    next(error);
  }
});

// Assign template to client
router.post('/clients/:clientId/assignments', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const validatedData = assignTemplateSchema.parse(req.body);
    
    const client = await prisma.clientConfig.findUnique({
      where: { clientId }
    });

    if (!client) {
      return res.status(404).json({
        success: false,
        error: 'Client not found'
      });
    }

    const assignment = await prisma.clientTemplateAssignment.create({
      data: {
        ...validatedData,
        clientConfigId: client.id
      }
    });

    res.status(201).json({
      success: true,
      data: assignment,
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
    next(error);
  }
});

// Get fallback variables for a template
router.get('/fallback-variables/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    
    const variables = await prisma.templateFallbackVariable.findMany({
      where: { templateId },
      orderBy: { variableOrder: 'asc' }
    });

    res.json({
      success: true,
      data: variables
    });
  } catch (error) {
    next(error);
  }
});

// Create fallback variables for a template
router.post('/fallback-variables', async (req, res, next) => {
  try {
    const { templateId, variables } = req.body;
    
    if (!Array.isArray(variables)) {
      return res.status(400).json({
        success: false,
        error: 'Variables must be an array'
      });
    }

    const createdVariables = await prisma.templateFallbackVariable.createMany({
      data: variables.map((variable: any, index: number) => ({
        templateId,
        variableName: variable.name,
        variableOrder: variable.order || index + 1
      }))
    });

    res.status(201).json({
      success: true,
      data: { count: createdVariables.count },
      message: `${createdVariables.count} variables created successfully`
    });
  } catch (error) {
    next(error);
  }
});

// Get available templates (hardcoded for now)
router.get('/available', async (req, res, next) => {
  try {
    const templates = [
      {
        id: 'bccf8cfb2b1e422dbc425755f1b7dc67',
        name: 'Product Showcase Template',
        description: 'Perfect for showcasing product features and benefits',
        category: 'product',
        variables: ['product_name', 'product_price', 'product_discount', 'category_name', 'feature_one', 'feature_two', 'feature_three', 'website_description', 'product_image']
      },
      {
        id: '3bb2bf2276754c0ea6b235db9409f508',
        name: 'Feature Highlight Template',
        description: 'Focus on key product features and benefits',
        category: 'feature',
        variables: ['product_name', 'main_feature', 'benefit_one', 'benefit_two', 'call_to_action', 'brand_name', 'product_image']
      },
      {
        id: '47a53273dcd0428bbe7bf960b8bf7f02',
        name: 'Brand Story Template',
        description: 'Tell your brand story and connect with customers',
        category: 'brand',
        variables: ['brand_name', 'product_name', 'brand_story', 'unique_value', 'customer_testimonial', 'product_image', 'website_url']
      },
      {
        id: 'aeec955f97a6476d88e4547adfeb3c97',
        name: 'Promotional Template',
        description: 'Perfect for sales and promotional campaigns',
        category: 'promotional',
        variables: ['product_name', 'product_price', 'discount_percent', 'brand_name', 'urgency_text', 'product_image', 'cta_text']
      }
    ];

    res.json({
      success: true,
      data: templates
    });
  } catch (error) {
    next(error);
  }
});

// Get template statistics
router.get('/stats', async (req, res, next) => {
  try {
    const [totalClients, totalAssignments, totalVariables] = await Promise.all([
      prisma.clientConfig.count(),
      prisma.clientTemplateAssignment.count(),
      prisma.templateFallbackVariable.count()
    ]);

    res.json({
      success: true,
      data: {
        totalClients,
        totalAssignments,
        totalVariables
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router; 