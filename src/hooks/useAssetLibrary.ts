
import { useState } from 'react';
import { assetsAPI } from '@/api/backend-client';
import { useToast } from '@/hooks/use-toast';
import { downloadAndStoreAsset } from '@/utils/assetStorage';

export interface AssetLibraryItem {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  asset_type: 'image' | 'video' | 'content' | 'formats' | 'ad';
  asset_url: string;
  gif_url?: string;
  content?: string;
  instruction: string;
  source_system: 'runway' | 'heygen' | 'openai';
  original_asset_id?: string;
  favorited: boolean;
  created_at: string;
  updated_at: string;
}

export function useAssetLibrary() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const saveToLibrary = async (asset: {
    title: string;
    description?: string;
    tags?: string[];
    asset_type: 'image' | 'video' | 'content' | 'formats' | 'ad';
    asset_url: string;
    content?: string;
    instruction: string;
    source_system: 'runway' | 'heygen' | 'openai';
    original_asset_id?: string;
  }) => {
    setIsLoading(true);
    try {
      let finalAssetUrl = asset.asset_url;
      let storedFileName: string | undefined;

      // Only download and store if it's not a content/formats type and the URL is external
      if (asset.asset_type !== 'content' && asset.asset_type !== 'formats' && asset.asset_url && !asset.asset_url.includes('supabase')) {
        toast({
          title: "Processing Asset",
          description: "Downloading and storing your asset...",
        });

        try {
          const downloadedAsset = await downloadAndStoreAsset(
            asset.asset_url,
            asset.asset_type === 'ad' ? 'image' : asset.asset_type, // Map 'ad' to 'image' for storage
            `${asset.title.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
          );
          finalAssetUrl = downloadedAsset.url;
          storedFileName = downloadedAsset.fileName;
        } catch (downloadError) {
          console.warn('Failed to download asset, using original URL:', downloadError);
          // Continue with original URL if download fails
        }
      }

      const response = await assetsAPI.create({
        ...asset,
        asset_url: finalAssetUrl
      });

      const data = response.data.data;

      toast({
        title: "Asset Saved",
        description: storedFileName 
          ? "Asset has been downloaded and saved to your library successfully!" 
          : "Asset has been saved to your library successfully!",
      });

      return data;
    } catch (error) {
      console.error('Error saving asset to library:', error);
      toast({
        title: "Error",
        description: "Failed to save asset to library.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getLibraryAssets = async (filters?: {
    asset_type?: string;
    favorited?: boolean;
    tags?: string[];
    source_system?: string;
    search?: string;
  }) => {
    try {
      const params: any = {};
      
      if (filters?.asset_type) params.assetType = filters.asset_type;
      if (filters?.favorited !== undefined) params.favorited = filters.favorited;
      if (filters?.source_system) params.sourceSystem = filters.source_system;
      if (filters?.search) params.search = filters.search;
      if (filters?.tags) params.tags = filters.tags.join(',');

      const response = await assetsAPI.getAll(params);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching library assets:', error);
      throw error;
    }
  };

  const toggleFavorite = async (id: string, favorited: boolean) => {
    try {
      const response = await assetsAPI.toggleFavorite(id);
      return response.data.data;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  };

  const deleteFromLibrary = async (id: string) => {
    try {
      await assetsAPI.delete(id);
      toast({
        title: "Asset Deleted",
        description: "Asset has been removed from your library.",
      });
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        title: "Error",
        description: "Failed to delete asset from library.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    saveToLibrary,
    getLibraryAssets,
    toggleFavorite,
    deleteFromLibrary,
    isLoading,
  };
}
