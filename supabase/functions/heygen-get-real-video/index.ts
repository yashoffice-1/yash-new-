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

    if (ourVideo.status === 'completed' && ourVideo.video_url) {
      console.log('Video is completed! Downloading and storing...');
      
      // Download and store the video to our storage
      let storedVideoUrl = ourVideo.video_url;
      let storedGifUrl = ourVideo.gif_url;

      try {
        // Download video
        console.log('Fetching video from URL:', ourVideo.video_url);
        const videoResponse = await fetch(ourVideo.video_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        console.log('Video response status:', videoResponse.status);
        
        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob();
          console.log('Video blob size:', videoBlob.size);
          
          const videoFileName = `heygen-video-${callbackId}-${Date.now()}.mp4`;
          
          const { data: videoUpload, error: videoUploadError } = await supabase.storage
            .from('generated-assets')
            .upload(videoFileName, videoBlob, {
              contentType: 'video/mp4',
              upsert: true
            });

          if (videoUploadError) {
            console.error('Video upload error:', videoUploadError);
          } else {
            const { data: { publicUrl: videoPublicUrl } } = supabase.storage
              .from('generated-assets')
              .getPublicUrl(videoUpload.path);
            storedVideoUrl = videoPublicUrl;
            console.log('Video stored successfully:', videoPublicUrl);
          }
        } else {
          console.error('Failed to fetch video:', videoResponse.status, videoResponse.statusText);
        }

        // Download GIF if available
        if (ourVideo.gif_url) {
          console.log('Fetching GIF from URL:', ourVideo.gif_url);
          const gifResponse = await fetch(ourVideo.gif_url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          console.log('GIF response status:', gifResponse.status);
          
          if (gifResponse.ok) {
            const gifBlob = await gifResponse.blob();
            console.log('GIF blob size:', gifBlob.size);
            
            const gifFileName = `heygen-gif-${callbackId}-${Date.now()}.gif`;
            
            const { data: gifUpload, error: gifUploadError } = await supabase.storage
              .from('generated-assets')
              .upload(gifFileName, gifBlob, {
                contentType: 'image/gif',
                upsert: true
              });

            if (gifUploadError) {
              console.error('GIF upload error:', gifUploadError);
            } else {
              const { data: { publicUrl: gifPublicUrl } } = supabase.storage
                .from('generated-assets')
                .getPublicUrl(gifUpload.path);
              storedGifUrl = gifPublicUrl;
              console.log('GIF stored successfully:', gifPublicUrl);
            }
          } else {
            console.error('Failed to fetch GIF:', gifResponse.status, gifResponse.statusText);
          }
        }
      } catch (downloadError) {
        console.error('Failed to download and store assets:', downloadError);
        console.log('Using original URLs as fallback');
      }

      // Update the asset with the stored video URL
      const { error: updateError } = await supabase
        .from('asset_library')
        .update({
          asset_url: storedVideoUrl,
          gif_url: storedGifUrl || null,
          description: `${asset.description} | Real video retrieved and stored: ${new Date().toISOString()}`
        })
        .eq('id', assetId);

      if (updateError) {
        console.error('Failed to update asset:', updateError);
        throw updateError;
      }

      console.log('Asset updated with stored video');
      
      return new Response(JSON.stringify({ 
        success: true,
        message: 'Real video downloaded, stored, and updated',
        video_url: storedVideoUrl,
        gif_url: storedGifUrl,
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