
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, RefreshCw } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InventoryItemRow } from "./InventoryItemRow";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  // Fetch inventory items
  const { data: inventory, isLoading, refetch } = useQuery({
    queryKey: ['inventory-display', searchTerm, categoryFilter],
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

  const handleGenerate = async (productId: string, type: 'image' | 'video' | 'content' | 'formats') => {
    console.log(`Generating ${type} for product ${productId}`);
    
    toast({
      title: "Generation Started",
      description: `${type} generation has been initiated for the selected product.`,
    });
    
    // Here you would integrate with your existing generation hooks
    // For now, just log the action
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
            Select products and generate marketing content with AI
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Products List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-6">
                        <div className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                        </div>
                        <div className="flex space-x-2">
                          {[...Array(4)].map((_, j) => (
                            <div key={j} className="w-16 h-8 bg-gray-200 rounded"></div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : inventory && inventory.length > 0 ? (
              inventory.map((product) => (
                <InventoryItemRow
                  key={product.id}
                  product={product}
                  onGenerate={handleGenerate}
                />
              ))
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || categoryFilter 
                    ? "No products match your current filters." 
                    : "Import your product catalog to get started."
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
