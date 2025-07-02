
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

class TemplateManager {
  private templateCache: Map<string, TemplateDetail> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private clientConfigCache: Map<string, ClientTemplateConfig> = new Map();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  async getClientConfig(clientId: string = 'default'): Promise<ClientTemplateConfig> {
    // Check cache first
    if (this.clientConfigCache.has(clientId)) {
      console.log(`Using cached client config for ${clientId}`);
      return this.clientConfigCache.get(clientId)!;
    }

    try {
      console.log(`Fetching client config from database for ${clientId}`);
      
      // Get client config
      const { data: clientConfig, error: clientError } = await supabase
        .from('client_configs')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (clientError) {
        console.error('Error fetching client config:', clientError);
        throw clientError;
      }

      // Get template assignments for this client
      const { data: templateAssignments, error: assignmentsError } = await supabase
        .from('client_template_assignments')
        .select('template_id, template_name, is_active')
        .eq('client_config_id', clientConfig.id)
        .eq('is_active', true);

      if (assignmentsError) {
        console.error('Error fetching template assignments:', assignmentsError);
        throw assignmentsError;
      }

      // Get fallback variables for all assigned templates
      const templateIds = templateAssignments?.map(t => t.template_id) || [];
      const { data: fallbackVars, error: varsError } = await supabase
        .from('template_fallback_variables')
        .select('template_id, variable_name')
        .in('template_id', templateIds)
        .order('variable_order');

      if (varsError) {
        console.error('Error fetching fallback variables:', varsError);
        throw varsError;
      }

      // Build fallback variables map
      const fallbackVariables: Record<string, string[]> = {};
      fallbackVars?.forEach(fv => {
        if (!fallbackVariables[fv.template_id]) {
          fallbackVariables[fv.template_id] = [];
        }
        fallbackVariables[fv.template_id].push(fv.variable_name);
      });

      const config: ClientTemplateConfig = {
        clientId: clientConfig.client_id,
        assignedTemplateIds: templateIds,
        fallbackVariables: fallbackVariables
      };

      // Cache the config
      this.clientConfigCache.set(clientId, config);
      
      console.log('Successfully fetched client config from database:', config);
      return config;

    } catch (error) {
      console.error('Error fetching client config from database:', error);
      
      // Return hardcoded fallback for default client
      if (clientId === 'default') {
        const fallbackConfig: ClientTemplateConfig = {
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
        };
        return fallbackConfig;
      }
      
      throw error;
    }
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

      // Get variables from HeyGen API response
      let variables = data.template.variableNames || data.template.variables || [];
      let variableTypes = data.template.variableTypes || {};
      
      // If HeyGen API returns no variables, try to use fallback variables
      if (!variables || variables.length === 0) {
        console.log(`HeyGen API returned no variables for ${templateId}, checking for fallback variables`);
        
        try {
          // Try to get fallback variables from database first
          const { data: fallbackVars, error } = await supabase
            .from('template_fallback_variables')
            .select('variable_name')
            .eq('template_id', templateId)
            .order('variable_order');

          if (!error && fallbackVars && fallbackVars.length > 0) {
            variables = fallbackVars.map(v => v.variable_name);
            console.log(`Using database fallback variables for ${templateId}:`, variables);
          } else {
            // Fallback to hardcoded variables if database lookup fails
            const config = await this.getClientConfig('default');
            variables = config.fallbackVariables?.[templateId] || [];
            console.log(`Using hardcoded fallback variables for ${templateId}:`, variables);
          }
          
          // Generate variable types for fallback variables
          if (variables.length > 0) {
            variableTypes = variables.reduce((acc, varName) => {
              acc[varName] = {
                name: varName,
                type: varName.includes('image') ? 'image_url' : varName.includes('url') ? 'url' : 'text',
                charLimit: varName.includes('image') || varName.includes('url') ? 500 : 100,
                required: true
              };
              return acc;
            }, {} as Record<string, TemplateVariable>);
          }
        } catch (fallbackError) {
          console.error(`Error getting fallback variables for ${templateId}:`, fallbackError);
        }
      }

      const templateDetail: TemplateDetail = {
        id: data.template.templateId || data.template.id || templateId,
        name: data.template.name || `Template ${templateId.slice(-8)}`,
        description: data.template.description || 'HeyGen video template',
        thumbnail: data.template.thumbnail || data.template.preview_url || data.template.cover_image || `https://img.heygen.com/template/${templateId}/thumbnail.jpg`,
        category: data.template.category || 'Custom',
        duration: data.template.duration || '30s',
        variables: variables,
        variableTypes: variableTypes
      };
      
      // Cache the result
      this.templateCache.set(templateId, templateDetail);
      this.cacheExpiry.set(templateId, Date.now() + this.CACHE_DURATION);
      
      console.log('Successfully fetched template detail from HeyGen API:', templateDetail);
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
    
    console.log(`Successfully loaded ${templates.length} templates for client ${clientId}`);
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

  private async getFallbackTemplate(templateId: string): Promise<TemplateDetail | null> {
    try {
      // Try to get fallback variables from database first
      const { data: fallbackVars, error } = await supabase
        .from('template_fallback_variables')
        .select('variable_name')
        .eq('template_id', templateId)
        .order('variable_order');

      let variables: string[] = [];
      
      if (!error && fallbackVars && fallbackVars.length > 0) {
        variables = fallbackVars.map(v => v.variable_name);
        console.log(`Using database fallback variables for ${templateId}:`, variables);
      } else {
        // Fallback to hardcoded variables if database lookup fails
        const config = await this.getClientConfig('default');
        variables = config.fallbackVariables?.[templateId] || [];
        console.log(`Using hardcoded fallback variables for ${templateId}:`, variables);
      }

      if (variables.length === 0) {
        console.warn(`No fallback variables found for template ${templateId}`);
        return null;
      }

      const fallbackTemplate: TemplateDetail = {
        id: templateId,
        name: `Template ${templateId.slice(-8)}`,
        description: 'HeyGen video template (fallback)',
        thumbnail: `https://img.heygen.com/template/${templateId}/thumbnail.jpg`,
        category: 'Custom',
        duration: '30s',
        variables: variables,
        variableTypes: variables.reduce((acc, varName) => {
          acc[varName] = {
            name: varName,
            type: varName.includes('image') ? 'image_url' : varName.includes('url') ? 'url' : 'text',
            charLimit: varName.includes('image') || varName.includes('url') ? 500 : 100,
            required: true
          };
          return acc;
        }, {} as Record<string, TemplateVariable>)
      };

      console.log('Created fallback template:', fallbackTemplate);
      return fallbackTemplate;
    } catch (error) {
      console.error('Error creating fallback template:', error);
      return null;
    }
  }

  // Method to add new client configurations (for future scalability)
  async addClientConfig(config: ClientTemplateConfig): Promise<void> {
    try {
      // Insert client config
      const { data: clientConfig, error: clientError } = await supabase
        .from('client_configs')
        .insert({
          client_id: config.clientId,
          client_name: config.clientId.charAt(0).toUpperCase() + config.clientId.slice(1) + ' Client'
        })
        .select()
        .single();

      if (clientError) throw clientError;

      // Insert template assignments
      const assignments = config.assignedTemplateIds.map(templateId => ({
        client_config_id: clientConfig.id,
        template_id: templateId,
        template_name: `Template ${templateId.slice(-8)}`,
        is_active: true
      }));

      const { error: assignmentsError } = await supabase
        .from('client_template_assignments')
        .insert(assignments);

      if (assignmentsError) throw assignmentsError;

      // Insert fallback variables if provided
      if (config.fallbackVariables) {
        const fallbackVars: any[] = [];
        Object.entries(config.fallbackVariables).forEach(([templateId, variables]) => {
          variables.forEach((variable, index) => {
            fallbackVars.push({
              template_id: templateId,
              variable_name: variable,
              variable_order: index + 1
            });
          });
        });

        const { error: varsError } = await supabase
          .from('template_fallback_variables')
          .insert(fallbackVars);

        if (varsError) throw varsError;
      }

      // Clear cache to force refresh
      this.clientConfigCache.delete(config.clientId);
      
      console.log(`Successfully added client configuration for ${config.clientId}`);
    } catch (error) {
      console.error('Error adding client config to database:', error);
      throw error;
    }
  }

  // Clear cache for a specific template or all templates
  clearCache(templateId?: string): void {
    if (templateId) {
      this.templateCache.delete(templateId);
      this.cacheExpiry.delete(templateId);
      console.log(`Cleared cache for template ${templateId}`);
    } else {
      this.templateCache.clear();
      this.cacheExpiry.clear();
      this.clientConfigCache.clear();
      console.log('Cleared all template caches');
    }
  }
}

export const templateManager = new TemplateManager();
export type { TemplateDetail, TemplateVariable, ClientTemplateConfig };
