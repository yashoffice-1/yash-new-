import { apiClient, getAuthHeaders } from '../shared/axios-config';
import type { SystemSetting, UpdateSettingData } from '../types';

class SettingsAPI {
  // Get all settings (admin only)
  async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const response = await apiClient.get('/settings');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  // Get public settings (any authenticated user)
  async getPublicSettings(): Promise<SystemSetting[]> {
    try {
      const response = await apiClient.get('/settings/public');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching public settings:', error);
      throw error;
    }
  }

  // Get upload limits
  async getUploadLimits(): Promise<{
    maxFileSizeMB: number;
    allowedFileTypes: string[];
    videoGenerationLimit: number;
  }> {
    try {
      const response = await apiClient.get('/settings/upload-limits');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching upload limits:', error);
      throw error;
    }
  }

  // Get rate limits
  async getRateLimits(): Promise<{
    requestsPerWindow: number;
    windowMs: number;
    windowMinutes: number;
  }> {
    try {
      const response = await apiClient.get('/settings/rate-limits');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching rate limits:', error);
      throw error;
    }
  }

  // Get a specific setting by key
  async getSetting(key: string): Promise<SystemSetting> {
    try {
      const response = await apiClient.get(`/settings/${key}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching setting:', error);
      throw error;
    }
  }

  // Update a setting (admin only)
  async updateSetting(key: string, data: UpdateSettingData): Promise<SystemSetting> {
    try {
      const response = await apiClient.put(`/settings/${key}`, data);
      return response.data.data;
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  /**
   * Get the system default character limit for template variables
   * Used when HeyGen doesn't provide a limit for text variables
   * @returns Current system default character limit
   */
  async getDefaultCharLimit(): Promise<{ defaultCharLimit: number }> {
    try {
      const response = await apiClient.get('/settings/default-char-limit');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching default character limit:', error);
      throw error;
    }
  }

  // Update default character limit (admin only)
  async updateDefaultCharLimit(defaultCharLimit: number): Promise<{ defaultCharLimit: number; message: string }> {
    try {
      const response = await apiClient.put('/settings/default-char-limit', { defaultCharLimit });
      return response.data.data;
    } catch (error) {
      console.error('Error updating default character limit:', error);
      throw error;
    }
  }
}

export const settingsAPI = new SettingsAPI(); 