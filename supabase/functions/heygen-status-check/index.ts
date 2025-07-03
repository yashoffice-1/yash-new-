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
    const { assetId } = await req.json();
    
    if (!assetId) {
      throw new Error('Asset ID is required');
    }

    console.log('Checking status for asset ID:', assetId);

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the asset details
    const { data: asset, error: assetError } = await supabase
      .from('asset_library')
      .select('*')
      .eq('id', assetId)
      .single();

    if (assetError || !asset) {
      throw new Error('Asset not found');
    }

    // Parse the callback ID from the description to get the HeyGen video ID
    let heygenVideoId = null;
    if (asset.description) {
      const callbackMatch = asset.description.match(/Callback: (feedgen_[^_]+_[^_]+_(\d+))/);
      if (callbackMatch) {
        heygenVideoId = callbackMatch[1];
        console.log('Found HeyGen video ID from callback:', heygenVideoId);
      }
    }

    if (!heygenVideoId) {
      console.log('No HeyGen video ID found, keeping current status');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'No HeyGen video ID found to check',
        status: asset.asset_url
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check HeyGen status using the List Videos API
    console.log('Checking HeyGen API for video status...');
    const heygenResponse = await fetch('https://api.heygen.com/v2/video/list', {
      method: 'GET',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!heygenResponse.ok) {
      console.error('HeyGen API error:', heygenResponse.status, heygenResponse.statusText);
      throw new Error('Failed to check HeyGen status');
    }

    const heygenData = await heygenResponse.json();
    console.log('HeyGen response:', JSON.stringify(heygenData, null, 2));

    // Find our video in the list
    const ourVideo = heygenData.data?.videos?.find((video: any) => 
      video.callback_id === heygenVideoId || video.video_id === heygenVideoId
    );

    if (!ourVideo) {
      console.log('Video not found in HeyGen list');
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Video not found in HeyGen',
        status: asset.asset_url
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Found video in HeyGen:', ourVideo);

    // Check if the video is completed
    if (ourVideo.status === 'completed' && ourVideo.video_url) {
      console.log('Video is completed! Updating asset...');
      
      // Update the asset with the completed video URL
      const { error: updateError } = await supabase
        .from('asset_library')
        .update({
          asset_url: ourVideo.video_url,
          gif_url: ourVideo.gif_url || null,
          description: `${asset.description} | Manually updated: ${new Date().toISOString()}`
        })
        .eq('id', assetId);

      if (updateError) {
        console.error('Failed to update asset:', updateError);
        throw updateError;
      }

      console.log('Asset updated successfully');
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Video completed and updated',
        status: 'completed',
        video_url: ourVideo.video_url,
        gif_url: ourVideo.gif_url
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (ourVideo.status === 'failed') {
      console.log('Video failed in HeyGen');
      
      // Update the asset to failed status
      const { error: updateError } = await supabase
        .from('asset_library')
        .update({
          asset_url: 'failed',
          description: `${asset.description} | Failed in HeyGen: ${new Date().toISOString()}`
        })
        .eq('id', assetId);

      if (updateError) {
        console.error('Failed to update failed asset:', updateError);
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Video failed in HeyGen',
        status: 'failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      console.log('Video still processing in HeyGen, status:', ourVideo.status);
      
      return new Response(JSON.stringify({ 
        success: true,
        message: `Video still processing in HeyGen: ${ourVideo.status}`,
        status: 'processing'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error checking HeyGen status:', error);
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