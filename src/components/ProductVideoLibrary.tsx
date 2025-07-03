import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Download, ExternalLink, Play } from "lucide-react";

interface GeneratedVideo {
  id: string;
  title: string;
  asset_url: string;
  gif_url?: string;
  created_at: string;
  description?: string;
  source_system: string;
}

interface ProductVideoLibraryProps {
  productId: string;
  productName: string;
}

export function ProductVideoLibrary({ productId, productName }: ProductVideoLibraryProps) {
  const [videos, setVideos] = useState<GeneratedVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProductVideos = async () => {
      setIsLoading(true);
      try {
        console.log('Fetching videos for product:', productId);
        
        // Get videos from asset library for this product
        const { data: assetVideos, error: assetError } = await supabase
          .from('asset_library')
          .select('*')
          .eq('asset_type', 'video')
          .order('created_at', { ascending: false });

        if (assetError) {
          console.error('Error fetching asset library videos:', assetError);
          return;
        }

        // Also get videos from generated_assets to cross-reference
        const { data: generatedAssets, error: generatedError } = await supabase
          .from('generated_assets')
          .select('*')
          .eq('inventory_id', productId)
          .eq('asset_type', 'video')
          .order('created_at', { ascending: false });

        if (generatedError) {
          console.error('Error fetching generated assets:', generatedError);
        }

        // Filter asset library videos that relate to this product
        let productVideos: GeneratedVideo[] = [];
        
        if (assetVideos) {
          // Match by original_asset_id or by description containing product info
          productVideos = assetVideos.filter(video => {
            // Check if this video is linked to any of our generated assets
            const relatedAsset = generatedAssets?.find(asset => 
              asset.id === video.original_asset_id
            );
            
            // Also check if description mentions the product name
            const mentionsProduct = video.description?.toLowerCase().includes(productName.toLowerCase());
            
            return relatedAsset || mentionsProduct;
          }).map(video => ({
            id: video.id,
            title: video.title,
            asset_url: video.asset_url,
            gif_url: video.gif_url,
            created_at: video.created_at,
            description: video.description,
            source_system: video.source_system
          }));
        }

        console.log('Found product videos:', productVideos);
        setVideos(productVideos);
      } catch (error) {
        console.error('Error fetching product videos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductVideos();
  }, [productId, productName]);

  const handleDownload = (url: string, title: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title}.mp4`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenVideo = (url: string) => {
    window.open(url, '_blank');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Generated Videos</CardTitle>
          <CardDescription>Loading videos for {productName}...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Videos</CardTitle>
        <CardDescription>
          {videos.length > 0 
            ? `${videos.length} video${videos.length === 1 ? '' : 's'} generated for ${productName}`
            : `No videos generated for ${productName} yet`
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {videos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Play className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No videos generated yet</p>
            <p className="text-sm">Generate your first video using the template above</p>
          </div>
        ) : (
          <div className="space-y-4">
            {videos.map((video) => (
              <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  {video.gif_url && video.gif_url !== 'processing' && video.gif_url !== 'failed' ? (
                    <img 
                      src={video.gif_url} 
                      alt="Video preview"
                      className="w-16 h-12 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-16 h-12 bg-gray-200 rounded border flex items-center justify-center">
                      <Play className="h-4 w-4 text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{video.title}</h4>
                    {video.description && (
                      <p className="text-xs text-gray-600 mt-1">{video.description}</p>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {video.source_system}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(video.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {video.asset_url && video.asset_url !== 'processing' && video.asset_url !== 'failed' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenVideo(video.asset_url)}
                        className="flex items-center space-x-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(video.asset_url, video.title)}
                        className="flex items-center space-x-1"
                      >
                        <Download className="h-3 w-3" />
                        <span>Download</span>
                      </Button>
                    </>
                  )}
                  {(video.asset_url === 'processing' || !video.asset_url) && (
                    <Badge variant="outline" className="text-xs">
                      Processing...
                    </Badge>
                  )}
                  {video.asset_url === 'failed' && (
                    <Badge variant="destructive" className="text-xs">
                      Failed
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}