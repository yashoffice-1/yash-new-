
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Wand2, DollarSign, Package } from "lucide-react";

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

interface ProductCardProps {
  product: InventoryItem;
  onEdit: () => void;
  onDelete: () => void;
  onUseForGeneration: (product: InventoryItem) => void;
  // Multi-select props
  isSelected?: boolean;
  onSelect?: (productId: string, checked: boolean) => void;
  showCheckbox?: boolean;
}

export function ProductCard({ 
  product, 
  onEdit, 
  onDelete, 
  onUseForGeneration,
  isSelected = false,
  onSelect,
  showCheckbox = false
}: ProductCardProps) {
  const primaryImage = product.images?.[0];
  
  return (
    <Card className={`group hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardContent className="p-4">
        {/* Product Image with Checkbox Overlay */}
        <div className="relative w-full h-48 bg-gray-100 rounded-lg mb-4 overflow-hidden">
          {showCheckbox && (
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => onSelect?.(product.id, checked as boolean)}
                className="bg-white/90 backdrop-blur-sm"
              />
            </div>
          )}
          
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = 
                  '<div class="w-full h-full flex items-center justify-center bg-gray-200"><Package class="h-8 w-8 text-gray-400" /></div>';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-200">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
            {product.price && (
              <div className="flex items-center text-sm font-medium text-green-600">
                <DollarSign className="h-3 w-3" />
                {product.price}
              </div>
            )}
          </div>

          {product.description && (
            <p className="text-xs text-gray-600 line-clamp-2">{product.description}</p>
          )}

          <div className="flex flex-wrap gap-1">
            {product.category && (
              <Badge variant="outline" className="text-xs">
                {product.category}
              </Badge>
            )}
            {product.brand && (
              <Badge variant="outline" className="text-xs">
                {product.brand}
              </Badge>
            )}
            {product.sku && (
              <Badge variant="outline" className="text-xs">
                SKU: {product.sku}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              onClick={() => onUseForGeneration(product)}
              className="flex-1 text-xs"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Generate Content
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onEdit}
              className="text-xs"
            >
              <Edit className="h-3 w-3" />
            </Button>
            
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-xs text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
