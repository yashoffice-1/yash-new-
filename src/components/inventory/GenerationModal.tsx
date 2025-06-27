
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Package, Sparkles, Loader2, Download, Save, RefreshCw } from "lucide-react";
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
    "4th of July Message",
    "Send to a Customer via SMS", 
    "Instagram Story",
    "Facebook Post",
    "250X 250 Banner"
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAsset, setGeneratedAsset] = useState<GeneratedAsset | null>(null);
  const [showResults, setShowResults] = useState(false);

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

  // Reset state when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setInstruction('');
      setGeneratedAsset(null);
      setShowResults(false);
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion === "4th of July Message") {
      setInstruction(`I want this product to showcase 4th of July SALE with Fireworks in the background and the message "4th of July SUPER SALE" and the number "30% OFF"`);
    } else {
      const enhancedSuggestion = `${suggestion} for ${product.name}${product.brand ? ` by ${product.brand}` : ''}${product.description ? `. ${product.description}` : ''}`;
      setInstruction(enhancedSuggestion);
    }
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

  const handleConfirm = async () => {
    if (!instruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction before proceeding.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Call the generation API directly here
      const { data, error } = await supabase.functions.invoke('runwayml-generate', {
        body: {
          type: 'image',
          instruction: instruction,
          productInfo: {
            name: product.name,
            description: product.description
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success && !data.asset_url) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const asset: GeneratedAsset = {
        id: data.asset_id || `image-${Date.now()}`,
        type: 'image',
        url: data.asset_url,
        instruction: instruction,
        timestamp: new Date(),
        source_system: 'runway',
        status: data.status,
        message: data.message
      };

      setGeneratedAsset(asset);
      setShowResults(true);

      // Show different toast messages based on status
      if (data.status === 'processing') {
        toast({
          title: "Image Generation Started",
          description: "Your image is being generated by RunwayML. This may take a few minutes.",
        });
      } else if (data.status === 'error') {
        toast({
          title: "Using Placeholder",
          description: data.message || "RunwayML API issue detected. Using placeholder image for testing.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Image Generated",
          description: "Your image has been created successfully!",
        });
      }

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
    
    // Call the original onConfirm callback
    onConfirm(instruction);
  };

  const handleDownload = () => {
    if (generatedAsset?.url) {
      const link = document.createElement('a');
      link.href = generatedAsset.url;
      link.download = `${product.name}-${generatedAsset.type}-${generatedAsset.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `${generatedAsset.type} asset download initiated.`,
      });
    }
  };

  const handleSaveToLibrary = () => {
    toast({
      title: "Saved to Library",
      description: "Asset has been saved to your library.",
    });
  };

  const handleStartOver = () => {
    setShowResults(false);
    setGeneratedAsset(null);
    setInstruction(getDefaultInstruction());
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  if (showResults && generatedAsset) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Here is Your Generated Image:</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Generated Image Display */}
            <div className="flex justify-center">
              <div className="relative rounded-lg overflow-hidden bg-gray-100 max-w-md">
                {generatedAsset.url ? (
                  <img
                    src={generatedAsset.url}
                    alt="Generated content"
                    className="w-full h-auto object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = 
                        '<div class="w-full h-48 flex items-center justify-center bg-gray-200 rounded-lg"><Package class="h-8 w-8 text-gray-400" /><span class="ml-2 text-gray-500">Image failed to load</span></div>';
                    }}
                  />
                ) : (
                  <div className="w-full h-48 flex items-center justify-center bg-gray-100">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </div>
            </div>

            {generatedAsset.message && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                <p className="text-sm text-blue-800">{generatedAsset.message}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button
                variant="outline"
                onClick={handleStartOver}
                className="flex items-center space-x-1 border-red-500 text-red-500 hover:bg-red-50"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Modify Asset</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleStartOver}
                className="flex items-center space-x-1 border-blue-500 text-blue-500 hover:bg-blue-50"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Start All Over</span>
              </Button>

              <Button
                onClick={handleDownload}
                className="flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
            </div>

            {/* Generate Content Option */}
            <div className="text-center">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
                onClick={() => {
                  // This would trigger content generation
                  toast({
                    title: "Content Generation",
                    description: "Content generation feature coming soon!",
                  });
                }}
              >
                <Save className="h-5 w-5 mr-2" />
                Do you Need Text to Go with the Asset For an Ad, Post or Content?
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>What Do you Want To Generate?</DialogTitle>
          <DialogDescription>
            Some Quick Ideas From Your Marketing Calendar and Previous Generations:
          </DialogDescription>
        </DialogHeader>

        {/* Suggestions */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {SUGGESTION_PROMPTS[generationType].map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-left h-auto p-3 whitespace-normal text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        </div>

        {/* Instruction Input */}
        <div className="space-y-3">
          <div className="border-2 border-black rounded-lg p-4 bg-gray-50">
            <div className="space-y-2">
              <div className="bg-yellow-300 text-black px-2 py-1 rounded text-sm font-semibold">
                Type Your Instructions Here.
              </div>
              <div className="bg-yellow-300 text-black px-2 py-1 rounded text-xs">
                If you want a Message with the Product Like "SALE" be sure you use quotes to send the instructions
              </div>
              
              <Textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="Example: I want this product to showcase 4th of July SALE with Fireworks in the background and the message '4th of July SUPER SALE' and the number '30% OFF'"
                className="min-h-[120px] bg-white"
              />
              
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
                <span>Improved with AI</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Generation Status */}
        {isGenerating && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium">Generating Content...</h3>
              <p className="text-gray-500">This may take a few moments</p>
            </div>
          </div>
        )}

        <div className="flex justify-center pt-4 border-t">
          <Button 
            onClick={handleConfirm} 
            disabled={!instruction.trim() || isGenerating}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "I like the Description, Generate Image >>"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
