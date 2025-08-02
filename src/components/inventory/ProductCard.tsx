
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Play, CheckCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: {
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
  };
  onEdit: () => void;
  onDelete: () => void;
  onUseForGeneration: (product: any) => void;
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
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);

  const handleSelect = (checked: boolean) => {
    console.log('ProductCard handleSelect:', product.id, checked);
    onSelect?.(product.id, checked);
  };
  
  return (
    <Card 
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg group ${
        isSelected 
          ? 'ring-2 ring-blue-500 ring-offset-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300' 
          : 'hover:border-blue-300 hover:bg-gradient-to-br from-gray-50 to-blue-50/30'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection Overlay */}
      {showCheckbox && (
        <div className="absolute top-3 left-3 z-20">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => handleSelect(e.target.checked)}
            className={`w-5 h-5 border-2 rounded transition-all duration-200 cursor-pointer ${
              isSelected 
                ? 'bg-blue-500 border-blue-500 text-white' 
                : 'bg-white/90 border-gray-300 hover:border-blue-400'
            }`}
          />
          {isSelected && (
            <div className="absolute -inset-1 bg-blue-500/20 rounded-full animate-ping pointer-events-none"></div>
          )}
        </div>
      )}

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

        {/* Product Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100 rounded-lg">
        {product.images && product.images.length > 0 ? (
            <img
            src={product.images[0]}
              alt={product.name}
            className={`w-full h-full object-cover transition-all duration-300 ${
              isSelected ? 'scale-105' : 'group-hover:scale-105'
            }`}
            />
          ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
            <div className="text-gray-400 text-4xl">📦</div>          </div>
          )}
        
        {/* Image Overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 ${
          isHovered || isSelected ? 'opacity-100' : ''
        }`} />
        </div>

      <CardContent className="p-4">
        {/* Product Info */}
        <div className="space-y-3">
        <div className="space-y-2">
            <h3 className={`font-semibold text-lg truncate transition-colors duration-200 ${
              isSelected ? 'text-blue-700' : 'text-gray-900'
            }`}>
              {product.name}
            </h3>
            
            {product.description && (
              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                {product.description}
              </p>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-2">
            {product.category && (
              <Badge 
                variant="outline" 
                className={`text-xs transition-colors duration-200 ${
                  isSelected 
                    ? 'border-blue-300 text-blue-700 bg-blue-50' 
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                {product.category}
              </Badge>
            )}
            
            {product.price && (
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-green-600">
                  ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                </span>
                {product.sku && (
                  <span className="text-xs text-gray-500 font-mono">SKU: {product.sku}</span>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3">
            <div className="flex space-x-1">
            <Button
              size="sm"
                variant="ghost"
                onClick={onEdit}
                className="flex items-center space-x-1 h-8 px-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-all duration-200 group"
            >
                <Edit className="w-3 h-3 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Edit</span>
            </Button>
            
            <Button
              size="sm"
                variant="ghost"
                onClick={onDelete}
                className="flex items-center space-x-1 h-8 px-2 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-all duration-200 group"
              >
                <Trash2 className="w-3 h-3 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-medium">Delete</span>
            </Button>
            </div>
            
            <Button
              size="sm"
              onClick={() => onUseForGeneration(product)}
              className="flex items-center space-x-1 h-8 px-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:via-indigo-700 hover:to-purple-800 text-white shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 group"
            >
              <Sparkles className="w-3 h-3 group-hover:animate-pulse" />
              <span className="text-xs font-medium">Generate</span>
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Selection Animation */}
      {isSelected && (
        <div className="absolute inset-0 bg-blue-500/5 pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        </div>
      )}
    </Card>
  );
}
