import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { assetId, videoId } = await req.json();
    
    if (!assetId) {
      throw new Error('Asset ID is required');
    }

    console.log('Getting shareable URL for asset:', assetId);

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use provided video ID or default test ID
    const targetVideoId = videoId || "c96041171feb416fa4b08803c2b1833b";
    
    console.log('Getting shareable URL for video ID:', targetVideoId);
    
    // Exact implementation of your curl command
    const shareResponse = await fetch('https://api.heygen.com/v1/video/share', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'x-api-key': heygenApiKey
      },
      body: JSON.stringify({
        video_id: targetVideoId
      })
    });
    
    console.log('Share response status:', shareResponse.status);
    
    if (!shareResponse.ok) {
      const errorText = await shareResponse.text();
      console.error('Share API error:', shareResponse.status, errorText);
      throw new Error(`Share API error: ${shareResponse.status} - ${errorText}`);
    }
    
    const shareData = await shareResponse.json();
    console.log('Share response:', shareData);
    
    if (shareData.code === 100 && shareData.data) {
      const shareableUrl = shareData.data;
      console.log('Got shareable URL:', shareableUrl);
      
      // Update the asset with the shareable URL
      const { error: updateError } = await supabase
        .from('asset_library')
        .update({
          asset_url: shareableUrl,
          description: `Shareable HeyGen video URL (ID: ${targetVideoId}) | Updated: ${new Date().toISOString()}`
        })
        .eq('id', assetId);

      if (updateError) {
        console.error('Failed to update asset:', updateError);
        throw updateError;
      }

      console.log('Asset updated with shareable URL');
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Shareable video URL retrieved and updated',
        video_url: shareableUrl,
        video_id: targetVideoId,
        status: 'completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error(`Share API returned error: ${shareData.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error getting shareable HeyGen video:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});