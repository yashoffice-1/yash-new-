
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

export function MainContent() {
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  
  const handleProductSelect = (product: InventoryItem) => {
    setSelectedProduct(product);
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
                <FakeProduct />
                <InventoryManager onProductSelect={handleProductSelect} />
              </div>

              {/* Generation Interface */}
              <div className="space-y-6">
                <InstructionModule />
                <GeneratorButtons />
                <AssetDisplay />
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
                <FakeProduct />
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
                <InstructionModule />
                <GeneratorButtons />
                <AssetDisplay />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Selection */}
              <div className="space-y-6">
                <FakeProduct />
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
                <InstructionModule />
                <GeneratorButtons />
                <AssetDisplay />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ads" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Selection */}
              <div className="space-y-6">
                <FakeProduct />
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
                <InstructionModule />
                <GeneratorButtons />
                <AssetDisplay />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
