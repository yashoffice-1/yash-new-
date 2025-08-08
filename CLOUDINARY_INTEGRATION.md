# Cloudinary Integration

This document explains the Cloudinary integration implemented in the Shopify content generation application.

## Overview

The application now supports Cloudinary for asset storage, providing:
- Permanent asset storage (no expiration)
- CDN delivery for fast loading
- Automatic image/video optimization
- Organized folder structure
- Asset management capabilities

## Architecture

### Backend Components

1. **Cloudinary Service** (`backend/src/services/cloudinary.ts`)
   - Handles all Cloudinary operations
   - Upload from URL
   - Upload base64 data
   - Delete assets
   - Get asset information

2. **Cloudinary Routes** (`backend/src/routes/cloudinary.ts`)
   - `/api/cloudinary/upload` - Upload assets
   - `/api/cloudinary/:publicId` - Delete assets
   - `/api/cloudinary/:publicId/info` - Get asset info

3. **Enhanced Asset Routes** (`backend/src/routes/assets.ts`)
   - Automatic Cloudinary upload during asset creation
   - Cloudinary cleanup during asset deletion

### Frontend Components

1. **Cloudinary Client** (`src/api/clients/cloudinary-client.ts`)
   - API client for Cloudinary operations

2. **Cloudinary Utilities** (`src/utils/cloudinaryUpload.ts`)
   - Helper functions for upload/delete operations
   - Toast notifications for user feedback

## Environment Variables

Add these to your `.env` file:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Usage

### Automatic Integration

When saving assets, the system automatically:
1. Downloads the asset from the original URL
2. Uploads it to Cloudinary with organized folder structure
3. Stores the Cloudinary URL in the database
4. Includes Cloudinary public ID in the description for future reference

### Manual Upload

```typescript
import { uploadToCloudinary } from '@/utils/cloudinaryUpload';

const result = await uploadToCloudinary({
  url: 'https://example.com/image.jpg',
  assetType: 'image',
  fileName: 'my-image',
  folder: 'users/123/assets',
  tags: ['product', 'social-media']
});
```

### Manual Deletion

```typescript
import { deleteFromCloudinary } from '@/utils/cloudinaryUpload';

const success = await deleteFromCloudinary('public_id_here', 'image');
```

## Folder Structure

Assets are organized in Cloudinary with this structure:
```
users/
  {userId}/
    assets/
      image_1234567890.jpg
      video_1234567890.mp4
```

## Features

### 1. Automatic Upload
- When saving assets, they're automatically uploaded to Cloudinary
- Original URL is replaced with Cloudinary URL
- Cloudinary public ID is stored in description

### 2. Organized Storage
- User-specific folders
- Asset type categorization
- Timestamp-based naming

### 3. Error Handling
- Graceful fallback to original URL if Cloudinary fails
- User notifications for success/failure
- Detailed error logging

### 4. Asset Management
- Delete assets from Cloudinary
- Get asset information
- Track asset metadata

## API Endpoints

### Upload Asset
```http
POST /api/cloudinary/upload
Content-Type: application/json

{
  "url": "https://example.com/image.jpg",
  "assetType": "image",
  "fileName": "optional-custom-name",
  "folder": "optional-custom-folder",
  "tags": ["tag1", "tag2"]
}
```

### Delete Asset
```http
DELETE /api/cloudinary/{publicId}?resourceType=image
```

### Get Asset Info
```http
GET /api/cloudinary/{publicId}/info?resourceType=image
```

## Benefits

1. **Permanent Storage**: No more expired URLs
2. **Fast Delivery**: CDN-powered asset delivery
3. **Optimization**: Automatic image/video optimization
4. **Organization**: Structured folder hierarchy
5. **Reliability**: Cloudinary's enterprise-grade infrastructure
6. **Scalability**: Handles large files and high traffic

## Migration

Existing assets will continue to work with their original URLs. New assets will be automatically uploaded to Cloudinary.

To migrate existing assets:
1. Use the Cloudinary upload endpoint
2. Update the database with new URLs
3. Optionally delete from original storage

## Security

- All uploads require authentication
- User-specific folder isolation
- Secure API key management
- Input validation and sanitization

## Monitoring

The system logs:
- Upload attempts and results
- Deletion operations
- Error conditions
- Performance metrics

Check the console logs for detailed information about Cloudinary operations.

