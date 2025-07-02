
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

    // Transform the response to extract variables with metadata
    const templateDetail = {
      id: data.template_id || templateId,
      name: data.name || `Template ${templateId.slice(-8)}`,
      description: data.description || 'HeyGen video template',
      thumbnail: data.thumbnail || data.preview_url,
      category: data.category || 'Custom',
      duration: data.duration || '30s',
      variables: data.variables || [],
      // Extract variable names and types for easier processing
      variableNames: (data.variables || []).map((v: any) => v.name || v.key),
      variableTypes: (data.variables || []).reduce((acc: any, v: any) => {
        const name = v.name || v.key;
        if (name) {
          acc[name] = {
            type: v.type || 'text',
            required: v.required || false,
            charLimit: v.char_limit || v.maxLength || 500,
            description: v.description || ''
          };
        }
        return acc;
      }, {})
    };

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
