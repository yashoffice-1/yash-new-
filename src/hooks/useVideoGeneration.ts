
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedVideo {
  id: string;
  url: string;
  instruction: string;
  source_system: string;
  timestamp: Date;
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

interface UseVideoGenerationProps {
  onSuccess?: (video: GeneratedVideo) => void;
}

export function useVideoGeneration({ onSuccess }: UseVideoGenerationProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateVideo = async (
    instruction: string, 
    imageUrl?: string, 
    provider: 'runway' | 'heygen' = 'runway',
    formatSpecs?: FormatSpecs
  ): Promise<GeneratedVideo | null> => {
    setIsGenerating(true);
    
    try {
      console.log('Starting video generation with format specs:', formatSpecs);
      
      const functionName = provider === 'runway' ? 'runwayml-generate' : 'heygen-generate';
      const requestBody = {
        type: 'video',
        instruction: instruction,
        imageUrl: imageUrl,
        productInfo: {
          name: "Premium Wireless Headphones",
          description: "High-quality audio experience with noise cancellation"
        },
        formatSpecs: formatSpecs || {
          width: 1080,
          height: 1920,
          dimensions: "1080x1920",
          aspectRatio: "9:16",
          duration: "5s"
        }
      };

      console.log('Sending video generation request with format specs:', requestBody);

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: requestBody
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate video');
      }

      const video: GeneratedVideo = {
        id: data.asset_id,
        url: data.asset_url,
        instruction: instruction,
        source_system: provider === 'runway' ? 'runway' : 'heygen_zapier',
        timestamp: new Date(),
        message: data.message
      };

      // Show different success messages based on provider
      const aspectRatio = formatSpecs?.aspectRatio || '9:16';
      const duration = formatSpecs?.duration || '5s';
      const dimensions = formatSpecs?.dimensions || '1080x1920';
      const specification = formatSpecs?.specification || 'default';
      
      const successMessage = provider === 'runway' 
        ? `Video created using RunwayML with ${aspectRatio} aspect ratio (${dimensions}) for ${duration} with format: ${specification}`
        : `Video generation request sent to HeyGen via Google Sheets + Zapier automation with ${aspectRatio} aspect ratio for ${duration} with format: ${specification}`;

      toast({
        title: "Video Generation Started",
        description: successMessage,
      });

      onSuccess?.(video);
      return video;

    } catch (error) {
      console.error('Error generating video:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate video. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateVideo,
    isGenerating
  };
}
