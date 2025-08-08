import { InventoryItem, AssetGenerationConfig, GeneratedAsset } from '@/types/inventory';

// Mock image generation function
export const generateMockImage = (product: InventoryItem, config: AssetGenerationConfig, instruction: string): GeneratedAsset => {
  const timestamp = Date.now();
  const dimensions = config.specification || '1080x1080';
  const [width, height] = dimensions.split('x').map(Number);
  
  // Create a mock image URL based on product and configuration
  const mockImageUrl = `https://picsum.photos/${width}/${height}?random=${timestamp}&product=${encodeURIComponent(product.name)}&channel=${config.channel}&type=${config.type}`;
  
  return {
    id: `generated-${timestamp}`,
    type: config.asset_type,
    url: mockImageUrl,
    instruction: instruction,
    status: 'completed',
    message: 'Asset generated successfully'
  };
};

// Mock content generation function
export const generateMockContent = (product: InventoryItem, config: AssetGenerationConfig, instruction: string): GeneratedAsset => {
  const content = `Generated ${config.asset_type} content for ${product.name} based on: ${instruction}

Key Features:
• Optimized for ${config.channel} platform
• Format: ${config.type}
• Specifications: ${config.specification}
• Product: ${product.name}
• Brand: ${product.brand || 'N/A'}
• Category: ${product.category || 'N/A'}

This content is specifically tailored for ${config.channel} ${config.type} format and designed to engage your target audience effectively.`;

  return {
    type: 'content',
    content: content,
    instruction: instruction
  };
};

// Mock video generation function
export const generateMockVideo = (product: InventoryItem, config: AssetGenerationConfig, instruction: string): GeneratedAsset => {
  const timestamp = Date.now();
  const dimensions = config.specification || '1920x1080';
  const [width, height] = dimensions.split('x').map(Number);
  
  // Create a mock video URL
  const mockVideoUrl = `https://sample-videos.com/zip/10/mp4/SampleVideo_${width}x${height}_1mb.mp4?t=${timestamp}`;
  
  return {
    id: `generated-${timestamp}`,
    type: config.asset_type,
    url: mockVideoUrl,
    instruction: instruction,
    status: 'completed',
    message: 'Video generated successfully'
  };
};

// Main generation function that routes to appropriate mock generator
export const generateMockAsset = (product: InventoryItem, config: AssetGenerationConfig, instruction: string): GeneratedAsset => {
  switch (config.asset_type) {
    case 'image':
      return generateMockImage(product, config, instruction);
    case 'video':
      return generateMockVideo(product, config, instruction);
    case 'content':
      return generateMockContent(product, config, instruction);
    default:
      return generateMockImage(product, config, instruction);
  }
};
