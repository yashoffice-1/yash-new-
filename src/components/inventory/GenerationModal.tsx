
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";

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

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (instruction: string) => void;
  product: InventoryItem;
  generationType: 'image' | 'video' | 'content' | 'formats';
  title: string;
}

export function GenerationModal({ isOpen, onClose, onConfirm, product, generationType, title }: GenerationModalProps) {
  const [instruction, setInstruction] = useState('');

  const getDefaultInstruction = () => {
    const brandText = product.brand ? `for ${product.brand}` : '';
    const categoryText = product.category ? `in the ${product.category} category` : '';
    
    switch (generationType) {
      case 'image':
        return `Create a high-quality promotional image ${brandText} ${categoryText}. Focus on ${product.name} with clean, modern styling.`;
      case 'video':
        return `Create an engaging video ${brandText} ${categoryText}. Showcase ${product.name} with dynamic visuals and smooth transitions.`;
      case 'content':
        return `Write compelling marketing content ${brandText} ${categoryText}. Highlight the key features and benefits of ${product.name}.`;
      case 'formats':
        return `Generate multiple format variations ${brandText} ${categoryText}. Create different sizes and layouts for ${product.name} across various platforms.`;
      default:
        return `Generate content for ${product.name}`;
    }
  };

  const handleOpen = () => {
    if (isOpen && !instruction) {
      setInstruction(getDefaultInstruction());
    }
  };

  const handleConfirm = () => {
    onConfirm(instruction);
    setInstruction('');
  };

  const handleClose = () => {
    onClose();
    setInstruction('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl" onOpenAutoFocus={handleOpen}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Configure the generation settings for this product
          </DialogDescription>
        </DialogHeader>

        {/* Product Preview */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = 
                    '<div class="w-full h-full flex items-center justify-center bg-gray-200"><Package class="h-4 w-4 text-gray-400" /></div>';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Package className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium">{product.name}</h3>
            <div className="flex items-center space-x-2 mt-1">
              {product.brand && (
                <Badge variant="secondary" className="text-xs">
                  {product.brand}
                </Badge>
              )}
              {product.category && (
                <Badge variant="outline" className="text-xs">
                  {product.category}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Instruction Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Generation Instructions</label>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Enter your generation instructions..."
            className="min-h-[120px]"
          />
          <p className="text-sm text-gray-500">
            Provide detailed instructions for the AI to generate the best results for your {generationType}.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!instruction.trim()}>
            Generate {generationType}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
