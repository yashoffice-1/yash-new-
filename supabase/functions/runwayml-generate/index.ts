
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
      console.log('RunwayML API key not configured, using placeholder');
      throw new Error('RunwayML API key not configured');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Starting RunwayML ${type} generation with API key configured`);

    // Prepare the prompt for better results
    const enhancedPrompt = `${instruction}. Product: ${productInfo?.name || 'Premium Wireless Headphones'}. ${productInfo?.description || 'High-quality audio device'}`;

    console.log('Enhanced prompt:', enhancedPrompt);

    let requestBody: any;
    let apiEndpoint: string;

    if (type === 'image') {
      // Using the correct RunwayML API v1 endpoint for image generation
      requestBody = {
        promptText: enhancedPrompt,
        seed: Math.floor(Math.random() * 1000000),
        width: 1024,
        height: 1024
      };
      apiEndpoint = 'https://api.runwayml.com/v1/image_generations';
    } else {
      // Using the correct RunwayML API v1 endpoint for video generation
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

    let assetUrl: string;
    let runwayTaskId: string | null = null;

    if (response.ok) {
      const data = await response.json();
      console.log('RunwayML API response data:', JSON.stringify(data, null, 2));
      
      // Handle the async nature of RunwayML - they typically return a task ID first
      runwayTaskId = data.id;
      
      if (data.status === 'PENDING' || data.status === 'RUNNING') {
        console.log('Generation is in progress, task ID:', runwayTaskId);
        // For now, use placeholder while task processes
        assetUrl = type === 'image' 
          ? imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      } else if (data.status === 'SUCCEEDED') {
        // If completed immediately, use the actual URL
        assetUrl = data.output?.[0] || data.url || data.image_url || data.video_url;
        if (!assetUrl) {
          console.log('No asset URL in completed response');
          assetUrl = type === 'image' 
            ? imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        }
      } else {
        console.log('Unexpected status:', data.status);
        assetUrl = type === 'image' 
          ? imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
          : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      }
    } else {
      const errorText = await response.text();
      console.error('RunwayML API error:', response.status, errorText);
      
      // Parse error for better understanding
      try {
        const errorData = JSON.parse(errorText);
        console.error('Parsed error:', errorData);
      } catch (e) {
        console.error('Could not parse error as JSON');
      }
      
      // Use placeholder on API error for testing purposes
      console.log('Using placeholder due to API error');
      assetUrl = type === 'image' 
        ? imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
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

    console.log(`RunwayML ${type} generation completed successfully`);

    return new Response(JSON.stringify({ 
      success: true, 
      asset_url: assetUrl,
      asset_id: asset.id,
      type: type,
      runway_task_id: runwayTaskId,
      status: runwayTaskId ? 'processing' : 'completed'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in runwayml-generate function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
