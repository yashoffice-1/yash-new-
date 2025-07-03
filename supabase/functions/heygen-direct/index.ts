
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
  console.log('HeyGen Direct function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting HeyGen Direct function execution');
    
    if (!heygenApiKey) {
      console.error('HeyGen API key missing');
      throw new Error('HeyGen API key not configured. Please add HEYGEN_API_KEY to Supabase secrets.');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }

    console.log('Environment variables OK, parsing request body...');
    const requestBody = await req.json();
    console.log('Request body received:', JSON.stringify(requestBody, null, 2));
    
    const { templateId, templateData, instruction, productId }: HeyGenDirectRequest = requestBody;

    console.log('Parsed request data:', {
      templateId,
      productId,
      hasTemplateData: !!templateData,
      instruction: instruction?.substring(0, 100) + '...'
    });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare variables for HeyGen template according to API documentation
    const variables: Record<string, any> = {};
    
    // Use user improved data first, then AI suggested, then extracted as fallback
    const allKeys = Object.keys(templateData.userImproved || {});
    console.log('Template variable keys found:', allKeys);
    
    allKeys.forEach(key => {
      const content = templateData.userImproved[key] || 
                     templateData.aiSuggested[key] || 
                     templateData.extracted[key] || '';
      
      // Format variables according to HeyGen API documentation
      variables[key] = {
        name: key,
        type: key.toLowerCase().includes('image') ? 'image' : 'text',
        properties: key.toLowerCase().includes('image') ? {
          url: content
        } : {
          content: content
        }
      };
    });

    console.log('Template variables prepared in HeyGen API format:', JSON.stringify(variables, null, 2));

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
        console.error('Missing required variables:', missingVariables);
        throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
      }
    }

    // Generate a unique callback ID for tracking
    const callbackId = `feedgen_${templateId}_${productId || 'noproduct'}_${Date.now()}`;
    console.log('Generated callback ID:', callbackId);

    console.log('Creating video with template variables:', {
      templateId,
      variablesFormatted: Object.keys(variables).length,
      variableCount: allKeys.length,
      callbackId
    });

    // Call HeyGen API to generate video using template with correct format
    console.log('Making request to HeyGen API...');
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
        include_gif: true,
        test: false,
        callback_id: callbackId,
      }),
    });

    console.log('HeyGen API response status:', heygenResponse.status);

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
    console.log('HeyGen API response data:', heygenData);

    // Store the generation request in database and asset library
    console.log('Storing asset in database and library...');
    let assetId = null;
    let libraryId = null;
    
    try {
      // First, store in generated_assets table
      const { data: asset, error: dbError } = await supabase
        .from('generated_assets')
        .insert({
          id: callbackId, // Use callback ID as the asset ID for easier tracking
          channel: 'youtube',
          format: 'mp4',
          source_system: 'heygen',
          asset_type: 'video',
          url: heygenData.data?.video_url || 'pending',
          instruction: instruction || 'Direct HeyGen API video generation',
          approved: false,
          inventory_id: productId
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error storing generated asset:', dbError);
        throw new Error(`Failed to store generated asset: ${dbError.message}`);
      } else {
        console.log('Video generation request stored in database with ID:', asset.id);
        assetId = asset.id;
        
        // Now create entry in asset library for immediate tracking
        try {
          // Get product info for title formatting
          let productData = null;
          if (productId) {
            console.log('Fetching product data for ID:', productId);
            const { data: product, error: productError } = await supabase
              .from('inventory')
              .select('name, price')
              .eq('id', productId)
              .single();
              
            if (productError) {
              console.log('Product fetch error (non-fatal):', productError);
            } else {
              productData = product;
              console.log('Product data fetched:', productData);
            }
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
            shortTitle = `HeyGen Video - ${productId || 'Product'}`;
          }
          
          console.log('Creating asset library entry with title:', shortTitle);
          
          const { data: libraryEntry, error: libraryError } = await supabase
            .from('asset_library')
            .insert({
              title: shortTitle,
              asset_type: 'video',
              asset_url: 'processing',
              source_system: 'heygen',
              instruction: instruction || 'Direct HeyGen API video generation',
              original_asset_id: callbackId,
              description: `Video: ${productData?.name || 'Product'} | Template: ${templateId} | Callback: ${callbackId}`
            })
            .select()
            .single();
            
          if (libraryError) {
            console.error('Failed to create asset library entry:', libraryError);
            throw new Error(`Failed to create library entry: ${libraryError.message}`);
          } else {
            libraryId = libraryEntry.id;
            console.log('Asset library entry created successfully with ID:', libraryId);
          }
        } catch (libraryInsertError) {
          console.error('Asset library creation error:', libraryInsertError);
          throw libraryInsertError;
        }
      }
    } catch (dbStoreError) {
      console.error('Database storage error:', dbStoreError);
      throw dbStoreError;
    }

    const responseData = { 
      success: true, 
      video_id: heygenData.data?.video_id || callbackId,
      video_url: heygenData.data?.video_url || 'processing',
      asset_id: assetId,
      library_id: libraryId,
      callback_id: callbackId,
      type: 'video',
      message: 'Video generation started via HeyGen Direct API. Processing may take a few minutes.',
      template_id: templateId,
      heygen_response: heygenData
    };

    console.log('Returning success response:', responseData);

    return new Response(JSON.stringify(responseData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in heygen-direct function:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    const errorResponse = { 
      success: false, 
      error: error.message,
      details: 'Check function logs for more information',
      timestamp: new Date().toISOString()
    };

    console.log('Returning error response:', errorResponse);

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
