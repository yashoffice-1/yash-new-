
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Upload, Package, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddProductDialog } from "./AddProductDialog";
import { ImportProductsDialog } from "./ImportProductsDialog";
import { ProductCard } from "./ProductCard";

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

interface InventoryManagerProps {
  onProductSelect?: (product: InventoryItem) => void;
}

export function InventoryManager({ onProductSelect }: InventoryManagerProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);

  // Fetch inventory items
  const { data: inventory, isLoading, refetch } = useQuery({
    queryKey: ['inventory', searchTerm, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching inventory:', error);
        throw error;
      }
      
      return data as InventoryItem[];
    },
  });

  // Get unique categories for filter
  const { data: categories } = useQuery({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory')
        .select('category')
        .not('category', 'is', null)
        .eq('status', 'active');
      
      if (error) throw error;
      
      const uniqueCategories = [...new Set(data.map(item => item.category))].filter(Boolean);
      return uniqueCategories;
    },
  });

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ status: 'inactive' })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Product Deleted",
        description: "Product has been moved to inactive status.",
      });

      refetch();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const handleProductAdded = () => {
    refetch();
    setShowAddDialog(false);
    toast({
      title: "Product Added",
      description: "New product has been successfully added to inventory.",
    });
  };

  const handleProductsImported = (count: number) => {
    refetch();
    setShowImportDialog(false);
    toast({
      title: "Products Imported",
      description: `${count} products have been successfully imported.`,
    });
  };

  const handleUseForGeneration = (product: InventoryItem) => {
    console.log('Using product for generation:', product);
    onProductSelect?.(product);
    
    toast({
      title: "Product Selected",
      description: `${product.name} has been selected for content generation.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>Product Inventory</span>
          </CardTitle>
          <CardDescription>
            Manage your product catalog and connect them to content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="">All Categories</option>
              {categories?.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <div className="flex space-x-2">
              <Button onClick={() => setShowAddDialog(true)} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </Button>
              
              <Button variant="outline" onClick={() => setShowImportDialog(true)} className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Import</span>
              </Button>
            </div>
          </div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : inventory && inventory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inventory.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={() => setSelectedProduct(product)}
                  onDelete={() => handleDeleteProduct(product.id)}
                  onUseForGeneration={handleUseForGeneration}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || categoryFilter 
                  ? "No products match your current filters." 
                  : "Get started by adding your first product to the inventory."
                }
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="flex items-center space-x-2 mx-auto">
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AddProductDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onProductAdded={handleProductAdded}
        editProduct={selectedProduct}
        onEditComplete={() => {
          setSelectedProduct(null);
          setShowAddDialog(false);
          refetch();
        }}
      />

      <ImportProductsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onProductsImported={handleProductsImported}
      />
    </div>
  );
}
