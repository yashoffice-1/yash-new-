
import { useState } from "react";
import { FakeProduct } from "./FakeProduct";
import { InstructionModule } from "./InstructionModule";
import { GeneratorButtons } from "./GeneratorButtons";
import { AssetDisplay } from "./AssetDisplay";
import { useToast } from "@/hooks/use-toast";

type GeneratorType = 'image' | 'video' | 'content' | 'combo';

interface GeneratedAsset {
  type: GeneratorType;
  url: string;
  instruction: string;
  timestamp: Date;
}

export function UserDashboard() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [approvedInstruction, setApprovedInstruction] = useState<string | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (type: GeneratorType) => {
    if (!selectedImage || !approvedInstruction) return;

    setIsGenerating(true);
    toast({
      title: "Generation Started",
      description: `Starting ${type} generation...`,
    });

    // Simulate API generation delay
    setTimeout(() => {
      const newAsset: GeneratedAsset = {
        type,
        url: selectedImage, // For demo, using selected image as result
        instruction: approvedInstruction,
        timestamp: new Date()
      };

      setGeneratedAssets(prev => [newAsset, ...prev]);
      setIsGenerating(false);
      
      toast({
        title: "Generation Complete",
        description: `Your ${type} has been generated successfully!`,
      });
    }, 3000);
  };

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
