
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

    // Extract variables from the HeyGen API response
    let extractedVariables: string[] = [];
    
    // Try multiple possible locations for variables in the response
    if (data.variables && Array.isArray(data.variables)) {
      extractedVariables = data.variables.map((v: any) => {
        if (typeof v === 'string') return v;
        return v.name || v.key || v.variable_name || v.id;
      }).filter(Boolean);
    } else if (data.template && data.template.variables) {
      extractedVariables = data.template.variables.map((v: any) => {
        if (typeof v === 'string') return v;
        return v.name || v.key || v.variable_name || v.id;
      }).filter(Boolean);
    } else if (data.data && data.data.variables) {
      extractedVariables = data.data.variables.map((v: any) => {
        if (typeof v === 'string') return v;
        return v.name || v.key || v.variable_name || v.id;
      }).filter(Boolean);
    }

    console.log('Extracted variables from HeyGen API:', extractedVariables);

    // Transform the response to extract variables with metadata
    const templateDetail = {
      id: data.template_id || data.id || templateId,
      name: data.name || data.template_name || `Template ${templateId.slice(-8)}`,
      description: data.description || 'HeyGen video template',
      thumbnail: data.thumbnail || data.preview_url || data.cover_image,
      category: data.category || 'Custom',
      duration: data.duration || '30s',
      variables: extractedVariables,
      // Extract variable names and types for easier processing
      variableNames: extractedVariables,
      variableTypes: extractedVariables.reduce((acc: any, varName: string) => {
        acc[varName] = {
          type: 'text',
          required: true,
          charLimit: 500,
          description: `Variable for ${varName.replace(/_/g, ' ')}`
        };
        return acc;
      }, {})
    };

    console.log('Final template detail to return:', JSON.stringify(templateDetail, null, 2));

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
