
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

${productInfo ? `Product context: ${productInfo.name} - ${productInfo.description}` : ''}

Return only the optimized instruction, no explanation.`;
    } else if (type === 'marketing-content') {
      systemPrompt = `You are a professional marketing copywriter. Create engaging marketing content based on the provided instruction. Focus on benefits, emotional appeal, and clear calls to action. Return your response in a clean, readable format.`;

      userPrompt = `Create marketing content based on this instruction: "${instruction}"

${productInfo ? `Product: ${productInfo.name} - ${productInfo.description}` : ''}

Please create:
1. A compelling headline (max 10 words)
2. Main marketing copy (2-3 sentences)
3. Call to action (max 5 words)
4. 3 relevant hashtags

Format your response as clean, readable text with clear sections - NOT as JSON. Use this format:

HEADLINE:
[Your headline here]

MARKETING COPY:
[Your marketing copy here]

CALL TO ACTION:
[Your call to action here]

HASHTAGS:
[Your hashtags here]`;
    }

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

    console.log(`OpenAI ${type} request completed successfully`);

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
