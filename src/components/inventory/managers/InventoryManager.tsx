import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Button } from "@/components/ui/forms/button";
import { Input } from "@/components/ui/forms/input";
import { Badge } from "@/components/ui/data_display/badge";
import { Checkbox } from "@/components/ui/forms/checkbox";
import { Search, Plus, Upload, Package, Edit, Trash2, Image, Video, FileText, Wand2, RefreshCw, CheckCircle, Save, ExternalLink, Loader2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/ui/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { AddProductDialog } from "../dialogs/AddProductDialog";
import { ImportProductsDialog } from "../dialogs/ImportProductsDialog";
import { ProductCard } from "../display/ProductCard";
import { inventoryAPI } from "@/api/clients/backend-client";
import { useAssetLibrary } from "@/hooks/data/useAssetLibrary";
import { generationAPI } from "@/api/clients/generation-client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeneration } from "@/contexts/GenerationContext";
import { validateAssetForSaving, prepareAssetData, handleSaveError, showSaveSuccess } from '@/utils/assetSaving';

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
  const { user } = useAuth();
  const { addGenerationResult } = useGeneration();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [isShopifyAuthenticating, setIsShopifyAuthenticating] = useState(false);
  const [shopifyConnections, setShopifyConnections] = useState<any[]>([]);
  const [shopDomain, setShopDomain] = useState("new-build-123.myshopify.com");

  // Shopify products state
  const [shopifyProducts, setShopifyProducts] = useState<any[]>([]);
  const [isLoadingShopifyProducts, setIsLoadingShopifyProducts] = useState(false);
  const [shopifyError, setShopifyError] = useState<string | null>(null);
  const [selectedShopifyProducts, setSelectedShopifyProducts] = useState<string[]>([]);
  const [showShopifyProducts, setShowShopifyProducts] = useState(false);

  // Multi-select state
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showGenerator, setShowGenerator] = useState(false);
  const [generationType, setGenerationType] = useState<'video' | 'image' | 'content' | null>(null);
  
  // Generation form state
  const [generationConfig, setGenerationConfig] = useState({
    channel: 'facebook',
    type: 'image',
    format: 'feed_post',
    formatSpec: 'square',
    instructions: '',
    batchGenerate: true,
    variations: false,
    autoOptimize: true
  });

  // Generation results state
  const [generationResults, setGenerationResults] = useState<Array<{
    id: string;
    title: string;
    description: string;
    asset_type: 'image' | 'video' | 'content';
    asset_url: string;
    content?: string;
    instruction: string;
    source_system: 'runway' | 'heygen' | 'openai';
    platform: string;
    format: string;
    product: InventoryItem;
    timestamp: Date;
    status?: string;
    error?: string;
  }>>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savingAssets, setSavingAssets] = useState<Set<string>>(new Set());
  const [isEnhancing, setIsEnhancing] = useState(false);

  // Fetch inventory items
  const { data: inventoryResponse, isLoading, refetch } = useQuery({
    queryKey: ['inventory', searchTerm, categoryFilter],
    queryFn: async () => {
      const params: any = {
        status: 'active',
        limit: 100
      };

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (categoryFilter) {
        params.category = categoryFilter;
      }

      const response = await inventoryAPI.getAll(params);
      return response.data;
    },
  });

  const inventory = inventoryResponse?.data || [];

  // Get all categories from active products
  const { data: categories, refetch: refetchCategories } = useQuery<string[]>({
    queryKey: ['inventory-categories'],
    queryFn: async () => {
      const response = await inventoryAPI.getCategories();
      return response.data.data;
    },
  });

  const { saveToLibrary } = useAssetLibrary();

  // DEPRECATED: Polling-based status checking - Replaced by webhook + SSE system
  // const checkPendingAssetStatus = async (result: typeof generationResults[0]) => {
  //   if (!result.asset_url.startsWith('pending_')) return;

  //   try {
  //     if (result.source_system === 'heygen') {
  //       // Extract video ID from pending URL
  //       const videoId = result.asset_url.replace('pending_', '');
  //       const response = await generationAPI.getStatus(videoId);
  //       const statusData = response.data.data;
        
  //       if (statusData.status === 'completed' && statusData.videoUrl) {
  //         // Update the result with the final URL
  //         setGenerationResults(prev => prev.map(r => 
  //           r.id === result.id 
  //             ? { ...r, asset_url: statusData.videoUrl, status: 'completed' }
  //             : r
  //         ));
  //       } else if (statusData.status === 'failed') {
  //         // Update the result to failed
  //         setGenerationResults(prev => prev.map(r => 
  //           r.id === result.id 
  //             ? { ...r, status: 'failed', error: statusData.errorMessage }
  //             : r
  //         ));
  //       }
  //     }
  //     // Add similar logic for RunwayML if needed
  //   } catch (error) {
  //     console.error('Error checking asset status:', error);
  //   }
  // };

  // DEPRECATED: Polling-based status checking - Replaced by webhook + SSE system
  // useEffect(() => {
  //   if (generationResults.length === 0) return;

  //   const pendingAssets = generationResults.filter(r => r.asset_url.startsWith('pending_'));
  //   if (pendingAssets.length === 0) return;

  //   const interval = setInterval(() => {
  //     pendingAssets.forEach(checkPendingAssetStatus);
  //   }, 10000); // Check every 10 seconds

  //   return () => clearInterval(interval);
  // }, [generationResults]);

  const handleDeleteProduct = async (productId: string) => {
    try {
      await inventoryAPI.update(productId, { status: 'inactive' });

      toast({
        title: "Product Deleted",
        description: "Product has been moved to inactive status.",
      });

      refetch();
      refetchCategories();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast({
        title: "Error",
        description: "Failed to delete product.",
        variant: "destructive",
      });
    }
  };

  const handleProductAdded = async (productData: any) => {
    try {
      // Use the backend API client to create product with Prisma
      await inventoryAPI.create(productData);

      refetch();
      refetchCategories();
      setShowAddDialog(false);
      toast({
        title: "Product Added",
        description: "New product has been successfully added to inventory.",
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      
      // Don't close dialog - let user retry
      toast({
        title: "Error",
        description: "Failed to create product. Please try again.",
        variant: "destructive",
      });
      
      // Re-throw so AddProductDialog knows there was an error
      throw error;
    }
  };

  const handleProductsImported = (count: number) => {
    refetch();
    refetchCategories();
    setShowImportDialog(false);
    toast({
      title: "Products Imported",
      description: `${count} products have been successfully imported.`,
    });
  };

  const handleShopifyAuth = async () => {
    setIsShopifyAuthenticating(true);
    
    try {
      // Validate shop domain format
      const domain = shopDomain.trim().toLowerCase();
      if (!domain.includes('.myshopify.com') && !domain.includes('.')) {
        throw new Error('Please enter a valid Shopify domain (e.g., yourstore.myshopify.com)');
      }

      // Get the auth token from localStorage
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        throw new Error('No authentication token found. Please sign in again.');
      }

      // Get the backend URL from environment variables
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

      // Call the backend API to initiate Shopify OAuth
      const response = await fetch(`${backendUrl}/api/shopify/auth/initiate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ shopDomain }),
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to Shopify OAuth URL
        window.location.href = data.authUrl;
      } else {
        throw new Error(data.error || 'Failed to initiate Shopify authentication');
      }
    } catch (error: any) {
      console.error('Shopify authentication error:', error);
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to authenticate with Shopify. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsShopifyAuthenticating(false);
    }
  };

  // Function to fetch Shopify products
  const fetchShopifyProducts = async (connectionId: string) => {
    setIsLoadingShopifyProducts(true);
    setShopifyError(null);
    
    try {
      const authToken = localStorage.getItem('auth_token');
      
      if (!authToken) {
        throw new Error('No authentication token found');
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
      
      const response = await fetch(`${backendUrl}/api/shopify/products/${connectionId}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setShopifyProducts(data.data.products || []);
        setShowShopifyProducts(true);
        toast({
          title: "✅ Shopify Products Loaded",
          description: `Successfully fetched ${data.data.products?.length || 0} products from ${data.data.shop?.name || 'your store'}.`,
        });
      } else {
        throw new Error(data.error || 'Failed to fetch Shopify products');
      }
    } catch (error: any) {
      console.error('Error fetching Shopify products:', error);
      setShopifyError(error.message);
      toast({
        title: "❌ Failed to Load Products",
        description: error.message || "Failed to fetch products from Shopify. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingShopifyProducts(false);
    }
  };

  // Fetch Shopify connections on component mount
  useEffect(() => {
    const fetchShopifyConnections = async () => {
      try {
        // Get the auth token from localStorage
        const authToken = localStorage.getItem('auth_token');
        
        if (!authToken) {
          console.warn('No auth token found for fetching Shopify connections');
          return;
        }

        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        
        const response = await fetch(`${backendUrl}/api/shopify/connections`, {
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
        });
        const data = await response.json();
        if (data.success) {
          setShopifyConnections(data.data);
          
          // Auto-fetch products from the first connected store
          const connectedStores = data.data.filter((conn: any) => conn.status === 'connected');
          if (connectedStores.length > 0) {
            // Automatically fetch products from the first connected store
            fetchShopifyProducts(connectedStores[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching Shopify connections:', error);
      }
    };

    // Check if user is authenticated by checking both user object and token
    const authToken = localStorage.getItem('auth_token');
    if (user && authToken) {
      fetchShopifyConnections();
    }
  }, [user]);

  // Handle Shopify OAuth success/error messages
  useEffect(() => {
    const shopifyConnected = searchParams.get('shopify_connected');
    const shopifyError = searchParams.get('shopify_error');
    const shop = searchParams.get('shop');
    const errorMessage = searchParams.get('message');

    if (shopifyConnected === 'true' && shop) {
      toast({
        title: "✅ Shopify Connected Successfully!",
        description: `Your store ${shop} has been successfully connected and is ready to use.`,
      });
      
      // Clear the success parameters from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('shopify_connected');
      newSearchParams.delete('shop');
      setSearchParams(newSearchParams);
      
      // Refresh Shopify connections
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }

    if (shopifyError === 'true') {
      toast({
        title: "❌ Shopify Connection Failed",
        description: errorMessage || "Failed to connect to Shopify. Please try again.",
        variant: "destructive",
      });
      
      // Clear the error parameters from URL
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete('shopify_error');
      newSearchParams.delete('message');
      setSearchParams(newSearchParams);
    }
  }, [searchParams, setSearchParams, toast]);

  const handleUseForGeneration = (product: InventoryItem) => {
    console.log('Using product for generation:', product);
    
    // Select the product first
    setSelectedProducts([product.id]);
    onProductSelect?.(product);

    // Open the generation modal
    setGenerationType('content'); // Default to content generation
    setShowGenerator(true);

    toast({
      title: "Product Selected",
      description: `${product.name} has been selected for content generation.`,
      variant: "default",
    });
  };

  // Mul    ti-select handlers
  const handleProductSelect = (productId: string, checked: boolean) => {
    console.log('InventoryManager handleProductSelect:', productId, checked);
    console.log('Current selectedProducts:', selectedProducts);
    
    if (checked) {
      setSelectedProducts(prev => {
        const newState = [...prev, productId];
        console.log('Adding product, new state:', newState);
        return newState;
      });
    } else {
      setSelectedProducts(prev => {
        const newState = prev.filter(id => id !== productId);
        console.log('Removing product, new state:', newState);
        return newState;
      });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(inventory.map(product => product.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // Shopify product selection handlers
  const handleShopifyProductSelect = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedShopifyProducts(prev => [...prev, productId]);
    } else {
      setSelectedShopifyProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleSelectAllShopify = (checked: boolean) => {
    if (checked) {
      setSelectedShopifyProducts(shopifyProducts.map(product => product.id));
    } else {
      setSelectedShopifyProducts([]);
    }
  };

  // Import selected Shopify products to inventory
  const handleImportFromShopify = async () => {
    if (selectedShopifyProducts.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one Shopify product to import.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Find selected products
      const productsToImport = shopifyProducts.filter(product => 
        selectedShopifyProducts.includes(product.id)
      );

      // Convert Shopify products to inventory format and create them
      for (const shopifyProduct of productsToImport) {
        const inventoryData = {
          name: shopifyProduct.title,
          description: shopifyProduct.description,
          price: shopifyProduct.variants[0]?.price ? parseFloat(shopifyProduct.variants[0].price) : null,
          sku: shopifyProduct.variants[0]?.sku || null,
          category: shopifyProduct.productType || null,
          brand: shopifyProduct.vendor || null,
          images: shopifyProduct.images.map((img: any) => img.url),
          metadata: {
            shopifyId: shopifyProduct.id,
            handle: shopifyProduct.handle,
            tags: shopifyProduct.tags
          }
        };

        await inventoryAPI.create(inventoryData);
      }

      refetch();
      refetchCategories();
      setSelectedShopifyProducts([]);
      
      toast({
        title: "✅ Products Imported Successfully",
        description: `${productsToImport.length} product${productsToImport.length > 1 ? 's' : ''} imported from Shopify to your inventory.`,
      });

    } catch (error: any) {
      console.error('Error importing Shopify products:', error);
      toast({
        title: "❌ Import Failed",
        description: "Failed to import products from Shopify. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGenerateContent = async () => {
    if (selectedProductsData.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select at least one product to generate content.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setShowGenerator(false);

    try {
      toast({
        title: "Starting Generation",
        description: `Preparing to generate ${generationConfig.type} content for ${selectedProductsData.length} product${selectedProductsData.length > 1 ? 's' : ''}...`,
      });

      // Determine the best service based on content type and platform
      const getServiceForGeneration = () => {
        const { type, channel } = generationConfig;
        
        if (type === 'video') {
          if (channel === 'youtube' || channel === 'tiktok') {
            return 'heygen'; // HeyGen is best for video content
          } else {
            return 'runway'; // Runway for other video platforms
          }
        } else if (type === 'image') {
          // Use RunwayML for image generation with reference image support
          return 'runway';
        } else {
          // Use OpenAI for text content
          return 'openai';
        }
      };

      const service = getServiceForGeneration();
      console.log(`Using ${service} for ${generationConfig.type} generation`);

      // Show service-specific loading message
      toast({
        title: `Generating with ${service.charAt(0).toUpperCase() + service.slice(1)}`,
        description: `Creating ${generationConfig.type} content. This may take a few moments...`,
      });

      // Generate content for each selected product
      const results = await Promise.all(
        selectedProductsData.map(async (product, index) => {
          // Add delay between requests to avoid rate limiting
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          const instruction = generationConfig.instructions || getPlatformSpecificInstruction();
          
          // Prepare format specifications - only include what's actually used by each service
          const formatSpecs = {
            // For OpenAI: only size for images, maxTokens/temperature for text
            ...(generationConfig.type === 'image' && {
              size: generationConfig.formatSpec === 'square' ? '1024x1024' : 
                    generationConfig.formatSpec === 'landscape' ? '1792x1024' : '1024x1792'
            }),
            ...(generationConfig.type === 'content' && {
              maxTokens: 200,
              temperature: 0.7
            }),
            // For HeyGen: aspect ratio and other video-specific specs
            ...(service === 'heygen' && {
              aspectRatio: generationConfig.formatSpec === 'square' ? '1:1' : 
                          generationConfig.formatSpec === 'landscape' ? '16:9' : '9:16'
            }),
            // For RunwayML: width/height for image generation
            ...(service === 'runway' && generationConfig.type === 'image' && {
              width: generationConfig.formatSpec === 'square' ? 1024 : 
                     generationConfig.formatSpec === 'landscape' ? 1920 : 1024,
              height: generationConfig.formatSpec === 'square' ? 1024 : 
                      generationConfig.formatSpec === 'landscape' ? 1080 : 1920
            })
          };

          let result;
          
          try {
            // Show progress for each product
            toast({
              title: `Generating for ${product.name}`,
              description: `Processing ${index + 1} of ${selectedProductsData.length}...`,
            });

            if (service === 'heygen') {
              // Call HeyGen API
              result = await generateWithHeyGen(product, instruction, formatSpecs);
            } else if (service === 'runway') {
              // Call Runway API
              const hasReferenceImage = product.images && product.images.length > 0;
              if (hasReferenceImage) {
                toast({
                  title: `Generating with RunwayML`,
                  description: `Creating image using reference image for ${product.name}...`,
                });
              }
              result = await generateWithRunway(product, instruction, formatSpecs);
            } else {
              // Call OpenAI API
              result = await generateWithOpenAI(product, instruction, formatSpecs);
            }

            // ✅ Add debug logging for API response
            console.log(`Generation result for ${product.name}:`, {
              service,
              result,
              data: result?.data,
              asset_url: result?.asset_url,
              url: result?.url,
              status: result?.status
            });

            // ✅ Handle different API response structures
            let assetUrl = '';
            let status = 'completed';

            if (service === 'openai') {
              // Try different possible structures for OpenAI response
              console.log('Processing OpenAI result structure:', JSON.stringify(result, null, 2));
              
              // For image generation, the URL should be in the result
              if (generationConfig.type === 'image') {
                assetUrl = result?.data?.url || 
                          result?.data?.result || 
                          result?.url || 
                          result?.result || 
                          result?.data?.image_url || 
                          result?.data?.asset_url || '';
              } else {
                // For content generation, use the text result
                assetUrl = result?.data?.result || 
                          result?.result || 
                          'content-generated';
              }
              
              console.log('Extracted assetUrl for OpenAI:', assetUrl);
              status = 'completed';
            } else if (service === 'heygen') {
              // HeyGen returns: { success: true, data: { videoId, assetId, status } }
              // For HeyGen, we need to wait for the video to be ready
              assetUrl = `pending_${result?.data?.videoId || ''}`;
              status = result?.data?.status || 'processing';
            } else if (service === 'runway') {
              // RunwayML gen4_image_turbo returns completed image directly (same as OpenAI)
              console.log('Processing RunwayML result structure:', JSON.stringify(result, null, 2));
              assetUrl = result?.data?.result || '';
              console.log('Extracted assetUrl for RunwayML:', assetUrl);
              status = 'completed';
            }

            // Add error handling for empty URLs
            if (!assetUrl && (service === 'openai' || service === 'runway')) {
              console.error(`No URL found in ${service} response. Full result:`, result);
              // For content generation, use a placeholder
              if (generationConfig.type === 'content') {
                assetUrl = 'content-generated';
              } else {
                assetUrl = 'https://via.placeholder.com/800x600/FF6B6B/FFFFFF?text=URL+Not+Found';
              }
            }

            return {
              id: `gen-${Date.now()}-${index}`,
              title: `${product.name} - ${generationConfig.channel} ${generationConfig.format}`,
              description: `Generated ${generationConfig.type} for ${product.name} on ${generationConfig.channel}`,
              asset_type: generationConfig.type as 'image' | 'video' | 'content',
              asset_url: assetUrl,
              content: instruction,
              instruction: instruction,
              source_system: service as 'runway' | 'heygen' | 'openai',
              platform: generationConfig.channel,
              format: generationConfig.format,
              product: product,
              status: status
            };
          } catch (error) {
            console.error(`Generation failed for ${product.name}:`, error);
            console.error(`Service was: ${service}, Generation config:`, generationConfig);
            console.error(`Full result that caused error:`, result);
            
            // Return a placeholder result for failed generations
            return {
              id: `gen-${Date.now()}-${index}`,
              title: `${product.name} - ${generationConfig.channel} ${generationConfig.format}`,
              description: `Generation failed for ${product.name}`,
              asset_type: generationConfig.type as 'image' | 'video' | 'content',
              asset_url: `https://via.placeholder.com/800x600/EF4444/FFFFFF?text=Generation+Failed`,
              content: instruction,
              instruction: instruction,
                          source_system: service as 'runway' | 'heygen' | 'openai',
            platform: generationConfig.channel,
            format: generationConfig.format,
            product: product,
            status: 'failed',
            error: error.message
            };
          }
        })
      );

      setGenerationResults(results);
      
      // Add each result to the global generation context
      results.forEach(result => {
        const globalAsset = {
          id: result.id,
          type: result.asset_type,
          url: result.asset_url || '', // Ensure URL is never undefined
          asset_url: result.asset_url || '', // For backward compatibility
          content: result.content,
          instruction: result.instruction,
          timestamp: new Date(),
          source_system: result.source_system,
          status: result.status,
          message: result.error || undefined,
          // Additional properties for the modal
          title: result.title,
          description: result.description,
          platform: result.platform,
          channel: result.platform || 'social_media',
          product: result.product,
          format: result.format,
          inventoryId: result.product?.id // Add inventory ID directly
        };
        
        console.log('Adding result to global context:', globalAsset);
        addGenerationResult(globalAsset);
      });

      const successCount = results.filter(r => r.status !== 'failed').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      if (failedCount > 0) {
        toast({
          title: "Generation Partially Complete",
          description: `${successCount} generated successfully, ${failedCount} failed. Check results for details.`,
          variant: failedCount === results.length ? "destructive" : "default",
        });
      } else {
        toast({
          title: "Generation Complete",
          description: `Successfully generated ${successCount} ${generationConfig.type}${successCount > 1 ? 's' : ''}!`,
        });
      }

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // HeyGen API integration
  const generateWithHeyGen = async (product: InventoryItem, instruction: string, formatSpecs: any) => {
    const response = await generationAPI.generateWithHeyGen({
      templateId: 'default', // Use a default template ID or get from user selection
      instruction: instruction,
      productId: product.id,
      formatSpecs: formatSpecs
    });

    return response.data;
  };

  // Runway API integration
  const generateWithRunway = async (product: InventoryItem, instruction: string, formatSpecs: any) => {
    // Use the first product image as reference image for image generation
    const referenceImage = generationConfig.type === 'image' && product.images && product.images.length > 0 
      ? product.images[0] 
      : undefined;

    if (referenceImage) {
      console.log(`Using reference image for ${product.name}:`, referenceImage);
    } else {
      console.log(`No reference image available for ${product.name}, using text-to-image generation`);
    }

    const response = await generationAPI.generateWithRunway({
      type: generationConfig.type as 'image' | 'video',
      instruction: instruction,
      productInfo: {
        name: product.name,
        description: product.description || ''
      },
      formatSpecs: formatSpecs,
      referenceImage: referenceImage
    });

    return response.data;
  };

  // OpenAI API integration
  const generateWithOpenAI = async (product: InventoryItem, instruction: string, formatSpecs: any) => {
    console.log('Calling OpenAI API with:', {
      type: generationConfig.type === 'content' ? 'text' : 'image',
      instruction: instruction,
      productInfo: {
        name: product.name,
        description: product.description || ''
      },
      formatSpecs: formatSpecs
    });

    try {
      const response = await generationAPI.generateWithOpenAI({
        type: generationConfig.type === 'content' ? 'text' : 'image',
        instruction: instruction,
        productInfo: {
          name: product.name,
          description: product.description || ''
        },
        formatSpecs: formatSpecs,
        channel: generationConfig.channel
      });

      console.log('OpenAI API response:', response);
      console.log('OpenAI API response.data:', response.data);
      console.log('OpenAI API response.data.data:', response.data?.data);
      
      // Return the data structure that matches the backend response
      // The backend returns: { success: true, data: { result, assetId, metadata }, message }
      // So we return response.data which contains the backend response
      return response.data;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  };



  const handleSaveToLibrary = async (result: typeof generationResults[0]) => {
    if (savingAssets.has(result.id)) return;

    try {
      setSavingAssets(prev => new Set(prev).add(result.id));

      const assetData = prepareAssetData({
        title: result.title,
        description: result.description,
        asset_type: result.asset_type,
        asset_url: result.asset_url,
        content: result.content,
        instruction: result.instruction,
        source_system: result.source_system,
        channel: result.platform || 'social_media',
        inventoryId: result.product?.id,
        tags: [result.platform, result.format, result.product?.category].filter(Boolean)
      });

      const validation = validateAssetForSaving(assetData);
      if (!validation.isValid) {
        toast({
          title: "Cannot Save",
          description: validation.message,
          variant: "destructive",
        });
        return;
      }

      await saveToLibrary(assetData);
      showSaveSuccess(result.title);
    } catch (error) {
      handleSaveError(error, 'asset');
    } finally {
      setSavingAssets(prev => {
        const newSet = new Set(prev);
        newSet.delete(result.id);
        return newSet;
      });
    }
  };

  const handleGenerationComplete = () => {
    setShowGenerator(false);
    setGenerationResults([]);
    setSelectedProducts([]);
    setGenerationConfig({
      channel: 'facebook',
      type: 'image',
      format: 'feed_post',
      formatSpec: 'square',
      instructions: '',
      batchGenerate: true,
      variations: false,
      autoOptimize: true
    });
  };

  const handleEnhanceInstruction = async () => {
    const currentInstruction = generationConfig.instructions || getPlatformSpecificInstruction();
    if (!currentInstruction.trim()) {
      toast({
        title: "Error",
        description: "Please enter an instruction first.",
        variant: "destructive",
      });
      return;
    }

    setIsEnhancing(true);

    try {
      // Get the first selected product for context
      const product = selectedProductsData[0];
      if (!product) {
        toast({
          title: "Error",
          description: "Please select at least one product first.",
          variant: "destructive",
        });
        return;
      }

      // Create enhanced prompt for instruction improvement
      const enhancementPrompt = `You are a prompt engineer for AI image generation tools. Your task is to enhance the following instruction to produce a clean, high-quality product image for use on the ${generationConfig.channel} platform.

User's original instruction:
"${currentInstruction.trim()}"

Product Details:
- Name: ${product.name}
${product.description ? `- Description: ${product.description}` : ''}
${product.brand ? `- Brand: ${product.brand}` : ''}
${product.category ? `- Category: ${product.category}` : ''}

Enhance the instruction with the following rules:
1. Focus on **clean, realistic product photography**.
2. **Do NOT include** text overlays, buttons, mock UI, or logos.
3. Emphasize **professional composition, lighting, shadows**, and **background** suited for ${generationConfig.channel}.
4. Ensure the **product is centered, fully visible**, and shown from an ideal angle.
5. Include platform-specific framing or format if relevant (e.g., square for Instagram, vertical for Reels, etc.).
6. Use natural or studio lighting, with a soft shadow or clean backdrop.
7. Avoid abstract, surreal, or cartoon styles unless the original intent requires it.

Your output should be:
- A single enhanced prompt (max 200 words)
- Directly usable by an AI image generation model
- Focused only on visual instructions
- Do not explain your changes — return only the improved prompt.
`;


      // Call OpenAI API to improve the instruction
      console.log('Enhancement prompt:', enhancementPrompt);
      const response = await generationAPI.generateWithOpenAI({
        type: 'text',
        instruction: enhancementPrompt,
        productInfo: {
          name: product.name,
          description: product.description || ''
        },
        formatSpecs: {
          maxTokens: 250, // Lowered from 500 to reduce cost & latency
          temperature: 0.5 // Reduced randomness for more reliable outputs
        },
        channel: generationConfig.channel
      });
      
      console.log('Enhancement response:', response);
      console.log('Enhancement response.data:', response?.data);
      console.log('Enhancement response.data.data:', response?.data?.data);
      if (response?.data?.data?.result) {
        const improvedInstruction = response.data.data.result.trim();
        
        // Truncate instruction if it's too long for image generation
        const truncatedInstruction = generationConfig.type === 'image' 
          ? improvedInstruction.length > 1000 
            ? improvedInstruction.substring(0, 1000) + '...'
            : improvedInstruction
          : improvedInstruction;
        
        setGenerationConfig(prev => ({ ...prev, instructions: truncatedInstruction }));
        toast({
          title: "Instruction Enhanced",
          description: "Your instruction has been optimized using AI for better generation results.",
        });
      } else {
        throw new Error('No improvement result received');
      }
    } catch (error) {
      console.error('Error enhancing instruction:', error);
      toast({
        title: "Enhancement Failed",
        description: "Failed to enhance instruction. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEnhancing(false);
    }
  };

  const selectedProductsData = inventory.filter(product => selectedProducts.includes(product.id));

  // Simple Shopify Product Card component
  const ShopifyProductCard = ({ product, isSelected, onSelect }: { 
    product: any; 
    isSelected: boolean; 
    onSelect: (id: string, checked: boolean) => void;
  }) => (
    <div className={`border rounded-xl p-4 transition-all duration-200 hover:shadow-lg ${
      isSelected 
        ? theme === 'dark'
          ? 'border-blue-400 bg-blue-900/20'
          : 'border-blue-500 bg-blue-50'
        : theme === 'dark'
          ? 'border-gray-600 hover:border-gray-500 bg-gray-800'
          : 'border-gray-200 hover:border-gray-300'
    }`}>
      <div className="flex items-start space-x-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(product.id, checked as boolean)}
          className="mt-1"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start space-x-3">
            {product.images[0] && (
              <img
                src={product.images[0].url}
                alt={product.images[0].altText || product.title}
                className={`w-16 h-16 object-cover rounded-lg border flex-shrink-0 ${
                  theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                }`}
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold truncate mb-1 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>{product.title}</h3>
              {product.description && (
                <p className={`text-sm line-clamp-2 mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>{product.description}</p>
              )}
              <div className="flex flex-wrap gap-2 text-xs">
                {product.vendor && (
                  <Badge variant="outline" className={
                    theme === 'dark' 
                      ? 'bg-purple-900/50 text-purple-300 border-purple-600' 
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }>
                    {product.vendor}
                  </Badge>
                )}
                {product.productType && (
                  <Badge variant="outline" className={
                    theme === 'dark' 
                      ? 'bg-blue-900/50 text-blue-300 border-blue-600' 
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }>
                    {product.productType}
                  </Badge>
                )}
                {product.variants[0]?.price && (
                  <Badge variant="secondary" className={
                    theme === 'dark' 
                      ? 'bg-green-900/50 text-green-300 border-green-600' 
                      : 'bg-green-50 text-green-800 border-green-200'
                  }>
                    ${product.variants[0].price}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Generate platform-specific instruction placeholder
  const getPlatformSpecificInstruction = () => {
    const { channel, type, format, formatSpec } = generationConfig;
    const productName = selectedProductsData[0]?.name || 'selected product';
    
    const platformInstructions = {
      facebook: {
        image: {
          feed_post: `Generate a high-quality product image of ${productName} on a clean, minimal background. Ensure the product is centered, well-lit, and shown in its best angle. No text, logos, or overlays. Use natural shadows and realistic lighting to enhance appeal.`,
          ad: `Create a professional image of ${productName} for advertising. Showcase the product clearly on a clean, neutral or softly colored background. Focus on visual quality and presentation. No text or graphic elements.`
        }
      },
      instagram: {
        image: {
          feed_post: `Generate a visually appealing, aesthetic image of ${productName} on a clean or trendy background. Highlight the product with natural lighting and minimal styling. Avoid any text overlays or extra design elements.`,
          reel: `Create a clean thumbnail image featuring ${productName} with no text. Focus on bold colors or aesthetic backgrounds to catch attention naturally.`
        }
      },
      linkedin: {
        image: {
          feed_post: `Generate a clean and professional product image of ${productName}. Use neutral or business-appropriate background. No text or graphic overlays. Focus on presenting the product with high clarity and polish.`,
          ad: `Create a minimal, high-resolution image of ${productName} suitable for a professional LinkedIn ad. Keep background clean and product presentation sharp. No text or icons.`
        }
      },
      twitter: {
        image: {
          feed_post: `Create a clean product image of ${productName} on a solid or gradient background. Keep the product as the main focus. Avoid using any text, logos, or other graphical elements.`,
          ad: `Generate a sharp, focused image of ${productName} for Twitter ads. Use a clean backdrop and ensure excellent lighting and product visibility. Do not include text or overlays.`
        }
      }
    };
    

    const instruction = platformInstructions[channel]?.[type]?.[format];
    return instruction || `Create a compelling ${type} showcasing ${productName} for ${channel}. Highlight key features and benefits with professional styling and engaging visuals.`;
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
              className={`px-3 py-2 border rounded-md text-sm ${
                theme === 'dark' 
                  ? 'border-gray-600 bg-gray-800 text-white' 
                  : 'border-gray-300 bg-white text-gray-900'
              }`}
            >
                          <option value="">All Categories</option>
              {categories?.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            {/* Shopify Domain Input */}
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Enter your Shopify domain (e.g., your-store.myshopify.com)"
                value={shopDomain}
                onChange={(e) => setShopDomain(e.target.value)}
                className="w-80"
              />
              <Button 
                onClick={handleShopifyAuth}
                disabled={isShopifyAuthenticating || !shopDomain.trim()}
                className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
              >
                {isShopifyAuthenticating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingBag className="h-4 w-4" />
                )}
                <span>
                  {isShopifyAuthenticating ? 'Connecting...' : 'Connect Shopify'}
                </span>
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button onClick={() => setShowAddDialog(true)} className="flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </Button>
              
              <Button variant="outline" onClick={() => setShowImportDialog(true)} className="flex items-center space-x-2">
                <Upload className="h-4 w-4" />
                <span>Import</span>
              </Button>

              {inventory && inventory.length > 0 && (
                <div 
                  onClick={() => handleSelectAll(!(selectedProducts.length === inventory.length))}
                  className={`flex items-center space-x-2 p-2 border rounded-md cursor-pointer transition-all duration-200 ${
                    selectedProducts.length === inventory.length && inventory.length > 0
                      ? theme === 'dark'
                        ? 'bg-blue-900/20 border-blue-400 text-blue-300 hover:bg-blue-900/30'
                        : 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
                      : theme === 'dark'
                        ? 'hover:bg-gray-700 border-gray-600'
                      : 'hover:bg-gray-100 border-gray-200'
                  }`}
                >
                  <Checkbox
                    checked={selectedProducts.length === inventory.length && inventory.length > 0}
                    className="w-4 h-4"
                  />
                  <span>Select All</span>
                </div>
              )}
            </div>
          </div>

          {/* Multi-Select Controls */}
          {inventory && inventory.length > 0 && (
            <div className={`transition-all duration-300 ease-in-out border-2 rounded-xl p-4 mb-6 ${
              selectedProducts.length > 0 
                ? theme === 'dark'
                  ? 'bg-gradient-to-r from-blue-900/20 via-indigo-900/20 to-purple-900/20 border-blue-400 shadow-lg'
                  : 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-200 shadow-lg'
                : theme === 'dark'
                  ? 'bg-gray-800 border-gray-600'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-4">
                  {selectedProducts.length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors">
                        {selectedProducts.length} selected
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProducts([])}
                        className={`transition-all duration-200 ${
                          theme === 'dark'
                            ? 'text-gray-400 hover:text-red-400 hover:bg-red-900/20'
                            : 'text-gray-500 hover:text-red-600 hover:bg-red-50'
                        }`}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  )}
                </div>

                {selectedProducts.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => {
                        setGenerationType('video');
                        setShowGenerator(true);
                      }}
                      className="flex items-center space-x-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Video className="h-4 w-4" />
                      <span>Generate Video</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setGenerationType('image');
                        setShowGenerator(true);
                      }}
                      className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Image className="h-4 w-4" />
                      <span>Generate Image</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setGenerationType('content');
                        setShowGenerator(true);
                      }}
                      className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Generate Content</span>
                    </Button>
                    
                    <Button
                      onClick={() => {
                        setGenerationType('content');
                        setShowGenerator(true);
                      }}
                      className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                    >
                      <Wand2 className="h-4 w-4" />
                      <span>AI Generate</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Products Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border rounded-xl p-4 animate-pulse">
                  <div className="w-full h-48 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : inventory && inventory.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {inventory.map((product, index) => (
                <div
                  key={product.id}
                  className="transform transition-all duration-300 hover:scale-105"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <ProductCard
                    product={product}
                    onEdit={() => {
                      setSelectedProduct(product);
                      setShowAddDialog(true);
                    }}
                    onDelete={() => handleDeleteProduct(product.id)}
                    onUseForGeneration={handleUseForGeneration}
                    isSelected={selectedProducts.includes(product.id)}
                    onSelect={handleProductSelect}
                    showCheckbox={true}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className={`w-24 h-24 bg-gradient-to-br rounded-full flex items-center justify-center mx-auto mb-6 ${
                theme === 'dark' 
                  ? 'from-gray-700 to-gray-800' 
                  : 'from-gray-100 to-gray-200'
              }`}>
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className={`text-xl font-semibold mb-3 ${
                theme === 'dark' ? 'text-white' : 'text-gray-900'
              }`}>No products found</h3>
              <p className={`mb-6 max-w-md mx-auto ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {searchTerm || categoryFilter 
                  ? "No products match your current filters. Try adjusting your search criteria." 
                  : "Get started by adding your first product to the inventory. You'll be able to select multiple products for content generation."
                }
              </p>
              <Button 
                onClick={() => setShowAddDialog(true)} 
                className="flex items-center space-x-2 mx-auto bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <Plus className="h-4 w-4" />
                <span>Add Your First Product</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shopify Products Section */}
      {shopifyConnections.length > 0 && shopifyConnections.some(conn => conn.status === 'connected') && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="h-5 w-5 text-green-600" />
                <div>
                      <CardTitle className={theme === 'dark' ? 'text-green-400' : 'text-green-800'}>Shopify Products</CardTitle>
                  <CardDescription>
                    Products from your connected Shopify store{shopifyConnections.length > 1 ? 's' : ''}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {showShopifyProducts && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShopifyProducts(false)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Hide Products
                  </Button>
                )}
                <select
                  className={`px-3 py-2 border rounded-md text-sm ${
                    theme === 'dark' 
                      ? 'border-gray-600 bg-gray-800 text-white' 
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  onChange={(e) => {
                    if (e.target.value) {
                      fetchShopifyProducts(e.target.value);
                    }
                  }}
                >
                  <option value="">Select Store</option>
                  {shopifyConnections
                    .filter(conn => conn.status === 'connected')
                    .map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connection.shopName || connection.shopDomain}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Shopify Products Loading State */}
            {isLoadingShopifyProducts && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-green-600" />
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Loading products from Shopify...</p>
              </div>
            )}

            {/* Shopify Products Error State */}
            {shopifyError && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExternalLink className="h-8 w-8 text-red-600" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Failed to Load Products</h3>
                <p className="text-red-600 mb-4">{shopifyError}</p>
                <Button
                  onClick={() => {
                    const connectedStore = shopifyConnections.find(conn => conn.status === 'connected');
                    if (connectedStore) {
                      fetchShopifyProducts(connectedStore.id);
                    }
                  }}
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}

            {/* Shopify Products Content */}
            {showShopifyProducts && !isLoadingShopifyProducts && !shopifyError && (
              <>
                {/* Selection Controls */}
                {shopifyProducts.length > 0 && (
                  <div className={`border-2 rounded-xl p-4 mb-6 ${
                    theme === 'dark'
                      ? 'bg-gradient-to-r from-green-900/20 to-emerald-900/20 border-green-600'
                      : 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center space-x-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSelectAllShopify(!(selectedShopifyProducts.length === shopifyProducts.length))}
                          className={`flex items-center space-x-2 transition-all duration-200 ${
                            selectedShopifyProducts.length === shopifyProducts.length && shopifyProducts.length > 0
                              ? theme === 'dark'
                                ? 'bg-green-900/30 border-green-500 text-green-300 hover:bg-green-900/50'
                                : 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200'
                              : theme === 'dark'
                                ? 'hover:bg-green-900/20'
                                : 'hover:bg-green-100'
                          }`}
                        >
                          <Checkbox
                            checked={selectedShopifyProducts.length === shopifyProducts.length && shopifyProducts.length > 0}
                            className="w-4 h-4"
                          />
                          <span>Select All</span>
                        </Button>
                        
                        {selectedShopifyProducts.length > 0 && (
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className={`transition-colors ${
                              theme === 'dark'
                                ? 'bg-green-900/50 text-green-300 hover:bg-green-900/70'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}>
                              {selectedShopifyProducts.length} selected
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedShopifyProducts([])}
                              className="text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                            >
                              Clear Selection
                            </Button>
                          </div>
                        )}
                      </div>

                      {selectedShopifyProducts.length > 0 && (
                        <Button
                          onClick={handleImportFromShopify}
                          className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
                        >
                          <Upload className="h-4 w-4" />
                          <span>Import to Inventory</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Products Grid */}
                {shopifyProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {shopifyProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className="transform transition-all duration-300 hover:scale-105"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <ShopifyProductCard
                          product={product}
                          isSelected={selectedShopifyProducts.includes(product.id)}
                          onSelect={handleShopifyProductSelect}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                }`}>
                      <ShoppingBag className="h-8 w-8 text-gray-400" />
                    </div>
                <h3 className={`text-lg font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>No Products Found</h3>
                <p className={`mb-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                      No products were found in the selected Shopify store.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Initial State - No products loaded yet */}
            {!showShopifyProducts && !isLoadingShopifyProducts && !shopifyError && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="h-8 w-8 text-green-600" />
                </div>
                <h3 className={`text-lg font-semibold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                }`}>Connected to Shopify!</h3>
                <p className={`mb-4 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Your Shopify store is connected. Select a store above to view and import products.
                </p>
                <Button
                  onClick={() => {
                    const connectedStore = shopifyConnections.find(conn => conn.status === 'connected');
                    if (connectedStore) {
                      fetchShopifyProducts(connectedStore.id);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Load Products
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <AddProductDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onProductAdded={handleProductAdded}
        editProduct={selectedProduct}
        onEditComplete={async (productData: any) => {
          try {
            // Use the backend API client to update product with Prisma
            if (selectedProduct?.id) {
              await inventoryAPI.update(selectedProduct.id, productData);
            }

            setSelectedProduct(null);
            setShowAddDialog(false);
            refetch();
            refetchCategories();
            toast({
              title: "Product Updated",
              description: "Product has been successfully updated.",
            });
          } catch (error: any) {
            console.error('Error updating product:', error);
            
            // Don't close dialog - let user retry
            toast({
              title: "Error",
              description: "Failed to update product. Please try again.",
              variant: "destructive",
            });
            
            // Re-throw so AddProductDialog knows there was an error
            throw error;
          }
        }}
      />

      <ImportProductsDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onProductsImported={handleProductsImported}
      />

      {/* Generation Modal */}
      {showGenerator && generationType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 animate-in fade-in duration-300">
          <div className={`rounded-xl shadow-2xl w-full max-w-6xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-4 duration-300 ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-white'
          }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white p-4 sm:p-6 flex-shrink-0 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
              </div>

              <div className="relative flex justify-between items-start sm:items-center">
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg sm:text-2xl font-bold flex items-center">
                    <div className="relative">
                      <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 animate-pulse" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                    <span className="truncate">Unified Asset Generator</span>
                  </h3>
                  <p className="text-blue-100 mt-1 text-sm sm:text-base">
                    {selectedProductsData.length === 0
                      ? "Select products to start generating content"
                      : `Generate ${generationConfig.type}s for ${selectedProductsData.length} selected product${selectedProductsData.length > 1 ? 's' : ''}`
                    }
                  </p>
                </div>
                <Button
                  onClick={handleGenerationComplete}
                  variant="ghost"
                   size="sm"
                  className="text-white hover:bg-white/20 ml-2 flex-shrink-0 transition-all duration-200 hover:scale-110"
                >
                  <span className="text-xl">×</span>
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
              {/* Left Panel - Configuration */}
              <div className={`w-full lg:w-1/2 border-b lg:border-b-0 lg:border-r overflow-y-auto scrollbar-thin ${
                theme === 'dark' 
                  ? 'border-gray-700 scrollbar-thumb-gray-600 scrollbar-track-gray-800' 
                  : 'border-gray-200 scrollbar-thumb-gray-300 scrollbar-track-gray-100'
              }`}>
                <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                  {/* Product Configuration */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 animate-pulse"></div>
                      <h4 className={`font-semibold text-base sm:text-lg ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>Selected Products</h4>
                      <Badge variant="secondary" className={`ml-auto flex-shrink-0 transition-colors ${
                        theme === 'dark' 
                          ? 'bg-blue-900/50 text-blue-300 hover:bg-blue-800/50' 
                          : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      }`}>
                        {selectedProductsData.length} products
                      </Badge>
                    </div>

                    {selectedProductsData.length === 0 ? (
                      <div className="text-center py-8 px-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                        <h5 className={`text-lg font-medium mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>No Products Selected</h5>
                        <p className={`mb-4 max-w-sm mx-auto ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Please select one or more products from the inventory to generate content.
                        </p>
                        <div className="space-y-2">
                          <Button
                            variant="outline"
                            onClick={handleGenerationComplete}
                            className="w-full"
                          >
                            Close Generator
                          </Button>
                          <p className={`text-xs ${
                            theme === 'dark' ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            Tip: Use the checkboxes in the inventory to select products
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className={`space-y-3 max-h-32 sm:max-h-48 overflow-y-auto scrollbar-thin ${
                        theme === 'dark'
                          ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800'
                          : 'scrollbar-thumb-gray-300 scrollbar-track-gray-100'
                      }`}>
                        {selectedProductsData.map((product, index) => (
                          <div key={product.id} className={`flex items-center space-x-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-md group ${
                            theme === 'dark'
                              ? 'bg-gradient-to-r from-gray-800 via-blue-900/20 to-indigo-900/20 border-gray-600 hover:border-blue-400'
                              : 'bg-gradient-to-r from-gray-50 via-blue-50 to-indigo-50 border-gray-200 hover:border-blue-300'
                          }`}>
                            <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm flex-shrink-0 shadow-sm ${
                              theme === 'dark'
                                ? 'bg-gradient-to-br from-blue-900 to-indigo-900 text-blue-300'
                                : 'bg-gradient-to-br from-blue-100 to-indigo-200 text-blue-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm truncate transition-colors ${
                                theme === 'dark'
                                  ? 'text-white group-hover:text-blue-300'
                                  : 'text-gray-900 group-hover:text-blue-600'
                              }`}>{product.name}</p>
                              {product.category && (
                                <Badge variant="outline" className={`text-xs mt-1 backdrop-blur-sm ${
                                  theme === 'dark'
                                    ? 'bg-gray-800/80 border-gray-600 text-gray-300'
                                    : 'bg-white/80 border-gray-300 text-gray-700'
                                }`}>
                                  {product.category}
                                </Badge>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProducts(prev => prev.filter(id => id !== product.id));
                              }}
                              className={`flex-shrink-0 transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100 ${
                                theme === 'dark'
                                  ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                                  : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                              }`}
                            >
                              <span className="hidden sm:inline">Remove</span>
                              <span className="sm:hidden">×</span>
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Platform Configuration - Only show if products are selected */}
                  {selectedProductsData.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0 animate-pulse"></div>
                        <h4 className={`font-semibold text-base sm:text-lg ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>Platform Settings</h4>
                      </div>
                    
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Channel Selection */}
                        <div className="space-y-2">
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-700'
                          }`}>Channel</label>
                          <select 
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 ${
                              theme === 'dark' 
                                ? 'bg-gray-700 border-gray-600 text-white hover:border-blue-400' 
                                : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400'
                            }`}
                            value={generationConfig.channel}
                            onChange={(e) => setGenerationConfig(prev => ({ ...prev, channel: e.target.value }))}
                          >
                            <option value="facebook">📘 Facebook</option>
                            <option value="instagram">📷 Instagram</option>
                            <option value="tiktok">🎵 TikTok</option>
                            <option value="youtube">📺 YouTube</option>
                            <option value="linkedin">💼 LinkedIn</option>
                            <option value="twitter">🐦 Twitter</option>
                          </select>
                        </div>

                        {/* Type Selection */}
                        <div className="space-y-2">
                          <label className={`block text-sm font-medium ${
                            theme === 'dark' ? 'text-white' : 'text-gray-700'
                          }`}>Content Type</label>
                          <select 
                            className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 ${
                              theme === 'dark' 
                                ? 'bg-gray-700 border-gray-600 text-white hover:border-blue-400' 
                                : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400'
                            }`}
                            value={generationConfig.type}
                            onChange={(e) => setGenerationConfig(prev => ({ ...prev, type: e.target.value }))}
                          >
                            <option value="image">🖼️ Image</option>
                            <option value="video">🎥 Video</option>
                            <option value="carousel">🔄 Carousel</option>
                          </select>
                        </div>
                      </div>

                      {/* Format Selection */}
                      <div className="space-y-2">
                        <label className={`block text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-700'
                        }`}>Format</label>
                        <select 
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 ${
                            theme === 'dark' 
                              ? 'bg-gray-700 border-gray-600 text-white hover:border-blue-400' 
                              : 'bg-white border-gray-300 text-gray-900 hover:border-blue-400'
                          }`}
                          value={generationConfig.format}
                          onChange={(e) => setGenerationConfig(prev => ({ ...prev, format: e.target.value }))}
                        >
                          <option value="feed_post">📄 Feed Post</option>
                          <option value="reel">🎬 Reel</option>
                          <option value="ad">📢 Ad</option>
                          <option value="banner">🖼️ Banner</option>
                        </select>
                      </div>

                      {/* Format Specifications */}
                      <div className="space-y-3">
                        <label className={`block text-sm font-medium ${
                          theme === 'dark' ? 'text-white' : 'text-gray-700'
                        }`}>Dimensions</label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                          <div className={`p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            generationConfig.formatSpec === 'square' 
                              ? `border-blue-500 shadow-md scale-105 ${
                                  theme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-50'
                                }` 
                              : `${
                                  theme === 'dark' 
                                    ? 'border-gray-600 hover:border-blue-400 hover:bg-blue-900/20' 
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                }`
                          }`}>
                            <input 
                              type="radio" 
                              name="format" 
                              id="square" 
                              value="square"
                              checked={generationConfig.formatSpec === 'square'}
                              onChange={(e) => setGenerationConfig(prev => ({ ...prev, formatSpec: e.target.value }))}
                              className="sr-only"
                            />
                            <label htmlFor="square" className="cursor-pointer">
                              <div className="text-center">
                                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-gray-200 to-gray-300 mx-auto mb-1 sm:mb-2 rounded shadow-sm"></div>
                                <p className={`text-xs sm:text-sm font-medium ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>Square</p>
                                <p className={`text-xs hidden sm:block ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}>1080×1080px</p>
                              </div>
                            </label>
                          </div>
                          
                          <div className={`p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            generationConfig.formatSpec === 'landscape' 
                              ? `border-blue-500 shadow-md scale-105 ${
                                  theme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-50'
                                }` 
                              : `${
                                  theme === 'dark' 
                                    ? 'border-gray-600 hover:border-blue-400 hover:bg-blue-900/20' 
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                }`
                          }`}>
                            <input 
                              type="radio" 
                              name="format" 
                              id="landscape" 
                              value="landscape"
                              checked={generationConfig.formatSpec === 'landscape'}
                              onChange={(e) => setGenerationConfig(prev => ({ ...prev, formatSpec: e.target.value }))}
                              className="sr-only"
                            />
                            <label htmlFor="landscape" className="cursor-pointer">
                              <div className="text-center">
                                <div className="w-6 h-4 sm:w-8 sm:h-4 bg-gradient-to-br from-gray-200 to-gray-300 mx-auto mb-1 sm:mb-2 rounded shadow-sm"></div>
                                <p className={`text-xs sm:text-sm font-medium ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>Landscape</p>
                                <p className={`text-xs hidden sm:block ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}>1920×1080px</p>
                              </div>
                            </label>
                          </div>
                          
                          <div className={`p-2 sm:p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
                            generationConfig.formatSpec === 'portrait' 
                              ? `border-blue-500 shadow-md scale-105 ${
                                  theme === 'dark' ? 'bg-blue-900/50' : 'bg-blue-50'
                                }` 
                              : `${
                                  theme === 'dark' 
                                    ? 'border-gray-600 hover:border-blue-400 hover:bg-blue-900/20' 
                                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                                }`
                          }`}>
                            <input 
                              type="radio" 
                              name="format" 
                              id="portrait" 
                              value="portrait"
                              checked={generationConfig.formatSpec === 'portrait'}
                              onChange={(e) => setGenerationConfig(prev => ({ ...prev, formatSpec: e.target.value }))}
                              className="sr-only"
                            />
                            <label htmlFor="portrait" className="cursor-pointer">
                              <div className="text-center">
                                <div className="w-4 h-6 sm:w-4 sm:h-8 bg-gradient-to-br from-gray-200 to-gray-300 mx-auto mb-1 sm:mb-2 rounded shadow-sm"></div>
                                <p className={`text-xs sm:text-sm font-medium ${
                                  theme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>Portrait</p>
                                <p className={`text-xs hidden sm:block ${
                                  theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                                }`}>1080×1920px</p>
                              </div>
                            </label>
                          </div>
                          

                        </div>
                        <p className="text-xs text-blue-600 mt-2 flex items-center">
                          <span className="mr-1">✨</span>
                          Optimized for {generationConfig.channel.charAt(0).toUpperCase() + generationConfig.channel.slice(1)} {generationConfig.format.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Panel - Instructions and Actions */}
              <div className="w-full lg:w-1/2 flex flex-col min-h-0">
                <div className={`p-4 sm:p-6 flex-1 overflow-y-auto scrollbar-thin ${
                  theme === 'dark'
                    ? 'scrollbar-thumb-gray-600 scrollbar-track-gray-800'
                    : 'scrollbar-thumb-gray-300 scrollbar-track-gray-100'
                }`}>
                  {selectedProductsData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                          theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          <Wand2 className={`h-8 w-8 ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-400'
                          }`} />
                        </div>
                        <h5 className={`text-lg font-medium mb-2 ${
                          theme === 'dark' ? 'text-white' : 'text-gray-900'
                        }`}>Ready to Generate</h5>
                        <p className={`mb-4 max-w-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Select products from the left panel to configure your content generation settings.
                        </p>
                        <div className="space-y-3">
                          <div className={`flex items-center justify-center space-x-2 text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>Choose products from inventory</span>
                          </div>
                          <div className={`flex items-center justify-center space-x-2 text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Configure platform settings</span>
                          </div>
                          <div className={`flex items-center justify-center space-x-2 text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>Add generation instructions</span>
                          </div>
                          <div className={`flex items-center justify-center space-x-2 text-sm ${
                            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>Generate your content</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Instructions */}
                      <div className="space-y-4 mb-6 sm:mb-8">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 animate-pulse"></div>
                          <h4 className={`font-semibold text-base sm:text-lg ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>Content Instructions</h4>
                        </div>
                        
                        <div className="space-y-3">
                                                      <div className="relative">
                              <textarea
                                className={`w-full h-24 sm:h-32 px-4 py-3 pr-12 border rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 ${
                                  theme === 'dark' 
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                }`}
                                placeholder="Enter detailed instructions for content generation..."
                                value={generationConfig.instructions || getPlatformSpecificInstruction()}
                                onChange={(e) => setGenerationConfig(prev => ({ ...prev, instructions: e.target.value }))}
                              />
                              <div className={`absolute top-3 right-3 text-xs px-2 py-1 rounded ${
                                theme === 'dark' 
                                  ? 'text-gray-400 bg-gray-800/80' 
                                  : 'text-gray-500 bg-white/80'
                              }`}>
                                {(generationConfig.instructions || getPlatformSpecificInstruction()).length}/500
                              </div>
                            </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className={`w-full border-dashed transition-all duration-200 group ${
                              theme === 'dark' 
                                ? 'border-gray-600 hover:border-blue-400 hover:bg-blue-900/20 text-white' 
                                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-900'
                            }`}
                            onClick={handleEnhanceInstruction}
                            disabled={isEnhancing || !(generationConfig.instructions || getPlatformSpecificInstruction()).trim()}
                          >
                            {isEnhancing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                <span className="hidden sm:inline">Enhancing...</span>
                                <span className="sm:hidden">Enhancing...</span>
                              </>
                            ) : (
                              <>
                                <Wand2 className="h-4 w-4 mr-2 group-hover:animate-pulse" />
                                <span className="hidden sm:inline">Enhance with AI</span>
                                <span className="sm:hidden">AI Enhance</span>
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Generation Options */}
                      <div className="space-y-4 mb-6 sm:mb-8">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0 animate-pulse"></div>
                          <h4 className={`font-semibold text-base sm:text-lg ${
                            theme === 'dark' ? 'text-white' : 'text-gray-900'
                          }`}>Generation Options</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                            theme === 'dark'
                              ? 'bg-gradient-to-r from-gray-800 to-blue-900/20 border-gray-600 hover:border-blue-400'
                              : 'bg-gradient-to-r from-gray-50 to-blue-50 border-gray-200 hover:border-blue-300'
                          }`}>
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <input 
                                type="checkbox" 
                                id="batch_generate" 
                                checked={generationConfig.batchGenerate}
                                onChange={(e) => setGenerationConfig(prev => ({ ...prev, batchGenerate: e.target.checked }))}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 flex-shrink-0 transition-all duration-200"
                              />
                              <label htmlFor="batch_generate" className={`text-sm font-medium truncate cursor-pointer ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>Generate for all selected products</label>
                            </div>
                            <Badge variant="secondary" className={`flex-shrink-0 transition-colors ${
                              theme === 'dark'
                                ? 'bg-green-900/50 text-green-300 hover:bg-green-800/50'
                                : 'bg-green-100 text-green-800 hover:bg-green-200'
                            }`}>Recommended</Badge>
                          </div>
                          
                          <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                            theme === 'dark'
                              ? 'bg-gradient-to-r from-gray-800 to-purple-900/20 border-gray-600 hover:border-purple-400'
                              : 'bg-gradient-to-r from-gray-50 to-purple-50 border-gray-200 hover:border-purple-300'
                          }`}>
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <input 
                                type="checkbox" 
                                id="variations" 
                                checked={generationConfig.variations}
                                onChange={(e) => setGenerationConfig(prev => ({ ...prev, variations: e.target.checked }))}
                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 flex-shrink-0 transition-all duration-200"
                              />
                              <label htmlFor="variations" className={`text-sm font-medium truncate cursor-pointer ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>Create multiple variations</label>
                            </div>
                            <Badge variant="outline" className={`flex-shrink-0 ${
                              theme === 'dark'
                                ? 'border-gray-600 text-gray-300'
                                : 'border-gray-300 text-gray-700'
                            }`}>Optional</Badge>
                          </div>
                          
                          <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                            theme === 'dark'
                              ? 'bg-gradient-to-r from-gray-800 to-orange-900/20 border-gray-600 hover:border-orange-400'
                              : 'bg-gradient-to-r from-gray-50 to-orange-50 border-gray-200 hover:border-orange-300'
                          }`}>
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <input 
                                type="checkbox" 
                                id="auto_optimize" 
                                checked={generationConfig.autoOptimize}
                                onChange={(e) => setGenerationConfig(prev => ({ ...prev, autoOptimize: e.target.checked }))}
                                className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 flex-shrink-0 transition-all duration-200"
                              />
                              <label htmlFor="auto_optimize" className={`text-sm font-medium truncate cursor-pointer ${
                                theme === 'dark' ? 'text-white' : 'text-gray-900'
                              }`}>Auto-optimize for platform</label>
                            </div>
                            <Badge variant="secondary" className={`flex-shrink-0 transition-colors ${
                              theme === 'dark'
                                ? 'bg-orange-900/50 text-orange-300 hover:bg-orange-800/50'
                                : 'bg-orange-100 text-orange-800 hover:bg-orange-200'
                            }`}>Recommended</Badge>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className={`p-4 sm:p-6 border-t flex-shrink-0 ${
                  theme === 'dark'
                    ? 'border-gray-700 bg-gradient-to-r from-gray-800 to-blue-900/20'
                    : 'border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50'
                }`}>
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                    <Button
                      variant="outline"
                      onClick={handleGenerationComplete}
                      className={`flex-1 transition-all duration-200 ${
                        theme === 'dark'
                          ? 'border-gray-600 text-white hover:bg-gray-700'
                          : 'border-gray-300 text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleGenerateContent}
                      disabled={selectedProductsData.length === 0 || isGenerating}
                      className={`flex-1 transition-all duration-200 ${
                        selectedProductsData.length === 0 || isGenerating
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                      }`}
                      size="lg"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Wand2 className={`h-4 w-4 mr-2 ${selectedProductsData.length > 0 ? 'animate-pulse' : ''}`} />
                          <span className="hidden sm:inline">
                            {selectedProductsData.length === 0 ? 'Select Products First' : `Generate ${generationConfig.type.charAt(0).toUpperCase() + generationConfig.type.slice(1)}`}
                          </span>
                          <span className="sm:hidden">
                            {selectedProductsData.length === 0 ? 'Select Products' : 'Generate'}
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generation Results Modal - REMOVED - Now using global FirstGenerationResultsModal */}
    </div>
  );
}
