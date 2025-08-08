import { apiClient } from '../shared/axios-config';

export interface CloudinaryUploadRequest {
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

// Cloudinary API
export const cloudinaryAPI = {
  // Upload asset to Cloudinary
  uploadAsset: (data: CloudinaryUploadRequest) => 
    apiClient.post<{ success: boolean; data: CloudinaryUploadResult; message: string }>('/cloudinary/upload', data),

  // Delete asset from Cloudinary
  deleteAsset: (publicId: string, resourceType: 'image' | 'video' = 'image') =>
    apiClient.delete<{ success: boolean; message: string; data: { publicId: string; resourceType: string } }>(`/cloudinary/${publicId}`, {
      params: { resourceType }
    }),

  // Get asset info from Cloudinary
  getAssetInfo: (publicId: string, resourceType: 'image' | 'video' = 'image') =>
    apiClient.get<{ success: boolean; data: any }>(`/cloudinary/${publicId}/info`, {
      params: { resourceType }
    }),
};

