
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedVideo {
  id: string;
  url: string;
  instruction: string;
  source_system: string;
  timestamp: Date;
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
    provider: 'runway' | 'heygen' = 'runway'
  ): Promise<GeneratedVideo | null> => {
    setIsGenerating(true);
    
    try {
      const functionName = provider === 'runway' ? 'runwayml-generate' : 'heygen-generate';
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          type: 'video',
          instruction: instruction,
          imageUrl: imageUrl,
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
        throw new Error(data.error || 'Failed to generate video');
      }

      const video: GeneratedVideo = {
        id: data.asset_id,
        url: data.asset_url,
        instruction: instruction,
        source_system: provider,
        timestamp: new Date()
      };

      toast({
        title: "Video Generated",
        description: `Your video has been created using ${provider}!`,
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
