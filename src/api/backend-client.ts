import axios from 'axios';

// Backend API client configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

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
  // Get all assets
  getAll: (params?: {
    page?: number;
    limit?: number;
    assetType?: string;
    sourceSystem?: string;
    favorited?: boolean;
    search?: string;
    tags?: string;
  }) => apiClient.get('/assets', { params }),

  // Get single asset
  getById: (id: string) => apiClient.get(`/assets/${id}`),

  // Create new asset
  create: (data: any) => apiClient.post('/assets', data),

  // Update asset
  update: (id: string, data: any) => apiClient.put(`/assets/${id}`, data),

  // Delete asset
  delete: (id: string) => apiClient.delete(`/assets/${id}`),

  // Toggle favorite status
  toggleFavorite: (id: string) => apiClient.patch(`/assets/${id}/favorite`),

  // Get generated assets
  getGenerated: (params?: {
    page?: number;
    limit?: number;
    assetType?: string;
    sourceSystem?: string;
    channel?: string;
    approved?: boolean;
  }) => apiClient.get('/assets/generated/all', { params }),

  // Create generated asset
  createGenerated: (data: any) => apiClient.post('/assets/generated', data),

  // Update generated asset approval status
  updateApproval: (id: string, approved: boolean) =>
    apiClient.patch(`/assets/generated/${id}/approve`, { approved }),

  // Get asset statistics
  getStats: () => apiClient.get('/assets/stats/overview'),
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
  heygenGenerate: (data: {
    templateId: string;
    productId?: string;
    instruction: string;
    formatSpecs?: {
      channel?: string;
      format?: string;
    };
  }) => apiClient.post('/ai/heygen/generate', data),

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