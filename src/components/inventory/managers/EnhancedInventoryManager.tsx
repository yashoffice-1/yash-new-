import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Search, Package, Image, Video, FileText, Megaphone, CheckSquare, X, Clapperboard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/ui/use-toast";
import { UnifiedAssetGenerator } from "../generators/UnifiedAssetGenerator";

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

interface EnhancedInventoryManagerProps {
  onVideoTemplateClick?: (product: InventoryItem) => void;
}

export function EnhancedInventoryManager({ onVideoTemplateClick }: EnhancedInventoryManagerProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState<'image' | 'video' | 'content' | 'ad'>('image');

  // Fetch inventory items
  const { data: inventory, isLoading, refetch } = useQuery({
    queryKey: ['enhanced-inventory', searchTerm, categoryFilter],
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

  // Clear selections when filters change
  useEffect(() => {
    setSelectedProducts([]);
  }, [searchTerm, categoryFilter]);

  const filteredInventory = inventory || [];
  const selectedProductsData = filteredInventory.filter(p => selectedProducts.includes(p.id));

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts(prev => [...prev, productId]);
    } else {
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredInventory.length) {
      // Deselect all
      setSelectedProducts([]);
    } else {
      // Select all filtered products
      setSelectedProducts(filteredInventory.map(p => p.id));
    }
  };

  const handleGenerationClick = (assetType: 'image' | 'video' | 'content' | 'ad', productId?: string) => {
    if (productId && !selectedProducts.includes(productId)) {
      // If clicking on a specific product that's not selected, select only that product
      setSelectedProducts([productId]);
    }
    
    if (selectedProducts.length === 0 && !productId) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to generate assets.",
        variant: "destructive",
      });
      return;
    }

    setSelectedAssetType(assetType);
    setShowGenerator(true);
  };

  const handleVideoTemplateClick = (productId?: string) => {
    if (productId) {
      const product = filteredInventory.find(p => p.id === productId);
      if (product && onVideoTemplateClick) {
        onVideoTemplateClick(product);
      }
    } else if (selectedProducts.length > 0) {
      const product = filteredInventory.find(p => p.id === selectedProducts[0]);
      if (product && onVideoTemplateClick) {
        onVideoTemplateClick(product);
      }
    } else {
      toast({
        title: "No Product Selected",
        description: "Please select a product to use video templates.",
        variant: "destructive",
      });
    }
  };

  const renderProductRow = (product: InventoryItem) => {
    const isSelected = selectedProducts.includes(product.id);
    const primaryImage = product.images?.[0];

    return (
      <div
        key={product.id}
        className={`flex items-center space-x-4 p-4 border rounded-lg transition-all ${
          isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
        }`}
      >
        {/* Selection Checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
          className="flex-shrink-0"
        />

        {/* Product Image */}
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = 
                  '<div class="w-full h-full flex items-center justify-center bg-gray-200"><Package class="h-6 w-6 text-gray-400" /></div>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Package className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product Information */}
        <div className="flex-1 space-y-2">
          <h3 className="font-medium text-lg">{product.name}</h3>
          
          <div className="flex flex-wrap gap-2">
            {product.brand && (
              <Badge variant="secondary" className="text-xs">
                {product.brand}
              </Badge>
            )}
            {product.category && (
              <Badge variant="outline" className="text-xs">
                {product.category}
              </Badge>
            )}
            {product.price && (
              <Badge variant="outline" className="text-xs text-green-600">
                ${product.price}
              </Badge>
            )}
          </div>

          {product.description && (
            <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
          )}
        </div>

        {/* Generation Buttons */}
        <div className="flex flex-col space-y-2 flex-shrink-0">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerationClick('image', product.id)}
              className="flex items-center space-x-1"
            >
              <Image className="h-4 w-4" />
              <span className="hidden sm:inline">Image</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerationClick('video', product.id)}
              className="flex items-center space-x-1"
            >
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Video</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleVideoTemplateClick(product.id)}
              className="flex items-center space-x-1"
            >
              <Clapperboard className="h-4 w-4" />
              <span className="hidden sm:inline">Video Template</span>
            </Button>
          </div>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerationClick('content', product.id)}
              className="flex items-center space-x-1"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Content</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerationClick('ad', product.id)}
              className="flex items-center space-x-1"
            >
              <Megaphone className="h-4 w-4" />
              <span className="hidden sm:inline">Ad</span>
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Enhanced Product Generator</span>
            </div>
            {selectedProducts.length > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                {selectedProducts.length} selected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Select products and generate unified marketing assets with AI
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
              onClick={handleSelectAll}
              className="flex items-center space-x-2"
            >
              {selectedProducts.length === filteredInventory.length ? (
                <X className="h-4 w-4" />
              ) : (
                <CheckSquare className="h-4 w-4" />
              )}
              <span>
                {selectedProducts.length === filteredInventory.length ? 'Deselect All' : 'Select All'}
              </span>
            </Button>
          </div>

          {/* Multi-Product Generation Buttons */}
          {selectedProducts.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-3">
                Generate for {selectedProducts.length} Selected Product{selectedProducts.length > 1 ? 's' : ''}
              </h4>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleGenerationClick('image')}
                  className="flex items-center space-x-1"
                >
                  <Image className="h-4 w-4" />
                  <span>Generate Images</span>
                </Button>
                
                <Button
                  onClick={() => handleGenerationClick('video')}
                  className="flex items-center space-x-1"
                  variant="secondary"
                >
                  <Video className="h-4 w-4" />
                  <span>Generate Videos</span>
                </Button>

                <Button
                  onClick={() => handleVideoTemplateClick()}
                  className="flex items-center space-x-1"
                  variant="secondary"
                >
                  <Clapperboard className="h-4 w-4" />
                  <span>Video Template</span>
                </Button>
                
                <Button
                  onClick={() => handleGenerationClick('content')}
                  className="flex items-center space-x-1"
                  variant="secondary"
                >
                  <FileText className="h-4 w-4" />
                  <span>Generate Content</span>
                </Button>
                
                <Button
                  onClick={() => handleGenerationClick('ad')}
                  className="flex items-center space-x-1"
                  variant="secondary"
                >
                  <Megaphone className="h-4 w-4" />
                  <span>Generate Ads</span>
                </Button>
              </div>
            </div>
          )}

          {/* Products List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <div className="w-16 h-16 bg-gray-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                    </div>
                    <div className="flex space-x-2">
                      {[...Array(5)].map((_, j) => (
                        <div key={j} className="w-16 h-8 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredInventory.length > 0 ? (
              filteredInventory.map(renderProductRow)
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

      {/* Unified Asset Generator */}
      <UnifiedAssetGenerator
        isOpen={showGenerator}
        onClose={() => setShowGenerator(false)}
        selectedProducts={selectedProductsData}
        initialAssetType={selectedAssetType}
      />
    </div>
  );
}
