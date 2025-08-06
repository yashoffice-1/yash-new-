import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/layout/card";
import { Badge } from "@/components/ui/data_display/badge";
import { Button } from "@/components/ui/forms/button";
import { Progress } from "@/components/ui/data_display/progress";
import { supabase } from "@/integrations/supabase/client";
import { Download, ExternalLink, Play, Clock, Sparkles } from "lucide-react";

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
  const [progressStates, setProgressStates] = useState<Record<string, number>>({});

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

  // Progress simulation for processing videos
  useEffect(() => {
    const processingVideos = videos.filter(video => 
      video.asset_url === 'processing' || !video.asset_url
    );

    if (processingVideos.length === 0) return;

    const interval = setInterval(() => {
      setProgressStates(prev => {
        const newStates = { ...prev };
        let hasUpdates = false;

        processingVideos.forEach(video => {
          const currentProgress = newStates[video.id] || 0;
          const startTime = newStates[`${video.id}_startTime`] || Date.now();
          const elapsedTime = (Date.now() - startTime) / 1000; // seconds
          const totalDuration = 300; // 5 minutes in seconds
          const targetProgress = 92; // Target 92% before completion
          
          // Calculate progress based on elapsed time
          let newProgress;
          if (elapsedTime >= totalDuration) {
            // After 5 minutes, stay at 92% until completion
            newProgress = targetProgress;
          } else {
            // Linear progress from 0 to 92% over 5 minutes
            newProgress = Math.min(targetProgress, (elapsedTime / totalDuration) * targetProgress);
          }
          
          // Set start time if not already set
          if (!newStates[`${video.id}_startTime`]) {
            newStates[`${video.id}_startTime`] = startTime;
          }
          
          if (newProgress !== currentProgress) {
            newStates[video.id] = newProgress;
            hasUpdates = true;
          }
        });

        return hasUpdates ? newStates : prev;
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, [videos, progressStates]);

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
            {videos.map((video) => {
              const isProcessing = video.asset_url === 'processing' || !video.asset_url;
              const currentProgress = progressStates[video.id] || 0;
              
              return (
                <div key={video.id} className={`flex items-center justify-between p-4 border rounded-lg transition-all duration-300 ${
                  isProcessing ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 animate-pulse' : ''
                }`}>
                  <div className="flex items-center space-x-4">
                    {video.gif_url && video.gif_url !== 'processing' && video.gif_url !== 'failed' ? (
                      <img 
                        src={video.gif_url} 
                        alt="Video preview"
                        className="w-16 h-12 object-cover rounded border"
                      />
                    ) : isProcessing ? (
                      <div className="w-16 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded border flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-[slide-in-right_2s_ease-in-out_infinite]"></div>
                        <Sparkles className="h-4 w-4 text-blue-600 animate-spin" />
                      </div>
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
                      
                      {/* Progress bar for processing videos */}
                      {isProcessing && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-blue-600 flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>Generating video...</span>
                            </span>
                            <span className="text-xs font-bold text-purple-600">
                              {Math.round(currentProgress)}%
                            </span>
                          </div>
                          <Progress 
                            value={currentProgress} 
                            className="h-2 bg-blue-100"
                          />
                          <p className="text-xs text-gray-500">
                            {currentProgress >= 92 
                              ? "Almost complete - finalizing video..."
                              : `Estimated time remaining: ${Math.max(1, Math.round((300 - (currentProgress / 92 * 300)) / 60))} minutes`
                            }
                          </p>
                        </div>
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
                    {isProcessing && (
                      <div className="flex flex-col items-end space-y-1">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 animate-pulse">
                          <Sparkles className="h-3 w-3 mr-1 animate-spin" />
                          Processing
                        </Badge>
                        <span className="text-xs text-gray-500">
                          HeyGen is creating your video
                        </span>
                      </div>
                    )}
                    {video.asset_url === 'failed' && (
                      <Badge variant="destructive" className="text-xs">
                        Failed
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}