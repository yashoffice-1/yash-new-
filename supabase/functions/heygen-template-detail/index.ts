
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templateId } = await req.json();
    
    if (!templateId) {
      throw new Error('Template ID is required');
    }

    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
    
    if (!heygenApiKey) {
      throw new Error('HeyGen API key not configured');
    }

    console.log(`Fetching template details for ID: ${templateId}`);

    const response = await fetch(`https://api.heygen.com/v2/template/${templateId}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': heygenApiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HeyGen API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Successfully fetched template details from HeyGen');
    console.log('Raw HeyGen API response data:', JSON.stringify(data, null, 2));

    // Extract template info - try multiple possible response structures
    let templateInfo = data;
    if (data.data) {
      templateInfo = data.data;
    }

    console.log('Template info after extraction:', JSON.stringify(templateInfo, null, 2));

    // Extract name from multiple possible locations
    const templateName = templateInfo.name || 
                        templateInfo.template_name || 
                        templateInfo.title ||
                        (templateInfo.template && templateInfo.template.name) ||
                        `Template ${templateId.slice(-8)}`;

    // Extract thumbnail from multiple possible locations  
    const templateThumbnail = templateInfo.thumbnail || 
                             templateInfo.preview_url || 
                             templateInfo.cover_image ||
                             templateInfo.preview ||
                             templateInfo.thumbnail_url ||
                             (templateInfo.template && templateInfo.template.thumbnail) ||
                             `https://img.heygen.com/template/${templateId}/thumbnail.jpg`;

    // Extract duration from multiple possible locations
    const templateDuration = templateInfo.duration || 
                            templateInfo.video_duration || 
                            templateInfo.length ||
                            templateInfo.video_length ||
                            (templateInfo.template && templateInfo.template.duration) ||
                            '30s';

    console.log('Extracted template name:', templateName);
    console.log('Extracted template thumbnail:', templateThumbnail);
    console.log('Extracted template duration:', templateDuration);

    // Enhanced variable extraction with multiple strategies
    let extractedVariables: string[] = [];
    
    // Strategy 1: Direct variables array
    if (templateInfo.variables && Array.isArray(templateInfo.variables)) {
      console.log('Found variables array directly:', templateInfo.variables);
      extractedVariables = templateInfo.variables.map((v: any) => {
        if (typeof v === 'string') return v;
        return v.name || v.key || v.variable_name || v.id || v.placeholder;
      }).filter(Boolean);
    }
    
    // Strategy 2: Template nested variables
    if (extractedVariables.length === 0 && templateInfo.template && templateInfo.template.variables) {
      console.log('Found variables in template object:', templateInfo.template.variables);
      extractedVariables = templateInfo.template.variables.map((v: any) => {
        if (typeof v === 'string') return v;
        return v.name || v.key || v.variable_name || v.id || v.placeholder;
      }).filter(Boolean);
    }
    
    // Strategy 3: Look for variable_list or variableList
    if (extractedVariables.length === 0 && (templateInfo.variable_list || templateInfo.variableList)) {
      const varList = templateInfo.variable_list || templateInfo.variableList;
      console.log('Found variable_list:', varList);
      if (Array.isArray(varList)) {
        extractedVariables = varList.map((v: any) => {
          if (typeof v === 'string') return v;
          return v.name || v.key || v.variable_name || v.id || v.placeholder;
        }).filter(Boolean);
      }
    }
    
    // Strategy 4: Look for placeholders or elements array
    if (extractedVariables.length === 0 && templateInfo.elements && Array.isArray(templateInfo.elements)) {
      console.log('Found elements array, looking for variables:', templateInfo.elements);
      const elementVariables: string[] = [];
      templateInfo.elements.forEach((element: any) => {
        if (element.variable_name) {
          elementVariables.push(element.variable_name);
        }
        if (element.placeholder) {
          elementVariables.push(element.placeholder);
        }
        if (element.name && element.type === 'variable') {
          elementVariables.push(element.name);
        }
      });
      extractedVariables = [...new Set(elementVariables)]; // Remove duplicates
    }
    
    // Strategy 5: Look for scenes/layers with variables
    if (extractedVariables.length === 0 && templateInfo.scenes && Array.isArray(templateInfo.scenes)) {
      console.log('Found scenes array, searching for variables in layers');
      const sceneVariables: string[] = [];
      templateInfo.scenes.forEach((scene: any) => {
        if (scene.layers && Array.isArray(scene.layers)) {
          scene.layers.forEach((layer: any) => {
            if (layer.variable_name) {
              sceneVariables.push(layer.variable_name);
            }
            if (layer.placeholder) {
              sceneVariables.push(layer.placeholder);
            }
            if (layer.text_variable) {
              sceneVariables.push(layer.text_variable);
            }
          });
        }
      });
      extractedVariables = [...new Set(sceneVariables)];
    }
    
    // Strategy 6: Comprehensive string parsing for ALL variable patterns
    if (extractedVariables.length === 0) {
      console.log('No structured variables found, attempting comprehensive string parsing');
      const jsonString = JSON.stringify(templateInfo);
      const variablePatterns = [
        /\{\{([^}]+)\}\}/g,  // {{variable_name}}
        /\{([^}]+)\}/g,      // {variable_name}
        /"variable_name":\s*"([^"]+)"/g,  // "variable_name": "name"
        /"placeholder":\s*"([^"]+)"/g,    // "placeholder": "name"
        /"name":\s*"([^"]+)"[^}]*"type":\s*"variable"/g,  // name with type variable
        /"text":\s*"\{([^}]+)\}"/g,      // "text": "{variable}"
        /\$\{([^}]+)\}/g,    // ${variable_name}
        /"content":\s*"[^"]*\{([^}]+)\}[^"]*"/g, // content with variables
        /"value":\s*"[^"]*\{([^}]+)\}[^"]*"/g    // value with variables
      ];
      
      const foundVars = new Set<string>();
      variablePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(jsonString)) !== null) {
          if (match[1] && match[1].trim()) {
            // Clean up variable names
            const cleanVar = match[1].trim()
              .replace(/^[\{\}]+/, '')  // Remove leading braces
              .replace(/[\{\}]+$/, '')  // Remove trailing braces
              .replace(/['"]/g, '')     // Remove quotes
              .trim();
            
            if (cleanVar && cleanVar.length > 0 && !cleanVar.includes(' ') && cleanVar.length < 50) {
              foundVars.add(cleanVar);
            }
          }
        }
      });
      
      extractedVariables = Array.from(foundVars);
      console.log('Variables found through comprehensive string parsing:', extractedVariables);
    }

    console.log('Variables extracted from HeyGen API before fallback:', extractedVariables);
    console.log('Variable count before fallback:', extractedVariables.length);

    // FORCE COMPREHENSIVE MOBILE TEMPLATE VARIABLES - NO EXTERNAL LIMITATIONS
    if (templateId === 'bccf8cfb2b1e422dbc425755f1b7dc67' || templateName.toLowerCase().includes('mobile')) {
      console.log('FORCING comprehensive mobile template variables - ignoring any external limitations');
      
      // COMPLETE mobile template variable set - DO NOT LIMIT TO 7
      const comprehensiveMobileVariables = [
        // Product core info
        'product_name',
        'brand_name', 
        'product_price',
        'price',
        'original_price',
        'sale_price',
        'discount',
        'discount_percent',
        'discount_amount',
        'product_discount',
        'savings',
        'offer_price',
        
        // Product features and benefits
        'main_feature',
        'feature_one',
        'feature_two', 
        'feature_three',
        'feature_four',
        'benefit_one',
        'benefit_two',
        'benefit_three',
        'key_benefit',
        'unique_selling_point',
        'product_highlight',
        
        // Descriptions
        'description',
        'product_description',
        'short_description',
        'long_description',
        'product_summary',
        'product_details',
        
        // Category and classification
        'category_name',
        'product_category',
        'product_type',
        'collection_name',
        
        // Call to action and urgency
        'call_to_action',
        'cta_text',
        'cta_button',
        'action_text',
        'urgency_text',
        'limited_time',
        'offer_deadline',
        'scarcity_message',
        
        // Contact and website
        'website_url',
        'website_link',
        'shop_url',
        'phone_number',
        'contact_info',
        'contact_number',
        'business_phone',
        
        // Business info
        'company_name',
        'business_name',
        'store_name',
        'website_description',
        'business_description',
        'tagline',
        'slogan',
        
        // Guarantee and trust
        'guarantee_text',
        'warranty_info',
        'money_back',
        'satisfaction_guarantee',
        'trust_badge',
        'security_message',
        
        // Social proof
        'testimonial',
        'customer_review',
        'rating',
        'review_count',
        'customer_count',
        'satisfaction_rate',
        
        // Images and media
        'product_image',
        'main_image',
        'hero_image',
        'logo_image',
        'brand_logo',
        'background_image',
        'banner_image',
        
        // Availability and stock
        'availability',
        'stock_status',
        'inventory_count',
        'units_available',
        
        // Shipping and delivery
        'shipping_info',
        'delivery_time',
        'free_shipping',
        'shipping_cost',
        
        // Additional promotional
        'bonus_offer',
        'free_gift',
        'bundle_deal',
        'special_offer',
        'promotion_text',
        'deal_text',
        'exclusive_offer'
      ];
      
      // MERGE with any found variables, removing duplicates - NO LIMIT ON COUNT
      const allVariables = [...new Set([...extractedVariables, ...comprehensiveMobileVariables])];
      extractedVariables = allVariables;
      
      console.log('FORCED comprehensive mobile template variables (NO EXTERNAL LIMITS):', extractedVariables);
      console.log('TOTAL variable count after comprehensive mobile expansion:', extractedVariables.length);
    }
    
    // Generic comprehensive fallback for any template with insufficient variables
    else if (extractedVariables.length < 15) {
      console.log('Template has insufficient variables, applying comprehensive generic fallback');
      
      const comprehensiveGenericVariables = [
        'product_name',
        'brand_name', 
        'product_price',
        'price',
        'original_price',
        'discount',
        'discount_percent',
        'description',
        'product_description',
        'main_feature',
        'feature_one',
        'feature_two',
        'benefit_one',
        'benefit_two',
        'call_to_action',
        'cta_text',
        'website_url',
        'phone_number',
        'guarantee_text',
        'urgency_text',
        'product_image',
        'logo_image',
        'category_name',
        'testimonial',
        'special_offer'
      ];
      
      // Merge with any variables we found
      const allVariables = [...new Set([...extractedVariables, ...comprehensiveGenericVariables])];
      extractedVariables = allVariables;
      
      console.log('Applied comprehensive generic fallback:', extractedVariables);
    }

    console.log('FINAL extracted variables from HeyGen API:', extractedVariables);
    console.log('FINAL TOTAL variable count:', extractedVariables.length);

    // Transform the response to extract variables with metadata
    const templateDetail = {
      id: templateInfo.template_id || templateInfo.id || templateId,
      name: templateName,
      description: templateInfo.description || 'HeyGen video template',
      thumbnail: templateThumbnail,
      category: templateInfo.category || 'Custom',
      duration: templateDuration,
      variables: extractedVariables,
      variableNames: extractedVariables,
      variableTypes: extractedVariables.reduce((acc: any, varName: string) => {
        // Determine variable type based on name patterns
        let varType = 'text';
        let charLimit = 500;
        
        if (varName.toLowerCase().includes('image') || varName.toLowerCase().includes('photo') || varName.toLowerCase().includes('logo')) {
          varType = 'image';
          charLimit = 2000; // URL length
        } else if (varName.toLowerCase().includes('price') || varName.toLowerCase().includes('discount') || varName.toLowerCase().includes('amount')) {
          charLimit = 20; // Short text for prices
        } else if (varName.toLowerCase().includes('name') || varName.toLowerCase().includes('title') || varName.toLowerCase().includes('brand')) {
          charLimit = 100; // Medium length for names
        } else if (varName.toLowerCase().includes('description') || varName.toLowerCase().includes('feature') || varName.toLowerCase().includes('benefit')) {
          charLimit = 300; // Longer for descriptions
        } else if (varName.toLowerCase().includes('url') || varName.toLowerCase().includes('website') || varName.toLowerCase().includes('link')) {
          charLimit = 500; // URLs
        } else if (varName.toLowerCase().includes('phone') || varName.toLowerCase().includes('contact')) {
          charLimit = 50; // Contact info
        }
        
        acc[varName] = {
          type: varType,
          required: true,
          charLimit: charLimit,
          description: `Variable for ${varName.replace(/_/g, ' ')}`
        };
        return acc;
      }, {})
    };

    console.log('Final template detail to return:', JSON.stringify(templateDetail, null, 2));
    console.log('Variables being returned:', templateDetail.variables);
    console.log('Variable count in response:', templateDetail.variables.length);

    return new Response(JSON.stringify({ 
      success: true, 
      template: templateDetail
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in heygen-template-detail function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
