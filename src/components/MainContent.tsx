
import { useView } from "@/contexts/ViewContext";
import { AdminDashboard } from "./admin/AdminDashboard";
import { UserDashboard } from "./UserDashboard";
import { AssetLibrary } from "./AssetLibrary";
import { InventoryDisplay } from "./inventory/InventoryDisplay";
import { useState } from "react";
import { Button } from "./ui/button";
import { Library, Package } from "lucide-react";

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
  const { isAdmin } = useView();
  const [activeTab, setActiveTab] = useState<'inventory' | 'library'>('inventory');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  const handleProductSelect = (product: InventoryItem) => {
    setSelectedProduct(product);
  };

  if (isAdmin) {
    return <AdminDashboard />;
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation for User Mode */}
      <div className="flex space-x-4 border-b">
        <Button 
          variant={activeTab === 'inventory' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('inventory')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Package className="h-4 w-4" />
          <span>Inventory</span>
        </Button>
        
        <Button 
          variant={activeTab === 'library' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('library')}
          className="rounded-b-none flex items-center space-x-2"
        >
          <Library className="h-4 w-4" />
          <span>Asset Library</span>
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'inventory' && <InventoryDisplay />}
      {activeTab === 'library' && <AssetLibrary />}
    </div>
  );
}
