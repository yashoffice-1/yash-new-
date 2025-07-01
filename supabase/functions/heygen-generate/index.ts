
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.1';

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
    category?: string;
    price?: number;
    discount?: string;
  };
  templateConfig?: {
    id: string;
    name: string;
    webhookUrl: string;
    variables: string[];
  };
}

interface ProcessedProductData {
  product_name: string;
  product_price: string;
  product_discount: string;
  category_name: string;
  feature_one: string;
  feature_two: string;
  feature_three: string;
  website_description: string;
  product_image: string;
}

// Field processing functions (copied from utility for edge function)
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function extractFeaturesFromDescription(description: string): string[] {
  const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const features: string[] = [];
  
  const featureKeywords = ['feature', 'includes', 'with', 'offers', 'provides', 'equipped', 'designed'];
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length > 10 && features.length < 3) {
      const hasKeyword = featureKeywords.some(keyword => 
        trimmed.toLowerCase().includes(keyword)
      );
      
      if (hasKeyword || trimmed.length < 100) {
        features.push(truncateText(trimmed, 80));
      }
    }
  }
  
  while (features.length < 3) {
    const genericFeatures = [
      'High-quality construction',
      'User-friendly design', 
      'Premium materials'
    ];
    features.push(genericFeatures[features.length] || 'Quality assured');
  }
  
  return features;
}

function processProductForSpreadsheet(productInfo: {
  name: string;
  description?: string;
  category?: string;
  price?: number;
  discount?: string;
  imageUrl?: string;
}): ProcessedProductData {
  const description = productInfo.description || productInfo.name;
  const features = extractFeaturesFromDescription(description);
  
  let discount = productInfo.discount || '0%';
  if (!productInfo.discount && productInfo.price) {
    const discountPercentage = Math.floor(Math.random() * 20) + 5;
    discount = `${discountPercentage}%`;
  }
  
  return {
    product_name: truncateText(productInfo.name, 81),
    product_price: productInfo.price ? `$${productInfo.price}` : '$99.99',
    product_discount: discount,
    category_name: truncateText(productInfo.category || 'Electronics', 150),
    feature_one: truncateText(features[0] || 'Premium quality', 80),
    feature_two: truncateText(features[1] || 'Advanced technology', 80),
    feature_three: truncateText(features[2] || 'User-friendly design', 80),
    website_description: truncateText(description, 22),
    product_image: productInfo.imageUrl || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { instruction, imageUrl, productInfo, templateConfig }: HeyGenRequest = await req.json();

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use default webhook if no template is provided
    const webhookUrl = templateConfig?.webhookUrl || 'https://hooks.zapier.com/hooks/catch/23139889/ube0vsx/';
    const templateName = templateConfig?.name || 'Default Template';

    console.log(`Starting HeyGen video generation using template: ${templateName}`);
    console.log('Webhook URL:', webhookUrl);

    // Process product data with field constraints
    const defaultProduct = {
      name: "Premium Wireless Headphones",
      description: "Experience superior sound quality with our premium wireless headphones. Features advanced noise cancellation technology, comfortable over-ear design, and up to 30 hours of battery life. Perfect for music lovers and professionals.",
      category: "Electronics",
      price: 199,
      discount: "15%"
    };

    const productData = processProductForSpreadsheet({
      name: productInfo?.name || defaultProduct.name,
      description: productInfo?.description || defaultProduct.description,
      category: productInfo?.category || defaultProduct.category,
      price: productInfo?.price || defaultProduct.price,
      discount: productInfo?.discount || defaultProduct.discount,
      imageUrl: imageUrl
    });

    console.log('Processed product data with constraints:', productData);

    // Validate field lengths
    const validation = {
      product_name: productData.product_name.length <= 81,
      category_name: productData.category_name.length <= 150,
      feature_one: productData.feature_one.length <= 80,
      feature_two: productData.feature_two.length <= 80,
      feature_three: productData.feature_three.length <= 80,
      website_description: productData.website_description.length <= 22
    };

    console.log('Field validation results:', validation);

    // Create webhook payload with ACTUAL VALUES - FIXED
    const webhookData = {
      timestamp: new Date().toISOString(),
      instruction: instruction,
      status: "pending",
      source: "feedgenerator_app",
      request_id: crypto.randomUUID(),
      template_id: templateConfig?.id || 'default',
      template_name: templateName,
      // CRITICAL FIX: Send actual processed values, not field names
      product_name: productData.product_name,           // Actual value like "Premium Wireless Headphones"
      product_price: productData.product_price,         // Actual value like "$199"  
      product_discount: productData.product_discount,   // Actual value like "15%"
      category_name: productData.category_name,         // Actual value like "Electronics"
      feature_one: productData.feature_one,             // Actual extracted feature
      feature_two: productData.feature_two,             // Actual extracted feature
      feature_three: productData.feature_three,         // Actual extracted feature
      website_description: productData.website_description, // Actual truncated description
      product_image: productData.product_image          // Actual image URL
    };

    console.log('=== WEBHOOK DATA BEING SENT ===');
    console.log('Template:', templateName);
    console.log('Webhook URL:', webhookUrl);
    console.log('Data payload:', JSON.stringify(webhookData, null, 2));

    // Post to Zapier webhook
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Zapier webhook error:', response.status, errorText);
      throw new Error(`Failed to trigger Zapier webhook: ${response.status} - ${errorText}`);
    }

    console.log('✅ Successfully sent data to Zapier webhook');
    console.log('Response status:', response.status);

    // Generate a placeholder video URL for immediate feedback
    const placeholderVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    
    // Store in database
    const { data: asset, error: dbError } = await supabase
      .from('generated_assets')
      .insert({
        channel: 'youtube',
        format: 'mp4',
        source_system: 'heygen',
        asset_type: 'video',
        url: placeholderVideoUrl,
        instruction: instruction,
        approved: false
      })
      .select()
      .single();

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    console.log(`✅ HeyGen video generation request completed using template: ${templateName}`);

    return new Response(JSON.stringify({ 
      success: true, 
      asset_url: placeholderVideoUrl,
      asset_id: asset.id,
      type: 'video',
      message: `Video generation request sent using template "${templateName}". Actual product data sent to Google Sheets successfully.`,
      webhook_data: webhookData,
      request_id: webhookData.request_id,
      template_used: templateName,
      field_validation: validation,
      processed_data: productData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in heygen-generate function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
