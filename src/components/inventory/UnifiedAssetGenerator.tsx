
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

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  images: string[];
  metadata: any;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UnifiedAssetGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: InventoryItem[];
  initialAssetType: 'image' | 'video' | 'content' | 'ad';
}

type GeneratorType = 'image' | 'video' | 'content' | 'ad';

export function UnifiedAssetGenerator({ 
  isOpen, 
  onClose, 
  selectedProducts, 
  initialAssetType 
}: UnifiedAssetGeneratorProps) {
  const [activeTab, setActiveTab] = useState(initialAssetType);
  const [instruction, setInstruction] = useState("");
  const { toast } = useToast();

  // Use the first selected product for templates tab, or create a mock product if none selected
  const selectedProduct = selectedProducts.length > 0 ? selectedProducts[0] : {
    id: 'mock',
    name: 'No Product Selected',
    description: null,
    price: null,
    sku: null,
    category: null,
    brand: null,
    images: [],
    metadata: {},
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const handleGenerate = async (type: GeneratorType) => {
    if (!instruction.trim() || selectedProducts.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please provide an instruction and select products before generating.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Asset Generation Started",
      description: `Generating ${type} for ${selectedProducts.length} product(s) with instruction: ${instruction}`,
    });

    // TODO: Implement actual asset generation logic here
    console.log(`Generating ${type} for ${selectedProducts.length} products with instruction: ${instruction}`);
  };

  const handleTabChange = (value: string) => {
    // Type guard to ensure the value is one of our expected types
    if (value === 'image' || value === 'video' || value === 'content' || value === 'ad' || value === 'templates') {
      if (value !== 'templates') {
        setActiveTab(value as GeneratorType);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5" />
            <span>Unified Asset Generator</span>
          </DialogTitle>
          <DialogDescription>
            Generate images, videos, content, and ads for {selectedProducts.length} selected product(s)
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="image">Images</TabsTrigger>
            <TabsTrigger value="video">Videos</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="ad">Ads</TabsTrigger>
            <TabsTrigger value="templates">Video Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="image" className="flex-1 overflow-y-auto p-4">
            <ImageGenerator
              selectedProducts={selectedProducts}
              instruction={instruction}
              setInstruction={setInstruction}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="video" className="flex-1 overflow-y-auto p-4">
            <VideoGenerator
              selectedProducts={selectedProducts}
              instruction={instruction}
              setInstruction={setInstruction}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="content" className="flex-1 overflow-y-auto p-4">
            <ContentGenerator
              selectedProducts={selectedProducts}
              instruction={instruction}
              setInstruction={setInstruction}
              onGenerate={handleGenerate}
            />
          </TabsContent>

          <TabsContent value="ad" className="flex-1 overflow-y-auto p-4">
            <AdGenerator
              selectedProducts={selectedProducts}
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
