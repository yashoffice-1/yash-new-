
import { useState } from "react";
import { FakeProduct } from "./FakeProduct";
import { SimpleTestButtons } from "./SimpleTestButtons";
import { AssetDisplay } from "./AssetDisplay";

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
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAssetGenerated = (asset: GeneratedAsset) => {
    setGeneratedAssets(prev => [asset, ...prev]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">FeedGenerator - Testing Mode</h2>
        <p className="text-muted-foreground">Testing RunwayML integration with simple buttons</p>
      </div>

      <FakeProduct 
        onImageSelect={setSelectedImage}
        selectedImage={selectedImage}
      />

      <SimpleTestButtons 
        onAssetGenerated={handleAssetGenerated}
        onGeneratingChange={setIsGenerating}
      />

      <AssetDisplay 
        assets={generatedAssets}
        isGenerating={isGenerating}
      />
    </div>
  );
}
