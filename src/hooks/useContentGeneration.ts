
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedContent {
  headline: string;
  copy: string;
  cta: string;
  hashtags: string[];
}

interface UseContentGenerationProps {
  onSuccess?: (content: GeneratedContent) => void;
}

export function useContentGeneration({ onSuccess }: UseContentGenerationProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateContent = async (instruction: string): Promise<GeneratedContent | null> => {
    setIsGenerating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'generate-content',
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
        throw new Error(data.error || 'Failed to generate content');
      }

      let content: GeneratedContent;
      try {
        content = JSON.parse(data.result);
      } catch {
        // Fallback if the response isn't valid JSON
        content = {
          headline: "Premium Audio Experience",
          copy: "Experience superior sound quality with our wireless headphones. Perfect for professionals who demand excellence.",
          cta: "Shop Now",
          hashtags: ["#AudioExcellence", "#WirelessFreedom", "#PremiumSound"]
        };
      }

      toast({
        title: "Content Generated",
        description: "Your marketing content has been created successfully!",
      });

      onSuccess?.(content);
      return content;

    } catch (error) {
      console.error('Error generating content:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate content. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateContent,
    isGenerating
  };
}
