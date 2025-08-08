import { apiClient } from '../shared/axios-config';
import type { Asset, InventoryItem, Template, GenerationRequest } from '../types';

// Inventory API
export const inventoryAPI = {
  // Get all inventory items
  getAll: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
    all?: string;
  }) => apiClient.get('/inventory', { params }),

  // Get all categories from active products
  getCategories: () => apiClient.get('/inventory/categories'),

  // Get single inventory item
  getById: (id: string) => apiClient.get(`/inventory/${id}`),

  // Create new inventory item
  create: (data: any) => apiClient.post('/inventory', data),

  // Update inventory item
  update: (id: string, data: any) => apiClient.put(`/inventory/${id}`, data),

  // Delete inventory item
  delete: (id: string) => apiClient.delete(`/inventory/${id}`),

  // Bulk create inventory items
  bulkCreate: (items: any[]) => apiClient.post('/inventory/bulk', { items }),
};

// Assets API
export const assetsAPI = {
  // Get all assets for the current user
  getAssets: (params?: any) => apiClient.get('/assets', { params }),

  // Create new asset (profileId will be set by backend from auth token)
  createAsset: (data: {
    title: string;
    description?: string;
    instruction: string;
    assetType: 'image' | 'video' | 'content';
    channel: string; // ✅ Include channel
    format: string;
    sourceSystem: string;
    url: string;
    tags?: string[];
    inventoryId?: string; // ✅ Include inventoryId
  }) => apiClient.post('/assets', data),

  // Update asset
  updateAsset: (assetId: string, data: { url?: string; status?: string }) =>
    apiClient.put(`/assets/${assetId}`, data),

  // Delete asset
  deleteAsset: (assetId: string) => apiClient.delete(`/assets/${assetId}`),

  // Toggle favorite
  toggleFavorite: (assetId: string) => apiClient.patch(`/assets/${assetId}/favorite`),

  // Proxy download external assets
  proxyDownload: (data: { url: string; fileName?: string }) => apiClient.post('/assets/proxy-download', data),
};

// AI Generation API
export const aiAPI = {
  // OpenAI generation
  openaiGenerate: (data: {
    prompt: string;
    type: 'text' | 'image' | 'video';
    options?: any;
  }) => apiClient.post('/ai/openai/generate', data),

  // HeyGen generation
  heygenGenerate: (data: GenerationRequest) => apiClient.post('/ai/heygen/generate', data),

  // HeyGen status check
  heygenStatus: (videoId: string) => apiClient.get(`/ai/heygen/status/${videoId}`),

  // RunwayML generation
  runwaymlGenerate: (data: {
    prompt: string;
    options?: any;
  }) => apiClient.post('/ai/runwayml/generate', data),

  // Get AI statistics
  getStats: () => apiClient.get('/ai/stats'),
};

// Templates API
export const templatesAPI = {
  // Get all client configurations
  getClients: () => apiClient.get('/templates/clients'),

  // Create client configuration
  createClient: (data: { clientId: string; clientName: string }) =>
    apiClient.post('/templates/clients', data),

  // Get template assignments for a client
  getClientAssignments: (clientId: string) =>
    apiClient.get(`/templates/clients/${clientId}/assignments`),

  // Assign template to client
  assignTemplate: (clientId: string, data: {
    templateId: string;
    templateName?: string;
    isActive?: boolean;
  }) => apiClient.post(`/templates/clients/${clientId}/assignments`, data),

  // Get fallback variables for a template
  getFallbackVariables: (templateId: string) =>
    apiClient.get(`/templates/fallback-variables/${templateId}`),

  // Create fallback variables
  createFallbackVariables: (templateId: string, variables: any[]) =>
    apiClient.post('/templates/fallback-variables', { templateId, variables }),

  // Get available templates
  getAvailable: () => apiClient.get('/templates/available'),

  // Get template statistics
  getStats: () => apiClient.get('/templates/stats'),

  // Get HeyGen templates list (admin only)
  getHeyGenTemplates: () => apiClient.get('/templates/heygen/list'),

  // Get user's assigned templates
  getUserTemplates: () => apiClient.get('/templates'),

  // Get all template assignments (admin only)
  getAllAssignments: () => apiClient.get('/templates/admin/all'),

  // Assign template to user (admin only)
  assignTemplateToUser: (data: {
    userId: string;
    templateId: string;
    templateName: string;
    templateDescription?: string;
    thumbnailUrl?: string;
    category?: string;
    aspectRatio?: string;
    expiresAt?: string;
    variables?: any[];
  }) => apiClient.post('/templates/admin/assign', data),

  // Update template assignment
  updateTemplateAssignment: (assignmentId: string, data: {
    templateName?: string;
    templateDescription?: string;
    thumbnailUrl?: string;
    category?: string;
    aspectRatio?: string;
    canUse?: boolean;
    expiresAt?: string;
    variables?: any[];
  }) => apiClient.put(`/templates/${assignmentId}`, data),

  // Delete template assignment
  deleteTemplateAssignment: (assignmentId: string) => apiClient.delete(`/templates/${assignmentId}`),

  // Get all available templates from all sources (admin only)
  getAllAvailableTemplates: () => apiClient.get('/templates/admin/all-available'),

  // Fetch HeyGen template variables (admin only)
  getHeyGenTemplateVariables: (templateId: string) =>
    apiClient.get(`/templates/heygen/variables/${templateId}`),

  // Clean up expired templates (admin only)
  cleanupExpiredTemplates: () => apiClient.post('/templates/admin/cleanup-expired'),

  // Generate video from template
  generateTemplate: (data: GenerationRequest) => apiClient.post('/ai/heygen/generate', data),

  // Get video generation status
  getGenerationStatus: (videoId: string) => apiClient.get(`/ai/heygen/status/${videoId}`),

  // HeyGen specific methods
  heygen: {
    // Get HeyGen templates list
    getTemplates: () => apiClient.get('/templates/heygen/list'),
    
    // Get HeyGen template variables
    getTemplateVariables: (templateId: string) => apiClient.get(`/templates/heygen/variables/${templateId}`),
    
    // Get video status
    getStatus: (videoId: string) => apiClient.get(`/ai/heygen/status/${videoId}`),
    
    // Recover pending videos
    recoverPending: () => apiClient.post('/ai/heygen/recover-pending'),
  },
};

// Admin API
export const adminAPI = {
  // Get all users
  getUsers: () => apiClient.get('/admin/users'),

  // Update user role
  updateUserRole: (userId: string, role: string) => 
    apiClient.patch(`/admin/users/${userId}/role`, { role }),

  // Get system statistics
  getStats: () => apiClient.get('/admin/stats'),

  // Get user analytics
  getUserAnalytics: (userId: string) => apiClient.get(`/admin/users/${userId}/analytics`),
};

// Auth API
export const authAPI = {
  // Get all API keys
  getApiKeys: () => apiClient.get('/auth/api-keys'),

  // Create new API key
  createApiKey: (data: { keyValue: string; provider: string }) =>
    apiClient.post('/auth/api-keys', data),

  // Delete API key
  deleteApiKey: (id: string) => apiClient.delete(`/auth/api-keys/${id}`),

  // Get API key by provider
  getApiKeyByProvider: (provider: string) =>
    apiClient.get(`/auth/api-keys/provider/${provider}`),

  // Health check
  health: () => apiClient.get('/auth/health'),
};

// Health check for backend
export const healthCheck = () => apiClient.get('/health');

export default apiClient; 