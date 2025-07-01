
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GeneratedContent {
  content: string;
  timestamp: Date;
}

interface FormatSpecs {
  channel?: string;
  assetType?: string;
  format?: string;
  specification?: string;
  maxChars?: number;
  requirements?: string;
  requiresCallToAction?: boolean;
  includeEmojis?: boolean;
  useSalesLanguage?: boolean;
}

interface UseContentGenerationProps {
  onSuccess?: (content: GeneratedContent) => void;
  productInfo?: {
    name: string;
    description?: string | null;
    category?: string | null;
    brand?: string | null;
    price?: number | null;
  };
}

export function useContentGeneration({ onSuccess, productInfo }: UseContentGenerationProps = {}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateContent = async (
    instruction: string, 
    formatSpecs?: FormatSpecs
  ): Promise<GeneratedContent | null> => {
    setIsGenerating(true);
    
    try {
      console.log('Generating content with format specs:', formatSpecs);
      
      const defaultProductInfo = {
        name: "Premium Wireless Headphones",
        description: "High-quality audio experience with noise cancellation"
      };

      // Enhanced instruction for advertising content
      let enhancedInstruction = instruction;
      if (formatSpecs?.requiresCallToAction) {
        enhancedInstruction += `\n\nIMPORTANT: This is advertising content. MUST include:
        - Strong, compelling call-to-action (e.g., "Shop Now", "Get Yours Today", "Limited Time Offer")
        - Relevant emojis to increase engagement
        - Urgency or scarcity elements where appropriate
        - Sales-focused language that drives conversions
        - Price information if available: ${productInfo?.price ? `$${productInfo.price}` : 'mention competitive pricing'}`;
      }

      const { data, error } = await supabase.functions.invoke('openai-generate', {
        body: {
          type: 'marketing-content',
          instruction: enhancedInstruction,
          productInfo: productInfo || defaultProductInfo,
          formatSpecs: formatSpecs || {
            format: 'general',
            specification: 'Standard marketing content'
          },
          advertisingContext: formatSpecs?.requiresCallToAction ? {
            requiresCallToAction: true,
            includeEmojis: formatSpecs.includeEmojis,
            useSalesLanguage: formatSpecs.useSalesLanguage,
            channel: formatSpecs.channel,
            format: formatSpecs.format
          } : null
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

      const contentType = formatSpecs?.requiresCallToAction ? 'advertising content' : 'content';
      const formatInfo = formatSpecs?.format || 'marketing content';
      const ctaNote = formatSpecs?.requiresCallToAction ? ' with call-to-action and sales elements' : '';

      toast({
        title: "Content Generated",
        description: `Your ${formatInfo} has been created${ctaNote}`,
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
