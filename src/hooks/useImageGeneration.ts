
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImage {
  id: string;
  url: string;
  instruction: string;
  source_system: string;
  timestamp: Date;
}

interface UseImageGenerationProps {
  onSuccess?: (image: GeneratedImage) => void;
}

export function useImageGeneration({ onSuccess }: UseImageGenerationProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateImage = async (instruction: string): Promise<GeneratedImage | null> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('runwayml-generate', {
        body: {
          type: 'image',
          instruction: instruction,
          productInfo: {
            name: "Premium Wireless Headphones",
            description: "High-quality audio experience with noise cancellation"
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const image: GeneratedImage = {
        id: data.asset_id,
        url: data.asset_url,
        instruction: instruction,
        source_system: 'runway',
        timestamp: new Date()
      };

      toast({
        title: "Image Generated",
        description: "Your image has been created successfully!",
      });

      onSuccess?.(image);
      return image;

    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate image. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateImage,
    isGenerating
  };
}
