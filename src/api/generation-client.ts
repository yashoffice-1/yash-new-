import axios from 'axios';

// Generation API client configuration
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// Create axios instance with default configuration
const apiClient = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 60000, // 60 seconds for generation requests
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

// Generation API
export const generationAPI = {
  // HeyGen generation
  generateWithHeyGen: (data: {
    type: 'video';
    instruction: string;
    productId: string;
    formatSpecs: any;
    templateData: any;
  }) => apiClient.post('/ai/heygen/generate', {
    templateId: 'default',
    productId: data.productId,
    instruction: data.instruction,
    formatSpecs: data.formatSpecs
  }),

  // Runway generation
  generateWithRunway: (data: {
    type: 'image' | 'video';
    instruction: string;
    productInfo: {
      name: string;
      description: string;
    };
    formatSpecs: any;
  }) => apiClient.post('/ai/runwayml/generate', {
    prompt: data.instruction,
    type: data.type,
    options: data.formatSpecs
  }),

  // OpenAI generation
  generateWithOpenAI: (data: {
    type: 'content';
    instruction: string;
    productInfo: {
      name: string;
      description: string;
    };
    formatSpecs: any;
  }) => apiClient.post('/ai/openai/generate', {
    prompt: data.instruction,
    type: data.type === 'content' ? 'text' : data.type,
    options: data.formatSpecs
  }),

  // Get generation status
  getStatus: (generationId: string) => apiClient.get(`/ai/heygen/status/${generationId}`),

  // Cancel generation
  cancelGeneration: (generationId: string) => apiClient.post(`/ai/generation-cancel/${generationId}`),
};

export default generationAPI; 