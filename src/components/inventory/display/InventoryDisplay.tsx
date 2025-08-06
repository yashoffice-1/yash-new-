
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useView } from "@/contexts/ViewContext";
import { InventoryManager } from "../managers/InventoryManager";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Package, BarChart3 } from "lucide-react";
import { inventoryAPI } from "@/api/clients/backend-client";

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

  // Fetch inventory data for stats
  const { data: inventoryResponse } = useQuery({
    queryKey: ['inventory-stats-display'],
    queryFn: async () => {
      const response = await inventoryAPI.getAll({ status: 'active', all: 'true' });
      return response.data;
    },
  });

  const totalProducts = inventoryResponse?.data?.length || 0;

  const handleProductSelect = (product: InventoryItem) => {
    setSelectedProduct(product);
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Product Inventory</h1>
        <p className="text-muted-foreground">
          Manage your product catalog and inventory
        </p>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              Active in inventory
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              New products added
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Content Area */}
      <div className="min-h-[600px]">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Product Management</h2>
            <p className="text-sm text-muted-foreground">
              Add, edit, and manage your product catalog
            </p>
          </div>
          <InventoryManager onProductSelect={handleProductSelect} />
        </div>
      </div>
    </div>
  );
}
