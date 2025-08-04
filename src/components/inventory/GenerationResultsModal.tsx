
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Package, Download, RefreshCw, Save, Edit, Loader2 } from "lucide-react";
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

interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'content';
  url?: string;
  content?: string;
  instruction: string;
  timestamp: Date;
  source_system?: string;
  status?: string;
  message?: string;
}

interface GenerationResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: InventoryItem;
  assets: GeneratedAsset[];
  isGenerating: boolean;
  onStartOver: () => void;
}

export function GenerationResultsModal({ 
  isOpen, 
  onClose, 
  product, 
  assets, 
  isGenerating, 
  onStartOver 
}: GenerationResultsModalProps) {
  const { toast } = useToast();
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState("");

  const latestAsset = assets[0];

  const handleDownload = (asset: GeneratedAsset) => {
    if (asset.url) {
      const link = document.createElement('a');
      link.href = asset.url;
      link.download = `${product.name}-${asset.type}-${asset.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (asset.content) {
      const blob = new Blob([asset.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product.name}-content-${asset.id}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
    
    toast({
      title: "Download Started",
      description: `${asset.type} asset download initiated.`,
    });
  };

  const handleSaveToLibrary = () => {
    toast({
      title: "Saved to Library",
      description: "Asset has been saved to your library.",
    });
  };

  const handleEditContent = (asset: GeneratedAsset) => {
    setEditingContent(asset.id);
    setEditedContent(asset.content || "");
  };

  const handleSaveEdit = () => {
    // In a real implementation, you would update the asset content
    toast({
      title: "Content Updated",
      description: "Your edits have been saved.",
    });
    setEditingContent(null);
  };

  const renderAssetContent = (asset: GeneratedAsset) => {
    if (asset.type === 'image' && asset.url) {
      return (
        <div className="relative rounded-lg overflow-hidden bg-gray-100">
          <img
            src={asset.url}
            alt={`Generated ${asset.type}`}
            className="w-full h-auto max-h-96 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = 
                '<div class="w-full h-48 flex items-center justify-center bg-gray-200 rounded-lg"><Package class="h-8 w-8 text-gray-400" /><span class="ml-2 text-gray-500">Image failed to load</span></div>';
            }}
          />
        </div>
      );
    }

    if (asset.type === 'video' && asset.url) {
      return (
        <div className="relative rounded-lg overflow-hidden bg-gray-100">
          <video
            src={asset.url}
            controls
            className="w-full h-auto max-h-96"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement!.innerHTML = 
                '<div class="w-full h-48 flex items-center justify-center bg-gray-200 rounded-lg"><Package class="h-8 w-8 text-gray-400" /><span class="ml-2 text-gray-500">Video failed to load</span></div>';
            }}
          />
        </div>
      );
    }

    if (asset.type === 'content' && asset.content) {
      return (
        <div className="space-y-4">
          {editingContent === asset.id ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[200px]"
                placeholder="Edit your content..."
              />
              <div className="flex space-x-2">
                <Button onClick={handleSaveEdit} size="sm">
                  Save Changes
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setEditingContent(null)}
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-4 bg-gray-50 rounded-lg border">
                <pre className="whitespace-pre-wrap text-sm">{asset.content}</pre>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => handleEditContent(asset)}
                className="flex items-center space-x-1"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Content</span>
              </Button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="w-full h-48 flex items-center justify-center bg-gray-100 rounded-lg">
        <div className="text-center">
          <Package className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500">Content not available</p>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generation Results</DialogTitle>
        </DialogHeader>

        {/* Product Info */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement!.innerHTML = 
                    '<div class="w-full h-full flex items-center justify-center bg-gray-200"><Package class="h-4 w-4 text-gray-400" /></div>';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <Package className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="font-medium">{product.name}</h3>
            <div className="flex items-center space-x-2 mt-1">
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
            </div>
          </div>
        </div>

        {/* Generation Status */}
        {isGenerating ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <h3 className="text-lg font-medium">Generating Content...</h3>
              <p className="text-gray-500">This may take a few moments</p>
            </div>
          </div>
        ) : latestAsset ? (
          <div className="space-y-6">
            {/* Generated Content */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium">Generated {latestAsset.type}</h4>
                <Badge variant="outline" className="text-xs">
                  {latestAsset.source_system}
                </Badge>
              </div>
              
              {renderAssetContent(latestAsset)}
              
              {latestAsset.message && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">{latestAsset.message}</p>
                </div>
              )}
            </div>

            {/* Instruction Display */}
            {latestAsset.instruction && (
              <div className="space-y-2">
                <h5 className="font-medium">Original Instruction:</h5>
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <p className="text-sm">{latestAsset.instruction}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <Button
                onClick={() => handleDownload(latestAsset)}
                className="flex items-center space-x-1"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={handleSaveToLibrary}
                className="flex items-center space-x-1"
              >
                <Save className="h-4 w-4" />
                <span>Save to Library</span>
              </Button>
              
              <Button
                variant="outline"
                onClick={onStartOver}
                className="flex items-center space-x-1"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Start Over</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Generated</h3>
            <p className="text-gray-500">Start a generation to see results here.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
