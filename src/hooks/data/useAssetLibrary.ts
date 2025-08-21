
import { useState } from 'react';
import { assetClient } from '@/api/shared/axios-config';
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
      const response = await assetClient.post('/assets', {
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
    page?: number;
    limit?: number;
  }) => {
    try {
      const params: any = {};
      
      if (filters?.asset_type) params.assetType = filters.asset_type;
      if (filters?.favorited !== undefined) params.favorited = filters.favorited;
      if (filters?.source_system) params.sourceSystem = filters.source_system;
      if (filters?.search) params.search = filters.search;
      if (filters?.tags) params.tags = filters.tags.join(',');
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      const response = await assetClient.get('/assets', { params });
      return {
        assets: response.data.data,
        pagination: response.data.pagination
      };
    } catch (error) {
      console.error('Error fetching library assets:', error);
      throw error;
    }
  };

  const getAssetTypeCounts = async (filters?: {
    favorited?: boolean;
    search?: string;
    tags?: string[];
  }) => {
    try {
      const params: any = {};
      
      if (filters?.favorited !== undefined) params.favorited = filters.favorited;
      if (filters?.search) params.search = filters.search;
      if (filters?.tags) params.tags = filters.tags.join(',');

      const response = await assetClient.get('/assets/counts', { params });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching asset type counts:', error);
      throw error;
    }
  };

  const toggleFavorite = async (id: string, favorited: boolean) => {
    try {
      const response = await assetClient.patch(`/assets/${id}/favorite`);
      return response.data.data;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  };

  const deleteFromLibrary = async (id: string) => {
    try {
      await assetClient.delete(`/assets/${id}`);
    } catch (error) {
      console.error('Error deleting asset:', error);
      throw error;
    }
  };

  return {
    saveToLibrary,
    getLibraryAssets,
    getAssetTypeCounts,
    toggleFavorite,
    deleteFromLibrary,
    isLoading,
  };
}
