
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedContent {
  content: string;
  timestamp: Date;
}

interface UseContentGenerationProps {
  onSuccess?: (content: GeneratedContent) => void;
  productInfo?: {
    name: string;
    description?: string | null;
    category?: string | null;
    brand?: string | null;
  };
}

export function useContentGeneration({ onSuccess, productInfo }: UseContentGenerationProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateContent = async (instruction: string): Promise<GeneratedContent | null> => {
    setIsGenerating(true);
    
    try {
      const defaultProductInfo = {
        name: "Premium Wireless Headphones",
        description: "High-quality audio experience with noise cancellation"
      };

      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'marketing-content',
          instruction: instruction,
          productInfo: productInfo || defaultProductInfo
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate content');
      }

      const content: GeneratedContent = {
        content: data.result,
        timestamp: new Date()
      };

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
