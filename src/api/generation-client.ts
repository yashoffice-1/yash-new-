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
      // Check if we're not already on a login page to avoid infinite redirects
      if (!window.location.pathname.includes('/auth/')) {
        window.location.href = '/auth/signin';
      }
    }
    return Promise.reject(error);
  }
);

// Generation API
export const generationAPI = {
  // HeyGen generation (Video)
  generateWithHeyGen: (data: {
    templateId: string;
    productId: string;
    instruction: string;
    formatSpecs: {
      channel?: string;
      format?: string;
      aspectRatio?: string;
      duration?: string;
    };
  }) => apiClient.post('/ai/heygen/generate', {
    templateId: data.templateId,
    productId: data.productId,
    instruction: data.instruction,
    formatSpecs: data.formatSpecs
  }),

  // RunwayML generation (Video/Image)
  generateWithRunway: (data: {
    type: 'image' | 'video';
    instruction: string;
    productInfo: {
      name: string;
      description: string;
    };
    formatSpecs: {
      width?: number;
      height?: number;
      duration?: string;
    };
  }) => apiClient.post('/ai/runwayml/generate', {
    prompt: data.instruction,
    type: data.type,
    options: data.formatSpecs
  }),

  // OpenAI generation (Text/Image)
  generateWithOpenAI: (data: {
    type: 'text' | 'image';
    instruction: string;
    productInfo: {
      name: string;
      description: string;
    };
    formatSpecs: {
      maxTokens?: number;
      temperature?: number;
      size?: string;
    };
  }) => apiClient.post('/ai/openai/generate', {
    prompt: data.instruction,
    type: data.type,
    options: data.formatSpecs
  }),



  // Get HeyGen templates
  getHeyGenTemplates: () => apiClient.get('/ai/heygen/templates'),

  // Get generation status (HeyGen)
  getStatus: (videoId: string) => apiClient.get(`/ai/heygen/status/${videoId}`),

  // Get AI generation statistics
  getStats: () => apiClient.get('/ai/stats'),

  // Test environment variables
  testEnv: () => apiClient.get('/ai/test-env'),

  // Test all services
  testAll: () => apiClient.post('/ai/test-all'),
};

export default generationAPI; 