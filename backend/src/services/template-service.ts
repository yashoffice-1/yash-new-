import { prisma } from '../index';

export interface TemplateAccess {
  id: string;
  userId: string;
  sourceSystem: string;
  externalId: string;
  templateName: string;
  templateDescription?: string;
  thumbnailUrl?: string;
  category?: string;
  aspectRatio?: string;
  canUse: boolean;
  usageCount: number;
  lastUsedAt?: Date;
  selectedAt: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  variables?: any[];
}

export interface CreateTemplateAccessData {
  userId: string;
  sourceSystem: string;
  externalId: string;
  templateName: string;
  templateDescription?: string;
  thumbnailUrl?: string;
  category?: string;
  aspectRatio?: string;
  expiresAt?: Date;
}

export class TemplateService {
  /**
   * Get all template access for a user
   */
  async getUserTemplates(userId: string): Promise<TemplateAccess[]> {
    const templates = await prisma.userTemplateAccess.findMany({
      where: {
        userId,
        canUse: true
      },
      include: {
        variables: true
      },
      orderBy: {
        selectedAt: 'desc'
      }
    });

    return templates.map((template: any) => ({
      ...template,
      templateDescription: template.templateDescription || undefined,
      thumbnailUrl: template.thumbnailUrl || undefined, 
      category: template.category || undefined,
      aspectRatio: template.aspectRatio || undefined,
      lastUsedAt: template.lastUsedAt || undefined,
      expiresAt: template.expiresAt || undefined,
      variables: template.variables || []
    }));
  }

  /**
   * Get a specific template access by ID
   */
  async getTemplateAccess(id: string): Promise<TemplateAccess | null> {
    const template = await prisma.userTemplateAccess.findUnique({
      where: { id },
      include: {
        variables: true
      }
    });

    if (!template) return null;

    return {
      ...template,
      templateDescription: template.templateDescription || undefined,
      thumbnailUrl: template.thumbnailUrl || undefined,
      category: template.category || undefined,
      aspectRatio: template.aspectRatio || undefined,
      lastUsedAt: template.lastUsedAt || undefined,
      expiresAt: template.expiresAt || undefined,
      variables: template.variables || []
    };
  }

  /**
   * Check if user has access to a specific template
   */
  async hasTemplateAccess(userId: string, sourceSystem: string, externalId: string): Promise<boolean> {
    console.log('hasTemplateAccess called with:', { userId, sourceSystem, externalId });
    
    if (!userId || typeof userId !== 'string') {
      console.error('Invalid userId in hasTemplateAccess:', userId);
      return false;
    }

    const template = await prisma.userTemplateAccess.findUnique({
      where: {
        userId_sourceSystem_externalId: {
          userId,
          sourceSystem,
          externalId
        }
      }
    });

    console.log('Template access result:', template);
    return template?.canUse || false;
  }

  /**
   * Grant template access to a user
   */
  async grantTemplateAccess(data: CreateTemplateAccessData): Promise<TemplateAccess> {
    // Check if template access already exists
    const existing = await prisma.userTemplateAccess.findUnique({
      where: {
        userId_sourceSystem_externalId: {
          userId: data.userId,
          sourceSystem: data.sourceSystem,
          externalId: data.externalId
        }
      }
    });

    if (existing) {
      // Update existing template access
      const updated = await prisma.userTemplateAccess.update({
        where: { id: existing.id },
        data: {
          templateName: data.templateName,
          templateDescription: data.templateDescription,
          thumbnailUrl: data.thumbnailUrl,
          category: data.category,
          aspectRatio: data.aspectRatio,
          canUse: true,
          expiresAt: data.expiresAt,
          selectedAt: new Date()
        }
      });

      return {
        ...updated,
        templateDescription: updated.templateDescription || undefined,
        thumbnailUrl: updated.thumbnailUrl || undefined,
        category: updated.category || undefined,
        aspectRatio: updated.aspectRatio || undefined,
        lastUsedAt: updated.lastUsedAt || undefined,
        expiresAt: updated.expiresAt || undefined
      };
    }

    // Create new template access
    const created = await prisma.userTemplateAccess.create({
      data: {
        userId: data.userId,
        sourceSystem: data.sourceSystem,
        externalId: data.externalId,
        templateName: data.templateName,
        templateDescription: data.templateDescription,
        thumbnailUrl: data.thumbnailUrl,
        category: data.category,
        aspectRatio: data.aspectRatio,
        canUse: true,
        expiresAt: data.expiresAt
      }
    });

    return {
      ...created,
      templateDescription: created.templateDescription || undefined,
      thumbnailUrl: created.thumbnailUrl || undefined,
      category: created.category || undefined,
      aspectRatio: created.aspectRatio || undefined,
      lastUsedAt: created.lastUsedAt || undefined,
      expiresAt: created.expiresAt || undefined
    };
  }

  /**
   * Revoke template access for a user
   */
  async revokeTemplateAccess(userId: string, sourceSystem: string, externalId: string): Promise<void> {
    await prisma.userTemplateAccess.updateMany({
      where: {
        userId,
        sourceSystem,
        externalId
      },
      data: {
        canUse: false
      }
    });
  }

  /**
   * Update template usage count
   */
  async updateTemplateUsage(templateAccessId: string): Promise<void> {
    await prisma.userTemplateAccess.update({
      where: { id: templateAccessId },
      data: {
        usageCount: {
          increment: 1
        },
        lastUsedAt: new Date()
      }
    });
  }

  /**
   * Get template usage statistics for a user
   */
  async getUserTemplateStats(userId: string): Promise<{
    totalTemplates: number;
    activeTemplates: number;
    totalUsage: number;
    mostUsedTemplate?: TemplateAccess;
  }> {
    const templates = await prisma.userTemplateAccess.findMany({
      where: { userId },
      orderBy: { usageCount: 'desc' }
    });

    const totalTemplates = templates.length;
    const activeTemplates = templates.filter((t: any) => t.canUse).length;
    const totalUsage = templates.reduce((sum: number, t: any) => sum + t.usageCount, 0);
    const mostUsedTemplate = templates[0]?.usageCount > 0 ? {
      ...templates[0],
      templateDescription: templates[0].templateDescription || undefined,
      thumbnailUrl: templates[0].thumbnailUrl || undefined,
      category: templates[0].category || undefined,
      aspectRatio: templates[0].aspectRatio || undefined,
      lastUsedAt: templates[0].lastUsedAt || undefined,
      expiresAt: templates[0].expiresAt || undefined
    } : undefined;

    return {
      totalTemplates,
      activeTemplates,
      totalUsage,
      mostUsedTemplate
    };
  }

  /**
   * Clean up expired template access
   */
  async cleanupExpiredTemplates(): Promise<number> {
    const result = await prisma.userTemplateAccess.updateMany({
      where: {
        expiresAt: {
          lt: new Date()
        },
        canUse: true
      },
      data: {
        canUse: false
      }
    });

    return result.count;
  }
}

export const templateService = new TemplateService(); 