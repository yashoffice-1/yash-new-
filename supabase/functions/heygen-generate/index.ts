
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const googleSheetsWebhook = Deno.env.get('HEYGEN_GOOGLE_SHEETS_WEBHOOK');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HeyGenRequest {
  instruction?: string;
  imageUrl?: string;
  productInfo?: {
    name: string;
    description: string;
  };
  templateId?: string;
  templateData?: {
    extracted: any;
    aiSuggested: any;
    userImproved: any;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instruction, imageUrl, productInfo, templateId, templateData }: HeyGenRequest = await req.json();

    if (!googleSheetsWebhook) {
      throw new Error('Google Sheets webhook URL not configured. Please add HEYGEN_GOOGLE_SHEETS_WEBHOOK to Supabase secrets.');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting HeyGen video generation via Google Sheets + Zapier');

    // Prepare data for Google Sheets - handle both old format and new template format
    let sheetData;

    if (templateId && templateData) {
      // New template-based format
      sheetData = {
        timestamp: new Date().toISOString(),
        template_id: templateId,
        instruction: instruction || `Template-based video creation using ${templateId}`,
        
        // Raw extracted data
        raw_product_name: templateData.extracted?.productName || "",
        raw_product_price: templateData.extracted?.productPrice || "",
        raw_product_discount: templateData.extracted?.productDiscount || "",
        raw_category_name: templateData.extracted?.categoryName || "",
        raw_feature_one: templateData.extracted?.featureOne || "",
        raw_feature_two: templateData.extracted?.featureTwo || "",
        raw_feature_three: templateData.extracted?.featureThree || "",
        raw_website_description: templateData.extracted?.websiteDescription || "",
        raw_product_image: templateData.extracted?.productImage || "",

        // AI suggested data
        ai_product_name: templateData.aiSuggested?.productName || "",
        ai_product_price: templateData.aiSuggested?.productPrice || "",
        ai_product_discount: templateData.aiSuggested?.productDiscount || "",
        ai_category_name: templateData.aiSuggested?.categoryName || "",
        ai_feature_one: templateData.aiSuggested?.featureOne || "",
        ai_feature_two: templateData.aiSuggested?.featureTwo || "",
        ai_feature_three: templateData.aiSuggested?.featureThree || "",
        ai_website_description: templateData.aiSuggested?.websiteDescription || "",
        ai_product_image: templateData.aiSuggested?.productImage || "",

        // User improved final data
        final_product_name: templateData.userImproved?.productName || "",
        final_product_price: templateData.userImproved?.productPrice || "",
        final_product_discount: templateData.userImproved?.productDiscount || "",
        final_category_name: templateData.userImproved?.categoryName || "",
        final_feature_one: templateData.userImproved?.featureOne || "",
        final_feature_two: templateData.userImproved?.featureTwo || "",
        final_feature_three: templateData.userImproved?.featureThree || "",
        final_website_description: templateData.userImproved?.websiteDescription || "",
        final_product_image: templateData.userImproved?.productImage || "",

        status: "pending",
        source: "feedgenerator_template_utility"
      };
    } else {
      // Legacy format for backward compatibility
      sheetData = {
        timestamp: new Date().toISOString(),
        instruction: instruction,
        product_name: productInfo?.name || "Premium Wireless Headphones",
        product_description: productInfo?.description || "High-quality audio experience with noise cancellation",
        image_url: imageUrl || "",
        status: "pending",
        source: "feedgenerator_app"
      };
    }

    console.log('Sending data to Google Sheets:', sheetData);

    // Post to Google Sheets via webhook/Zapier
    const response = await fetch(googleSheetsWebhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sheetData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to post to Google Sheets: ${response.status} - ${errorText}`);
    }

    // Generate a placeholder video URL for immediate feedback
    const placeholderVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    
    // Store in database with pending status
    const { data: asset, error: dbError } = await supabase
      .from('generated_assets')
      .insert({
        channel: 'youtube',
        format: 'mp4',
        source_system: templateId ? 'heygen_template_zapier' : 'heygen_zapier',
        asset_type: 'video',
        url: placeholderVideoUrl,
        instruction: instruction || 'Template-based video generation',
        approved: false
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log('HeyGen video generation request sent to Google Sheets successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      asset_url: placeholderVideoUrl,
      asset_id: asset.id,
      type: 'video',
      message: templateId 
        ? 'Template-based video generation request sent to Google Sheets. HeyGen will process via Zapier automation.'
        : 'Video generation request sent to Google Sheets. HeyGen will process via Zapier automation.',
      template_id: templateId,
      sheets_data: sheetData
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
