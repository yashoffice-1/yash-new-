import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  resource_type: 'image' | 'video' | 'raw';
}

export interface AssetUploadData {
  url: string;
  fileName?: string;
  assetType: 'image' | 'video' | 'content';
  folder?: string;
  tags?: string[];
}

export class CloudinaryService {
  /**
   * Download and upload asset to Cloudinary
   */
  static async uploadFromUrl(data: AssetUploadData): Promise<CloudinaryUploadResult> {
    try {
      // eslint-disable-next-line no-console
      console.log(`Downloading asset from: ${data.url}`);
      
      // Download the asset
      const response = await axios.get(data.url, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.data) {
        throw new Error('Failed to download asset');
      }

      // Convert to buffer for upload
      const buffer = Buffer.from(response.data);

      // Upload to Cloudinary
      const uploadOptions = {
        folder: data.folder || 'generated-assets',
        tags: data.tags || ['generated', data.assetType],
        resource_type: (data.assetType === 'video' ? 'video' : 'image') as 'image' | 'video',
        public_id: data.fileName || `asset_${Date.now()}`,
        overwrite: false,
        unique_filename: true,
      };

      // eslint-disable-next-line no-console
      console.log('Uploading to Cloudinary with options:', uploadOptions);

      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              // eslint-disable-next-line no-console
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else if (result) {
              // eslint-disable-next-line no-console
              console.log('Cloudinary upload successful:', result.public_id);
              resolve(result as CloudinaryUploadResult);
            } else {
              reject(new Error('No result from Cloudinary upload'));
            }
          }
        ).end(buffer);
      });

      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error uploading to Cloudinary:', error);
      throw new Error(`Failed to upload asset to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload base64 data to Cloudinary
   */
  static async uploadBase64(base64Data: string, options: {
    assetType: 'image' | 'video' | 'content';
    fileName?: string;
    folder?: string;
    tags?: string[];
  }): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions = {
        folder: options.folder || 'generated-assets',
        tags: options.tags || ['generated', options.assetType],
        resource_type: (options.assetType === 'video' ? 'video' : 'image') as 'image' | 'video',
        public_id: options.fileName || `asset_${Date.now()}`,
        overwrite: false,
        unique_filename: true,
      };

      // eslint-disable-next-line no-console
      console.log('Uploading base64 to Cloudinary with options:', uploadOptions);

      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload(
          base64Data,
          uploadOptions,
          (error, result) => {
            if (error) {
              // eslint-disable-next-line no-console
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else if (result) {
              // eslint-disable-next-line no-console
              console.log('Cloudinary upload successful:', result.public_id);
              resolve(result as CloudinaryUploadResult);
            } else {
              reject(new Error('No result from Cloudinary upload'));
            }
          }
        );
      });

      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error uploading base64 to Cloudinary:', error);
      throw new Error(`Failed to upload base64 to Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete asset from Cloudinary
   */
  static async deleteAsset(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType
      });
      // eslint-disable-next-line no-console
      console.log('Asset deleted from Cloudinary:', publicId);
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error deleting asset from Cloudinary:', error);
      throw new Error(`Failed to delete asset from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get asset info from Cloudinary
   */
  static async getAssetInfo(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<any> {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType
      });
      return result;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error getting asset info from Cloudinary:', error);
      throw new Error(`Failed to get asset info from Cloudinary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

