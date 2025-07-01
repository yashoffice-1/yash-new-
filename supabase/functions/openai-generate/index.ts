import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      type, 
      instruction, 
      productInfo, 
      context,
      fieldName,
      currentValue,
      constraint,
      formatSpecs 
    } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    let systemPrompt = '';
    let userPrompt = '';

    switch (type) {
      case 'improve-template-field':
        systemPrompt = `You are an expert copywriter specializing in product marketing and template optimization. 
        Your task is to improve template field content while strictly adhering to character limits and field purposes.
        
        CRITICAL RULES:
        1. NEVER exceed the character limit specified
        2. Keep the core meaning and key information
        3. Make the content more compelling and marketing-focused
        4. Use action words and emotional triggers when appropriate
        5. Maintain factual accuracy about the product
        6. Optimize for the specific field purpose`;

        userPrompt = `Improve this template field content:

Field: ${fieldName}
Purpose: ${constraint?.description || 'General field'}
Character Limit: ${constraint?.maxLength || 'Not specified'}
Current Content: "${currentValue}"

Product Context:
- Name: ${productInfo?.name || 'N/A'}
- Category: ${productInfo?.category || 'N/A'}
- Brand: ${productInfo?.brand || 'N/A'}
- Price: ${productInfo?.price ? `$${productInfo.price}` : 'N/A'}
- Description: ${productInfo?.description || 'N/A'}

Requirements:
- Stay within ${constraint?.maxLength || 100} characters
- Make it more compelling and marketing-focused
- Keep all factual information accurate
- Optimize for ${fieldName.replace('_', ' ')} field purpose
- Return ONLY the improved content, no explanations`;
        break;

      case 'marketing-suggestions':
        systemPrompt = `You are a marketing expert who generates compelling, platform-specific content suggestions. 
        Create engaging suggestions that are optimized for the specific channel and format.`;
        
        userPrompt = `Generate 3 marketing content suggestions for:
        Product: ${productInfo?.name}
        Channel: ${context?.channel || 'general'}
        Format: ${context?.format || 'general'}
        
        Make suggestions compelling, platform-appropriate, and action-oriented.`;
        break;

      case 'clean-instruction':
        systemPrompt = `You are a professional content editor. Clean up and improve the given instruction while maintaining its core intent and making it more effective for AI generation.`;
        
        userPrompt = `Clean and improve this instruction: "${instruction}"
        
        Context: ${JSON.stringify(context)}
        
        Make it clearer, more specific, and better structured for AI content generation.`;
        break;

      case 'marketing-content':
        systemPrompt = `You are a professional marketing copywriter. Create compelling, engaging content optimized for the specified format and platform.`;
        
        userPrompt = `Create marketing content with these specifications:
        Instruction: ${instruction}
        Product: ${JSON.stringify(productInfo)}
        Format Specs: ${JSON.stringify(formatSpecs)}
        
        Make it compelling, platform-appropriate, and conversion-focused.`;
        break;

      default:
        throw new Error(`Unknown generation type: ${type}`);
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
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const data = await response.json();
    const result = data.choices[0]?.message?.content?.trim();

    if (!result) {
      throw new Error('No content generated from OpenAI');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      result 
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
