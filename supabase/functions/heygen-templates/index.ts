
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
    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
    
    if (!heygenApiKey) {
      throw new Error('HeyGen API key not configured');
    }

    console.log('Fetching templates from HeyGen API');

    const response = await fetch('https://api.heygen.com/v2/templates', {
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
    console.log('Successfully fetched templates from HeyGen');

    return new Response(JSON.stringify({ 
      success: true, 
      templates: data.data || data.templates || data,
      total: data.total || (data.data?.length) || 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in heygen-templates function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
