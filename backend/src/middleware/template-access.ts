import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { templateService } from '../services/template-service';

/**
 * Middleware to check if user has access to a specific template
 * Usage: templateAccess('heygen', 'template-id')
 */
export function templateAccess(sourceSystem: string, externalIdParam: string = 'templateId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;

      if (!userId || typeof userId !== 'string') {
        console.error('Invalid userId:', userId);
        return res.status(401).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const externalId = req.params[externalIdParam] || req.body[externalIdParam];

      if (!externalId) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
      }

      console.log('Checking template access:', { userId, sourceSystem, externalId });

      const hasAccess = await templateService.hasTemplateAccess(userId, sourceSystem, externalId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this template'
        });
      }

      return next();
    } catch (error) {
      console.error('Template access check failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check template access'
      });
    }
  };
}

/**
 * Middleware to check if user has access to any template from a specific source system
 * Usage: hasAnyTemplateAccess('heygen')
 */
export function hasAnyTemplateAccess(sourceSystem: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;

      if (!userId || typeof userId !== 'string') {
        console.error('Invalid userId:', userId);
        return res.status(401).json({
          success: false,
          error: 'User ID is required'
        });
      }
      
      const templates = await templateService.getUserTemplates(userId);
      const hasAnyAccess = templates.some(template => 
        template.sourceSystem === sourceSystem && template.canUse
      );

      if (!hasAnyAccess) {
        return res.status(403).json({
          success: false,
          error: `No ${sourceSystem} templates available`
        });
      }

      return next();
    } catch (error) {
      console.error('Template access check failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check template access'
      });
    }
  };
}

/**
 * Middleware to validate template access and update usage
 * Usage: validateAndUpdateTemplateUsage('heygen', 'templateId')
 */
export function validateAndUpdateTemplateUsage(sourceSystem: string, externalIdParam: string = 'templateId') {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId || (req as any).user?.id;

      if (!userId || typeof userId !== 'string') {
        console.error('Invalid userId:', userId);
        return res.status(401).json({
          success: false,
          error: 'User ID is required'
        });
      }

      const externalId = req.params[externalIdParam] || req.body[externalIdParam];

      if (!externalId) {
        return res.status(400).json({
          success: false,
          error: 'Template ID is required'
        });
      }

      console.log('Validating template access:', { userId, sourceSystem, externalId });

      // Check if user has access to this template
      const hasAccess = await templateService.hasTemplateAccess(userId, sourceSystem, externalId);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          error: 'Access denied to this template'
        });
      }

      // Get the template access record to update usage
      const template = await prisma.userTemplateAccess.findUnique({
        where: {
          userId_sourceSystem_externalId: {
            userId,
            sourceSystem,
            externalId
          }
        }
      });

      if (template) {
        // Update usage count
        await templateService.updateTemplateUsage(template.id);
      }

      return next();
    } catch (error) {
      console.error('Template access validation failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate template access'
      });
    }
  };
} 