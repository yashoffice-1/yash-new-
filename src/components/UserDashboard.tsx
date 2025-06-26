import { useState } from "react";
import { FakeProduct } from "./FakeProduct";
import { InstructionModule } from "./InstructionModule";
import { GeneratorButtons } from "./GeneratorButtons";
import { AssetDisplay } from "./AssetDisplay";
import { useToast } from "@/hooks/use-toast";
import { useImageGeneration } from "@/hooks/useImageGeneration";
import { useVideoGeneration } from "@/hooks/useVideoGeneration";
import { useContentGeneration } from "@/hooks/useContentGeneration";

type GeneratorType = 'image' | 'video' | 'content' | 'combo';

interface GeneratedAsset {
  id: string;
  type: GeneratorType;
  url: string;
  instruction: string;
  timestamp: Date;
  source_system?: string;
  content?: string;
  status?: string;
  runway_task_id?: string;
  message?: string;
}

export function UserDashboard() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [approvedInstruction, setApprovedInstruction] = useState<string | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const { toast } = useToast();

  const { generateImage, isGenerating: isGeneratingImage } = useImageGeneration({
    onSuccess: (image) => {
      const asset: GeneratedAsset = {
        id: image.id,
        type: 'image',
        url: image.url,
        instruction: image.instruction,
        timestamp: image.timestamp,
        source_system: image.source_system,
        status: image.status,
        runway_task_id: image.runway_task_id,
        message: image.message
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const { generateVideo, isGenerating: isGeneratingVideo } = useVideoGeneration({
    onSuccess: (video) => {
      const asset: GeneratedAsset = {
        id: video.id,
        type: 'video',
        url: video.url,
        instruction: video.instruction,
        timestamp: video.timestamp,
        source_system: video.source_system,
        message: video.message
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const { generateContent, isGenerating: isGeneratingContent } = useContentGeneration({
    onSuccess: (content) => {
      const asset: GeneratedAsset = {
        id: `content-${Date.now()}`,
        type: 'content',
        url: '', // Content doesn't have a URL
        instruction: approvedInstruction || '',
        timestamp: content.timestamp,
        source_system: 'openai',
        content: content.content
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const handleGenerate = async (type: GeneratorType) => {
    if (!selectedImage || !approvedInstruction) return;

    toast({
      title: "Generation Started",
      description: `Starting ${type} generation...`,
    });

    try {
      switch (type) {
        case 'image':
          await generateImage(approvedInstruction);
          break;
        case 'video':
          await generateVideo(approvedInstruction, selectedImage, 'runway');
          break;
        case 'content':
          await generateContent(approvedInstruction);
          break;
        case 'combo':
          // Generate all three types sequentially to avoid overwhelming the APIs
          toast({
            title: "Combo Generation",
            description: "Generating image, video, and content. This may take a moment...",
          });
          
          await generateImage(approvedInstruction);
          await generateVideo(approvedInstruction, selectedImage, 'runway');
          await generateContent(approvedInstruction);
          break;
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isGenerating = isGeneratingImage || isGeneratingVideo || isGeneratingContent;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Create AI-Powered Content</h2>
        <p className="text-muted-foreground">Select a product image and generate amazing content in seconds</p>
      </div>

      <FakeProduct 
        onImageSelect={setSelectedImage}
        selectedImage={selectedImage}
      />

      <InstructionModule 
        onInstructionApproved={setApprovedInstruction}
        selectedImage={selectedImage}
      />

      <GeneratorButtons
        approvedInstruction={approvedInstruction}
        selectedImage={selectedImage}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
      />

      {(isGenerating || generatedAssets.length > 0) && (
        <AssetDisplay 
          assets={generatedAssets}
          isGenerating={isGenerating}
        />
      )}
    </div>
  );
}
