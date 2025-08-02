import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001/api';

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: 'general' | 'security' | 'upload' | 'email' | 'system';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingData {
  value: string;
  description?: string;
  category?: 'general' | 'security' | 'upload' | 'email' | 'system';
  isPublic?: boolean;
}

class SettingsAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Get all settings (admin only)
  async getAllSettings(): Promise<SystemSetting[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  // Get public settings (any authenticated user)
  async getPublicSettings(): Promise<SystemSetting[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/public`, {
        headers: this.getAuthHeaders(),
      });
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
      const response = await axios.get(`${API_BASE_URL}/settings/upload-limits`, {
        headers: this.getAuthHeaders(),
      });
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
      const response = await axios.get(`${API_BASE_URL}/settings/rate-limits`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching rate limits:', error);
      throw error;
    }
  }

  // Get a specific setting by key
  async getSetting(key: string): Promise<SystemSetting> {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings/${key}`, {
        headers: this.getAuthHeaders(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching setting:', error);
      throw error;
    }
  }

  // Update a setting (admin only)
  async updateSetting(key: string, data: UpdateSettingData): Promise<SystemSetting> {
    try {
      const response = await axios.put(`${API_BASE_URL}/settings/${key}`, data, {
        headers: this.getAuthHeaders(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }
}

export const settingsAPI = new SettingsAPI(); 