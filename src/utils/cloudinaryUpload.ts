import { cloudinaryAPI } from '@/api';
import { toast } from '@/hooks/ui/use-toast';

export interface CloudinaryUploadOptions {
  url: string;
  assetType: 'image' | 'video' | 'content';
  fileName?: string;
  folder?: string;
  tags?: string[];
}

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resource_type: 'image' | 'video' | 'raw';
}

/**
 * Upload asset to Cloudinary
 */
export const uploadToCloudinary = async (options: CloudinaryUploadOptions): Promise<CloudinaryUploadResult | null> => {
  try {
    console.log('Uploading to Cloudinary:', options.url);
    
    const response = await cloudinaryAPI.uploadAsset(options);
    
    if (response.data.success) {
      console.log('Cloudinary upload successful:', response.data.data.public_id);
      toast({
        title: "Upload Successful",
        description: "Asset uploaded to Cloudinary successfully",
      });
      return response.data.data;
    } else {
      throw new Error('Upload failed');
    }
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    toast({
      title: "Upload Failed",
      description: "Failed to upload asset to Cloudinary",
      variant: "destructive",
    });
    return null;
  }
};

/**
 * Delete asset from Cloudinary
 */
export const deleteFromCloudinary = async (publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<boolean> => {
  try {
    console.log('Deleting from Cloudinary:', publicId);
    
    const response = await cloudinaryAPI.deleteAsset(publicId, resourceType);
    
    if (response.data.success) {
      console.log('Cloudinary deletion successful:', publicId);
      toast({
        title: "Deletion Successful",
        description: "Asset deleted from Cloudinary successfully",
      });
      return true;
    } else {
      throw new Error('Deletion failed');
    }
  } catch (error) {
    console.error('Cloudinary deletion error:', error);
    toast({
      title: "Deletion Failed",
      description: "Failed to delete asset from Cloudinary",
      variant: "destructive",
    });
    return false;
  }
};

/**
 * Get asset info from Cloudinary
 */
export const getCloudinaryAssetInfo = async (publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<any | null> => {
  try {
    const response = await cloudinaryAPI.getAssetInfo(publicId, resourceType);
    
    if (response.data.success) {
      return response.data.data;
    } else {
      throw new Error('Failed to get asset info');
    }
  } catch (error) {
    console.error('Error getting Cloudinary asset info:', error);
    return null;
  }
};

