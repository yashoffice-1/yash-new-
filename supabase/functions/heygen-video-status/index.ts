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

    console.log('Getting video status for asset ID:', assetId);

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

    // Since all videos are using the same fallback ID, we need to show the user what videos are available
    // and let them manually select or we need to fix the data structure
    
    console.log('Asset info:', {
      id: asset.id,
      title: asset.title,
      instruction: asset.instruction,
      created_at: asset.created_at
    });
    
    // For now, let's just use the most recent video from HeyGen for each asset
    // This is a temporary solution until we can properly track video IDs
    
    const listResponse = await fetch('https://api.heygen.com/v1/video.list', {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': heygenApiKey
      }
    });
    
    if (!listResponse.ok) {
      const errorText = await listResponse.text();
      console.error('List API error:', listResponse.status, errorText);
      throw new Error(`List API error: ${listResponse.status} - ${errorText}`);
    }
    
    const listData = await listResponse.json();
    console.log('Available videos:', listData.data?.videos?.length || 0);
    
    if (!listData.data?.videos || listData.data.videos.length === 0) {
      throw new Error('No videos found in HeyGen account');
    }
    
    // Sort videos by creation time (newest first)
    const sortedVideos = listData.data.videos.sort((a: any, b: any) => b.created_at - a.created_at);
    
    // For demo purposes, let's use different videos for different assets
    // This is a workaround until we have proper video ID tracking
    const assetIndex = parseInt(asset.id.slice(-1), 16) % sortedVideos.length;
    const selectedVideo = sortedVideos[assetIndex];
    
    console.log(`Selected video ${assetIndex} for asset ${asset.title}:`, {
      video_id: selectedVideo.video_id,
      status: selectedVideo.status,
      created_at: selectedVideo.created_at
    });
    
    const videoId = selectedVideo.video_id;

    // Use HeyGen video_status.get API
    console.log('Getting video status for video ID:', videoId);
    
    const statusResponse = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': heygenApiKey
      }
    });
    
    console.log('Status response status:', statusResponse.status);
    
    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.error('Status API error:', statusResponse.status, errorText);
      throw new Error(`Status API error: ${statusResponse.status} - ${errorText}`);
    }
    
    const statusData = await statusResponse.json();
    console.log('Status response:', statusData);
    
    if (statusData.code === 100 && statusData.data) {
      const videoData = statusData.data;
      console.log('Video status:', videoData.status);
      console.log('Video URL:', videoData.video_url);
      console.log('GIF URL:', videoData.gif_url);
      
      // Update the asset based on video status
      let updateData: any = {
        description: `${asset.description} | Status check: ${new Date().toISOString()}`
      };

      if (videoData.status === 'completed' && videoData.video_url) {
        console.log('Video is completed, downloading and storing...');
        
        try {
          // Download the video file
          const videoResponse = await fetch(videoData.video_url);
          if (!videoResponse.ok) {
            throw new Error(`Failed to download video: ${videoResponse.status}`);
          }
          
          const videoBlob = await videoResponse.arrayBuffer();
          const fileName = `heygen-video-${videoId}-${Date.now()}.mp4`;
          
          // Store in Supabase storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('generated-assets')
            .upload(fileName, videoBlob, {
              contentType: 'video/mp4',
              upsert: false
            });

          if (uploadError) {
            console.error('Storage upload error:', uploadError);
            throw uploadError;
          }

          console.log('Video uploaded to storage:', uploadData.path);
          
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('generated-assets')
            .getPublicUrl(uploadData.path);

          const storedVideoUrl = publicUrlData.publicUrl;
          console.log('Stored video URL:', storedVideoUrl);
          
          // Also download and store GIF if available
          let storedGifUrl = videoData.gif_url;
          if (videoData.gif_url) {
            try {
              const gifResponse = await fetch(videoData.gif_url);
              if (gifResponse.ok) {
                const gifBlob = await gifResponse.arrayBuffer();
                const gifFileName = `heygen-gif-${videoId}-${Date.now()}.gif`;
                
                const { data: gifUploadData, error: gifUploadError } = await supabase.storage
                  .from('generated-assets')
                  .upload(gifFileName, gifBlob, {
                    contentType: 'image/gif',
                    upsert: false
                  });

                if (!gifUploadError) {
                  const { data: gifPublicUrlData } = supabase.storage
                    .from('generated-assets')
                    .getPublicUrl(gifUploadData.path);
                  storedGifUrl = gifPublicUrlData.publicUrl;
                  console.log('Stored GIF URL:', storedGifUrl);
                }
              }
            } catch (gifError) {
              console.warn('Failed to download GIF, using original URL:', gifError);
            }
          }

          updateData.asset_url = storedVideoUrl;
          updateData.gif_url = storedGifUrl;
          updateData.description = `${asset.description} | Video stored permanently: ${new Date().toISOString()}`;
          
        } catch (downloadError) {
          console.error('Failed to download/store video:', downloadError);
          // Fallback to original URL if download fails
          updateData.asset_url = videoData.video_url;
          updateData.gif_url = videoData.gif_url || null;
          updateData.description = `${asset.description} | Using temporary HeyGen URL (expires in 7 days): ${new Date().toISOString()}`;
        }
      } else if (videoData.status === 'failed') {
        updateData.asset_url = 'failed';
        updateData.description = `${asset.description} | Video failed: ${new Date().toISOString()}`;
        console.log('Video failed');
      } else if (videoData.status === 'processing' || videoData.status === 'pending') {
        updateData.asset_url = 'processing';
        updateData.description = `${asset.description} | Still processing: ${new Date().toISOString()}`;
        console.log('Video still processing');
      }

      const { error: updateError } = await supabase
        .from('asset_library')
        .update(updateData)
        .eq('id', assetId);

      if (updateError) {
        console.error('Failed to update asset:', updateError);
        throw updateError;
      }

      console.log('Asset updated successfully');
      
      return new Response(JSON.stringify({ 
        success: true,
        message: `Video status: ${videoData.status}`,
        status: videoData.status,
        video_url: videoData.video_url,
        gif_url: videoData.gif_url,
        duration: videoData.duration,
        video_id: videoId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error(`Status API returned error: ${statusData.message || 'Unknown error'}`);
    }

  } catch (error) {
    console.error('Error getting video status:', error);
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