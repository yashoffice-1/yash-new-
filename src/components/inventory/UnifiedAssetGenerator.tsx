import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Sparkles } from "lucide-react";
import { ImageGenerator } from "./ImageGenerator";
import { VideoGenerator } from "./VideoGenerator";
import { ContentGenerator } from "./ContentGenerator";
import { AdGenerator } from "./AdGenerator";
import { useToast } from "@/hooks/use-toast";
import { VideoTemplatesTab } from "./VideoTemplatesTab";

interface UnifiedAssetGeneratorProps {
  selectedProduct: any;
  onClose: () => void;
}

type GeneratorType = 'image' | 'video' | 'content' | 'ad';

export function UnifiedAssetGenerator({ selectedProduct, onClose }: UnifiedAssetGeneratorProps) {
  const [activeTab, setActiveTab] = useState("image");
  const [instruction, setInstruction] = useState("");
  const { toast } = useToast();

  const handleGenerate = async (type: GeneratorType) => {
    if (!instruction.trim() || !selectedProduct) {
      toast({
        title: "Missing Information",
        description: "Please provide an instruction and select a product before generating.",
        variant: "destructive",
      });
      return;
    }

    const productInfo = {
      name: selectedProduct.name,
      description: selectedProduct.description,
      category: selectedProduct.category,
      brand: selectedProduct.brand,
      price: selectedProduct.price,
    };

    toast({
      title: "Asset Generation Started",
      description: `Generating ${type} for ${selectedProduct.name} with instruction: ${instruction}`,
    });

    // TODO: Implement actual asset generation logic here
    console.log(`Generating ${type} for ${selectedProduct.name} with instruction: ${instruction}`);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <span>Unified Asset Generator</span>
          </DialogTitle>
          <DialogDescription>
            Generate images, videos, content, and ads for {selectedProduct?.name}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="ad">Ads</TabsTrigger>
            <TabsTrigger value="templates">Video Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="flex-1 overflow-y-auto p-4">
            <ImageGenerator
              selectedProduct={selectedProduct}
              instruction={instruction}
              setInstruction={setInstruction}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="video" className="flex-1 overflow-y-auto p-4">
            <VideoGenerator
              selectedProduct={selectedProduct}
              instruction={instruction}
              setInstruction={setInstruction}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="content" className="flex-1 overflow-y-auto p-4">
            <ContentGenerator
              selectedProduct={selectedProduct}
              instruction={instruction}
              setInstruction={setInstruction}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="ad" className="flex-1 overflow-y-auto p-4">
            <AdGenerator
              selectedProduct={selectedProduct}
              instruction={instruction}
              setInstruction={setInstruction}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="templates" className="flex-1 overflow-y-auto p-4">
            <VideoTemplatesTab selectedProduct={selectedProduct} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
