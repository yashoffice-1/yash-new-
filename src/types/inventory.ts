export interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  sku: string | null;
  category: string | null;
  brand: string | null;
  images: string[];
  metadata: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AssetGenerationConfig {
  channel: string;
  asset_type: 'image' | 'video' | 'content';
  type: string;
  specification: string;
  description: string;
}

export interface GeneratedAsset {
  id?: string;
  type: string;
  content?: string;
  url?: string;
  asset_url?: string; // For backward compatibility
  instruction: string;
  status?: string;
  message?: string;
  adCopy?: string;
  timestamp?: Date;
  source_system?: string;
  // Additional properties for the modal
  title?: string;
  description?: string;
  platform?: string;
  channel?: string;
  product?: InventoryItem;
  format?: string;
  inventoryId?: string; // Add inventory ID for direct access
}
