
import { useState } from 'react';
import { assetsAPI } from '@/api/clients/backend-client';
import { handleSaveError, showSaveSuccess } from '@/utils/assetSaving';

export interface AssetLibraryItem {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  asset_type: 'image' | 'video' | 'content';
  asset_url: string;
  content?: string;
  instruction: string;
  source_system: 'runway' | 'heygen' | 'openai';
  favorited: boolean;
  created_at: string;
  updated_at: string;
  profile?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  templateAccess?: {
    id: string;
    templateName: string;
    externalId: string;
  };
}

export function useAssetLibrary() {
  const [isLoading, setIsLoading] = useState(false);

  const saveToLibrary = async (asset: {
    title: string;
    description?: string;
    tags?: string[];
    asset_type: 'image' | 'video' | 'content' | 'ad' | 'formats';
    asset_url: string;
    content?: string;
    instruction: string;
    source_system: 'runway' | 'heygen' | 'openai';
    channel: string;
    inventoryId?: string;
  }) => {
    setIsLoading(true);
    try {
      const response = await assetsAPI.createAsset({
        title: asset.title,
        description: asset.description,
        tags: asset.tags,
        assetType: asset.asset_type,
        url: asset.asset_url,
        instruction: asset.instruction,
        sourceSystem: asset.source_system,
        channel: asset.channel,
        inventoryId: asset.inventoryId,
        format: asset.asset_type === 'image' ? 'png' : asset.asset_type === 'video' ? 'mp4' : 'txt',
      });

      if (response.data.success) {
        showSaveSuccess(asset.title);
      }

      return response.data;
    } catch (error) {
      handleSaveError(error, 'asset');
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

      const response = await assetsAPI.getAssets(params);
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
      await assetsAPI.deleteAsset(id);
    } catch (error) {
      console.error('Error deleting asset:', error);
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
