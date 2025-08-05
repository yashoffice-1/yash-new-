
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

export interface Template {
  id: string;
  name: string;
  variables: string[];
}

export interface ProductVariableState {
  extracted: string;
  aiSuggested: string;
  userImproved: string;
  checked: boolean;
}

export type IntegrationMethod = 'direct' | 'zapier';
