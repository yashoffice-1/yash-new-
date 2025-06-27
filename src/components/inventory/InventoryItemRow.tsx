import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Image, Video, FileText, Layers } from "lucide-react";
import { GenerationModal } from "./GenerationModal";
import { GenerationResultsModal } from "./GenerationResultsModal";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useContentGeneration } from "@/hooks/useContentGeneration";

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

interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'content' | 'formats';
  url?: string;
  content?: string;
  instruction: string;
  timestamp: Date;
  source_system?: string;
  status?: string;
  message?: string;
}

interface InventoryItemRowProps {
  product: InventoryItem;
  onGenerate: (productId: string, type: 'image' | 'video' | 'content' | 'formats') => void;
}

export function InventoryItemRow({ product, onGenerate }: InventoryItemRowProps) {
  const [showModal, setShowModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [generationType, setGenerationType] = useState<'image' | 'video' | 'content' | 'formats'>('image');
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState('');
  
  const primaryImage = product.images?.[0];

  const productInfo = {
    name: product.name,
    description: product.description,
    category: product.category,
    brand: product.brand,
  };

  const { generateImage } = useImageGeneration({
    onSuccess: (image) => {
      const asset: GeneratedAsset = {
        id: image.id,
        type: 'image',
        url: image.url,
        instruction: currentInstruction,
        timestamp: image.timestamp,
        source_system: image.source_system,
        status: image.status,
        message: image.message
      };
      setGeneratedAssets([asset]);
      setIsGenerating(false);
      // Don't close the modal here, let the results modal handle the flow
    }
  });

  const { generateVideo } = useVideoGeneration({
    onSuccess: (video) => {
      const asset: GeneratedAsset = {
        id: video.id,
        type: 'video',
        url: video.url,
        instruction: currentInstruction,
        timestamp: video.timestamp,
        source_system: video.source_system,
        message: video.message
      };
      setGeneratedAssets([asset]);
      setIsGenerating(false);
    }
  });

  const { generateContent } = useContentGeneration({
    onSuccess: (content) => {
      const asset: GeneratedAsset = {
        id: `content-${Date.now()}`,
        type: 'content',
        content: content.content,
        instruction: currentInstruction,
        timestamp: content.timestamp,
        source_system: 'openai'
      };
      setGeneratedAssets([asset]);
      setIsGenerating(false);
    },
    productInfo
  });

  const handleGenerateClick = (type: 'image' | 'video' | 'content' | 'formats') => {
    setGenerationType(type);
    setGeneratedAssets([]); // Clear previous results
    setShowModal(true);
    setShowResultsModal(false);
  };

  const handleConfirmGeneration = async (instruction: string) => {
    setCurrentInstruction(instruction);
    setIsGenerating(true);
    // Don't close the modal immediately - keep it open to show the results
    
    try {
      switch (generationType) {
        case 'image':
          await generateImage(instruction);
          break;
        case 'video':
          await generateVideo(instruction, primaryImage);
          break;
        case 'content':
          await generateContent(instruction);
          break;
        case 'formats':
          // For formats, generate multiple types
          await generateImage(instruction);
          await generateVideo(instruction, primaryImage);
          await generateContent(instruction);
          break;
      }
    } catch (error) {
      console.error('Generation error:', error);
      setIsGenerating(false);
    }
    
    // Trigger the original onGenerate callback
    onGenerate(product.id, generationType);
  };

  const handleCloseGenerationModal = () => {
    if (!isGenerating) {
      setShowModal(false);
      setCurrentInstruction('');
      
      // If we have generated assets, show the results modal
      if (generatedAssets.length > 0) {
        setShowResultsModal(true);
      }
    }
  };

  const handleCloseResultsModal = () => {
    setShowResultsModal(false);
    setGeneratedAssets([]);
    setCurrentInstruction('');
  };

  const handleStartOver = () => {
    setShowResultsModal(false);
    setGeneratedAssets([]);
    setCurrentInstruction('');
    setShowModal(true);
  };

  const getGenerationTypeLabel = () => {
    switch (generationType) {
      case 'image':
        return 'Image Generation';
      case 'video':
        return 'Video Generation';
      case 'content':
        return 'Content Generation';
      case 'formats':
        return 'Format Generation';
      default:
        return 'Generation';
    }
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center space-x-6">
            {/* Product Image - Left */}
            <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = 
                      '<div class="w-full h-full flex items-center justify-center bg-gray-200"><Package class="h-6 w-6 text-gray-400" /></div>';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-200">
                  <Package className="h-6 w-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Information - Center */}
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold text-lg leading-tight">{product.name}</h3>
              
              <div className="flex items-center space-x-3">
                {product.brand && (
                  <Badge variant="secondary" className="text-sm">
                    {product.brand}
                  </Badge>
                )}
                {product.category && (
                  <Badge variant="outline" className="text-sm">
                    {product.category}
                  </Badge>
                )}
              </div>

              {product.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
              )}
            </div>

            {/* Action Buttons - Right */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateClick('image')}
                className="flex items-center space-x-1"
                disabled={isGenerating}
              >
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Image</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateClick('video')}
                className="flex items-center space-x-1"
                disabled={isGenerating}
              >
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Video</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateClick('content')}
                className="flex items-center space-x-1"
                disabled={isGenerating}
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Content</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateClick('formats')}
                className="flex items-center space-x-1"
                disabled={isGenerating}
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Formats</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <GenerationModal
        isOpen={showModal}
        onClose={handleCloseGenerationModal}
        onConfirm={handleConfirmGeneration}
        product={product}
        generationType={generationType}
        title={getGenerationTypeLabel()}
      />

      <GenerationResultsModal
        isOpen={showResultsModal}
        onClose={handleCloseResultsModal}
        product={product}
        assets={generatedAssets}
        isGenerating={isGenerating}
        onStartOver={handleStartOver}
      />
    </>
  );
}
