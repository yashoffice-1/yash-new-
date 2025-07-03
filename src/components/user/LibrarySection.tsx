
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LibraryAssetCard } from "./library/LibraryAssetCard";
import { useAssetLibrary } from "@/hooks/useAssetLibrary";
import { Loader2 } from "lucide-react";

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

export function LibrarySection() {
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getLibraryAssets } = useAssetLibrary();

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true);
      try {
        const libraryAssets = await getLibraryAssets();
        
        // Transform asset library items to LibraryAsset format
        const transformedAssets: LibraryAsset[] = libraryAssets.map(asset => {
          // Determine status based on asset_url
          let status: 'completed' | 'processing' | 'failed' = 'completed';
          if (asset.asset_url === 'processing' || asset.asset_url === 'pending') {
            status = 'processing';
          } else if (asset.asset_url === 'failed' || !asset.asset_url) {
            status = 'failed';
          }

          return {
            id: asset.id,
            title: asset.title,
            type: asset.asset_type as 'video' | 'image' | 'content',
            url: asset.asset_url,
            gif_url: asset.gif_url,
            thumbnail: asset.asset_type === 'image' ? asset.asset_url : undefined,
            createdAt: new Date(asset.created_at).toLocaleDateString(),
            favorited: asset.favorited,
            status
          };
        });

        setAssets(transformedAssets);
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
    
    // Refresh assets every 30 seconds to check for updates
    const interval = setInterval(fetchAssets, 30000);
    return () => clearInterval(interval);
  }, [getLibraryAssets]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Library</CardTitle>
        <CardDescription>
          Your generated videos and content with sharing options
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading your assets...</span>
          </div>
        ) : assets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No assets found. Generate some content to see it here!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assets.map((asset) => (
              <LibraryAssetCard key={asset.id} asset={asset} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
