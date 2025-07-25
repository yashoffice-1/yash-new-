
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { 
  Play,
  Heart,
  HeartOff,
  Loader2,
  AlertCircle,
  Video
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
          {asset.status === 'processing' ? (
            <div className="w-24 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded flex flex-col items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 mx-auto" />
                <p className="text-xs text-blue-600 mt-1">Creating...</p>
                <div className="w-20 bg-gray-200 rounded-full h-1 mt-1">
                  <div className="bg-blue-600 h-1 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                </div>
              </div>
            </div>
          ) : asset.status === 'failed' ? (
            <div className="w-24 h-16 bg-red-100 rounded flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="h-6 w-6 text-red-600 mx-auto" />
                <p className="text-xs text-red-600 mt-1">Failed</p>
              </div>
            </div>
          ) : asset.thumbnail || asset.type === 'image' ? (
            <img 
              src={asset.thumbnail || asset.url} 
              alt={asset.title}
              className="w-24 h-16 object-cover rounded bg-gray-200"
            />
          ) : (
            <div className="w-24 h-16 bg-gray-100 rounded flex items-center justify-center">
              <Video className="h-8 w-8 text-gray-400" />
            </div>
          )}
          
          {asset.type === 'video' && asset.status === 'completed' && (
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
              {asset.gif_url && asset.status === 'completed' && (
                <p className="text-xs text-blue-600 mt-1">
                  ✨ GIF preview available
                </p>
              )}
              {asset.status === "processing" && (
                <div className="mt-2">
                  <p className="text-xs text-blue-600 mb-1">
                    🎬 FeedGenesis is working on your video
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: "75%" }}></div>
                    </div>
                    <span className="text-xs text-gray-500">75%</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Estimated time remaining: 1-2 minutes
                  </p>
                </div>
              )}
              {asset.status === "processing" && asset.url === "pending" && (
                <p className="text-xs text-orange-600 mt-1">
                  ⏳ Request sent - Processing will begin shortly
                </p>
              )}
              {asset.status === 'failed' && (
                <p className="text-xs text-red-600 mt-1">
                  ❌ Video generation failed. Please try again.
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Badge 
                className={
                  asset.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : asset.status === 'processing' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-red-100 text-red-800'
                }
              >
                {asset.status === 'processing' ? '🎬 Generating' : 
                 asset.status === 'completed' ? '✅ Ready' : 
                 '❌ Failed'}
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
