
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Video, FileText, Image, Megaphone } from "lucide-react";
import { FakeProduct } from "./FakeProduct";
import { InstructionModule } from "./InstructionModule";
import { GeneratorButtons } from "./GeneratorButtons";
import { AssetDisplay } from "./AssetDisplay";
import { InventoryManager } from "./inventory/InventoryManager";
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

interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'content' | 'combo';
  url: string;
  instruction: string;
  timestamp: Date;
  source_system?: string;
  content?: string;
  status?: string;
  runway_task_id?: string;
  message?: string;
}

export function MainContent() {
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [approvedInstruction, setApprovedInstruction] = useState<string | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<GeneratedAsset[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleProductSelect = (product: InventoryItem) => {
    setSelectedProduct(product);
  };

  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

  const handleInstructionApproved = (instruction: string) => {
    setApprovedInstruction(instruction);
  };

  const handleGenerate = async (type: 'image' | 'video' | 'content' | 'combo', formatSpecs?: any) => {
    if (!approvedInstruction || !selectedImage) return;
    
    setIsGenerating(true);
    
    // Create a mock asset for now - in real implementation this would call the actual APIs
    const newAsset: GeneratedAsset = {
      id: `asset-${Date.now()}`,
      type,
      url: type === 'content' ? '' : selectedImage, // Mock URL for non-content types
      instruction: approvedInstruction,
      timestamp: new Date(),
      content: type === 'content' ? `Generated ${type} content based on: ${approvedInstruction}` : undefined,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} generation initiated`
    };
    
    setGeneratedAssets(prev => [newAsset, ...prev]);
    
    // Simulate API call delay
    setTimeout(() => {
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">FeedGenesis</h1>
          <p className="text-gray-600">Transform your product feeds into ready-to-use assets</p>
        </div>

        <Tabs defaultValue="products" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="products" className="flex items-center space-x-2">
              <Package className="h-4 w-4" />
              <span>Products</span>
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center space-x-2">
              <Video className="h-4 w-4" />
              <span>Video</span>
            </TabsTrigger>
            <TabsTrigger value="image" className="flex items-center space-x-2">
              <Image className="h-4 w-4" />
              <span>Image</span>
            </TabsTrigger>
            <TabsTrigger value="content" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Content</span>
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center space-x-2">
              <Megaphone className="h-4 w-4" />
              <span>Ads</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Selection */}
              <div className="space-y-6">
                <FakeProduct 
                  onImageSelect={handleImageSelect}
                  selectedImage={selectedImage}
                />
                <InventoryManager onProductSelect={handleProductSelect} />
              </div>

              {/* Generation Interface */}
              <div className="space-y-6">
                <InstructionModule 
                  onInstructionApproved={handleInstructionApproved}
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
            </div>
          </TabsContent>

          <TabsContent value="video" className="space-y-6">
            <VideoTemplatesTab selectedProduct={selectedProduct} />
          </TabsContent>

          <TabsContent value="image" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Selection */}
              <div className="space-y-6">
                <FakeProduct 
                  onImageSelect={handleImageSelect}
                  selectedImage={selectedImage}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Product</CardTitle>
                    <CardDescription>
                      Choose a product for image generation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedProduct ? (
                      <div className="space-y-2">
                        <h3 className="font-medium">{selectedProduct.name}</h3>
                        <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                        {selectedProduct.price && (
                          <p className="text-sm font-medium">${selectedProduct.price}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Select a product from the inventory to generate images
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Generation Interface */}
              <div className="space-y-6">
                <InstructionModule 
                  onInstructionApproved={handleInstructionApproved}
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
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Selection */}
              <div className="space-y-6">
                <FakeProduct 
                  onImageSelect={handleImageSelect}
                  selectedImage={selectedImage}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Product</CardTitle>
                    <CardDescription>
                      Choose a product for content generation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedProduct ? (
                      <div className="space-y-2">
                        <h3 className="font-medium">{selectedProduct.name}</h3>
                        <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                        {selectedProduct.price && (
                          <p className="text-sm font-medium">${selectedProduct.price}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Select a product from the inventory to generate content
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Generation Interface */}
              <div className="space-y-6">
                <InstructionModule 
                  onInstructionApproved={handleInstructionApproved}
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
            </div>
          </TabsContent>

          <TabsContent value="ads" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Selection */}
              <div className="space-y-6">
                <FakeProduct 
                  onImageSelect={handleImageSelect}
                  selectedImage={selectedImage}
                />
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Product</CardTitle>
                    <CardDescription>
                      Choose a product for ad generation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedProduct ? (
                      <div className="space-y-2">
                        <h3 className="font-medium">{selectedProduct.name}</h3>
                        <p className="text-sm text-gray-600">{selectedProduct.description}</p>
                        {selectedProduct.price && (
                          <p className="text-sm font-medium">${selectedProduct.price}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Select a product from the inventory to generate ads
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Generation Interface */}
              <div className="space-y-6">
                <InstructionModule 
                  onInstructionApproved={handleInstructionApproved}
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
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
