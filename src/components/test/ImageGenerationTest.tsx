import { useState } from 'react';
import { Button } from '@/components/ui/forms/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Badge } from '@/components/ui/data_display/badge';
import { Download, Save } from 'lucide-react';
import { useToast } from '@/hooks/ui/use-toast';
import { SaveAssetDialog } from '@/components/inventory/dialogs/SaveAssetDialog';
import { generateMockImage } from '@/utils/mockGeneration';
import { InventoryItem, AssetGenerationConfig, GeneratedAsset } from '@/types/inventory';

export function ImageGenerationTest() {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);

  // Mock product data
  const mockProduct: InventoryItem = {
    id: 'product-1',
    name: 'Premium Wireless Headphones',
    description: 'High-quality audio experience with noise cancellation',
    price: 299.99,
    sku: 'WH-001',
    category: 'Electronics',
    brand: 'AudioTech',
    images: ['https://picsum.photos/400/400?random=1'],
    metadata: {},
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  };

  // Mock configuration
  const mockConfig: AssetGenerationConfig = {
    channel: 'facebook',
    asset_type: 'image',
    type: 'Feed Post',
    specification: '1080x1080',
    description: 'Create compelling image ad for Premium Wireless Headphones with strong CTA, emojis, and urgency for Facebook Feed Post (1080x1080)'
  };

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Simulate generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const fullInstruction = `#channel: Facebook
#type: Feed Post
#spec: 1080x1080
#product: Premium Wireless Headphones by AudioTech
#price: $299.99
#format_requirements: Optimize for Facebook Feed Post with specifications: 1080x1080
#advertising_context: Include CTA, emojis, urgency, sales language

Create compelling image ad for Premium Wireless Headphones with strong CTA, emojis, and urgency for Facebook Feed Post (1080x1080)`;

      const result = generateMockImage(mockProduct, mockConfig, fullInstruction);
      setGeneratedAsset(result);

      toast({
        title: "Generation Successful",
        description: "Your image has been generated with format: 1080x1080",
      });
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (asset: GeneratedAsset) => {
    if (asset.url) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = `${asset.type}-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Download Started",
        description: "Downloading your image...",
      });
    }
  };

  const generateSaveData = () => ({
    title: `${mockProduct.name} - Facebook Feed Post`,
    description: `Product: ${mockProduct.name}
Brand: ${mockProduct.brand}
Category: ${mockProduct.category}
Description: ${mockProduct.description}
Channel: Facebook
Format: Feed Post
Specifications: 1080x1080`,
    tags: [
      mockProduct.brand?.toLowerCase(),
      mockProduct.category?.toLowerCase(),
      'facebook',
      'image',
      'feed-post',
      'generated'
    ].filter(Boolean) as string[]
  });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Generation Test</CardTitle>
          <CardDescription>
            Test the complete image generation flow without external dependencies
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Product Info */}
          <div className="flex items-center space-x-4 p-4 border rounded-lg">
            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={mockProduct.images[0]}
                alt={mockProduct.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-medium">{mockProduct.name}</h3>
              <p className="text-sm text-gray-600">{mockProduct.description}</p>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline">{mockProduct.brand}</Badge>
                <Badge variant="outline">{mockProduct.category}</Badge>
                <Badge variant="outline">${mockProduct.price}</Badge>
              </div>
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
            <div>
              <label className="text-sm font-medium">Channel</label>
              <p className="text-sm text-gray-600">Facebook</p>
            </div>
            <div>
              <label className="text-sm font-medium">Format</label>
              <p className="text-sm text-gray-600">Feed Post (1080x1080)</p>
            </div>
            <div>
              <label className="text-sm font-medium">Asset Type</label>
              <p className="text-sm text-gray-600">Image</p>
            </div>
            <div>
              <label className="text-sm font-medium">Specification</label>
              <p className="text-sm text-gray-600">1080x1080</p>
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Generating Image...
              </>
            ) : (
              'Generate Image'
            )}
          </Button>

          {/* Generated Asset Display */}
          {generatedAsset && (
            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-medium">Generated Image</h4>
              
              <div className="space-y-2">
                <img
                  src={generatedAsset.url}
                  alt="Generated asset"
                  className="max-w-full h-auto rounded border max-h-64 object-contain"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <SaveAssetDialog
                  asset={{
                    id: generatedAsset.id || `${generatedAsset.type}-${Date.now()}`,
                    type: 'image',
                    url: generatedAsset.url!,
                    instruction: generatedAsset.instruction,
                    source_system: 'runway',
                    channel: 'facebook',
                    inventoryId: mockProduct.id
                  }}
                  prefillData={generateSaveData()}
                />

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(generatedAsset)}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </Button>
              </div>

              <div className="text-xs text-gray-500">
                <p><strong>Status:</strong> {generatedAsset.status}</p>
                <p><strong>Message:</strong> {generatedAsset.message}</p>
                <p><strong>URL:</strong> {generatedAsset.url}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
