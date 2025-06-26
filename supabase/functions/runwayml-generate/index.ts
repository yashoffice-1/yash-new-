
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1';

const runwayApiKey = Deno.env.get('RUNWAYML_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RunwayRequest {
  type: 'image' | 'video';
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
    const { type, instruction, imageUrl, productInfo }: RunwayRequest = await req.json();

    if (!runwayApiKey) {
      console.log('RunwayML API key not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'RunwayML API key not configured. Please add it in Supabase secrets.',
        asset_url: type === 'image' 
          ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        status: 'placeholder'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting RunwayML ${type} generation`);

    // Prepare enhanced prompt
    const enhancedPrompt = `${instruction}. Product: ${productInfo?.name || 'Premium Wireless Headphones'}. ${productInfo?.description || 'High-quality audio device with professional design'}`;
    console.log('Enhanced prompt:', enhancedPrompt);

    let requestBody: any;
    let apiEndpoint: string;

    if (type === 'image') {
      requestBody = {
        promptText: enhancedPrompt,
        seed: Math.floor(Math.random() * 1000000),
        width: 1024,
        height: 1024
      };
      apiEndpoint = 'https://api.runwayml.com/v1/image_generations';
    } else {
      requestBody = {
        promptText: enhancedPrompt,
        model: "gen3a_turbo",
        width: 1280,
        height: 768,
        duration: 5,
        seed: Math.floor(Math.random() * 1000000)
      };

      if (imageUrl) {
        requestBody.promptImage = imageUrl;
      }
      
      apiEndpoint = 'https://api.runwayml.com/v1/video_generations';
    }

    console.log('Making API call to RunwayML:', apiEndpoint);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Make the actual API call to RunwayML
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-09-13'
      },
      body: JSON.stringify(requestBody),
    });

    console.log('RunwayML API response status:', response.status);
    
    const responseText = await response.text();
    console.log('RunwayML API raw response:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse RunwayML response as JSON:', parseError);
      throw new Error(`Invalid JSON response from RunwayML: ${responseText}`);
    }

    console.log('RunwayML API parsed response:', JSON.stringify(data, null, 2));

    let assetUrl: string;
    let runwayTaskId: string | null = null;
    let status = 'completed';
    let message = '';

    if (response.ok) {
      runwayTaskId = data.id;
      
      if (data.status === 'PENDING' || data.status === 'RUNNING') {
        console.log('Generation is in progress, task ID:', runwayTaskId);
        status = 'processing';
        message = `${type} generation started. Task ID: ${runwayTaskId}. This may take a few minutes to complete.`;
        // Use placeholder while processing
        assetUrl = type === 'image' 
          ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      } else if (data.status === 'SUCCEEDED') {
        console.log('Generation completed successfully');
        assetUrl = data.output?.[0] || data.url || data.image_url || data.video_url;
        message = `${type} generation completed successfully!`;
        
        if (!assetUrl) {
          console.log('No asset URL in completed response, using placeholder');
          assetUrl = type === 'image' 
            ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
          message += ' (Using placeholder asset)';
        }
      } else if (data.status === 'FAILED') {
        console.log('RunwayML generation failed:', data.failure_reason || 'Unknown error');
        throw new Error(`RunwayML generation failed: ${data.failure_reason || 'Unknown error'}`);
      } else {
        console.log('Unexpected status from RunwayML:', data.status);
        status = 'processing';
        message = `${type} generation status: ${data.status}. Please check back later.`;
        assetUrl = type === 'image' 
          ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      }
    } else {
      console.error('RunwayML API error:', response.status, data);
      
      // Provide specific error message
      const errorMessage = data?.error?.message || data?.detail || data?.message || 'Unknown API error';
      message = `RunwayML API Error (${response.status}): ${errorMessage}. Using placeholder for testing.`;
      
      // Use placeholder on API error for testing purposes
      assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      status = 'error';
    }

    // Store the generated asset in database
    const { data: asset, error: dbError } = await supabase
      .from('generated_assets')
      .insert({
        channel: 'instagram',
        format: type === 'image' ? 'jpg' : 'mp4',
        source_system: 'runway',
        asset_type: type,
        url: assetUrl,
        instruction: instruction,
        approved: false
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`RunwayML ${type} generation request completed with status: ${status}`);

    return new Response(JSON.stringify({ 
      success: true, 
      asset_url: assetUrl,
      asset_id: asset.id,
      type: type,
      runway_task_id: runwayTaskId,
      status: status,
      message: message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in runwayml-generate function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message,
      asset_url: type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      status: 'error',
      message: `Error: ${error.message}. Using placeholder for testing.`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
