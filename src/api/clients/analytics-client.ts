import { analyticsClient } from '../shared/axios-config';

export interface AnalyticsData {
  users: {
    total: number;
    active: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    growth: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    retention: {
      day7: number;
      day30: number;
      day90: number;
    };
    roles: {
      user: number;
      admin: number;
      superadmin: number;
    };
  };
  content: {
    generated: {
      total: number;
      videos: number;
      images: number;
      text: number;
    };
    success: {
      heygen: number;
      openai: number;
      runwayml: number;
    };
    performance: {
      avgGenerationTime: number;
      successRate: number;
      failureRate: number;
    };
    templates: {
      totalUsed: number;
      mostPopular: Array<{ name: string; count: number }>;
    };
  };
  assets: {
    library: {
      total: number;
      videos: number;
      images: number;
      text: number;
    };
    engagement: {
      favorites: number;
      downloads: number;
      views: number;
    };
    storage: {
      used: number;
      total: number;
      percentage: number;
      costEstimate?: number;
      assetCount?: number;
      byResourceType?: Record<string, { bytes: number; count: number; gb: number }>;
      folders?: Record<string, { bytes: number; count: number; gb: number }>;
      totalFolders?: number;
    };
  };
  social: {
    connections: {
      youtube: number;
      instagram: number;
      facebook: number;
      tiktok: number;
    };
    uploads: {
      total: number;
      success: number;
      failed: number;
    };
    engagement: {
      likes: number;
      comments: number;
      shares: number;
      reach: number;
    };
  };
  business: {
    apiUsage: {
      total: number;
      byUser: Array<{ userId: string; count: number }>;
    };
    costs: {
      total: number;
      perGeneration: number;
      byPlatform: Record<string, number>;
      platformCounts?: Record<string, number>;
      byAssetType?: Record<string, number>;
    };
    revenue: {
      total: number;
      perUser: number;
      growth: number;
    };
  };
}

export interface AnalyticsResponse {
  success: boolean;
  data: AnalyticsData;
  error?: string;
}

export interface RealTimeMetrics {
  users: {
    total: number;
    active: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  };
  content: {
    generated: {
      total: number;
      videos: number;
      images: number;
      text: number;
    };
    performance: {
      avgGenerationTime: number;
      successRate: number;
      failureRate: number;
    };
  };
  social: {
    uploads: {
      total: number;
      success: number;
      failed: number;
    };
  };
}

class AnalyticsClient {
  /**
   * Get comprehensive analytics data
   * @param range - Time range for analytics (7d, 30d, 90d)
   * @returns Promise<AnalyticsResponse>
   */
  async getAnalytics(range: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsResponse> {
    try {
      const response = await analyticsClient.get(`/admin/analytics?range=${range}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch analytics data');
    }
  }

  /**
   * Get user analytics specifically
   * @param range - Time range for analytics
   * @returns Promise<AnalyticsData['users']>
   */
  async getUserAnalytics(range: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsData['users']> {
    const response = await this.getAnalytics(range);
    return response.data.users;
  }

  /**
   * Get content generation analytics
   * @param range - Time range for analytics
   * @returns Promise<AnalyticsData['content']>
   */
  async getContentAnalytics(range: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsData['content']> {
    const response = await this.getAnalytics(range);
    return response.data.content;
  }

  /**
   * Get asset library analytics
   * @param range - Time range for analytics
   * @returns Promise<AnalyticsData['assets']>
   */
  async getAssetAnalytics(range: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsData['assets']> {
    const response = await this.getAnalytics(range);
    return response.data.assets;
  }

  /**
   * Get social media analytics
   * @param range - Time range for analytics
   * @returns Promise<AnalyticsData['social']>
   */
  async getSocialAnalytics(range: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsData['social']> {
    const response = await this.getAnalytics(range);
    return response.data.social;
  }

  /**
   * Get business analytics
   * @param range - Time range for analytics
   * @returns Promise<AnalyticsData['business']>
   */
  async getBusinessAnalytics(range: '7d' | '30d' | '90d' = '30d'): Promise<AnalyticsData['business']> {
    const response = await this.getAnalytics(range);
    return response.data.business;
  }

  /**
   * Get real-time metrics (for dashboard widgets)
   * @returns Promise<RealTimeMetrics>
   */
  async getRealTimeMetrics(): Promise<RealTimeMetrics> {
    try {
      const response = await analyticsClient.get('/admin/analytics?range=7d');
      const data = response.data.data;
      
      return {
        users: {
          total: data.users.total,
          active: data.users.active
        },
        content: {
          generated: data.content.generated,
          performance: data.content.performance
        },
        social: {
          uploads: data.social.uploads
        }
      };
    } catch (error: any) {
      console.error('Error fetching real-time metrics:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch real-time metrics');
    }
  }
}

export const analyticsAPI = new AnalyticsClient();
