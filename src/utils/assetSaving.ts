import { toast } from '@/hooks/ui/use-toast';

export interface AssetSaveData {
  title: string;
  description?: string;
  tags?: string[];
  asset_type: 'image' | 'video' | 'content';
  asset_url: string;
  content?: string;
  instruction: string;
  source_system: 'runway' | 'heygen' | 'openai';
  channel: string;
  inventoryId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export const validateAssetForSaving = (asset: AssetSaveData): ValidationResult => {
  if (!asset.asset_url || asset.asset_url.trim() === '') {
    return { isValid: false, message: "Asset URL is missing" };
  }
  
  if (asset.asset_url.startsWith('pending_')) {
    return { isValid: false, message: "Asset is still processing" };
  }
  
  if (asset.asset_url === 'undefined' || asset.asset_url === 'null') {
    return { isValid: false, message: "Asset URL is invalid" };
  }
  
  return { isValid: true };
};

export const prepareAssetData = (asset: AssetSaveData): AssetSaveData => {
  return {
    ...asset,
    title: asset.title.trim(),
    description: asset.description?.trim() || undefined,
    tags: asset.tags?.filter(Boolean) || undefined,
    channel: asset.channel || 'social_media',
    source_system: asset.source_system || 'runway',
  };
};

export const handleSaveError = (error: any, context: string = 'asset') => {
  console.error(`Error saving ${context}:`, error);
  toast({
    title: "Save Failed",
    description: `Failed to save ${context} to library.`,
    variant: "destructive",
  });
};

export const showSaveSuccess = (title: string) => {
  toast({
    title: "Saved to Library",
    description: `${title} has been saved to your asset library.`,
  });
};
