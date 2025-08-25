
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/forms/button";
import { Badge } from "@/components/ui/data_display/badge";
import { Checkbox } from "@/components/ui/forms/checkbox";
import { Dialog, DialogContent } from "@/components/ui/overlays/dialog";
import { Edit, Trash2, CheckCircle, Sparkles, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

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
  const [isHovered, setIsHovered] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const { theme } = useTheme();

  const hasMultipleImages = product.images && product.images.length > 1;

  const handleSelect = (checked: boolean) => {
    onSelect?.(product.id, checked);
  };

  const nextImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (hasMultipleImages) {
      setCurrentImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const nextModalImage = () => {
    if (hasMultipleImages) {
      setModalImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevModalImage = () => {
    if (hasMultipleImages) {
      setModalImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const handleImageClick = () => {
    if (hasMultipleImages) {
      setModalImageIndex(currentImageIndex);
      setShowImageModal(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showImageModal) return;
    
    switch (e.key) {
      case 'Escape':
        setShowImageModal(false);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevModalImage();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextModalImage();
        break;
    }
  };

  // Reset current image index when product changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product.id]);

  // Handle keyboard events for modal
  useEffect(() => {
    if (showImageModal) {
      document.addEventListener('keydown', handleKeyDown as any);
      return () => document.removeEventListener('keydown', handleKeyDown as any);
    }
  }, [showImageModal, modalImageIndex]);
  
  return (
    <>
      <Card 
        className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg group ${
          isSelected 
            ? theme === 'dark'
              ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border-blue-400'
              : 'ring-2 ring-blue-500 ring-offset-2 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-300'
            : theme === 'dark'
              ? 'hover:border-blue-400 hover:bg-gradient-to-br from-gray-800 to-blue-900/10'
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

        {/* Multiple Images Badge */}
        {hasMultipleImages && (
          <div className="absolute top-2 left-2 z-10">
            <Badge 
              variant="secondary" 
              className="bg-black/70 text-white text-xs px-2 py-1"
            >
              {currentImageIndex + 1}/{product.images.length}
            </Badge>
          </div>
        )}

        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gray-100 rounded-lg">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[currentImageIndex]}
              alt={`${product.name} ${currentImageIndex + 1}`}
              className={`w-full h-full object-cover transition-all duration-300 cursor-pointer ${
                isSelected ? 'scale-105' : 'group-hover:scale-105'
              }`}
              onClick={handleImageClick}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
              <div className="text-gray-400 text-4xl">📦</div>
            </div>
          )}
          
          {/* Navigation Arrows */}
          {hasMultipleImages && isHovered && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 z-10"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200 z-10"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          
          {/* Gallery Dots */}
          {hasMultipleImages && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1 z-10">
              {product.images.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(index);
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentImageIndex 
                      ? 'bg-white' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </div>
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
                isSelected 
                  ? theme === 'dark' ? 'text-blue-400' : 'text-blue-700'
                  : theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>
                {product.name}
              </h3>
              
              {product.description && (
                <p className={`text-sm line-clamp-2 leading-relaxed ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
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
                      ? theme === 'dark'
                        ? 'border-blue-400 text-blue-300 bg-blue-900/30'
                        : 'border-blue-300 text-blue-700 bg-blue-50'
                      : theme === 'dark'
                        ? 'border-gray-600 bg-gray-800'
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
                    <span className={`text-xs font-mono ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>SKU: {product.sku}</span>
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

      {/* Full-Screen Image Modal */}
      <Dialog open={showImageModal} onOpenChange={setShowImageModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 bg-black/95 border-0">
          <div className="relative w-full h-full">
            {/* Close Button */}
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 z-20 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Main Image */}
            <div className="flex items-center justify-center h-full p-8">
              {product.images && product.images[modalImageIndex] && (
                <img
                  src={product.images[modalImageIndex]}
                  alt={`${product.name} ${modalImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Modal Navigation Arrows */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={prevModalImage}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextModalImage}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all duration-200"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Modal Image Counter */}
            {hasMultipleImages && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                {modalImageIndex + 1} / {product.images.length}
              </div>
            )}

            {/* Product Info in Modal */}
            <div className="absolute bottom-4 left-4 bg-black/50 text-white p-4 rounded-lg max-w-xs">
              <h3 className="font-semibold text-lg">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-gray-300 mt-1 line-clamp-2">
                  {product.description}
                </p>
              )}
              {product.price && (
                <p className="text-sm text-green-400 mt-1">
                  ${typeof product.price === 'number' ? product.price.toFixed(2) : product.price}
                </p>
              )}
            </div>

            {/* Modal Thumbnail Gallery */}
            {hasMultipleImages && (
              <div className="absolute top-4 left-4 flex space-x-2 max-w-xs overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setModalImageIndex(index)}
                    className={`w-12 h-12 rounded border-2 transition-all duration-200 flex-shrink-0 ${
                      index === modalImageIndex 
                        ? 'border-white' 
                        : 'border-white/50 hover:border-white/75'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      className="w-full h-full object-cover rounded"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
