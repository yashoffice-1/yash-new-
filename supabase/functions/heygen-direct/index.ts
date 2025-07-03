
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

    // Prepare variables for HeyGen template - variables should be a string according to API docs
    const variablesObject: Record<string, any> = {};
    
    // Use user improved data first, then AI suggested, then extracted as fallback
    const allKeys = Object.keys(templateData.userImproved || {});
    allKeys.forEach(key => {
      const content = templateData.userImproved[key] || 
                     templateData.aiSuggested[key] || 
                     templateData.extracted[key] || '';
      
      // Store variables as key-value pairs
      variablesObject[key] = content;
    });

    // Convert variables object to JSON string as expected by HeyGen API
    const variables = JSON.stringify(variablesObject);
    console.log('Template variables prepared as JSON string:', variables);

    // If no variables provided, this might be a template that doesn't need variables
    if (allKeys.length === 0) {
      console.log('No template variables provided - template may not require variables');
    } else {
      // Validate required variables only if we have variables to check
      const missingVariables = allKeys.filter(key => {
        const content = templateData.userImproved[key] || 
                       templateData.aiSuggested[key] || 
                       templateData.extracted[key] || '';
        return !content || content.toString().trim() === '';
      });

      if (missingVariables.length > 0) {
        throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
      }
    }

    console.log('Creating video with template variables:', {
      templateId,
      variables,
      variableCount: allKeys.length
    });

    // Call HeyGen API to generate video using template with correct format
    const heygenResponse = await fetch(`https://api.heygen.com/v2/template/${templateId}/generate`, {
      method: 'POST',
      headers: {
        'X-Api-Key': heygenApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        caption: false,
        title: `Video for ${productId || 'Product'}`,
        variables: variables,
        test: false,
        callback_id: `feedgen_${templateId}_${Date.now()}`,
      }),
    });

    if (!heygenResponse.ok) {
      const errorText = await heygenResponse.text();
      console.error('HeyGen API error:', {
        status: heygenResponse.status,
        statusText: heygenResponse.statusText,
        error: errorText,
        url: heygenResponse.url
      });
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
    console.error('Error in heygen-direct function:', {
      message: error.message,
      stack: error.stack,
      templateId,
      productId
    });
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      details: 'Check function logs for more information'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
