import { apiClient } from '../shared/axios-config';

// Template API
export const templateAPI = {
  // Get HeyGen templates list (via backend)
  getHeyGenTemplates: () => apiClient.get('/templates/heygen/list'),

  // Get HeyGen template details (via backend)
  getHeyGenTemplateDetail: (templateId: string) => apiClient.get(`/templates/heygen/detail/${templateId}`),

  // Get HeyGen template variables with character limits (via backend)
  getHeyGenTemplateVariables: (templateId: string) => apiClient.get(`/templates/heygen/variables/${templateId}`),

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