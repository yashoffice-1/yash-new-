
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

    // Enhanced prompt with product context
    const enhancedPrompt = `${instruction}. Product: ${productInfo?.name || 'Premium Wireless Headphones'}. ${productInfo?.description || 'High-quality audio device with professional design'}`;
    console.log('Enhanced prompt:', enhancedPrompt);

    let requestBody: any;
    let apiEndpoint: string;

    if (type === 'image') {
      // Updated API structure for image generation
      requestBody = {
        promptText: enhancedPrompt,
        width: 1280,
        height: 768,
        seed: Math.floor(Math.random() * 1000000),
        modelId: "runwayml/runway-gen3"
      };

      // Add image input for image-to-image if provided
      if (imageUrl) {
        requestBody.initImage = imageUrl;
        console.log('Using image URL for image generation:', imageUrl);
      }
      
      apiEndpoint = 'https://api.runwayml.com/v1/generate';
    } else {
      // Updated API structure for video generation
      requestBody = {
        promptText: enhancedPrompt,
        duration: 5,
        width: 1280,
        height: 768,
        seed: Math.floor(Math.random() * 1000000),
        modelId: "runwayml/runway-gen3"
      };

      // Add image input for image-to-video if provided
      if (imageUrl) {
        requestBody.initImage = imageUrl;
        console.log('Using image URL for video generation:', imageUrl);
      }
      
      apiEndpoint = 'https://api.runwayml.com/v1/generate';
    }

    console.log('Making API call to RunwayML:', apiEndpoint);
    console.log('Request body:', JSON.stringify(requestBody, null, 2));

    // Make the API call to RunwayML with corrected headers
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
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

    if (!response.ok) {
      console.error('RunwayML API error:', response.status, data);
      
      const errorMessage = data?.error || data?.message || data?.detail || 'Unknown API error';
      const message = `RunwayML API Error (${response.status}): ${errorMessage}. Using placeholder for testing.`;
      
      // Use placeholder on API error for testing purposes
      const assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      // Store the placeholder asset in database
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

      return new Response(JSON.stringify({ 
        success: true, 
        asset_url: assetUrl,
        asset_id: asset.id,
        type: type,
        runway_task_id: null,
        status: 'error',
        message: message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle successful response - extract generation ID for polling
    const generationId = data.id;
    console.log('RunwayML generation started with ID:', generationId);

    // Poll the generation status
    let generationStatus = 'PENDING';
    let assetUrl = '';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (generationStatus === 'PENDING' || generationStatus === 'RUNNING') {
      if (attempts >= maxAttempts) {
        console.log('Generation polling timeout after 5 minutes');
        break;
      }

      // Wait 5 seconds before checking
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      console.log(`Checking generation status (attempt ${attempts}/${maxAttempts})`);

      // Check generation status
      const statusResponse = await fetch(`https://api.runwayml.com/v1/generate/${generationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${runwayApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!statusResponse.ok) {
        console.error('Failed to check generation status:', statusResponse.status);
        break;
      }

      const statusData = await statusResponse.json();
      console.log('Generation status check response:', JSON.stringify(statusData, null, 2));

      generationStatus = statusData.status;

      if (generationStatus === 'SUCCEEDED' || generationStatus === 'COMPLETED') {
        // Extract asset URL from the response
        assetUrl = statusData.output?.url || statusData.artifacts?.[0]?.url || statusData.url || '';
        console.log('Generation completed successfully, asset URL:', assetUrl);
        break;
      } else if (generationStatus === 'FAILED') {
        console.error('Generation failed:', statusData.failure || statusData.failureReason || 'Unknown error');
        break;
      }
    }

    // Determine final status and asset URL
    let finalStatus = 'completed';
    let message = '';

    if ((generationStatus === 'SUCCEEDED' || generationStatus === 'COMPLETED') && assetUrl) {
      message = `${type} generation completed successfully!`;
      finalStatus = 'completed';
    } else if (generationStatus === 'FAILED') {
      message = `${type} generation failed. Using placeholder for testing.`;
      finalStatus = 'error';
      assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    } else {
      message = `${type} generation is still processing (Generation ID: ${generationId}). Using placeholder for now.`;
      finalStatus = 'processing';
      assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
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

    console.log(`RunwayML ${type} generation completed with status: ${finalStatus}`);

    return new Response(JSON.stringify({ 
      success: true, 
      asset_url: assetUrl,
      asset_id: asset.id,
      type: type,
      runway_task_id: generationId,
      status: finalStatus,
      message: message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in runwayml-generate function:', error);
    
    // Determine type for placeholder
    let type = 'image';
    try {
      const body = await req.json();
      type = body.type || 'image';
    } catch (e) {
      // Ignore parsing error, use default
    }

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
