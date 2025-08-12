
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/layout/card';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { Badge } from '@/components/ui/data_display/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/data_display/tabs';
import { Heart, Download, Copy, Trash2, Search, AlertCircle, RefreshCw, Share2, Upload, X, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAssetLibrary, AssetLibraryItem } from '@/hooks/data/useAssetLibrary';
import { useToast } from '@/hooks/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SocialMediaUpload } from '../../user/social/SocialMediaUpload';
import { templatesAPI, assetsAPI } from '@/api/clients/backend-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/overlays/dialog';

// Extend the AssetLibraryItem interface to include gif_url
interface ExtendedAssetLibraryItem extends AssetLibraryItem {
  gif_url?: string;
}

export function AssetLibrary() {
  const [assets, setAssets] = useState<ExtendedAssetLibraryItem[]>([]);
  const [filteredAssets, setFilteredAssets] = useState<ExtendedAssetLibraryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAssetForUpload, setSelectedAssetForUpload] = useState<ExtendedAssetLibraryItem | null>(null);
  const [progressStates, setProgressStates] = useState<Record<string, number>>({});
  const [selectedAsset, setSelectedAsset] = useState<ExtendedAssetLibraryItem | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);
  const [pagination, setPagination] = useState<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null>(null);

  // Add state for asset type counts
  const [assetTypeCounts, setAssetTypeCounts] = useState<{
    all: number;
    image: number;
    video: number;
    content: number;
  }>({
    all: 0,
    image: 0,
    video: 0,
    content: 0
  });

  // Add state to track if counts have been loaded
  const [countsLoaded, setCountsLoaded] = useState(false);

  const { getLibraryAssets, getAssetTypeCounts, toggleFavorite, deleteFromLibrary, isLoading } = useAssetLibrary();
  const { toast } = useToast();

  // Handle keyboard events for image modal
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isImageModalOpen) {
        setIsImageModalOpen(false);
      }
    };

    if (isImageModalOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isImageModalOpen]);

  // Update asset through API
  const updateAsset = async (assetId: string, updates: { url?: string; status?: string }) => {
    try {
      const response = await assetsAPI.updateAsset(assetId, updates);

      if (response.data.success) {
        // Update local state
        setAssets(prevAssets =>
          prevAssets.map(asset =>
            asset.id === assetId
              ? { ...asset, ...updates }
              : asset
          )
        );
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update asset');
      }
    } catch (error) {
      console.error('Failed to update asset:', error);
      throw error;
    }
  };

  // Function to load asset type counts - simplified and efficient
  const loadAssetTypeCounts = async () => {
    try {
      // This function is only called for the 'all' tab
      if (selectedType !== 'all') {
        return;
      }

      // Don't reload if we already have counts and no filters are applied
      if (countsLoaded && !showFavoritesOnly && !searchTerm) {
        return;
      }

      // For 'all' tab, use the new efficient API to get all counts in one call
      const baseFilters: any = {};
      if (showFavoritesOnly) {
        baseFilters.favorited = true;
      }
      if (searchTerm) {
        baseFilters.search = searchTerm;
      }

      const counts = await getAssetTypeCounts(baseFilters);
      
      // Update all counts
      setAssetTypeCounts({
        all: counts.all,
        image: counts.image,
        video: counts.video,
        content: counts.content
      });
      
      setCountsLoaded(true);
    } catch (error) {
      console.error('Error loading asset type counts:', error);
    }
  };

  const loadAssets = async (page: number = currentPage, limit: number = itemsPerPage) => {
    console.log('Loading assets from library...', { page, limit, selectedType });
    try {
      const filters: any = {
        page,
        limit
      };
      
      // Add filters based on current state
      if (selectedType !== 'all') {
        filters.asset_type = selectedType;
      }
      if (showFavoritesOnly) {
        filters.favorited = true;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }

      console.log('Filters for loadAssets:', filters);
      const result = await getLibraryAssets(filters);
      console.log('Loaded assets from library:', result);
      
      setAssets(result.assets);
      setFilteredAssets(result.assets);
      setPagination(result.pagination);
      setCurrentPage(page);
    } catch (error) {
      console.error('Error loading assets:', error);
      toast({
        title: "Error",
        description: "Failed to load assets. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInitialLoading(false);
    }
  };

  // Pagination handlers
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= (pagination?.pages || 1)) {
      loadAssets(page, itemsPerPage);
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
    loadAssets(1, newItemsPerPage);
  };

  // Progress simulation for processing videos
  useEffect(() => {
    const processingVideos = assets.filter(asset =>
      asset.asset_url === 'processing' || asset.asset_url === 'pending' || asset.asset_url?.startsWith('pending_')
    );

    if (processingVideos.length === 0) return;

    const interval = setInterval(() => {
      setProgressStates(prev => {
        const newStates = { ...prev };
        let hasUpdates = false;

        processingVideos.forEach(asset => {
          const currentProgress = newStates[asset.id] || 0;
          const startTime = newStates[`${asset.id}_startTime`] || Date.now();
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
          if (!newStates[`${asset.id}_startTime`]) {
            newStates[`${asset.id}_startTime`] = startTime;
          }

          if (newProgress !== currentProgress) {
            newStates[asset.id] = newProgress;
            hasUpdates = true;
          }
        });

        return hasUpdates ? newStates : prev;
      });
    }, 5000); // Update every 5 seconds instead of 3

    return () => clearInterval(interval);
  }, [assets, progressStates]);

  const handleManualRefresh = async () => {
    toast({
      title: "Refreshing Assets",
      description: "Loading latest asset updates...",
    });
    setCurrentPage(1);
    setCountsLoaded(false); // Reset counts loaded flag
    await loadAssets(1, itemsPerPage);
    // Counts will be updated automatically when assets are loaded
  };

  useEffect(() => {
    loadAssets(1, itemsPerPage);
    // Reset counts loaded flag on initial load
    setCountsLoaded(false);
    // Initialize counts to 0 to prevent undefined values
    setAssetTypeCounts({
      all: 0,
      image: 0,
      video: 0,
      content: 0
    });
  }, []);

  // Reload assets when filters change (server-side filtering)
  useEffect(() => {
    if (!isInitialLoading) {
      setCurrentPage(1);
      loadAssets(1, itemsPerPage);
      // Only reset counts loaded flag when actual filters change, not tab switching
      if (showFavoritesOnly || searchTerm) {
        setCountsLoaded(false);
      }
    }
  }, [selectedType, showFavoritesOnly, searchTerm]);

  // Update counts when pagination changes
  useEffect(() => {
    if (!isInitialLoading && pagination) {
      // For specific tabs, only update if we don't have detailed counts yet
      if (selectedType !== 'all') {
        // Only update if we don't have detailed counts loaded yet
        if (!countsLoaded) {
          const currentCount = pagination.total;
          setAssetTypeCounts(prev => ({
            ...prev,
            [selectedType]: currentCount
          }));
        }
      } else {
        // For 'all' tab, only update if we don't have detailed counts loaded yet
        if (!countsLoaded) {
          const currentCount = pagination.total;
          setAssetTypeCounts(prev => ({
            ...prev,
            all: currentCount
          }));
          
          // Load detailed counts
          loadAssetTypeCounts();
        }
        // If counts are already loaded, don't update from pagination
      }
    }
  }, [pagination, selectedType]);

  // Load detailed counts when filters change on 'all' tab
  useEffect(() => {
    if (!isInitialLoading && selectedType === 'all' && pagination) {
      // Only reload counts if filters have changed (not just tab switching)
      const hasFilters = showFavoritesOnly || searchTerm;
      if (hasFilters) {
        setCountsLoaded(false);
        loadAssetTypeCounts();
      }
    }
  }, [showFavoritesOnly, searchTerm]);

  const handleToggleFavorite = async (id: string, currentFavorited: boolean) => {
    await toggleFavorite(id, !currentFavorited);
    // Reload current page to reflect changes
    await loadAssets(currentPage, itemsPerPage);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this asset from your library?')) {
      await deleteFromLibrary(id);
      // Reload current page to reflect changes
      await loadAssets(currentPage, itemsPerPage);
    }
  };

  const handleDownload = async (asset: ExtendedAssetLibraryItem) => {
    if (asset.asset_url && asset.asset_type !== 'content') {
      try {
        // For Supabase storage URLs, add download parameter to force download
        let downloadUrl = asset.asset_url;
        if (asset.asset_url.includes('supabase.co/storage')) {
          // Add download parameter to Supabase URLs to force download
          downloadUrl = `${asset.asset_url}?download=${encodeURIComponent(asset.title)}.${asset.asset_type === 'image' ? 'png' : 'mp4'}`;
        }

        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${asset.title}-${asset.asset_type}`;
        link.target = '_blank'; // Fallback in case download doesn't work
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
          title: "Download Started",
          description: `Downloading ${asset.title}...`,
        });
      } catch (error) {
        console.error('Download error:', error);
        toast({
          title: "Download Failed",
          description: "Failed to download the asset. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCopyContent = async (content: string, title: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toast({
        title: "Content Copied",
        description: `${title} content copied to clipboard!`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy content to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleRefreshVideo = async (assetId: string) => {
    toast({
      title: "Checking Video Status",
      description: "Getting latest video status from HeyGen...",
    });

    try {
      // Get the asset details from the current state instead of Supabase
      const asset = assets.find(a => a.id === assetId);

      if (!asset) {
        throw new Error('Asset not found');
      }

      // Extract video ID from the asset URL if it's pending
      let videoId = null;
      if (asset.asset_url && asset.asset_url.startsWith('pending_')) {
        videoId = asset.asset_url.replace('pending_', '');
      } else if (asset.description) {
        // Try to extract video ID from description
        const videoIdMatch = asset.description.match(/video_id[:_](\w+)/i);
        if (videoIdMatch) {
          videoId = videoIdMatch[1];
        }
      }

      if (!videoId) {
        // If we can't find a video ID, use the backend bulk recovery endpoint
        const response = await templatesAPI.heygen.recoverPending();

        if (response.data.success) {
          toast({
            title: "✅ Recovery Completed",
            description: `${response.data.data.length} videos checked. ${response.data.data.filter((r: any) => r.updated).length} updated.`,
          });

          // Reload assets to show the updated status
          await loadAssets(currentPage);
          return;
        } else {
          throw new Error(response.data.error || 'Recovery failed');
        }
      }

      // Use the backend status check endpoint for specific video
      const response = await templatesAPI.heygen.getStatus(videoId);

      if (response.data.success) {
        const { status, videoUrl, errorMessage } = response.data.data;

        if (status === 'completed' && videoUrl) {
          // Update the asset with the final video URL
          await updateAsset(assetId, { url: videoUrl, status: 'completed' });
          toast({
            title: "✅ Video Ready",
            description: "Video has been completed and is now available for download.",
          });
        } else if (status === 'failed') {
          await updateAsset(assetId, { status: 'failed' });
          toast({
            title: "❌ Video Failed",
            description: errorMessage || "Video generation failed.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "⏳ Still Processing",
            description: "Video is still being generated. Please wait.",
          });
        }

        // Reload assets to show the updated status
        await loadAssets(currentPage);
      } else {
        throw new Error(response.data.error || 'Failed to get video status');
      }
    } catch (error) {
      console.error('Error getting video status:', error);
      toast({
        title: "Failed to Get Video Status",
        description: error.message || "Could not retrieve video status from HeyGen.",
        variant: "destructive",
      });
    }
  };

  const handleBulkRecovery = async () => {
    toast({
      title: "Recovering Pending Videos",
      description: "Checking all pending HeyGen videos...",
    });

    try {
      const response = await templatesAPI.heygen.recoverPending();

      if (response.data.success) {
        const updatedCount = response.data.data.filter((r: any) => r.updated).length;
        toast({
          title: "✅ Bulk Recovery Completed",
          description: `${response.data.data.length} videos checked. ${updatedCount} videos updated.`,
        });

        // Reload assets to show the updated status
        setCurrentPage(1);
        await loadAssets(1);
      } else {
        throw new Error(response.data.error || 'Bulk recovery failed');
      }
    } catch (error) {
      console.error('Error in bulk recovery:', error);
      toast({
        title: "Failed to Recover Videos",
        description: error.message || "Could not recover pending videos.",
        variant: "destructive",
      });
    }
  };

  const handleUpload = (asset: ExtendedAssetLibraryItem) => {
    if (asset.asset_type === 'video' && asset.asset_url && asset.asset_url !== 'processing' && asset.asset_url !== 'pending') {
      setSelectedAssetForUpload(asset);
      setShowUploadModal(true);
    } else {
      toast({
        title: "Upload Not Available",
        description: "Only completed videos can be uploaded to social media platforms.",
        variant: "destructive"
      });
    }
  };

  const handleUploadComplete = (result: any) => {
    setShowUploadModal(false);
    setSelectedAssetForUpload(null);
    toast({
      title: "Upload Successful!",
      description: `Your video has been uploaded to ${result.platform || 'social media'}.`,
    });
  };

  const assetCounts = {
    all: assetTypeCounts.all,
    image: assetTypeCounts.image,
    video: assetTypeCounts.video,
    content: assetTypeCounts.content,
  };

  // Check if there are any pending HeyGen videos
  const hasPendingHeyGenVideos = assets.some(asset =>
    (asset.source_system === "heygen") && (asset.asset_url === "pending" || asset.asset_url === "processing" || asset.asset_url?.startsWith("pending_"))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Asset Library</h2>
          <p className="text-muted-foreground">Manage and organize your saved AI-generated assets</p>
        </div>
        <div className="flex space-x-2">
          {hasPendingHeyGenVideos && (
            <Button
              variant="default"
              onClick={handleBulkRecovery}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Recover Videos</span>
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search assets by title, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant={showFavoritesOnly ? "default" : "outline"}
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          className="flex items-center space-x-2"
        >
          <Heart className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          <span>Favorites Only</span>
        </Button>
      </div>

      {/* Asset Type Tabs */}
      <Tabs value={selectedType} onValueChange={setSelectedType}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({assetCounts.all})</TabsTrigger>
          <TabsTrigger value="image">Images ({assetCounts.image})</TabsTrigger>
          <TabsTrigger value="video">Videos ({assetCounts.video})</TabsTrigger>
          <TabsTrigger value="content">Content ({assetCounts.content})</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedType} className="mt-6">
          {isInitialLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading your assets...</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Refreshing assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                {searchTerm || showFavoritesOnly || selectedType !== 'all' ?
                  'No assets match your current filters.' :
                  'No assets in your library yet. Generate some content and save them to get started!'
                }
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAssets.map((asset) => (
                  <Card key={asset.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1 flex-1 mr-2">
                          <CardTitle className="text-lg line-clamp-1">{asset.title}</CardTitle>
                          {asset.description && (
                            <CardDescription className="line-clamp-2">{asset.description}</CardDescription>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleFavorite(asset.id, asset.favorited)}
                        >
                          <Heart className={`h-4 w-4 ${asset.favorited ? 'fill-red-500 text-red-500' : ''}`} />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        <Badge variant="secondary" className="text-xs">
                          {asset.asset_type?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {asset.source_system?.toUpperCase() || 'UNKNOWN'}
                        </Badge>
                        {asset.tags?.map((tag, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Asset Preview */}
                      {asset.asset_type === 'image' && asset.asset_url && (
                        <div className="aspect-video bg-gray-100 rounded overflow-hidden relative group cursor-pointer">
                          <img
                            src={asset.asset_url}
                            alt={asset.title}
                            className="w-full h-full object-contain bg-white"
                            onClick={() => {
                              console.log('Image clicked:', asset.title, asset.asset_url);
                              setSelectedAsset(asset);
                              setIsImageModalOpen(true);
                              console.log('Modal state set to open, selectedAsset:', asset);
                            }}
                            onError={(e) => {
                              console.error('Image failed to load:', asset.asset_url);
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              // Show error message
                              const errorDiv = document.createElement('div');
                              errorDiv.className = 'w-full h-full flex items-center justify-center bg-red-50 text-red-600 text-sm p-4';
                              errorDiv.innerHTML = `
                                <div class="text-center">
                                  <div class="flex items-center justify-center mb-2">
                                    <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                  </div>
                                  <p class="font-medium">Image failed to load</p>
                                  <p class="text-xs mt-1">This asset may need to be re-generated</p>
                                </div>
                              `;
                              target.parentElement?.appendChild(errorDiv);
                            }}
                          />
                          {/* Overlay with expand icon */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white bg-opacity-90 rounded-full p-2 pointer-events-auto">
                              <Maximize2 className="h-5 w-5 text-gray-700" />
                            </div>
                          </div>
                        </div>
                      )}

                      {asset.asset_type === 'video' && (
                        <div className="aspect-video bg-black rounded overflow-hidden relative">
                          {asset.asset_url === 'processing' || asset.asset_url === 'pending' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 text-blue-800 p-4">
                              <div className="text-center">
                                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                                <p className="font-medium mb-2">🎬 FeedGenesis is working on your video</p>
                                <div className="flex items-center space-x-2 mb-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-32">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                      style={{ width: `${progressStates[asset.id] || 0}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-xs text-gray-600">{Math.round(progressStates[asset.id] || 0)}%</span>
                                </div>
                                <p className="text-xs text-gray-600">
                                  {progressStates[asset.id] >= 92
                                    ? "Almost complete - finalizing video..."
                                    : `Estimated time remaining: ${Math.max(1, Math.round((300 - ((progressStates[asset.id] || 0) / 92 * 300)) / 60))} minutes`
                                  }
                                </p>
                                {asset.asset_url === "pending" && (
                                  <p className="text-xs text-orange-600 mt-1">
                                    ⏳ Request sent - Processing will begin shortly
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : asset.asset_url === 'failed' || !asset.asset_url ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-sm p-4">
                              <div className="text-center">
                                <div className="flex items-center justify-center mb-2">
                                  <AlertCircle className="h-8 w-8" />
                                </div>
                                <p className="font-medium">❌ Video generation failed</p>
                                <p className="text-xs mt-1">Please try generating again</p>
                              </div>
                            </div>
                          ) : (
                            <video
                              src={asset.asset_url}
                              className="w-full h-full object-contain"
                              controls
                              onError={(e) => {
                                console.error('Video failed to load:', asset.asset_url);
                                const target = e.target as HTMLVideoElement;
                                target.style.display = 'none';
                                // Show error message
                                const errorDiv = document.createElement('div');
                                errorDiv.className = 'absolute inset-0 flex items-center justify-center bg-red-50 text-red-600 text-sm p-4';
                                errorDiv.innerHTML = `
                                  <div class="text-center">
                                    <div class="flex items-center justify-center mb-2">
                                      <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </div>
                                    <p class="font-medium">Video unavailable</p>
                                    <p class="text-xs mt-1">HeyGen video may require authentication</p>
                                    ${asset.gif_url ? '<p class="text-xs mt-1 text-blue-600">Trying GIF preview...</p>' : ''}
                                  </div>
                                `;
                                target.parentElement?.appendChild(errorDiv);

                                // If there's a GIF URL, try to show that instead
                                if (asset.gif_url) {
                                  setTimeout(() => {
                                    const img = document.createElement('img');
                                    img.src = asset.gif_url!;
                                    img.className = 'w-full h-full object-contain';
                                    img.onload = () => {
                                      errorDiv.remove();
                                      target.parentElement?.appendChild(img);
                                    };
                                    img.onerror = () => {
                                      errorDiv.querySelector('.text-blue-600')!.textContent = 'GIF preview also unavailable';
                                    };
                                  }, 1000);
                                }
                              }}
                            />
                          )}
                        </div>
                      )}

                      {asset.asset_type === 'content' && asset.content && (
                        <div className="bg-gray-50 p-3 rounded text-sm max-h-32 overflow-y-auto">
                          <p className="whitespace-pre-wrap line-clamp-4">{asset.content}</p>
                        </div>
                      )}

                      {/* Instruction */}
                      <div className="text-sm">
                        <p className="font-medium text-gray-700 mb-1">Original Instruction:</p>
                        <p className="text-gray-600 text-xs bg-gray-50 p-2 rounded line-clamp-2">
                          {asset.instruction}
                        </p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(asset.created_at).toLocaleDateString()}
                        </span>

                        <div className="flex space-x-1">
                          {/* Show refresh button for ALL HeyGen videos */}
                          {(asset.source_system === "heygen") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRefreshVideo(asset.id)}
                              className="text-blue-600 hover:text-blue-700 border-blue-200"
                              title="Check video status from HeyGen"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}

                          {asset.asset_type === 'content' && asset.content ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyContent(asset.content!, asset.title)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(asset)}
                              disabled={!asset.asset_url || asset.asset_url === "processing" || asset.asset_url === "pending"}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}

                          {asset.asset_type === 'video' && asset.asset_url && asset.asset_url !== 'processing' && asset.asset_url !== 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpload(asset)}
                              className="text-green-600 hover:text-green-700 border-green-200"
                              title="Upload video to social media"
                            >
                              <Share2 className="h-4 w-4" />
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(asset.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Pagination Controls */}
              {pagination && pagination.pages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  {/* Items per page selector */}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                    >
                      <option value={6}>6 per page</option>
                      <option value={12}>12 per page</option>
                      <option value={24}>24 per page</option>
                      <option value={48}>48 per page</option>
                    </select>
                  </div>

                  {/* Pagination info */}
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, pagination.total)} of {pagination.total} assets
                  </div>

                  {/* Pagination buttons */}
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage <= 1}
                      className="flex items-center space-x-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>Previous</span>
                    </Button>

                    {/* Page numbers */}
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }

                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= pagination.pages}
                      className="flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Social Media Upload Modal */}
      {showUploadModal && selectedAssetForUpload && (
        <SocialMediaUpload
          asset={selectedAssetForUpload}
          onClose={() => {
            setShowUploadModal(false);
            setSelectedAssetForUpload(null);
          }}
          onUploadComplete={handleUploadComplete}
        />
      )}

      {/* Image Modal */}
      {selectedAsset && (
        <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] w-[90vw] p-0 border-0 bg-black/95 backdrop-blur-sm">
            <div className="relative w-full h-full flex flex-col">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <DialogTitle className="text-white text-lg font-semibold">
                      {selectedAsset.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
                        {selectedAsset.asset_type?.toUpperCase() || 'IMAGE'}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">
                        {selectedAsset.source_system?.toUpperCase() || 'UNKNOWN'}
                      </Badge>
                      {selectedAsset.tags?.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-white/20 text-white">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(selectedAsset)}
                      className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-white/80 hover:bg-white/20"
                      onClick={() => setIsImageModalOpen(false)}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Image Container */}
              <div className="flex-1 flex items-center justify-center p-4 pt-16">
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={selectedAsset.asset_url}
                    alt={selectedAsset.title}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                    style={{ maxHeight: 'calc(90vh - 120px)' }}
                    onError={(e) => {
                      console.error('Image failed to load in modal:', selectedAsset.asset_url);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      // Show error message
                      const errorDiv = document.createElement('div');
                      errorDiv.className = 'flex items-center justify-center bg-red-50 text-red-600 text-sm p-8 rounded-lg border-2 border-red-200';
                      errorDiv.innerHTML = `
                        <div class="text-center">
                          <div class="flex items-center justify-center mb-2">
                            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p class="font-medium">Image failed to load</p>
                          <p class="text-xs mt-1">This asset may need to be re-generated</p>
                        </div>
                      `;
                      target.parentElement?.appendChild(errorDiv);
                    }}
                  />
                </div>
              </div>

              {/* Footer with additional info */}
              {selectedAsset.description && (
                <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent p-4">
                  <div className="text-white/90 text-sm">
                    <p className="font-medium mb-1">Description:</p>
                    <p className="text-white/70">{selectedAsset.description}</p>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
