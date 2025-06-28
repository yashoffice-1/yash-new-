
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OpenAIRequest {
  type: 'clean-instruction' | 'marketing-content';
  instruction: string;
  productInfo?: {
    name: string;
    description: string;
    category?: string | null;
    brand?: string | null;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, instruction, productInfo }: OpenAIRequest = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    if (type === 'clean-instruction') {
      systemPrompt = `You are an expert marketing content specialist. Your job is to take user instructions and optimize them for AI content generation. Make the instructions clear, specific, and marketing-focused while preserving the user's original intent.

Guidelines:
- Keep the core message but make it more specific
- Add marketing angle and target audience consideration
- Ensure it's actionable for content generation
- Make it professional but engaging
- Keep it concise (under 200 words)`;

      userPrompt = `Please optimize this instruction for marketing content generation: "${instruction}"

${productInfo ? `Product context: ${productInfo.name}${productInfo.brand ? ` by ${productInfo.brand}` : ''}${productInfo.category ? ` in ${productInfo.category}` : ''}${productInfo.description ? ` - ${productInfo.description}` : ''}` : ''}

Return only the optimized instruction, no explanation.`;
    } else if (type === 'marketing-content') {
      // Detect the channel/platform from the instruction
      let platformContext = '';
      const instructionLower = instruction.toLowerCase();
      
      if (instructionLower.includes('facebook') || instructionLower.includes('fb ad')) {
        platformContext = 'Facebook advertising platform with engaging headline, benefit-focused copy, and strong CTA';
      } else if (instructionLower.includes('instagram story')) {
        platformContext = 'Instagram Story format with short, punchy text and relevant hashtags';
      } else if (instructionLower.includes('sms')) {
        platformContext = 'SMS marketing with concise message under 160 characters';
      } else if (instructionLower.includes('email')) {
        platformContext = 'Email marketing with subject line and structured body content';
      } else {
        platformContext = 'general marketing content with professional tone';
      }

      systemPrompt = `You are a professional marketing copywriter specializing in creating compelling content for different advertising channels and platforms. Create engaging marketing content that is properly formatted for the specified platform. Focus on benefits, emotional appeal, and clear calls to action.

Platform Context: ${platformContext}

Return clean, formatted text that can be used directly in marketing campaigns. Do NOT return JSON format.`;

      userPrompt = `Create marketing content based on this instruction: "${instruction}"

Product Details:
- Name: ${productInfo?.name || 'Product'}
${productInfo?.brand ? `- Brand: ${productInfo.brand}` : ''}
${productInfo?.category ? `- Category: ${productInfo.category}` : ''}
${productInfo?.description ? `- Description: ${productInfo.description}` : ''}

Please create properly formatted marketing content with:

1. HEADLINE: (compelling, attention-grabbing headline)
2. BODY TEXT: (persuasive copy highlighting benefits and features)
3. CALL TO ACTION: (clear, action-oriented CTA)
4. HASHTAGS: (3-5 relevant hashtags if appropriate for the platform)

Format your response as clean, readable text with clear sections. Use line breaks between sections for better readability.`;
    }

    console.log(`Sending to OpenAI - Type: ${type}, System: ${systemPrompt.substring(0, 100)}...`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    console.log(`OpenAI ${type} request completed successfully. Result length: ${result.length} characters`);

    return new Response(JSON.stringify({ 
      success: true, 
      result: result,
      type: type 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in openai-generate function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
