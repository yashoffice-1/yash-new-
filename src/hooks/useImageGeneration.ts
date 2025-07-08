
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedImage {
  id: string;
  url: string;
  instruction: string;
  source_system: string;
  timestamp: Date;
  status?: string;
  runway_task_id?: string;
  message?: string;
}

interface FormatSpecs {
  channel?: string;
  assetType?: string;
  format?: string;
  specification?: string;
  width?: number;
  height?: number;
  dimensions?: string;
  aspectRatio?: string;
  duration?: string;
}

interface UseImageGenerationProps {
  onSuccess?: (image: GeneratedImage) => void;
}

export function useImageGeneration({ onSuccess }: UseImageGenerationProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateImage = async (
    instruction: string, 
    formatSpecs?: FormatSpecs
  ): Promise<GeneratedImage | null> => {
    setIsGenerating(true);
    
    try {
      console.log('Starting image generation with instruction:', instruction);
      console.log('Format specifications:', formatSpecs);
      console.log('Expected dimensions:', formatSpecs?.dimensions);
      console.log('Expected aspect ratio:', formatSpecs?.aspectRatio);
      
      const requestBody = {
        type: 'image',
        instruction: instruction,
        productInfo: {
          name: "Premium Wireless Headphones",
          description: "High-quality audio experience with noise cancellation"
        },
        formatSpecs: formatSpecs || {
          width: 1024,
          height: 1024,
          dimensions: "1024x1024",
          aspectRatio: "1:1"
        }
      };

      console.log('Sending request to RunwayML with format specs:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('runwayml-generate', {
        body: requestBody
      });

      console.log('Image generation response:', data);

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message);
      }

      if (!data.success && !data.asset_url) {
        throw new Error(data.error || 'Failed to generate image');
      }

      const image: GeneratedImage = {
        id: data.asset_id || `image-${Date.now()}`,
        url: data.asset_url,
        instruction: instruction,
        source_system: 'runway',
        timestamp: new Date(),
        status: data.status,
        runway_task_id: data.runway_task_id,
        message: data.message
      };

      // Show different toast messages based on status
      if (data.status === 'processing') {
        toast({
          title: "Image Generation Started",
          description: `Creating ${formatSpecs?.aspectRatio || '1:1'} image with dimensions ${formatSpecs?.dimensions || '1024x1024'}. This may take a few minutes.`,
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
          description: `Your ${formatSpecs?.aspectRatio || '1:1'} image (${formatSpecs?.dimensions || '1024x1024'}) has been created successfully with format: ${formatSpecs?.specification || 'default'}!`,
        });
      }

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
