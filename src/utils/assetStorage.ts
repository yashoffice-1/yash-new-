
import { supabase } from '@/integrations/supabase/client';

export interface DownloadedAsset {
  url: string;
  fileName: string;
}

export async function downloadAndStoreAsset(
  externalUrl: string, 
  assetType: 'image' | 'video' | 'content' | 'formats',
  fileName?: string
): Promise<DownloadedAsset> {
  try {
    // For content and formats types, we don't need to download anything
    if (assetType === 'content' || assetType === 'formats') {
      return { url: externalUrl, fileName: fileName || `${assetType}.txt` };
    }

    // Generate a unique filename if not provided
    const timestamp = Date.now();
    const extension = assetType === 'image' ? 'png' : 'mp4';
    const generatedFileName = fileName || `${assetType}-${timestamp}.${extension}`;

    // Download the file from the external URL
    const response = await fetch(externalUrl);
    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.statusText}`);
    }

    const blob = await response.blob();
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('generated-assets')
      .upload(generatedFileName, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-assets')
      .getPublicUrl(data.path);

    return {
      url: publicUrl,
      fileName: generatedFileName
    };
  } catch (error) {
    console.error('Error downloading and storing asset:', error);
    throw error;
  }
}

export function getStoredAssetUrl(fileName: string): string {
  const { data: { publicUrl } } = supabase.storage
    .from('generated-assets')
    .getPublicUrl(fileName);
  return publicUrl;
}
