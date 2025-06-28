
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedVideo {
  id: string;
  url: string;
  instruction: string;
  source_system: string;
  timestamp: Date;
  message?: string; // For HeyGen Zapier workflow feedback
}

interface FormatSpecs {
  channel?: string;
  assetType?: string;
  format?: string;
  specification?: string;
  width?: number;
  height?: number;
  dimensions?: string;
  aspectRatio?: number;
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
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
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
            dimensions: "1080x1920"
          }
        }
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
      const successMessage = provider === 'runway' 
        ? `Video created using RunwayML with format: ${formatSpecs?.format || 'video'} (${formatSpecs?.dimensions || '1080x1920'})`
        : `Video generation request sent to HeyGen via Google Sheets + Zapier automation with format: ${formatSpecs?.format || 'video'}`;

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
