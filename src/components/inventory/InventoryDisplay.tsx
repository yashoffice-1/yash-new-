
import { EnhancedInventoryManager } from "./EnhancedInventoryManager";
import { useView } from "@/contexts/ViewContext";

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
  const { setActiveTab, setSelectedProduct } = useView();

  const handleVideoTemplateClick = (product: InventoryItem) => {
    setSelectedProduct(product);
    setActiveTab('templates');
  };

  return <EnhancedInventoryManager onVideoTemplateClick={handleVideoTemplateClick} />;
}
