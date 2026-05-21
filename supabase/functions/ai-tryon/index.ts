// supabase/functions/ai-tryon/index.ts
// Proxies hair try-on requests to Replicate (Nano Banana Pro)
// Deploy: npx supabase functions deploy ai-tryon

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const REPLICATE_TOKEN = Deno.env.get('REPLICATE_API_TOKEN')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) throw new Error('Unauthorized');

    const body = await req.json();
    const { selfie_base64, reference_base64, resolution } = body;

    if (!selfie_base64 || !reference_base64) {
      throw new Error('Both selfie and reference images are required');
    }

    // Create prediction on Replicate
    const createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'f40e3af4b0d3b3a9bbf3fdbc5b1a79b228c1ee6e7fd0e8b87a8c0a0eae5a36e0', // Nano Banana Pro
        input: {
          image: `data:image/jpeg;base64,${selfie_base64}`,
          ref_image: `data:image/jpeg;base64,${reference_base64}`,
          output_format: 'png',
          output_quality: resolution === '4k' ? 100 : 80,
          width: resolution === '4k' ? 2048 : 1024,
          height: resolution === '4k' ? 2048 : 1024,
        },
      }),
    });

    const prediction = await createRes.json();

    if (prediction.error) {
      throw new Error(prediction.error);
    }

    // Poll for completion (Replicate is async)
    let output = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max

    while (attempts < maxAttempts) {
      await new Promise(r => setTimeout(r, 1000));
      attempts++;

      const statusRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: { 'Authorization': `Bearer ${REPLICATE_TOKEN}` },
      });
      const statusData = await statusRes.json();

      if (statusData.status === 'succeeded') {
        output = statusData.output;
        break;
      } else if (statusData.status === 'failed') {
        throw new Error(statusData.error || 'Generation failed');
      }
      // else still processing, continue polling
    }

    if (!output) {
      throw new Error('Generation timed out. Please try again.');
    }

    // Save to tryon_history
    const outputUrl = Array.isArray(output) ? output[0] : output;
    await supabase.from('tryon_history').insert({
      user_id: user.id,
      resolution: resolution || '4k',
      source: 'replicate',
      output_url: outputUrl,
      model_version: 'nano-banana-pro',
    });

    return new Response(JSON.stringify({
      success: true,
      output_url: outputUrl,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
