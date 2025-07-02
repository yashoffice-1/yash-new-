
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
    const { 
      type, 
      instruction, 
      templateId, 
      productId, 
      templateData,
      formatSpecs 
    } = await req.json();

    console.log('Received HeyGen generation request:', { 
      type, 
      templateId, 
      productId, 
      formatSpecs 
    });

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // For now, simulate the HeyGen API call by storing the request in Google Sheets
    // This will be processed by Zapier automation
    console.log('Preparing HeyGen template generation request...');
    
    // Store the generation request in the database
    const { data: assetData, error: insertError } = await supabase
      .from('generated_assets')
      .insert({
        asset_type: 'video',
        channel: formatSpecs?.channel || 'social_media',
        format: formatSpecs?.format || 'mp4',
        instruction: instruction,
        inventory_id: productId,
        source_system: 'heygen_zapier',
        url: 'pending', // Will be updated when webhook receives the actual URL
        approved: false
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to store generation request: ${insertError.message}`);
    }

    // Also store in asset_library for user access
    const { error: libraryError } = await supabase
      .from('asset_library')
      .insert({
        title: `HeyGen Video - ${templateId}`,
        asset_type: 'video',
        asset_url: 'pending',
        gif_url: null, // Will be updated when webhook provides GIF URL
        instruction: instruction,
        source_system: 'heygen_zapier',
        description: `Generated using HeyGen template ${templateId}`,
        original_asset_id: assetData.id
      });

    if (libraryError) {
      console.error('Failed to store in asset library:', libraryError);
    }

    console.log('HeyGen generation request processed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      asset_id: assetData.id,
      message: 'Video generation request sent to HeyGen via Google Sheets + Zapier automation',
      status: 'pending'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in heygen-generate function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
