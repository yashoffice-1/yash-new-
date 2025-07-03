
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
    const webhookData = await req.json();
    console.log('Received HeyGen webhook:', JSON.stringify(webhookData, null, 2));

    const { event_type, event_data } = webhookData;

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (event_type === 'avatar_video.success') {
      const {
        video_id,
        url: video_url,
        gif_download_url,
        video_share_page_url,
        thumbnail_url,
        callback_id,
        folder_id
      } = event_data;

      console.log('Processing successful video generation:', {
        video_id,
        video_url,
        gif_download_url,
        thumbnail_url,
        callback_id
      });

      const trackingId = callback_id || video_id;
      console.log('Using tracking ID:', trackingId);

      // Update generated_assets table
      console.log('Updating generated_assets table...');
      const { error: updateAssetError } = await supabase
        .from('generated_assets')
        .update({
          url: video_url,
          approved: true
        })
        .eq('id', trackingId);

      if (updateAssetError) {
        console.error('Failed to update generated asset:', updateAssetError);
      } else {
        console.log('Successfully updated generated_assets table');
      }

      // Download and store the video to our storage before updating library
      console.log('Downloading video for storage...');
      let storedVideoUrl = video_url;
      let storedGifUrl = gif_download_url;

      try {
        // Download video
        console.log('Fetching video from URL:', video_url);
        const videoResponse = await fetch(video_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        
        console.log('Video response status:', videoResponse.status);
        
        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob();
          console.log('Video blob size:', videoBlob.size);
          
          const videoFileName = `heygen-video-${video_id}-${Date.now()}.mp4`;
          
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
        if (gif_download_url) {
          console.log('Fetching GIF from URL:', gif_download_url);
          const gifResponse = await fetch(gif_download_url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          
          console.log('GIF response status:', gifResponse.status);
          
          if (gifResponse.ok) {
            const gifBlob = await gifResponse.blob();
            console.log('GIF blob size:', gifBlob.size);
            
            const gifFileName = `heygen-gif-${video_id}-${Date.now()}.gif`;
            
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

      // Update asset_library table with stored URLs
      console.log('Updating asset_library table...');
      const { data: existingLibraryEntry, error: findLibraryError } = await supabase
        .from('asset_library')
        .select('*')
        .eq('original_asset_id', trackingId)
        .single();

      if (findLibraryError) {
        console.log('No existing library entry found, creating new one:', findLibraryError);
        
        // Try to get product info for title formatting
        let productData = null;
        try {
          const { data: generatedAsset } = await supabase
            .from('generated_assets')
            .select('inventory_id')
            .eq('id', trackingId)
            .single();
            
          if (generatedAsset?.inventory_id) {
            const { data: product } = await supabase
              .from('inventory')
              .select('name, price')
              .eq('id', generatedAsset.inventory_id)
              .single();
            if (product) {
              productData = product;
              console.log('Found product data for new library entry:', productData);
            }
          }
        } catch (productError) {
          console.log('Could not fetch product data for title formatting:', productError);
        }
        
        // Format title with character limit for HeyGen compatibility
        const maxTitleLength = 50;
        let shortTitle = '';
        
        if (productData?.name) {
          let productName = productData.name;
          if (productName.length > 30) {
            productName = productName.substring(0, 30) + '...';
          }
          
          const priceText = productData?.price ? `$${productData.price}` : '';
          const orientation = 'landscape';
          
          const parts = [productName, priceText, orientation].filter(Boolean);
          shortTitle = parts.join(' + ');
          
          if (shortTitle.length > maxTitleLength) {
            shortTitle = shortTitle.substring(0, maxTitleLength - 3) + '...';
          }
        } else {
          shortTitle = `HeyGen Video - ${video_id}`;
        }
        
        console.log('Creating new library entry with title:', shortTitle);
        
        const { data: newLibraryEntry, error: insertLibraryError } = await supabase
          .from('asset_library')
          .insert({
            title: shortTitle,
            asset_type: 'video',
            asset_url: storedVideoUrl,
            gif_url: storedGifUrl,
            source_system: 'heygen',
            instruction: 'Video generated via HeyGen webhook',
            original_asset_id: trackingId,
            description: `Generated HeyGen video completed (ID: ${video_id})${productData?.name ? ` (Product: ${productData.name})` : ''} | Callback: ${callback_id || 'none'}`
          })
          .select()
          .single();
          
        if (insertLibraryError) {
          console.error('Failed to insert new asset library entry:', insertLibraryError);
        } else {
          console.log('Created new asset library entry from webhook:', newLibraryEntry);
        }
      } else {
        console.log('Found existing library entry, updating with video URLs:', existingLibraryEntry);
        
        const { error: updateLibraryError } = await supabase
          .from('asset_library')
          .update({
            asset_url: storedVideoUrl,
            gif_url: storedGifUrl,
            description: `${existingLibraryEntry.description || ''} | Completed: ${new Date().toISOString()}`
          })
          .eq('id', existingLibraryEntry.id);

        if (updateLibraryError) {
          console.error('Failed to update existing library entry:', updateLibraryError);
        } else {
          console.log('Successfully updated existing asset library entry');
        }
      }

    } else if (event_type === 'avatar_video.fail') {
      const { video_id, error: generation_error, callback_id } = event_data;
      
      console.log('Processing failed video generation:', {
        video_id,
        error: generation_error,
        callback_id
      });

      const trackingId = callback_id || video_id;

      // Update the status to indicate failure
      const { error: updateError } = await supabase
        .from('generated_assets')
        .update({
          url: 'failed',
          approved: false
        })
        .eq('id', trackingId);

      if (updateError) {
        console.error('Failed to update failed generation:', updateError);
      } else {
        console.log('Updated generated_assets for failed generation');
      }

      // Update asset library as well
      const { error: libraryUpdateError } = await supabase
        .from('asset_library')
        .update({
          asset_url: 'failed',
          description: `Failed HeyGen video generation: ${generation_error} | Callback: ${callback_id || 'none'}`
        })
        .eq('original_asset_id', trackingId);

      if (libraryUpdateError) {
        console.error('Failed to update library for failed generation:', libraryUpdateError);
      } else {
        console.log('Updated asset library for failed generation');
      }
    } else {
      console.log('Received unknown event type:', event_type);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully',
      event_type,
      processed_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing HeyGen webhook:', error);
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
