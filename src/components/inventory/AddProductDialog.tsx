
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { X, Plus, Upload, Image as ImageIcon, Package, DollarSign, Tag, Building2, Camera } from "lucide-react";
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

interface ProductData {
  name: string;
  description: string;
  price: number;
  sku: string;
  category: string;
  brand: string;
  images: string[];
}

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded: (product: ProductData) => void;
  editProduct?: InventoryItem | null;
  onEditComplete?: (product: ProductData) => void;
}

// Predefined categories for better organization
const PREDEFINED_CATEGORIES = [
  "Electronics",
  "Clothing & Fashion",
  "Home & Garden",
  "Sports & Outdoors",
  "Books & Media",
  "Health & Beauty",
  "Automotive",
  "Toys & Games",
  "Food & Beverages",
  "Jewelry & Accessories",
  "Tools & Hardware",
  "Pet Supplies",
  "Office Supplies",
  "Baby & Kids",
  "Other"
];

export function AddProductDialog({ 
  open, 
  onOpenChange, 
  onProductAdded, 
  editProduct,
  onEditComplete 
}: AddProductDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    sku: "",
    category: "",
    brand: "",
    images: [] as string[],
  });
  const [newImageUrl, setNewImageUrl] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Pre-fill form when editing
  useEffect(() => {
    if (editProduct) {
      setFormData({
        name: editProduct.name || "",
        description: editProduct.description || "",
        price: editProduct.price?.toString() || "",
        sku: editProduct.sku || "",
        category: editProduct.category || "",
        brand: editProduct.brand || "",
        images: editProduct.images || [],
      });
      setShowCustomCategory(!PREDEFINED_CATEGORIES.includes(editProduct.category || ""));
    } else {
      // Reset form for new product
      setFormData({
        name: "",
        description: "",
        price: "",
        sku: "",
        category: "",
        brand: "",
        images: [],
      });
      setShowCustomCategory(false);
    }
    setErrors({});
  }, [editProduct, open]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Required field validation
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!formData.category.trim()) {
      newErrors.category = "Category is required";
    }

    if (!formData.price.trim()) {
      newErrors.price = "Price is required";
    } else {
      const priceValue = parseFloat(formData.price);
      if (isNaN(priceValue)) {
        newErrors.price = "Please enter a valid price";
      } else if (priceValue < 0) {
        newErrors.price = "Price cannot be negative";
      } else if (priceValue > 999999.99) {
        newErrors.price = "Price cannot exceed $999,999.99";
      }
    }

    if (formData.sku && formData.sku.length < 3) {
      newErrors.sku = "SKU must be at least 3 characters";
    }

    if (!formData.brand.trim()) {
      newErrors.brand = "Brand name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddImage = () => {
    if (newImageUrl.trim()) {
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, newImageUrl.trim()]
      }));
      setNewImageUrl("");
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleCategoryChange = (category: string) => {
    if (category === "Other") {
      setShowCustomCategory(true);
      setFormData(prev => ({ ...prev, category: "" }));
    } else {
      setShowCustomCategory(false);
      setFormData(prev => ({ ...prev, category }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const productData: ProductData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price ? parseFloat(formData.price) : 0,
        sku: formData.sku.trim(),
        category: formData.category.trim(),
        brand: formData.brand.trim(),
        images: formData.images.filter(url => url.trim()),
      };

      if (editProduct) {
        // Update existing product
        toast({
          title: "✅ Product Updated",
          description: "Product has been successfully updated.",
        });

        onEditComplete?.(productData);
      } else {
        // Create new product
        toast({
          title: "✅ Product Added",
          description: "New product has been successfully added to inventory.",
        });

        onProductAdded(productData);
      }

      // Reset form and close dialog
      setFormData({
        name: "",
        description: "",
        price: "",
        sku: "",
        category: "",
        brand: "",
        images: [],
      });
      setNewImageUrl("");
      setErrors({});
      setShowCustomCategory(false);
      onOpenChange(false);

    } catch (error: any) {
      console.error('Error processing product:', error);
      toast({
        title: "❌ Error",
        description: "Failed to process product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="h-5 w-5" />
            <span>{editProduct ? "Edit Product" : "Add New Product"}</span>
          </DialogTitle>
          <DialogDescription>
            {editProduct 
              ? "Update the product information below." 
              : "Fill in the product details to add it to your inventory."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Package className="h-4 w-4 text-blue-500" />
                <h3 className="font-semibold">Basic Information</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center space-x-1">
                    <span>Product Name</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter product name"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sku" className="flex items-center space-x-1">
                    <Tag className="h-3 w-3" />
                    <span>SKU</span>
                  </Label>
                  <Input
                    id="sku"
                    value={formData.sku}
                    onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="Product SKU (optional)"
                    className={errors.sku ? "border-red-500" : ""}
                  />
                  {errors.sku && <p className="text-sm text-red-500">{errors.sku}</p>}
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe your product..."
                  rows={3}
                  className={errors.description ? "border-red-500" : ""}
                />
                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Classification Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign className="h-4 w-4 text-green-500" />
                <h3 className="font-semibold">Pricing & Classification</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price" className="flex items-center space-x-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Price</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className={errors.price ? "border-red-500" : ""}
                  />
                  {errors.price && <p className="text-sm text-red-500">{errors.price}</p>}
                </div>
                
                <div className="space-y-2">
                <Label htmlFor="category" className="flex items-center space-x-1">
                    <Tag className="h-3 w-3" />
                    <span>Category</span>
                  </Label>
                  <div className="relative">
                    <select
                      id="category"
                      value={showCustomCategory ? "Other" : formData.category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.category ? "border-red-500" : "border-gray-300"
                      }`}
                    >
                      <option value="">Select a category</option>
                      {PREDEFINED_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                                      {showCustomCategory && (
                      <Input
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        placeholder="Enter custom category"
                        className={`mt-2 ${errors.category ? "border-red-500" : ""}`}
                      />
                    )}
                    
                    {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="brand" className="flex items-center space-x-1">
                    <Building2 className="h-3 w-3" />
                    <span>Brand</span>
                  </Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                    placeholder="Brand name"
                    className={errors.brand ? "border-red-500" : ""}
                  />
                  {errors.brand && <p className="text-sm text-red-500">{errors.brand}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Images Section */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 mb-4">
                <Camera className="h-4 w-4 text-purple-500" />
                <h3 className="font-semibold">Product Images</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex space-x-2">
                  <Input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="Enter image URL"
                    className="flex-1"
                  />
                  <Button type="button" onClick={handleAddImage} size="sm" className="flex items-center space-x-1">
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </Button>
                </div>
                
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {formData.images.map((url, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border">
                          <img 
                            src={url} 
                            alt={`Product image ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center bg-gray-200">
                                  <ImageIcon class="h-8 w-8 text-gray-400" />
                                </div>
                              `;
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {formData.images.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No images added yet</p>
                    <p className="text-xs text-gray-400">Add product images using URLs above</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="flex space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="min-w-[120px]">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </div>
              ) : (
                <span>{editProduct ? "Update Product" : "Add Product"}</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
