import axios from 'axios';

// Template API client configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 30000, // 30 seconds for template requests
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
      // Check if we're not already on a login page to avoid infinite redirects
      if (!window.location.pathname.includes('/auth/')) {
        window.location.href = '/auth/signin';
      }
    }
    return Promise.reject(error);
  }
);

// Template API
export const templateAPI = {
  // Get HeyGen templates list (via backend)
  getHeyGenTemplates: () => apiClient.get('/templates/heygen/list'),

  // Get HeyGen template details (via backend)
  getHeyGenTemplateDetail: (templateId: string) => apiClient.get(`/templates/heygen/detail/${templateId}`),

  // Get template list (internal)
  getTemplateList: () => apiClient.get('/templates/list'),

  // Get template details (internal)
  getTemplateDetail: (templateId: string) => apiClient.get(`/templates/detail/${templateId}`),

  // Get client templates with full details
  getClientTemplates: (clientId: string = 'default') => apiClient.get(`/templates/client/${clientId}/templates`),

  // Get available templates
  getAvailableTemplates: () => apiClient.get('/templates/available'),

  // Get client configurations
  getClientConfigs: () => apiClient.get('/templates/clients'),

  // Create client configuration
  createClientConfig: (data: { clientId: string; clientName: string }) => 
    apiClient.post('/templates/clients', data),

  // Get template assignments for a client
  getClientAssignments: (clientId: string) => 
    apiClient.get(`/templates/clients/${clientId}/assignments`),

  // Assign template to client
  assignTemplate: (clientId: string, data: { templateId: string; templateName?: string; isActive?: boolean }) =>
    apiClient.post(`/templates/clients/${clientId}/assignments`, data),

  // Remove template assignment from client
  removeTemplateAssignment: (clientId: string, templateId: string) =>
    apiClient.delete(`/templates/clients/${clientId}/assignments/${templateId}`),

  // Create fallback variables for a template
  createFallbackVariables: (templateId: string, variables: any[]) =>
    apiClient.post('/templates/fallback-variables', { templateId, variables }),

  // Get template statistics
  getTemplateStats: () => apiClient.get('/templates/stats'),
};

export default templateAPI; 