
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
    
    // Strategy 6: String parsing for common variable patterns (last resort)
    if (extractedVariables.length === 0) {
      console.log('No structured variables found, attempting string parsing');
      const jsonString = JSON.stringify(templateInfo);
      const variablePatterns = [
        /\{\{([^}]+)\}\}/g,  // {{variable_name}}
        /"variable_name":\s*"([^"]+)"/g,  // "variable_name": "name"
        /"placeholder":\s*"([^"]+)"/g,    // "placeholder": "name"
        /"name":\s*"([^"]+)"[^}]*"type":\s*"variable"/g  // name with type variable
      ];
      
      const foundVars = new Set<string>();
      variablePatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(jsonString)) !== null) {
          if (match[1] && match[1].trim()) {
            foundVars.add(match[1].trim());
          }
        }
      });
      
      extractedVariables = Array.from(foundVars);
      console.log('Variables found through string parsing:', extractedVariables);
    }

    console.log('Final extracted variables from HeyGen API:', extractedVariables);
    console.log('Total variable count:', extractedVariables.length);

    // If still no variables found, create common fallback variables for mobile templates
    if (extractedVariables.length === 0 && templateName.toLowerCase().includes('mobile')) {
      console.log('No variables detected for mobile template, using fallback variables');
      extractedVariables = [
        'product_name',
        'brand_name', 
        'price',
        'discount',
        'description',
        'call_to_action',
        'website_url',
        'product_image'
      ];
      console.log('Applied fallback mobile template variables:', extractedVariables);
    }

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
        
        if (varName.toLowerCase().includes('image') || varName.toLowerCase().includes('photo')) {
          varType = 'image';
          charLimit = 2000; // URL length
        } else if (varName.toLowerCase().includes('price') || varName.toLowerCase().includes('discount')) {
          charLimit = 20; // Short text for prices
        } else if (varName.toLowerCase().includes('name') || varName.toLowerCase().includes('title')) {
          charLimit = 100; // Medium length for names
        } else if (varName.toLowerCase().includes('description')) {
          charLimit = 300; // Longer for descriptions
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
