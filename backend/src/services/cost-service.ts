import { prisma } from '../index';

export interface CostCalculationParams {
  platform: string;
  assetType: string;
  quality?: string;
  duration?: number; // For videos
  tokens?: number; // For AI models
  processingTime?: number;
}

export interface CostBreakdown {
  baseCost: number;
  processingCost: number;
  storageCost: number;
  totalCost: number;
  processingTime: number;
  tokensUsed?: number;
}

export class CostService {
  /**
   * Calculate the cost for a generation based on platform pricing
   */
  static async calculateGenerationCost(params: CostCalculationParams): Promise<CostBreakdown> {
    const { platform, assetType, quality = 'standard', duration, tokens, processingTime = 0 } = params;

    // Get platform pricing
    const pricing = await prisma.platformPricing.findUnique({
      where: {
        platform_assetType_quality: {
          platform,
          assetType,
          quality
        }
      }
    });

    if (!pricing) {
      throw new Error(`No pricing found for ${platform} ${assetType} ${quality}`);
    }

    // Calculate base cost
    let baseCost = Number(pricing.basePrice);

    // Add duration-based cost for videos
    if (duration && pricing.perSecondPrice) {
      baseCost += Number(pricing.perSecondPrice) * duration;
    }

    // Add token-based cost for AI models
    if (tokens && pricing.perTokenPrice) {
      baseCost += Number(pricing.perTokenPrice) * tokens;
    }

    // Calculate processing cost (based on processing time)
    const processingCost = this.calculateProcessingCost(processingTime);

    // Calculate storage cost (estimated)
    const storageCost = this.calculateStorageCost(assetType, duration);

    const totalCost = baseCost + processingCost + storageCost;

    return {
      baseCost: Number(baseCost.toFixed(4)),
      processingCost: Number(processingCost.toFixed(4)),
      storageCost: Number(storageCost.toFixed(4)),
      totalCost: Number(totalCost.toFixed(4)),
      processingTime,
      tokensUsed: tokens
    };
  }

  /**
   * Calculate processing cost based on time
   */
  private static calculateProcessingCost(processingTime: number): number {
    // Base processing cost: $0.01 per minute
    const costPerMinute = 0.01;
    return (processingTime / 60) * costPerMinute;
  }

  /**
   * Calculate storage cost based on asset type and duration
   */
  private static calculateStorageCost(assetType: string, duration?: number): number {
    // Storage cost per GB per month: $0.02
    const costPerGBPerMonth = 0.02;
    
    let estimatedSizeGB = 0;
    
    switch (assetType) {
      case 'video':
        // Estimate video size: 10MB per minute
        estimatedSizeGB = duration ? (duration * 10) / 1024 : 0.1;
        break;
      case 'image':
        // Estimate image size: 2MB
        estimatedSizeGB = 0.002;
        break;
      case 'text':
        // Estimate text size: 1KB
        estimatedSizeGB = 0.000001;
        break;
      default:
        estimatedSizeGB = 0.01;
    }

    // Calculate monthly storage cost
    return estimatedSizeGB * costPerGBPerMonth;
  }

  /**
   * Record cost for a generated asset
   */
  static async recordGenerationCost(
    assetId: string,
    profileId: string,
    costBreakdown: CostBreakdown,
    platform: string,
    assetType: string,
    quality?: string
  ) {
    try {
      // Create cost record
      const costRecord = await prisma.generationCostRecord.create({
        data: {
          assetId,
          profileId,
          sourceSystem: platform,
          assetType,
          baseCost: costBreakdown.baseCost,
          processingCost: costBreakdown.processingCost,
          storageCost: costBreakdown.storageCost,
          totalCost: costBreakdown.totalCost,
          processingTime: costBreakdown.processingTime,
          tokensUsed: costBreakdown.tokensUsed,
          quality: quality || 'standard'
        }
      });

      // Update the generated asset with cost information
      await prisma.generatedAsset.update({
        where: { id: assetId },
        data: {
          generationCost: costBreakdown.totalCost,
          processingTime: costBreakdown.processingTime
        }
      });

      return costRecord;
    } catch (error) {
      console.error('Error recording generation cost:', error);
      throw error;
    }
  }

  /**
   * Get cost analytics for a time period
   */
  static async getCostAnalytics(startDate: Date, endDate: Date) {
    const [
      totalCost,
      costByPlatform,
      costByAssetType,
      costByUser,
      averageCostPerGeneration
    ] = await Promise.all([
      // Total cost
      prisma.generationCostRecord.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          totalCost: true
        }
      }),

      // Cost by platform
      prisma.generationCostRecord.groupBy({
        by: ['sourceSystem'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          totalCost: true
        },
        _count: {
          id: true
        }
      }),

      // Cost by asset type
      prisma.generationCostRecord.groupBy({
        by: ['assetType'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          totalCost: true
        },
        _count: {
          id: true
        }
      }),

      // Top cost users
      prisma.generationCostRecord.groupBy({
        by: ['profileId'],
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _sum: {
          totalCost: true
        },
        _count: {
          id: true
        },
        orderBy: {
          _sum: {
            totalCost: 'desc'
          }
        },
        take: 10
      }),

      // Average cost per generation
      prisma.generationCostRecord.aggregate({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        _avg: {
          totalCost: true
        }
      })
    ]);

    return {
      totalCost: Number(totalCost._sum.totalCost || 0),
      costByPlatform: costByPlatform.map(item => ({
        platform: item.sourceSystem,
        totalCost: Number(item._sum.totalCost || 0),
        count: item._count.id
      })),
      costByAssetType: costByAssetType.map(item => ({
        assetType: item.assetType,
        totalCost: Number(item._sum.totalCost || 0),
        count: item._count.id
      })),
      topCostUsers: costByUser.map(item => ({
        profileId: item.profileId,
        totalCost: Number(item._sum.totalCost || 0),
        count: item._count.id
      })),
      averageCostPerGeneration: Number(averageCostPerGeneration._avg.totalCost || 0)
    };
  }

  /**
   * Initialize default platform pricing
   */
  static async initializeDefaultPricing() {
    const defaultPricing = [
      // HeyGen pricing
      { platform: 'heygen', assetType: 'video', quality: 'basic', basePrice: 0.15, perSecondPrice: 0.02 },
      { platform: 'heygen', assetType: 'video', quality: 'standard', basePrice: 0.25, perSecondPrice: 0.03 },
      { platform: 'heygen', assetType: 'video', quality: 'premium', basePrice: 0.35, perSecondPrice: 0.04 },
      
      // OpenAI pricing
      { platform: 'openai', assetType: 'image', quality: 'basic', basePrice: 0.02, perTokenPrice: 0.0001 },
      { platform: 'openai', assetType: 'image', quality: 'standard', basePrice: 0.04, perTokenPrice: 0.0002 },
      { platform: 'openai', assetType: 'text', quality: 'basic', basePrice: 0.01, perTokenPrice: 0.0001 },
      { platform: 'openai', assetType: 'text', quality: 'standard', basePrice: 0.02, perTokenPrice: 0.0002 },
      
      // RunwayML pricing
      { platform: 'runwayml', assetType: 'video', quality: 'basic', basePrice: 0.20, perSecondPrice: 0.025 },
      { platform: 'runwayml', assetType: 'video', quality: 'standard', basePrice: 0.30, perSecondPrice: 0.035 },
      { platform: 'runwayml', assetType: 'video', quality: 'premium', basePrice: 0.40, perSecondPrice: 0.045 },
      { platform: 'runwayml', assetType: 'image', quality: 'basic', basePrice: 0.05, perTokenPrice: 0.0001 },
      { platform: 'runwayml', assetType: 'image', quality: 'standard', basePrice: 0.10, perTokenPrice: 0.0002 },
      { platform: 'runwayml', assetType: 'image', quality: 'premium', basePrice: 0.15, perTokenPrice: 0.0003 }
    ];

    for (const pricing of defaultPricing) {
      await prisma.platformPricing.upsert({
        where: {
          platform_assetType_quality: {
            platform: pricing.platform,
            assetType: pricing.assetType,
            quality: pricing.quality
          }
        },
        update: pricing,
        create: pricing
      });
    }
  }
}
