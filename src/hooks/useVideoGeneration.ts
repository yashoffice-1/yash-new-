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
  gif_url?: string; // New field for HeyGen GIF URLs
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
  requiresCallToAction?: boolean;
  includeEmojis?: boolean;
  useSalesLanguage?: boolean;
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
      
      // Parse duration from format specs or specification
      let videoDuration = '5'; // default
      if (formatSpecs?.duration) {
        // Extract numeric value from duration string
        const durationMatch = formatSpecs.duration.match(/(\d+)/);
        videoDuration = durationMatch ? durationMatch[1] : '5';
      } else if (formatSpecs?.specification) {
        // Try to extract duration from specification
        const specDurationMatch = formatSpecs.specification.match(/(\d+)(?:s|sec|seconds?)/i);
        videoDuration = specDurationMatch ? specDurationMatch[1] : '5';
      }

      // Ensure duration is within acceptable limits (typically 5-30 seconds for most platforms)
      const duration = Math.min(Math.max(parseInt(videoDuration), 5), 30);

      // Enhanced instruction for advertising videos
      let enhancedInstruction = instruction;
      if (formatSpecs?.requiresCallToAction || formatSpecs?.format?.toLowerCase().includes('ad')) {
        enhancedInstruction += `\n\nThis is advertising video content. Ensure visual elements support:
        - Clear product showcasing
        - Text overlays with strong call-to-action
        - Visual urgency elements if appropriate
        - Brand visibility throughout the video
        - Engaging visual storytelling for ${formatSpecs?.channel || 'social media'}`;
      }

      const functionName = provider === 'runway' ? 'runwayml-generate' : 'heygen-generate';
      const requestBody = {
        type: 'video',
        instruction: enhancedInstruction,
        imageUrl: imageUrl,
        productInfo: {
          name: "Premium Wireless Headphones",
          description: "High-quality audio experience with noise cancellation"
        },
        formatSpecs: {
          width: formatSpecs?.width || 1080,
          height: formatSpecs?.height || 1920,
          dimensions: formatSpecs?.dimensions || "1080x1920",
          aspectRatio: formatSpecs?.aspectRatio || "9:16",
          duration: `${duration}s`,
          channel: formatSpecs?.channel,
          format: formatSpecs?.format,
          specification: formatSpecs?.specification,
          videoLength: duration,
          framerate: 24,
          quality: 'high',
          ...formatSpecs
        }
      };

      console.log('Sending video generation request with enhanced format specs:', requestBody);

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
        message: data.message,
        gif_url: data.gif_url // Store GIF URL if provided by HeyGen
      };

      // Show enhanced success messages with format details
      const aspectRatio = formatSpecs?.aspectRatio || '9:16';
      const durationText = `${duration}s`;
      const dimensions = formatSpecs?.dimensions || '1080x1920';
      const specification = formatSpecs?.specification || 'default';
      const isAd = formatSpecs?.requiresCallToAction || formatSpecs?.format?.toLowerCase().includes('ad');
      
      const successMessage = provider === 'runway' 
        ? `${isAd ? 'Ad video' : 'Video'} created using RunwayML with ${aspectRatio} aspect ratio (${dimensions}) for ${durationText} with format: ${specification}`
        : `${isAd ? 'Ad video' : 'Video'} generation request sent to HeyGen via Google Sheets + Zapier automation with ${aspectRatio} aspect ratio for ${durationText} with format: ${specification}${data.gif_url ? ' (GIF preview will be available)' : ''}`;

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
