// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  emailVerified: boolean;
  status: 'pending' | 'verified';
  role: 'user' | 'admin' | 'superadmin';
  createdAt?: string;
}

// Auth types
export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    user: User;
    token: string;
  };
}

export interface SignUpData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface SignInData {
  email: string;
  password: string;
}

// Asset types
export interface Asset {
  id: string;
  title: string;
  description?: string;
  instruction: string;
  asset_type: 'image' | 'video' | 'content';
  channel: string;
  format: string;
  source_system: string;
  url: string;
  tags?: string[];
  favorited?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Template types
export interface TemplateVariable {
  name: string;
  type: 'text' | 'image' | 'number';
  required?: boolean;
  defaultValue?: string;
  charLimit?: number;
  customCharLimit?: number;
}

export interface Template {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  category?: string;
  aspectRatio?: string;
  variables?: TemplateVariable[];
  expiresAt?: string;
  canUse?: boolean;
}

// Generation types
export interface GenerationRequest {
  templateId: string;
  variables?: Record<string, string>;
  instruction?: string;
  formatSpecs?: {
    channel?: string;
    format?: string;
    aspectRatio?: string;
    backgroundColor?: string;
  };
}

export interface GenerationResponse {
  success: boolean;
  data?: {
    videoId?: string;
    assetId?: string;
    status: string;
    url?: string;
  };
  message?: string;
  error?: string;
}

// Settings types
export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: 'general' | 'security' | 'upload' | 'email' | 'system';
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingData {
  value: string;
  description?: string;
  category?: 'general' | 'security' | 'upload' | 'email' | 'system';
  isPublic?: boolean;
}

// Inventory types
export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  sku?: string;
  category?: string;
  brand?: string;
  images?: string[];
  metadata?: Record<string, any>;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
