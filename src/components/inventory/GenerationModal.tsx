
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Package, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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

const SUGGESTION_PROMPTS = {
  image: [
    "Create a high-quality product showcase image with modern styling",
    "Design a social media ready image with vibrant colors",
    "Generate a lifestyle image showing the product in use",
    "Create an advertising banner with promotional text"
  ],
  video: [
    "Create a dynamic product showcase video with smooth transitions",
    "Generate an engaging social media video with motion graphics",
    "Create a product demo video highlighting key features",
    "Design a promotional video with cinematic effects"
  ],
  content: [
    "Write compelling marketing copy for social media",
    "Create persuasive product descriptions for e-commerce",
    "Generate email marketing content with call-to-action",
    "Write SEO-optimized product content for web"
  ],
  formats: [
    "Create multiple format variations for different platforms",
    "Generate content optimized for various social media channels",
    "Create a complete marketing package with different sizes",
    "Design responsive content for web and mobile"
  ]
};

export function GenerationModal({ isOpen, onClose, onConfirm, product, generationType, title }: GenerationModalProps) {
  const { toast } = useToast();
  const [instruction, setInstruction] = useState('');
  const [isImprovingInstruction, setIsImprovingInstruction] = useState(false);

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

  useEffect(() => {
    if (isOpen && !instruction) {
      setInstruction(getDefaultInstruction());
    }
  }, [isOpen, product, generationType]);

  // Reset instruction when modal closes
  useEffect(() => {
    if (!isOpen) {
      setInstruction('');
    }
  }, [isOpen]);

  const handleSuggestionClick = (suggestion: string) => {
    const enhancedSuggestion = `${suggestion} for ${product.name}${product.brand ? ` by ${product.brand}` : ''}${product.description ? `. ${product.description}` : ''}`;
    setInstruction(enhancedSuggestion);
  };

  const handleImproveInstruction = async () => {
    if (!instruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction first.",
        variant: "destructive",
      });
      return;
    }

    setIsImprovingInstruction(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'clean-instruction',
          instruction: instruction.trim(),
          productInfo: {
            name: product.name,
            description: product.description,
            category: product.category,
            brand: product.brand
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to improve instruction');
      }

      setInstruction(data.result);
      toast({
        title: "Instruction Improved",
        description: "Your instruction has been optimized for better AI generation.",
      });
    } catch (error) {
      console.error('Error improving instruction:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to improve instruction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImprovingInstruction(false);
    }
  };

  const handleConfirm = () => {
    if (!instruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    onConfirm(instruction);
  };

  const handleClose = () => {
    // Only allow closing if not generating
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
            {product.description && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{product.description}</p>
            )}
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Quick Ideas From Your Marketing Calendar</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {SUGGESTION_PROMPTS[generationType].map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-left h-auto p-3 whitespace-normal"
              >
                <div className="text-xs">{suggestion}</div>
              </Button>
            ))}
          </div>
        </div>

        {/* Instruction Input */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Generation Instructions</label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImproveInstruction}
              disabled={isImprovingInstruction || !instruction.trim()}
              className="flex items-center space-x-1"
            >
              {isImprovingInstruction ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              <span>AI Improve</span>
            </Button>
          </div>
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

        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!instruction.trim()}>
            Generate {generationType}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
