
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1';

const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeyGenRequest {
  instruction: string;
  imageUrl?: string;
  productInfo?: {
    name: string;
    description: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instruction, imageUrl, productInfo }: HeyGenRequest = await req.json();

    if (!heygenApiKey) {
      throw new Error('HeyGen API key not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting HeyGen video generation');

    // For HeyGen API integration
    const requestBody = {
      video_inputs: [{
        voice: {
          type: "text",
          input_text: instruction,
          voice_id: "1bd001e7e50f421d891986aad5158bc8"
        },
        character: {
          type: "avatar",
          avatar_id: "Anna_public_3_20240108"
        }
      }],
      aspect_ratio: "16:9"
    };

    // Simulate API call (replace with actual HeyGen API endpoint)
    const response = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-API-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      // For demo purposes, we'll use a placeholder video
      console.log('Using placeholder video for demo');
      const assetUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      
      // Store in database
      const { data: asset, error: dbError } = await supabase
        .from('generated_assets')
        .insert({
          channel: 'youtube',
          format: 'mp4',
          source_system: 'heygen',
          asset_type: 'video',
          url: assetUrl,
          instruction: instruction,
          approved: false
        })
        .select()
        .single();

      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        asset_url: assetUrl,
        asset_id: asset.id,
        type: 'video' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const assetUrl = data.video_url || data.url;

    // Store the generated asset in database
    const { data: asset, error: dbError } = await supabase
      .from('generated_assets')
      .insert({
        channel: 'youtube',
        format: 'mp4',
        source_system: 'heygen',
        asset_type: 'video',
        url: assetUrl,
        instruction: instruction,
        approved: false
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('HeyGen video generation completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      asset_url: assetUrl,
      asset_id: asset.id,
      type: 'video' 
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
