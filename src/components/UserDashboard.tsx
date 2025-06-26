
import { useState } from "react";
import { FakeProduct } from "./FakeProduct";
import { InstructionModule } from "./InstructionModule";
import { GeneratorButtons } from "./GeneratorButtons";
import { AssetDisplay } from "./AssetDisplay";
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
  const [isGenerating, setIsGenerating] = useState(false);

  const { generateImage } = useImageGeneration({
    onSuccess: (image) => {
      const asset: GeneratedAsset = {
        id: image.id,
        type: 'image',
        url: image.url,
        instruction: approvedInstruction || '',
        timestamp: image.timestamp,
        source_system: image.source_system,
        status: image.status,
        runway_task_id: image.runway_task_id,
        message: image.message
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const { generateVideo } = useVideoGeneration({
    onSuccess: (video) => {
      const asset: GeneratedAsset = {
        id: video.id,
        type: 'video',
        url: video.url,
        instruction: approvedInstruction || '',
        timestamp: video.timestamp,
        source_system: video.source_system,
        message: video.message
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const { generateContent } = useContentGeneration({
    onSuccess: (content) => {
      const asset: GeneratedAsset = {
        id: `content-${Date.now()}`,
        type: 'content',
        url: '',
        instruction: approvedInstruction || '',
        timestamp: content.timestamp,
        source_system: 'openai',
        content: content.content
      };
      setGeneratedAssets(prev => [asset, ...prev]);
    }
  });

  const handleGenerate = async (type: GeneratorType) => {
    if (!approvedInstruction) return;
    
    setIsGenerating(true);
    
    try {
      switch (type) {
        case 'image':
          await generateImage(approvedInstruction);
          break;
        case 'video':
          await generateVideo(approvedInstruction, selectedImage || undefined);
          break;
        case 'content':
          await generateContent(approvedInstruction);
          break;
        case 'combo':
          // Generate all three in sequence
          await generateImage(approvedInstruction);
          await generateVideo(approvedInstruction, selectedImage || undefined);
          await generateContent(approvedInstruction);
          break;
      }
    } catch (error) {
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">FeedGenerator</h2>
        <p className="text-muted-foreground">Create AI-powered content for your products</p>
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

      <AssetDisplay 
        assets={generatedAssets}
        isGenerating={isGenerating}
      />
    </div>
  );
}
