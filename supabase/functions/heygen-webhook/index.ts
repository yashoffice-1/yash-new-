
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
    console.log('Received HeyGen webhook:', webhookData);

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
        thumbnail_url
      });

      // Update generated_assets table
      const { error: updateAssetError } = await supabase
        .from('generated_assets')
        .update({
          url: video_url,
          approved: true
        })
        .eq('id', callback_id || video_id);

      if (updateAssetError) {
        console.error('Failed to update generated asset:', updateAssetError);
      }

      // Update asset_library table with both video URL and GIF URL
      const { error: updateLibraryError } = await supabase
        .from('asset_library')
        .update({
          asset_url: video_url,
          gif_url: gif_download_url,
          description: `Generated HeyGen video (ID: ${video_id})`
        })
        .eq('original_asset_id', callback_id || video_id);

      if (updateLibraryError) {
        console.error('Failed to update asset library:', updateLibraryError);
      }

      console.log('Successfully updated database with video and GIF URLs');

    } else if (event_type === 'avatar_video.fail') {
      const { video_id, error: generation_error } = event_data;
      
      console.log('Processing failed video generation:', {
        video_id,
        error: generation_error
      });

      // Update the status to indicate failure
      const { error: updateError } = await supabase
        .from('generated_assets')
        .update({
          url: 'failed',
          approved: false
        })
        .eq('id', video_id);

      if (updateError) {
        console.error('Failed to update failed generation:', updateError);
      }

      // Update asset library as well
      const { error: libraryUpdateError } = await supabase
        .from('asset_library')
        .update({
          asset_url: 'failed',
          description: `Failed HeyGen video generation: ${generation_error}`
        })
        .eq('original_asset_id', video_id);

      if (libraryUpdateError) {
        console.error('Failed to update library for failed generation:', libraryUpdateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing HeyGen webhook:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
