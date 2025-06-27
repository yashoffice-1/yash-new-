
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Image, Video, FileText, Layers } from "lucide-react";
import { GenerationModal } from "./GenerationModal";

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

interface InventoryItemRowProps {
  product: InventoryItem;
  onGenerate: (productId: string, type: 'image' | 'video' | 'content' | 'formats') => void;
}

export function InventoryItemRow({ product, onGenerate }: InventoryItemRowProps) {
  const [showModal, setShowModal] = useState(false);
  const [generationType, setGenerationType] = useState<'image' | 'video' | 'content' | 'formats'>('image');
  
  const primaryImage = product.images?.[0];

  const handleGenerateClick = (type: 'image' | 'video' | 'content' | 'formats') => {
    setGenerationType(type);
    setShowModal(true);
  };

  const handleConfirmGeneration = (instruction: string) => {
    onGenerate(product.id, generationType);
    setShowModal(false);
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
              >
                <Image className="h-4 w-4" />
                <span className="hidden sm:inline">Image</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateClick('video')}
                className="flex items-center space-x-1"
              >
                <Video className="h-4 w-4" />
                <span className="hidden sm:inline">Video</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateClick('content')}
                className="flex items-center space-x-1"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Content</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateClick('formats')}
                className="flex items-center space-x-1"
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
        onClose={() => setShowModal(false)}
        onConfirm={handleConfirmGeneration}
        product={product}
        generationType={generationType}
        title={getGenerationTypeLabel()}
      />
    </>
  );
}
