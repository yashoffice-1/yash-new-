
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const heygenApiKey = Deno.env.get('HEYGEN_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeyGenDirectRequest {
  templateId: string;
  templateData: {
    extracted: any;
    aiSuggested: any;
    userImproved: any;
  };
  instruction?: string;
  productId?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!heygenApiKey) {
      throw new Error('HeyGen API key not configured. Please add HEYGEN_API_KEY to Supabase secrets.');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { templateId, templateData, instruction, productId }: HeyGenDirectRequest = await req.json();

    console.log('Starting direct HeyGen API integration');
    console.log('Template ID:', templateId);
    console.log('Product ID:', productId);

    // Prepare variables for HeyGen template
    const variables: Record<string, string> = {};
    
    // Use user improved data first, then AI suggested, then extracted as fallback
    Object.keys(templateData.userImproved || {}).forEach(key => {
      variables[key] = templateData.userImproved[key] || 
                     templateData.aiSuggested[key] || 
                     templateData.extracted[key] || '';
    });

    console.log('Template variables prepared:', variables);

    // Call HeyGen API to generate video
    const heygenResponse = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-API-KEY': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        video_inputs: [{
          character: {
            type: "avatar",
            avatar_id: "default_avatar", // You may want to make this configurable
          },
          voice: {
            type: "text",
            input_text: variables.website_description || variables.product_name || "Product showcase video",
            voice_id: "default_voice", // You may want to make this configurable
          }
        }],
        dimension: {
          width: 1080,
          height: 1920,
        },
        aspect_ratio: "9:16",
        test: false, // Set to true for testing, false for production
        caption: false,
        callback_id: `feedgen_${Date.now()}`,
      }),
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error('HeyGen API error:', errorText);
      throw new Error(`HeyGen API error: ${heygenResponse.status} - ${errorText}`);
    }

    const heygenData = await heygenResponse.json();
    console.log('HeyGen API response:', heygenData);

    // Store the generation request in database
    const { data: asset, error: dbError } = await supabase
      .from('generated_assets')
      .insert({
        channel: 'youtube',
        format: 'mp4',
        source_system: 'heygen_direct_api',
        asset_type: 'video',
        url: heygenData.data?.video_url || 'pending',
        instruction: instruction || 'Direct HeyGen API video generation',
        approved: false,
        inventory_id: productId
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('Video generation request stored in database');

    return new Response(JSON.stringify({ 
      success: true, 
      video_id: heygenData.data?.video_id,
      video_url: heygenData.data?.video_url || 'processing',
      asset_id: asset.id,
      type: 'video',
      message: 'Video generation started via HeyGen Direct API. Processing may take a few minutes.',
      template_id: templateId,
      heygen_response: heygenData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in heygen-direct function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
