
import { useState, useEffect } from "react";
import { FakeProduct } from "../FakeProduct";
import { InstructionModule } from "../InstructionModule";
import { GeneratorButtons } from "../GeneratorButtons";
import { AssetDisplay } from "../inventory/display/AssetDisplay";
import { SocialMediaAutoPost } from "./social/SocialMediaAutoPost";
import { useImageGeneration } from "@/hooks/generation/useImageGeneration";
import { useVideoGeneration } from "@/hooks/generation/useVideoGeneration";
import { useContentGeneration } from "@/hooks/generation/useContentGeneration";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, DollarSign } from "lucide-react";

type GeneratorType = 'image' | 'video' | 'content' | 'combo';

interface GeneratedAsset {
  id: string;
  type: GeneratorType;
  url: string;
  instruction: string;
  timestamp: Date;
  source_system?: string;
  content?: string;
  status?: string;
  runway_task_id?: string;
  message?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  images: string[];
  metadata: any;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UserDashboardProps {
  selectedProduct?: InventoryItem | null;
}

export function UserDashboard({ selectedProduct }: UserDashboardProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [approvedInstruction, setApprovedInstruction] = useState<string | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<InventoryItem | null>(null);

  // Update current product when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setCurrentProduct(selectedProduct);
      // Auto-select the first image if available
      if (selectedProduct.images && selectedProduct.images.length > 0) {
        setSelectedImage(selectedProduct.images[0]);
      }
      // Reset instruction when switching products
      setApprovedInstruction(null);
    }
  }, [selectedProduct]);

  const { generateImage } = useImageGeneration({
    onSuccess: (image) => {
      const asset: GeneratedAsset = {
        id: image.id,
        type: 'image',
        url: image.url,
        instruction: approvedInstruction || '',
        timestamp: image.timestamp,
        source_system: image.source_system,
        status: image.status,
        runway_task_id: image.runway_task_id,
        message: image.message
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const { generateVideo } = useVideoGeneration({
    onSuccess: (video) => {
      const asset: GeneratedAsset = {
        id: video.id,
        type: 'video',
        url: video.url,
        instruction: approvedInstruction || '',
        timestamp: video.timestamp,
        source_system: video.source_system,
        message: video.message
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const { generateContent } = useContentGeneration({
    onSuccess: (content) => {
      const asset: GeneratedAsset = {
        id: `content-${Date.now()}`,
        type: 'content',
        url: '',
        instruction: approvedInstruction || '',
        timestamp: content.timestamp,
        source_system: 'openai',
        content: content.content
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const handleGenerate = async (type: GeneratorType) => {
    if (!approvedInstruction) return;
    
    setIsGenerating(true);
    
    try {
      switch (type) {
        case 'image':
          await generateImage(approvedInstruction);
          break;
        case 'video':
          await generateVideo(approvedInstruction, selectedImage || undefined);
          break;
        case 'content':
          await generateContent(approvedInstruction);
          break;
        case 'combo':
          // Generate all three in sequence
          await generateImage(approvedInstruction);
          await generateVideo(approvedInstruction, selectedImage || undefined);
          await generateContent(approvedInstruction);
          break;
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">FeedGenerator</h2>
        <p className="text-muted-foreground">Create AI-powered content for your products</p>
      </div>

      {/* Step 1: Product Selection */}
      {currentProduct ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Selected Product</CardTitle>
            <CardDescription>
              Product selected from inventory for content generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-4 p-4 border rounded-lg bg-green-50">
              {currentProduct.images && currentProduct.images.length > 0 && (
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={currentProduct.images[0]}
                    alt={currentProduct.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = 
                        '<div class="w-full h-full flex items-center justify-center bg-gray-200"><Package class="h-4 w-4 text-gray-400" /></div>';
                    }}
                  />
                </div>
              )}
              
              <div className="flex-1 space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-lg">{currentProduct.name}</h3>
                  {currentProduct.price && (
                    <div className="flex items-center text-sm font-medium text-green-600">
                      <DollarSign className="h-3 w-3" />
                      {currentProduct.price}
                    </div>
                  )}
                </div>
                
                {currentProduct.description && (
                  <p className="text-sm text-gray-600">{currentProduct.description}</p>
                )}
                
                <div className="flex flex-wrap gap-1">
                  {currentProduct.category && (
                    <Badge variant="outline" className="text-xs">
                      {currentProduct.category}
                    </Badge>
                  )}
                  {currentProduct.brand && (
                    <Badge variant="outline" className="text-xs">
                      {currentProduct.brand}
                    </Badge>
                  )}
                  {currentProduct.sku && (
                    <Badge variant="outline" className="text-xs">
                      SKU: {currentProduct.sku}
                    </Badge>
                  )}
                </div>

                {/* Image Selection */}
                {currentProduct.images && currentProduct.images.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Select image for generation:</p>
                    <div className="grid grid-cols-4 gap-2">
                      {currentProduct.images.map((image, index) => (
                        <div
                          key={index}
                          className={`relative w-16 h-16 rounded border-2 cursor-pointer transition-all ${
                            selectedImage === image 
                              ? 'border-blue-500 ring-2 ring-blue-200' 
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedImage(image)}
                        >
                          <img
                            src={image}
                            alt={`${currentProduct.name} ${index + 1}`}
                            className="w-full h-full object-cover rounded"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              e.currentTarget.parentElement!.innerHTML = 
                                '<div class="w-full h-full flex items-center justify-center bg-gray-200 rounded"><Package class="h-3 w-3 text-gray-400" /></div>';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <FakeProduct 
          onImageSelect={setSelectedImage}
          selectedImage={selectedImage}
        />
      )}

      <InstructionModule 
        onInstructionApproved={setApprovedInstruction}
        selectedImage={selectedImage}
      />

      <GeneratorButtons 
        approvedInstruction={approvedInstruction}
        selectedImage={selectedImage}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />

      <AssetDisplay 
        assets={generatedAssets}
        isGenerating={isGenerating}
      />

      {/* Show social media auto-post when we have an approved instruction and at least one image asset */}
      {(approvedInstruction && generatedAssets.some(asset => asset.type === 'image')) && (
        <SocialMediaAutoPost 
          imageUrl={generatedAssets.find(asset => asset.type === 'image')?.url || ''}
          instruction={approvedInstruction}
          isVisible={true}
        />
      )}
    </div>
  );
}
