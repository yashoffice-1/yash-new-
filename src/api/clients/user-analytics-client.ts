import { analyticsClient } from '../shared/axios-config';

export interface UserAnalyticsData {
  storage: {
    used: number;
    total: number;
    percentage: number;
    costEstimate: number;
    assetCount: number;
    byResourceType: Record<string, { bytes: number; count: number; gb: number }>;
    folders: Record<string, { bytes: number; count: number; gb: number }>;
  };
  costs: {
    total: number;
    perGeneration: number;
    byPlatform: Record<string, number>;
    platformCounts: Record<string, number>;
    byAssetType: Record<string, number>;
  };
  assets: {
    total: number;
    videos: number;
    images: number;
    byStatus: Record<string, number>;
    recent: Array<{
      id: string;
      assetType: string;
      sourceSystem: string;
      status: string;
      createdAt: string;
      url: string;
    }>;
  };
  activity: {
    lastUpload: string | null;
    totalUploads: number;
    thisMonth: number;
    lastMonth: number;
  };
}

export interface UserAnalyticsResponse {
  success: boolean;
  data: UserAnalyticsData;
  error?: string;
}

class UserAnalyticsClient {
  /**
   * Get user-specific analytics data
   * @param userId - User ID to fetch analytics for
   * @param range - Time range for analytics (7d, 30d, 90d)
   * @returns Promise<UserAnalyticsResponse>
   */
  async getUserAnalytics(userId: string, range: '7d' | '30d' | '90d' = '30d'): Promise<UserAnalyticsResponse> {
    try {
      const response = await analyticsClient.get(`/admin/users/${userId}/analytics?range=${range}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user analytics:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch user analytics data');
    }
  }

  /**
   * Get current user's analytics (for personal dashboard)
   * @param range - Time range for analytics
   * @returns Promise<UserAnalyticsResponse>
   */
  async getMyAnalytics(range: '7d' | '30d' | '90d' = '30d'): Promise<UserAnalyticsResponse> {
    try {
      const response = await analyticsClient.get(`/auth/me/analytics?range=${range}`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching my analytics:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch your analytics data');
    }
  }

  /**
   * Get user storage usage specifically
   * @param userId - User ID
   * @returns Promise<UserAnalyticsData['storage']>
   */
  async getUserStorage(userId: string): Promise<UserAnalyticsData['storage']> {
    const response = await this.getUserAnalytics(userId);
    return response.data.storage;
  }

  /**
   * Get user cost analytics specifically
   * @param userId - User ID
   * @returns Promise<UserAnalyticsData['costs']>
   */
  async getUserCosts(userId: string): Promise<UserAnalyticsData['costs']> {
    const response = await this.getUserAnalytics(userId);
    return response.data.costs;
  }

  /**
   * Get user asset analytics specifically
   * @param userId - User ID
   * @returns Promise<UserAnalyticsData['assets']>
   */
  async getUserAssets(userId: string): Promise<UserAnalyticsData['assets']> {
    const response = await this.getUserAnalytics(userId);
    return response.data.assets;
  }

  /**
   * Get user activity analytics specifically
   * @param userId - User ID
   * @returns Promise<UserAnalyticsData['activity']>
   */
  async getUserActivity(userId: string): Promise<UserAnalyticsData['activity']> {
    const response = await this.getUserAnalytics(userId);
    return response.data.activity;
  }
}

export const userAnalyticsAPI = new UserAnalyticsClient();
