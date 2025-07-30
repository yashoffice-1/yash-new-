import { Router } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import axios from 'axios';

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

// NEW: Get HeyGen templates list (calls external API and caches)
router.get('/heygen/list', async (req, res, next) => {
  try {
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    
    if (!heygenApiKey) {
      return res.status(500).json({
        success: false,
        error: 'HeyGen API key not configured'
      });
    }

    console.log('Fetching templates from HeyGen API');

    const response = await axios.get('https://api.heygen.com/v2/templates', {
      headers: {
        'accept': 'application/json',
        'x-api-key': heygenApiKey
      }
    });

    if (response.status !== 200) {
      throw new Error(`HeyGen API error: ${response.status} - ${response.statusText}`);
    }

    const templates = response.data.data?.templates || [];
    
    console.log('Successfully fetched templates from HeyGen:', {
      totalTemplates: templates.length,
      firstTemplate: templates[0]?.name || 'none'
    });
    console.log('First template structure:', JSON.stringify(templates[0], null, 2));

    res.json({
      success: true,
      data: {
        templates: templates,
        total: templates.length
      }
    });
  } catch (error) {
    console.error('Error fetching HeyGen templates:', error);
    next(error);
  }
});

// NEW: Get HeyGen template details (calls external API and caches)
router.get('/heygen/detail/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const heygenApiKey = process.env.HEYGEN_API_KEY;
    
    if (!heygenApiKey) {
      return res.status(500).json({
        success: false,
        error: 'HeyGen API key not configured'
      });
    }

    console.log(`Fetching template details for ID: ${templateId}`);

    const response = await axios.get(`https://api.heygen.com/v2/template/${templateId}`, {
      headers: {
        'accept': 'application/json',
        'x-api-key': heygenApiKey
      }
    });

    if (response.status !== 200) {
      throw new Error(`HeyGen API error: ${response.status} - ${response.statusText}`);
    }

    const templateData = response.data.data;
    
    console.log('Successfully fetched template details from HeyGen');
    console.log('Template data structure:', JSON.stringify(templateData, null, 2));

    res.json({
      success: true,
      data: templateData
    });
  } catch (error) {
    console.error('Error fetching HeyGen template details:', error);
    next(error);
  }
});

// NEW: Get template list (replaces external HeyGen API)
router.get('/list', async (req, res, next) => {
  try {
    // Get templates from our database with enhanced info
    const templates = await prisma.templateFallbackVariable.groupBy({
      by: ['templateId'],
      _count: {
        variableName: true
      }
    });

    // Enhanced template data with metadata
    const enhancedTemplates = templates.map(template => {
      const templateId = template.templateId;
      
      // Get template metadata from our hardcoded list
      const templateMetadata = getTemplateMetadata(templateId);
      
      return {
        template_id: templateId,
        name: templateMetadata.name,
        description: templateMetadata.description,
        thumbnail_image_url: templateMetadata.thumbnail,
        aspect_ratio: templateMetadata.aspectRatio,
        duration: templateMetadata.duration,
        category: templateMetadata.category,
        variable_count: template._count.variableName
      };
    });

    res.json({
      success: true,
      data: {
        templates: enhancedTemplates,
        total: enhancedTemplates.length
      }
    });
  } catch (error) {
    next(error);
  }
});

// NEW: Get template details (replaces external HeyGen API)
router.get('/detail/:templateId', async (req, res, next) => {
  try {
    const { templateId } = req.params;
    
    // Get template variables from database
    const variables = await prisma.templateFallbackVariable.findMany({
      where: { templateId },
      orderBy: { variableOrder: 'asc' },
      select: { variableName: true }
    });

    if (variables.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    // Get template metadata
    const templateMetadata = getTemplateMetadata(templateId);
    
    // Build variable types
    const variableTypes = variables.reduce((acc, variable) => {
      acc[variable.variableName] = {
        name: variable.variableName,
        type: variable.variableName.includes('image') ? 'image_url' : 
              variable.variableName.includes('url') ? 'url' : 'text',
        charLimit: variable.variableName.includes('image') || variable.variableName.includes('url') ? 500 : 100,
        required: true
      };
      return acc;
    }, {} as Record<string, any>);

    const templateDetail = {
      id: templateId,
      name: templateMetadata.name,
      description: templateMetadata.description,
      thumbnail: templateMetadata.thumbnail,
      category: templateMetadata.category,
      duration: templateMetadata.duration,
      aspectRatio: templateMetadata.aspectRatio,
      variables: variables.map(v => v.variableName),
      variableTypes: variableTypes
    };

    res.json({
      success: true,
      data: templateDetail
    });
  } catch (error) {
    next(error);
  }
});

// NEW: Get client templates with full details
router.get('/client/:clientId/templates', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    // Get client config
    let client = await prisma.clientConfig.findUnique({
      where: { clientId },
      include: {
        templateAssignments: {
          where: { isActive: true }
        }
      }
    });

    // If client doesn't exist, create it with default templates
    if (!client) {
      console.log(`Client ${clientId} not found, creating with default templates...`);
      
      // Create the client
      client = await prisma.clientConfig.create({
        data: {
          clientId,
          clientName: clientId === 'default' ? 'Default Client' : `Client ${clientId}`
        },
        include: {
          templateAssignments: {
            where: { isActive: true }
          }
        }
      });

      // Initialize default templates
      const defaultTemplates = [
        {
          templateId: 'bccf8cfb2b1e422dbc425755f1b7dc67',
          templateName: 'Product Showcase Template'
        },
        {
          templateId: '3bb2bf2276754c0ea6b235db9409f508',
          templateName: 'Feature Highlight Template'
        },
        {
          templateId: '47a53273dcd0428bbe7bf960b8bf7f02',
          templateName: 'Brand Story Template'
        },
        {
          templateId: 'aeec955f97a6476d88e4547adfeb3c97',
          templateName: 'Promotional Template'
        }
      ];

      // Create template assignments
      await Promise.all(
        defaultTemplates.map(template => 
          prisma.clientTemplateAssignment.create({
            data: {
              clientConfigId: client!.id,
              templateId: template.templateId,
              templateName: template.templateName,
              isActive: true
            }
          })
        )
      );

      // Create fallback variables for each template
      const fallbackVariables = [
        // Product Showcase Template
        { templateId: 'bccf8cfb2b1e422dbc425755f1b7dc67', variables: ['product_name', 'main_feature', 'benefit_one', 'benefit_two', 'call_to_action', 'brand_name', 'product_image'] },
        // Feature Highlight Template  
        { templateId: '3bb2bf2276754c0ea6b235db9409f508', variables: ['product_name', 'main_feature', 'benefit_one', 'benefit_two', 'call_to_action', 'brand_name', 'product_image'] },
        // Brand Story Template
        { templateId: '47a53273dcd0428bbe7bf960b8bf7f02', variables: ['brand_name', 'product_name', 'brand_story', 'unique_value', 'customer_testimonial', 'product_image', 'website_url'] },
        // Promotional Template
        { templateId: 'aeec955f97a6476d88e4547adfeb3c97', variables: ['product_name', 'product_price', 'discount_percent', 'brand_name', 'urgency_text', 'product_image', 'cta_text'] }
      ];

      // Create fallback variables
      await Promise.all(
        fallbackVariables.flatMap(template => 
          template.variables.map((variable, index) => 
            prisma.templateFallbackVariable.create({
              data: {
                templateId: template.templateId,
                variableName: variable,
                variableOrder: index
              }
            })
          )
        )
      );

      // Refresh client data after creating templates
      client = await prisma.clientConfig.findUnique({
        where: { clientId },
        include: {
          templateAssignments: {
            where: { isActive: true }
          }
        }
      });
    }

    // Get template details for each assigned template
    const templateDetails = await Promise.all(
      client.templateAssignments.map(async (assignment) => {
        const variables = await prisma.templateFallbackVariable.findMany({
          where: { templateId: assignment.templateId },
          orderBy: { variableOrder: 'asc' },
          select: { variableName: true }
        });

        const templateMetadata = getTemplateMetadata(assignment.templateId);
        
        return {
          id: assignment.templateId,
          name: templateMetadata.name,
          description: templateMetadata.description,
          thumbnail: templateMetadata.thumbnail,
          category: templateMetadata.category,
          duration: templateMetadata.duration,
          aspectRatio: templateMetadata.aspectRatio,
          variables: variables.map(v => v.variableName),
          status: 'active' as const
        };
      })
    );

    res.json({
      success: true,
      data: templateDetails
    });
  } catch (error) {
    next(error);
  }
});

// Initialize default templates for a client if none exist
router.post('/client/:clientId/initialize', async (req, res, next) => {
  try {
    const { clientId } = req.params;
    
    // Check if client exists
    let client = await prisma.clientConfig.findUnique({
      where: { clientId },
      include: {
        templateAssignments: true
      }
    });

    // Create client if it doesn't exist
    if (!client) {
      client = await prisma.clientConfig.create({
        data: {
          clientId,
          clientName: clientId === 'default' ? 'Default Client' : `Client ${clientId}`
        },
        include: {
          templateAssignments: true
        }
      });
    }

    // If client already has templates, return existing ones
    if (client.templateAssignments.length > 0) {
      return res.json({
        success: true,
        data: client.templateAssignments,
        message: 'Client already has templates configured'
      });
    }

    // Define default templates
    const defaultTemplates = [
      {
        templateId: 'bccf8cfb2b1e422dbc425755f1b7dc67',
        templateName: 'Product Showcase Template'
      },
      {
        templateId: '3bb2bf2276754c0ea6b235db9409f508',
        templateName: 'Feature Highlight Template'
      },
      {
        templateId: '47a53273dcd0428bbe7bf960b8bf7f02',
        templateName: 'Brand Story Template'
      },
      {
        templateId: 'aeec955f97a6476d88e4547adfeb3c97',
        templateName: 'Promotional Template'
      }
    ];

    // Create template assignments
    const templateAssignments = await Promise.all(
      defaultTemplates.map(template => 
        prisma.clientTemplateAssignment.create({
          data: {
            clientConfigId: client!.id,
            templateId: template.templateId,
            templateName: template.templateName,
            isActive: true
          }
        })
      )
    );

    // Create fallback variables for each template
    const fallbackVariables = [
      // Product Showcase Template
      { templateId: 'bccf8cfb2b1e422dbc425755f1b7dc67', variables: ['product_name', 'main_feature', 'benefit_one', 'benefit_two', 'call_to_action', 'brand_name', 'product_image'] },
      // Feature Highlight Template  
      { templateId: '3bb2bf2276754c0ea6b235db9409f508', variables: ['product_name', 'main_feature', 'benefit_one', 'benefit_two', 'call_to_action', 'brand_name', 'product_image'] },
      // Brand Story Template
      { templateId: '47a53273dcd0428bbe7bf960b8bf7f02', variables: ['brand_name', 'product_name', 'brand_story', 'unique_value', 'customer_testimonial', 'product_image', 'website_url'] },
      // Promotional Template
      { templateId: 'aeec955f97a6476d88e4547adfeb3c97', variables: ['product_name', 'product_price', 'discount_percent', 'brand_name', 'urgency_text', 'product_image', 'cta_text'] }
    ];

    // Create fallback variables
    await Promise.all(
      fallbackVariables.flatMap(template => 
        template.variables.map((variable, index) => 
          prisma.templateFallbackVariable.create({
            data: {
              templateId: template.templateId,
              variableName: variable,
              variableOrder: index
            }
          })
        )
      )
    );

    res.status(201).json({
      success: true,
      data: templateAssignments,
      message: `Initialized ${templateAssignments.length} default templates for client ${clientId}`
    });
  } catch (error) {
    next(error);
  }
});

// Helper function to get template metadata
function getTemplateMetadata(templateId: string) {
  const templateMap: Record<string, any> = {
    'bccf8cfb2b1e422dbc425755f1b7dc67': {
      name: 'Product Showcase Template',
      description: 'Perfect for showcasing product features and benefits',
      category: 'product',
      thumbnail: 'https://img.heygen.com/template/bccf8cfb2b1e422dbc425755f1b7dc67/thumbnail.jpg',
      duration: '30s',
      aspectRatio: 'landscape'
    },
    '3bb2bf2276754c0ea6b235db9409f508': {
      name: 'Feature Highlight Template',
      description: 'Focus on key product features and benefits',
      category: 'feature',
      thumbnail: 'https://img.heygen.com/template/3bb2bf2276754c0ea6b235db9409f508/thumbnail.jpg',
      duration: '30s',
      aspectRatio: 'portrait'
    },
    '47a53273dcd0428bbe7bf960b8bf7f02': {
      name: 'Brand Story Template',
      description: 'Tell your brand story and connect with customers',
      category: 'brand',
      thumbnail: 'https://img.heygen.com/template/47a53273dcd0428bbe7bf960b8bf7f02/thumbnail.jpg',
      duration: '30s',
      aspectRatio: 'landscape'
    },
    'aeec955f97a6476d88e4547adfeb3c97': {
      name: 'Promotional Template',
      description: 'Perfect for sales and promotional campaigns',
      category: 'promotional',
      thumbnail: 'https://img.heygen.com/template/aeec955f97a6476d88e4547adfeb3c97/thumbnail.jpg',
      duration: '30s',
      aspectRatio: 'landscape'
    }
  };

  return templateMap[templateId] || {
    name: `Template ${templateId.slice(-8)}`,
    description: 'HeyGen video template',
    category: 'custom',
    thumbnail: `https://img.heygen.com/template/${templateId}/thumbnail.jpg`,
    duration: '30s',
    aspectRatio: 'landscape'
  };
}

export default router; 