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

    // Create a prompt for generating variable suggestions
    const prompt = `
You are helping create video marketing content. Based on the product information below, generate appropriate values for the video template variables.

Product Information:
- Name: ${product.name}
- Brand: ${product.brand || 'Unknown'}
- Category: ${product.category || 'Unknown'}
- Price: ${product.price ? `$${product.price}` : 'Unknown'}
- Description: ${product.description || 'No description available'}

Template Variables to fill:
${templateVariables.map((variable: string) => `- ${variable}`).join('\n')}

Please provide concise, marketing-friendly values for each variable. Keep values under 50 characters each.
Return your response as a JSON object with variable names as keys and suggested values as values.

Example format:
{
  "product_name": "Premium Locksmith Tool Bundle",
  "brand_name": "Original Lishi",
  "product_price": "$199.00",
  "category_name": "Professional Tools"
}
`;

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