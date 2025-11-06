import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, targetLang, entityType, entityId } = await req.json();
    console.log('Translation request:', { 
      text: typeof text === 'string' ? text.substring(0, 50) : `${text.length} items`, 
      targetLang,
      entityType,
      entityId
    });

    // Initialize Supabase client for cache lookups
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check database cache first (only for Chinese to English)
    if (targetLang === 'en' && entityType && entityId) {
      const { data: cachedData } = await supabase
        .from(entityType)
        .select('name_zh, description_zh')
        .eq('id', entityId)
        .single();

      if (cachedData?.name_zh && text === cachedData.name_zh) {
        console.log('Cache hit for name translation');
        return new Response(
          JSON.stringify({ translated: cachedData.name_zh, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (cachedData?.description_zh && text === cachedData.description_zh) {
        console.log('Cache hit for description translation');
        return new Response(
          JSON.stringify({ translated: cachedData.description_zh, cached: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const isArray = Array.isArray(text);
    const textArray = isArray ? text : [text];

    const systemPrompt = targetLang === 'en'
      ? "You are a professional translator specializing in e-commerce jewelry terminology. Translate the following Simplified Chinese text to English. Maintain the tone, style, and cultural nuances. Return ONLY the translated text, no explanations."
      : "You are a professional translator specializing in e-commerce jewelry terminology. Translate the following English text to Simplified Chinese. Maintain the tone, style, and cultural nuances. Return ONLY the translated text, no explanations.";

    const userPrompt = isArray
      ? `Translate each item in this array separately and return a JSON array of translations:\n${JSON.stringify(textArray)}`
      : `Translate this text: "${textArray[0]}"`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    let translatedText = data.choices[0].message.content.trim();

    // Parse JSON array if response is array
    if (isArray) {
      try {
        const parsed = JSON.parse(translatedText);
        translatedText = Array.isArray(parsed) ? parsed : textArray;
      } catch {
        // Fallback if parsing fails
        translatedText = textArray;
      }
    }

    console.log('Translation successful');
    return new Response(
      JSON.stringify({ translated: translatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in translate function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Translation failed';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
