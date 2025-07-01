
import { supabase } from '@/integrations/supabase/client';

export interface DownloadedAsset {
  url: string;
  fileName: string;
}

export async function downloadAndStoreAsset(
  externalUrl: string, 
  assetType: 'image' | 'video' | 'content' | 'formats' | 'ad',
  fileName?: string
): Promise<DownloadedAsset> {
  try {
    console.log('Starting download and store process for:', externalUrl);
    
    // For content and formats types, we don't need to download anything
    if (assetType === 'content' || assetType === 'formats') {
      return { url: externalUrl, fileName: fileName || `${assetType}.txt` };
    }

    // Generate a unique filename if not provided
    const timestamp = Date.now();
    // Map 'ad' to image extension since ads are typically images
    const extension = (assetType === 'image' || assetType === 'ad') ? 'png' : 'mp4';
    const generatedFileName = fileName || `${assetType}-${timestamp}.${extension}`;

    console.log('Generated filename:', generatedFileName);

    // Download the file from the external URL
    console.log('Fetching external URL...');
    const response = await fetch(externalUrl);
    if (!response.ok) {
      throw new Error(`Failed to download asset: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    console.log('Downloaded blob size:', blob.size, 'bytes, type:', blob.type);
    
    // Upload to Supabase storage
    console.log('Uploading to Supabase storage...');
    const { data, error } = await supabase.storage
      .from('generated-assets')
      .upload(generatedFileName, blob, {
        contentType: blob.type,
        upsert: true
      });

    if (error) {
      console.error('Supabase storage error:', error);
      throw new Error(`Failed to upload to storage: ${error.message}`);
    }

    console.log('Upload successful, data:', data);

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('generated-assets')
      .getPublicUrl(data.path);

    console.log('Generated public URL:', publicUrl);

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
