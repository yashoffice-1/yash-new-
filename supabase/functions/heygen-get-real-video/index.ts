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

    console.log('Getting real HeyGen video for asset ID:', assetId);

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

    console.log('Asset found:', asset.title);
    console.log('Asset description:', asset.description);

    // Parse the callback ID from the description
    let callbackId = null;
    if (asset.description) {
      const callbackMatch = asset.description.match(/Callback: (feedgen_[^_]+_[^_]+_[^_]+_\d+)/);
      if (callbackMatch) {
        callbackId = callbackMatch[1];
        console.log('Found callback ID:', callbackId);
      }
    }

    if (!callbackId) {
      throw new Error('No callback ID found in asset description');
    }

    // Get all videos from HeyGen
    console.log('Fetching videos from HeyGen API...');
    const heygenResponse = await fetch('https://api.heygen.com/v1/video.list', {
      method: 'GET',
      headers: {
        'X-Api-Key': heygenApiKey,
        'accept': 'application/json'
      }
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error('HeyGen API error:', heygenResponse.status, errorText);
      throw new Error(`HeyGen API error: ${heygenResponse.status}`);
    }

    const heygenData = await heygenResponse.json();
    console.log('HeyGen videos found:', heygenData.data?.videos?.length || 0);

    // Find our video by callback_id
    const ourVideo = heygenData.data?.videos?.find((video: any) => {
      console.log('Checking video:', video.callback_id, 'against:', callbackId);
      return video.callback_id === callbackId;
    });

    if (!ourVideo) {
      throw new Error(`Video with callback_id ${callbackId} not found in HeyGen`);
    }

    console.log('Found our video:', ourVideo.status);
    console.log('Video URL:', ourVideo.video_url);

    if (ourVideo.status === 'completed' && ourVideo.video_id) {
      console.log('Video is completed! Getting shareable URL...');
      
      // Get shareable URL using HeyGen share API
      let shareableUrl = ourVideo.video_url; // fallback to original URL
      
      try {
        console.log('Getting shareable URL for video ID:', ourVideo.video_id);
        const shareResponse = await fetch('https://api.heygen.com/v1/video/share', {
          method: 'POST',
          headers: {
            'X-Api-Key': heygenApiKey,
            'accept': 'application/json',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            video_id: ourVideo.video_id
          })
        });
        
        console.log('Share response status:', shareResponse.status);
        
        if (shareResponse.ok) {
          const shareData = await shareResponse.json();
          console.log('Share response:', shareData);
          
          if (shareData.code === 100 && shareData.data) {
            shareableUrl = shareData.data;
            console.log('Got shareable URL:', shareableUrl);
          }
        } else {
          console.error('Failed to get shareable URL:', shareResponse.status, shareResponse.statusText);
        }
      } catch (shareError) {
        console.error('Error getting shareable URL:', shareError);
      }

      // Update the asset with the shareable URL
      const { error: updateError } = await supabase
        .from('asset_library')
        .update({
          asset_url: shareableUrl,
          gif_url: ourVideo.gif_url || null,
          description: `${asset.description} | Shareable video URL retrieved: ${new Date().toISOString()}`
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
        gif_url: ourVideo.gif_url,
        status: 'completed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error(`Video not ready. Status: ${ourVideo.status}`);
    }

  } catch (error) {
    console.error('Error getting real HeyGen video:', error);
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