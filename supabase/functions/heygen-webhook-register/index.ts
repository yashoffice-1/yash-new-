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

    const { action, endpointId } = await req.json();
    
    if (action === 'register') {
      // Register the webhook endpoint
      const webhookUrl = `https://speqcclarritenwiyrzl.supabase.co/functions/v1/heygen-webhook`;
      
      console.log('Registering webhook endpoint:', webhookUrl);
      
      const response = await fetch('https://api.heygen.com/v1/webhook/endpoint.add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': heygenApiKey
        },
        body: JSON.stringify({
          url: webhookUrl,
          events: ['avatar_video.success', 'avatar_video.fail']
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to register webhook: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Webhook registered successfully:', data);

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Webhook endpoint registered successfully',
        data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'list') {
      // List registered webhooks
      const response = await fetch('https://api.heygen.com/v1/webhook/endpoint.list', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': heygenApiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to list webhooks: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      return new Response(JSON.stringify({ 
        success: true, 
        data
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'delete' && endpointId) {
      // Delete a webhook endpoint
      const response = await fetch(`https://api.heygen.com/v1/webhook/endpoint.delete?endpoint_id=${endpointId}`, {
        method: 'DELETE',
        headers: {
          'Accept': 'application/json',
          'X-Api-Key': heygenApiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to delete webhook: ${response.status} - ${errorText}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Webhook endpoint deleted successfully'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      throw new Error('Invalid action. Use "register", "list", or "delete"');
    }

  } catch (error) {
    console.error('Error in webhook registration:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});