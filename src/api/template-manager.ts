
import { supabase } from "@/integrations/supabase/client";

interface TemplateVariable {
  name: string;
  type: string;
  charLimit: number;
  required?: boolean;
  description?: string;
}

interface TemplateDetail {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  category: string;
  duration: string;
  variables: string[];
  variableTypes: Record<string, TemplateVariable>;
}

interface ClientTemplateConfig {
  clientId: string;
  assignedTemplateIds: string[];
  fallbackVariables?: Record<string, string[]>;
}

// This could eventually come from a database table for different clients
const CLIENT_CONFIGS: Record<string, ClientTemplateConfig> = {
  'default': {
    clientId: 'default',
    assignedTemplateIds: [
      "bccf8cfb2b1e422dbc425755f1b7dc67",
      "3bb2bf2276754c0ea6b235db9409f508", 
      "47a53273dcd0428bbe7bf960b8bf7f02",
      "aeec955f97a6476d88e4547adfeb3c97"
    ],
    fallbackVariables: {
      "bccf8cfb2b1e422dbc425755f1b7dc67": ["product_name", "product_price", "product_discount", "category_name", "feature_one", "feature_two", "feature_three", "website_description", "product_image"],
      "3bb2bf2276754c0ea6b235db9409f508": ["product_name", "main_feature", "benefit_one", "benefit_two", "call_to_action", "brand_name", "product_image"],
      "47a53273dcd0428bbe7bf960b8bf7f02": ["brand_name", "product_name", "brand_story", "unique_value", "customer_testimonial", "product_image", "website_url"],
      "aeec955f97a6476d88e4547adfeb3c97": ["product_name", "product_price", "discount_percent", "brand_name", "urgency_text", "product_image", "cta_text"]
    }
  }
};

class TemplateManager {
  private templateCache: Map<string, TemplateDetail> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  async getClientConfig(clientId: string = 'default'): Promise<ClientTemplateConfig> {
    return CLIENT_CONFIGS[clientId] || CLIENT_CONFIGS['default'];
  }

  async getTemplateDetail(templateId: string, useCache: boolean = true): Promise<TemplateDetail | null> {
    // Check cache first
    if (useCache && this.isInCache(templateId)) {
      console.log(`Using cached template detail for ${templateId}`);
      return this.templateCache.get(templateId) || null;
    }

    try {
      console.log(`Fetching fresh template detail for ${templateId}`);
      
      const { data, error } = await supabase.functions.invoke('heygen-template-detail', {
        body: { templateId }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch template detail');
      }

      const templateDetail: TemplateDetail = data.template;
      
      // Cache the result
      this.templateCache.set(templateId, templateDetail);
      this.cacheExpiry.set(templateId, Date.now() + this.CACHE_DURATION);
      
      return templateDetail;

    } catch (error) {
      console.error(`Error fetching template detail for ${templateId}:`, error);
      return this.getFallbackTemplate(templateId);
    }
  }

  async getClientTemplates(clientId: string = 'default'): Promise<TemplateDetail[]> {
    const config = await this.getClientConfig(clientId);
    const templates: TemplateDetail[] = [];
    
    for (const templateId of config.assignedTemplateIds) {
      const template = await this.getTemplateDetail(templateId);
      if (template) {
        templates.push(template);
      }
    }
    
    return templates;
  }

  private isInCache(templateId: string): boolean {
    const expiry = this.cacheExpiry.get(templateId);
    if (!expiry || Date.now() > expiry) {
      this.templateCache.delete(templateId);
      this.cacheExpiry.delete(templateId);
      return false;
    }
    return this.templateCache.has(templateId);
  }

  private getFallbackTemplate(templateId: string): TemplateDetail | null {
    const config = CLIENT_CONFIGS['default'];
    const fallbackVariables = config.fallbackVariables?.[templateId];
    
    if (!fallbackVariables) {
      return null;
    }

    return {
      id: templateId,
      name: `Template ${templateId.slice(-8)}`,
      description: 'HeyGen video template (fallback)',
      thumbnail: 'https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=400&h=200&fit=crop',
      category: 'Custom',
      duration: '30s',
      variables: fallbackVariables,
      variableTypes: fallbackVariables.reduce((acc, varName) => {
        acc[varName] = {
          name: varName,
          type: varName.includes('image') ? 'image_url' : varName.includes('url') ? 'url' : 'text',
          charLimit: varName.includes('image') || varName.includes('url') ? 500 : 100,
          required: true
        };
        return acc;
      }, {} as Record<string, TemplateVariable>)
    };
  }

  // Method to add new client configurations (for future scalability)
  async addClientConfig(config: ClientTemplateConfig): Promise<void> {
    CLIENT_CONFIGS[config.clientId] = config;
    // In the future, this would save to database
    console.log(`Added client configuration for ${config.clientId}`);
  }

  // Clear cache for a specific template or all templates
  clearCache(templateId?: string): void {
    if (templateId) {
      this.templateCache.delete(templateId);
      this.cacheExpiry.delete(templateId);
    } else {
      this.templateCache.clear();
      this.cacheExpiry.clear();
    }
  }
}

export const templateManager = new TemplateManager();
export type { TemplateDetail, TemplateVariable, ClientTemplateConfig };
