import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeyGenVideo {
  id: string;
  title: string;
  status: string;
  created_at: string;
  video_url?: string;
  gif_url?: string;
  thumbnail_url?: string;
  duration?: number;
  callback_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
    if (!heygenApiKey) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'HeyGen API key not configured' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, videoIds, page = 1, limit = 20 } = await req.json();

    if (action === 'list') {
      console.log('Fetching HeyGen videos list...');
      
      // Fetch videos from HeyGen API
      const response = await fetch('https://api.heygen.com/v2/video/list', {
        method: 'GET',
        headers: {
          'X-Api-Key': heygenApiKey,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HeyGen API error:', response.status, errorText);
        return new Response(JSON.stringify({ 
          success: false, 
          error: `HeyGen API error: ${response.status}` 
        }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      console.log('HeyGen videos response:', JSON.stringify(data, null, 2));

      const videos: HeyGenVideo[] = data.data?.videos || [];
      
      return new Response(JSON.stringify({ 
        success: true, 
        videos: videos,
        total: data.data?.total || videos.length,
        page: page,
        limit: limit
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (action === 'pull' && videoIds && Array.isArray(videoIds)) {
      console.log('Pulling specific videos:', videoIds);
      
      const pulledVideos = [];
      const errors = [];

      for (const videoId of videoIds) {
        try {
          // Get video details from HeyGen
          const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
            method: 'GET',
            headers: {
              'X-Api-Key': heygenApiKey,
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            errors.push({ videoId, error: `HTTP ${response.status}` });
            continue;
          }

          const videoData = await response.json();
          console.log(`Video ${videoId} details:`, JSON.stringify(videoData, null, 2));

          if (videoData.data && videoData.data.status === 'completed' && videoData.data.video_url) {
            // Store video in our asset library
            const { data: existingAsset } = await supabase
              .from('asset_library')
              .select('id')
              .eq('original_asset_id', videoId)
              .single();

            if (!existingAsset) {
              // Download and store the video
              let storedVideoUrl = videoData.data.video_url;
              let storedGifUrl = videoData.data.gif_download_url;

              try {
                // Download video to our storage
                const videoResponse = await fetch(videoData.data.video_url, {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                  }
                });

                if (videoResponse.ok) {
                  const videoBlob = await videoResponse.blob();
                  const videoFileName = `heygen-pulled-${videoId}-${Date.now()}.mp4`;
                  
                  const { data: videoUpload, error: videoUploadError } = await supabase.storage
                    .from('generated-assets')
                    .upload(videoFileName, videoBlob, {
                      contentType: 'video/mp4',
                      upsert: true
                    });

                  if (!videoUploadError) {
                    const { data: { publicUrl } } = supabase.storage
                      .from('generated-assets')
                      .getPublicUrl(videoUpload.path);
                    storedVideoUrl = publicUrl;
                    console.log('Video stored successfully:', publicUrl);
                  }
                }

                // Download GIF if available
                if (videoData.data.gif_download_url) {
                  const gifResponse = await fetch(videoData.data.gif_download_url, {
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                  });

                  if (gifResponse.ok) {
                    const gifBlob = await gifResponse.blob();
                    const gifFileName = `heygen-pulled-gif-${videoId}-${Date.now()}.gif`;
                    
                    const { data: gifUpload, error: gifUploadError } = await supabase.storage
                      .from('generated-assets')
                      .upload(gifFileName, gifBlob, {
                        contentType: 'image/gif',
                        upsert: true
                      });

                    if (!gifUploadError) {
                      const { data: { publicUrl } } = supabase.storage
                        .from('generated-assets')
                        .getPublicUrl(gifUpload.path);
                      storedGifUrl = publicUrl;
                      console.log('GIF stored successfully:', publicUrl);
                    }
                  }
                }
              } catch (downloadError) {
                console.warn('Failed to download assets:', downloadError);
              }

              // Save to asset library
              const { data: newAsset, error: insertError } = await supabase
                .from('asset_library')
                .insert({
                  title: videoData.data.title || `HeyGen Video ${videoId}`,
                  asset_type: 'video',
                  asset_url: storedVideoUrl,
                  gif_url: storedGifUrl,
                  source_system: 'heygen',
                  instruction: 'Video pulled from HeyGen dashboard',
                  original_asset_id: videoId,
                  description: `Pulled from HeyGen | Duration: ${videoData.data.duration || 'unknown'}s | Created: ${videoData.data.created_at || 'unknown'}`
                })
                .select()
                .single();

              if (insertError) {
                errors.push({ videoId, error: `Database error: ${insertError.message}` });
              } else {
                pulledVideos.push(newAsset);
              }
            } else {
              console.log(`Video ${videoId} already exists in library`);
              pulledVideos.push({ id: existingAsset.id, status: 'already_exists' });
            }
          } else {
            errors.push({ videoId, error: `Video not completed or no URL available (status: ${videoData.data?.status})` });
          }
        } catch (error) {
          console.error(`Error processing video ${videoId}:`, error);
          errors.push({ videoId, error: error.message });
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        pulledVideos,
        errors,
        message: `Successfully pulled ${pulledVideos.length} videos, ${errors.length} errors`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid action. Use "list" or "pull" with videoIds array' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in heygen-list-videos function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});