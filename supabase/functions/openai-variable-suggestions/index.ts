import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product, templateVariables } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a more detailed prompt for generating variable suggestions
    const prompt = `
You are a professional marketing copywriter creating video content for e-commerce products. Based on the product information below, generate compelling, marketing-friendly values for each video template variable.

Product Information:
- Name: ${product.name}
- Brand: ${product.brand || 'Unknown'}
- Category: ${product.category || 'Unknown'}  
- Price: ${product.price ? `$${product.price}` : 'Unknown'}
- Description: ${product.description || 'No description available'}
- Images: ${product.images ? product.images.slice(0, 1).join(', ') : 'No images'}

Template Variables to fill:
${templateVariables.map((variable: string) => `- ${variable}`).join('\n')}

Guidelines:
- For product_name: Use a compelling, marketing version of the product name
- For product_price: Format as currency (e.g., "$199.99")  
- For product_discount: Create attractive discount text (e.g., "20% Off Limited Time")
- For category_name: Use market-friendly category names
- For features: Extract key benefits and features from the description
- For website_description: Create a compelling product description for video
- For product_image: Use the first product image URL if available

Keep each value concise but compelling (under 100 characters for most fields, longer for descriptions).
Return ONLY a valid JSON object with variable names as keys and suggested values as values.

Example:
{
  "product_name": "Professional Grade Security Lock Set",
  "product_price": "$348.99",
  "product_discount": "19% Off Limited Time",
  "category_name": "Security & Access Control",
  "feature_one": "Grade 1 Commercial Security",
  "feature_two": "Satin Chrome Finish",
  "feature_three": "Keypad Entry System",
  "website_description": "Premium trilogy keypad lever set with commercial-grade security and elegant satin chrome finish",
  "product_image": "${product.images?.[0] || ''}"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a marketing copywriter that creates concise, compelling video content. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    // Parse the JSON response
    let suggestions;
    try {
      suggestions = JSON.parse(generatedContent);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', generatedContent);
      // Fallback to basic suggestions if JSON parsing fails
      suggestions = {};
      templateVariables.forEach((variable: string) => {
        if (variable.toLowerCase().includes('product') && variable.toLowerCase().includes('name')) {
          suggestions[variable] = product.name;
        } else if (variable.toLowerCase().includes('brand')) {
          suggestions[variable] = product.brand || 'Your Brand';
        } else if (variable.toLowerCase().includes('price')) {
          suggestions[variable] = product.price ? `$${product.price}` : '$99.99';
        } else if (variable.toLowerCase().includes('category')) {
          suggestions[variable] = product.category || 'Premium Product';
        } else {
          suggestions[variable] = `Enter ${variable.replace(/_/g, ' ')}`;
        }
      });
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in openai-variable-suggestions function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});