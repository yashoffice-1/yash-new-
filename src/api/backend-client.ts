import { apiGet, apiPost, apiPut, apiDelete } from '@/utils/api';

// Backend API client configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Helper function to build API URLs
const buildUrl = (endpoint: string) => `${BACKEND_URL}/api${endpoint}`;

// Inventory API
export const inventoryAPI = {
  // Get all inventory items
  getAll: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const url = buildUrl(`/inventory${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return apiGet(url);
  },

  // Get single inventory item
  getById: (id: string) => apiGet(buildUrl(`/inventory/${id}`)),

  // Create new inventory item
  create: (data: any) => apiPost(buildUrl('/inventory'), data),

  // Update inventory item
  update: (id: string, data: any) => apiPut(buildUrl(`/inventory/${id}`), data),

  // Delete inventory item
  delete: (id: string) => apiDelete(buildUrl(`/inventory/${id}`)),

  // Bulk create inventory items
  bulkCreate: (items: any[]) => apiPost(buildUrl('/inventory/bulk'), { items }),
};

// Assets API
export const assetsAPI = {
  // Get all assets
  getAll: async (params?: {
    page?: number;
    limit?: number;
    assetType?: string;
    sourceSystem?: string;
    favorited?: boolean;
    search?: string;
    tags?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const url = buildUrl(`/assets${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return apiGet(url);
  },

  // Get single asset
  getById: (id: string) => apiGet(buildUrl(`/assets/${id}`)),

  // Create new asset
  create: (data: any) => apiPost(buildUrl('/assets'), data),

  // Update asset
  update: (id: string, data: any) => apiPut(buildUrl(`/assets/${id}`), data),

  // Delete asset
  delete: (id: string) => apiDelete(buildUrl(`/assets/${id}`)),

  // Toggle favorite status
  toggleFavorite: (id: string) => apiPost(buildUrl(`/assets/${id}/favorite`), {}),

  // Get generated assets
  getGenerated: async (params?: {
    page?: number;
    limit?: number;
    assetType?: string;
    sourceSystem?: string;
    channel?: string;
    approved?: boolean;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, value.toString());
      });
    }
    const url = buildUrl(`/assets/generated/all${queryParams.toString() ? `?${queryParams.toString()}` : ''}`);
    return apiGet(url);
  },

  // Create generated asset
  createGenerated: (data: any) => apiPost(buildUrl('/assets/generated'), data),

  // Update generated asset approval status
  updateApproval: (id: string, approved: boolean) =>
    apiPost(buildUrl(`/assets/generated/${id}/approve`), { approved }),

  // Get asset statistics
  getStats: () => apiGet(buildUrl('/assets/stats/overview')),
};

// AI Generation API
export const aiAPI = {
  // OpenAI generation
  openaiGenerate: (data: {
    prompt: string;
    type: 'text' | 'image' | 'video';
    options?: any;
  }) => apiPost(buildUrl('/ai/openai/generate'), data),

  // HeyGen generation
  heygenGenerate: (data: {
    templateId: string;
    productId?: string;
    instruction: string;
    formatSpecs?: {
      channel?: string;
      format?: string;
    };
  }) => apiPost(buildUrl('/ai/heygen/generate'), data),

  // HeyGen status check
  heygenStatus: (videoId: string) => apiGet(buildUrl(`/ai/heygen/status/${videoId}`)),

  // RunwayML generation
  runwaymlGenerate: (data: {
    prompt: string;
    options?: any;
  }) => apiPost(buildUrl('/ai/runwayml/generate'), data),

  // Get AI statistics
  getStats: () => apiGet(buildUrl('/ai/stats')),
};

// Templates API
export const templatesAPI = {
  // Get all client configurations
  getClients: () => apiGet(buildUrl('/templates/clients')),

  // Create client configuration
  createClient: (data: { clientId: string; clientName: string }) =>
    apiPost(buildUrl('/templates/clients'), data),

  // Get template assignments for a client
  getClientAssignments: (clientId: string) =>
    apiGet(buildUrl(`/templates/clients/${clientId}/assignments`)),

  // Assign template to client
  assignTemplate: (clientId: string, data: {
    templateId: string;
    templateName?: string;
    isActive?: boolean;
  }) => apiPost(buildUrl(`/templates/clients/${clientId}/assignments`), data),

  // Get fallback variables for a template
  getFallbackVariables: (templateId: string) =>
    apiGet(buildUrl(`/templates/fallback-variables/${templateId}`)),

  // Create fallback variables
  createFallbackVariables: (templateId: string, variables: any[]) =>
    apiPost(buildUrl('/templates/fallback-variables'), { templateId, variables }),

  // Get available templates
  getAvailable: () => apiGet(buildUrl('/templates/available')),

  // Get template statistics
  getStats: () => apiGet(buildUrl('/templates/stats')),
};

// Auth API
export const authAPI = {
  // Get all API keys
  getApiKeys: () => apiGet(buildUrl('/auth/api-keys')),

  // Create new API key
  createApiKey: (data: { keyValue: string; provider: string }) =>
    apiPost(buildUrl('/auth/api-keys'), data),

  // Delete API key
  deleteApiKey: (id: string) => apiDelete(buildUrl(`/auth/api-keys/${id}`)),

  // Get API key by provider
  getApiKeyByProvider: (provider: string) =>
    apiGet(buildUrl(`/auth/api-keys/provider/${provider}`)),

  // Health check
  health: () => apiGet(buildUrl('/auth/health')),
};

// Health check for backend
export const healthCheck = () => apiGet(buildUrl('/health'));

export default { inventoryAPI, assetsAPI, aiAPI, templatesAPI, authAPI, healthCheck }; 