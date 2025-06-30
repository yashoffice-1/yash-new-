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
  formatSpecs?: {
    channel?: string;
    assetType?: string;
    format?: string;
    specification?: string;
    width?: number;
    height?: number;
    dimensions?: string;
    aspectRatio?: string;
    duration?: string;
  };
}

// Function to create a concise prompt from the instruction and product info
function createConcisePrompt(instruction: string, productInfo?: { name: string; description: string }): string {
  // Limit the instruction to 500 characters to avoid API issues
  const truncatedInstruction = instruction.length > 500 ? instruction.substring(0, 500) + "..." : instruction;
  
  // Create a simple, focused prompt
  if (productInfo?.name) {
    const productName = productInfo.name.substring(0, 100); // Limit product name
    return `${truncatedInstruction} Product: ${productName}`;
  }
  
  return truncatedInstruction;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, instruction, imageUrl, productInfo, formatSpecs }: RunwayRequest = await req.json();

    console.log('Received format specifications:', formatSpecs);

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

    console.log(`Starting RunwayML ${type} generation with format specs`);

    // Create a concise prompt to avoid API issues
    const concisePrompt = createConcisePrompt(instruction, productInfo);
    console.log('Concise prompt:', concisePrompt);
    console.log('Prompt length:', concisePrompt.length);

    // Extract dimensions from format specs or use defaults
    const width = formatSpecs?.width || 1024;
    const height = formatSpecs?.height || 1024;
    const aspectRatio = formatSpecs?.aspectRatio || `${width}:${height}`;
    const duration = formatSpecs?.duration ? parseInt(formatSpecs.duration.replace(/[^\d]/g, '')) : 5;

    console.log('Using dimensions:', { width, height, aspectRatio, duration });

    // Use RunwayML's correct API structure based on documentation
    let requestBody: any;
    let apiEndpoint: string;

    if (type === 'image') {
      // Use correct image generation endpoint and structure with format specs
      requestBody = {
        promptText: concisePrompt,
        model: "gen4_image",
        ratio: aspectRatio === '1:1' ? '1920:1080' : aspectRatio // Map common ratios
      };
      
      // Add reference image if provided
      if (imageUrl) {
        requestBody.referenceImages = [
          {
            uri: imageUrl
          }
        ];
      }
      
      apiEndpoint = 'https://api.dev.runwayml.com/v1/text_to_image';
    } else {
      // Use correct video generation endpoint and structure with format specs
      const videoRatio = aspectRatio === '9:16' ? '1280:720' : 
                        aspectRatio === '16:9' ? '1920:1080' : 
                        aspectRatio === '1:1' ? '1280:720' : '1280:720';
      
      if (imageUrl) {
        // Image-to-video generation
        requestBody = {
          model: 'gen4_turbo',
          promptImage: imageUrl,
          promptText: concisePrompt,
          ratio: videoRatio,
          duration: Math.min(Math.max(duration, 5), 10) // Clamp between 5-10 seconds
        };
        apiEndpoint = 'https://api.dev.runwayml.com/v1/image_to_video';
      } else {
        // Text-to-video generation
        requestBody = {
          model: 'gen4_turbo',
          promptText: concisePrompt,
          ratio: videoRatio,
          duration: Math.min(Math.max(duration, 5), 10) // Clamp between 5-10 seconds
        };
        apiEndpoint = 'https://api.dev.runwayml.com/v1/text_to_video';
      }
    }

    console.log('Making API call to RunwayML:', apiEndpoint);
    console.log('Request body with format specs:', JSON.stringify(requestBody, null, 2));

    // Make the API call to RunwayML with correct headers
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${runwayApiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06'
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
      
      // Return placeholder on parsing error
      const assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      const { data: asset, error: dbError } = await supabase
        .from('generated_assets')
        .insert({
          channel: formatSpecs?.channel || 'instagram',
          format: type === 'image' ? 'jpg' : 'mp4',
          source_system: 'runway',
          asset_type: type,
          url: assetUrl,
          instruction: instruction,
          approved: false
        })
        .select()
        .single();

      return new Response(JSON.stringify({ 
        success: true, 
        asset_url: assetUrl,
        asset_id: asset?.id || `${type}-${Date.now()}`,
        type: type,
        runway_task_id: null,
        status: 'error',
        message: `Parse error: ${parseError.message}. Using placeholder for testing.`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('RunwayML API parsed response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      console.error('RunwayML API error:', response.status, data);
      
      const errorMessage = data?.error || data?.message || data?.detail || `HTTP ${response.status}`;
      const message = `RunwayML API Error: ${errorMessage}. Using placeholder for testing.`;
      
      // Use placeholder on API error for testing purposes
      const assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      // Store the placeholder asset in database
      const { data: asset, error: dbError } = await supabase
        .from('generated_assets')
        .insert({
          channel: formatSpecs?.channel || 'instagram',
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

    // Handle successful response - extract task ID
    const taskId = data.id;
    console.log('RunwayML task created with ID:', taskId);

    if (!taskId) {
      console.error('No task ID returned from RunwayML');
      const assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      const { data: asset, error: dbError } = await supabase
        .from('generated_assets')
        .insert({
          channel: formatSpecs?.channel || 'instagram',
          format: type === 'image' ? 'jpg' : 'mp4',
          source_system: 'runway',
          asset_type: type,
          url: assetUrl,
          instruction: instruction,
          approved: false
        })
        .select()
        .single();

      return new Response(JSON.stringify({ 
        success: true, 
        asset_url: assetUrl,
        asset_id: asset?.id || `${type}-${Date.now()}`,
        type: type,
        runway_task_id: null,
        status: 'error',
        message: 'No task ID returned. Using placeholder for testing.'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Poll the task status using correct endpoint
    let taskStatus = 'PENDING';
    let assetUrl = '';
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (taskStatus === 'PENDING' || taskStatus === 'RUNNING') {
      if (attempts >= maxAttempts) {
        console.log('Task polling timeout after 5 minutes');
        break;
      }

      // Wait 5 seconds before checking
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      console.log(`Checking task status (attempt ${attempts}/${maxAttempts})`);

      // Check task status using the correct endpoint structure
      const statusEndpoint = `https://api.dev.runwayml.com/v1/tasks/${taskId}`;

      const statusResponse = await fetch(statusEndpoint, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${runwayApiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-11-06'
        }
      });

      if (!statusResponse.ok) {
        console.error('Failed to check task status:', statusResponse.status);
        break;
      }

      const statusData = await statusResponse.json();
      console.log('Task status check response:', JSON.stringify(statusData, null, 2));

      taskStatus = statusData.status;

      if (taskStatus === 'SUCCEEDED' || taskStatus === 'COMPLETED') {
        // Extract asset URL from the response - handle both possible response formats
        if (statusData.output && Array.isArray(statusData.output) && statusData.output.length > 0) {
          // If output is an array, take the first URL
          assetUrl = statusData.output[0];
        } else if (statusData.output && typeof statusData.output === 'string') {
          // If output is a string URL
          assetUrl = statusData.output;
        } else if (statusData.artifacts && statusData.artifacts.length > 0) {
          // Alternative: check artifacts array
          assetUrl = statusData.artifacts[0].url;
        } else {
          // Fallback: look for url property directly
          assetUrl = statusData.url || '';
        }
        
        console.log('Task completed successfully, extracted asset URL:', assetUrl);
        
        // If we still don't have a URL, try to download and re-host the content
        if (!assetUrl) {
          console.log('No direct URL found, will use placeholder');
          assetUrl = type === 'image' 
            ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
            : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        }
        break;
      } else if (taskStatus === 'FAILED') {
        console.error('Task failed:', statusData.failure || statusData.failureReason || 'Unknown error');
        break;
      }
    }

    // Determine final status and asset URL
    let finalStatus = 'completed';
    let message = '';

    if ((taskStatus === 'SUCCEEDED' || taskStatus === 'COMPLETED') && assetUrl) {
      message = `${type} generation completed successfully! Note: RunwayML URLs may expire after some time.`;
      finalStatus = 'completed';
    } else if (taskStatus === 'FAILED') {
      message = `${type} generation failed. Using placeholder for testing.`;
      finalStatus = 'error';
      assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    } else {
      message = `${type} generation is still processing (Task ID: ${taskId}). Note: RunwayML URLs may expire after some time.`;
      finalStatus = 'processing';
      assetUrl = type === 'image' 
        ? 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
        : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    }

    // Store the generated asset in database with format specs
    const { data: asset, error: dbError } = await supabase
      .from('generated_assets')
      .insert({
        channel: formatSpecs?.channel || 'instagram',
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

    console.log(`RunwayML ${type} generation completed with format specs: ${formatSpecs?.specification}`);

    return new Response(JSON.stringify({ 
      success: true, 
      asset_url: assetUrl,
      asset_id: asset.id,
      type: type,
      runway_task_id: taskId,
      status: finalStatus,
      message: message + ` Generated with specs: ${formatSpecs?.specification || 'default'}`
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
