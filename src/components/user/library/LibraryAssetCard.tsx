
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Play,
  Heart,
  HeartOff
} from "lucide-react";
import { AssetActions } from "./AssetActions";

interface LibraryAsset {
  id: string;
  title: string;
  type: 'video' | 'image' | 'content';
  url: string;
  gif_url?: string;
  thumbnail?: string;
  createdAt: string;
  favorited: boolean;
  status: 'completed' | 'processing' | 'failed';
}

interface LibraryAssetCardProps {
  asset: LibraryAsset;
}

export function LibraryAssetCard({ asset }: LibraryAssetCardProps) {
  const { toast } = useToast();

  const toggleFavorite = (assetId: string) => {
    // In real implementation, this would update the database
    toast({
      title: "Updated",
      description: "Asset favorite status updated.",
    });
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start space-x-4">
        {/* Thumbnail */}
        <div className="relative">
          <img 
            src={asset.thumbnail} 
            alt={asset.title}
            className="w-24 h-16 object-cover rounded bg-gray-200"
          />
          {asset.type === 'video' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Play className="h-6 w-6 text-white bg-black bg-opacity-50 rounded-full p-1" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold">{asset.title}</h3>
              <p className="text-sm text-gray-600">
                Created: {new Date(asset.createdAt).toLocaleDateString()}
              </p>
              {asset.gif_url && (
                <p className="text-xs text-blue-600 mt-1">
                  ✨ GIF preview available
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={asset.status === 'completed' ? 'default' : asset.status === 'processing' ? 'secondary' : 'destructive'}
              >
                {asset.status}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleFavorite(asset.id)}
              >
                {asset.favorited ? (
                  <Heart className="h-4 w-4 text-red-500 fill-current" />
                ) : (
                  <HeartOff className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Asset Actions - only show for completed assets */}
          {asset.status === 'completed' && (
            <AssetActions asset={asset} />
          )}
        </div>
      </div>
    </div>
  );
}
