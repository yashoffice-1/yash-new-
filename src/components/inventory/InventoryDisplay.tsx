
import { useState } from "react";
import { EnhancedInventoryManager } from "./EnhancedInventoryManager";
import { VideoTemplateUtility } from "../VideoTemplateUtility";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

export function InventoryDisplay() {
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [showVideoTemplate, setShowVideoTemplate] = useState(false);

  const handleVideoTemplateClick = (product: InventoryItem) => {
    setSelectedProduct(product);
    setShowVideoTemplate(true);
  };

  const handleBackToInventory = () => {
    setShowVideoTemplate(false);
    setSelectedProduct(null);
  };

  if (showVideoTemplate && selectedProduct) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={handleBackToInventory}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Products</span>
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Video Template for: {selectedProduct.name}</h2>
            <p className="text-sm text-gray-600">Creating video template with selected product data</p>
          </div>
        </div>
        <VideoTemplateUtility selectedProduct={selectedProduct} />
      </div>
    );
  }

  return <EnhancedInventoryManager onVideoTemplateClick={handleVideoTemplateClick} />;
}
