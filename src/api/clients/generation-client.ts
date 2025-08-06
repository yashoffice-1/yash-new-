import { generationClient } from '../shared/axios-config';

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
  }) => generationClient.post('/ai/heygen/generate', {
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
  }) => generationClient.post('/ai/runwayml/generate', {
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
  }) => generationClient.post('/ai/openai/generate', {
    prompt: data.instruction,
    type: data.type,
    options: data.formatSpecs
  }),

  // Get HeyGen templates
  getHeyGenTemplates: () => generationClient.get('/ai/heygen/templates'),

  // Get generation status (HeyGen)
  getStatus: (videoId: string) => generationClient.get(`/ai/heygen/status/${videoId}`),

  // Get AI generation statistics
  getStats: () => generationClient.get('/ai/stats'),

  // Test environment variables
  testEnv: () => generationClient.get('/ai/test-env'),

  // Test all services
  testAll: () => generationClient.post('/ai/test-all'),
};

export default generationAPI; 