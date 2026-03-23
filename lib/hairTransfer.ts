/**
 * Tressana Hair Transfer Pipeline - Fast & Cheap (Flux Schnell)
 *
 * Step 1: LLaVA → describes reference hairstyle
 * Step 2: Flux Schnell → fast generation with strict copy prompt
 */

const REPLICATE_TOKEN = process.env.EXPO_PUBLIC_REPLICATE_TOKEN || '';

// ─── Step 1: Describe hairstyle using LLaVA ────────────────────────
async function describeHairstyle(base64Image: string): Promise<string> {
  if (!REPLICATE_TOKEN) throw new Error('Replicate token missing in .env');

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${REPLICATE_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'yorickvp/llava-13b:80537f9eead1a5bfa72d5ac6ea6414379be41d4d4f6679fd776e9535d1eb58bb',
      input: {
        image: `data:image/jpeg;base64,${base64Image}`,
        prompt: `Describe ONLY the hairstyle in this image in one detailed sentence. 
Include: hair length (short/medium/long), texture (straight/wavy/curly/coily), color, 
volume, parting, and any distinctive features like bangs, layers, braids, highlights, 
or curls. Do NOT describe the person's face, skin, clothes, background, or anything else. 
Be very precise and detailed.`,
        max_tokens: 150,
      },
    }),
  });

  if (!response.ok) throw new Error('Failed to analyse reference image');

  const prediction = await response.json();
  let result: string | undefined;

  for (let i = 0; i < 40; i++) {
    const poll = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = await poll.json();

    if (data.status === 'succeeded') {
      result = Array.isArray(data.output) ? data.output.join(' ').trim() : data.output?.trim();
      break;
    }
    await new Promise(r => setTimeout(r, 2500));
  }

  if (!result) throw new Error('Description timed out');
  return result;
}

// ─── Step 2: Generate with Flux Schnell (fast + strict copy) ────────────────
async function generateWithFlux(base64Selfie: string, hairstyleDescription: string): Promise<string> {
  if (!REPLICATE_TOKEN) throw new Error('Replicate token missing');

  const prompt = `Strictly and literally transfer the hairstyle from the reference exactly as described: ${hairstyleDescription}. 
Copy EVERY single detail: exact length, curl pattern/texture, color, volume, parting, bangs/layers/braids — do NOT smooth, wave, straighten, shorten, lengthen, or change anything about the hair. 
Do NOT add or invent any new hair features. 
Keep the face, eyes, skin tone, expression, clothing, pose, lighting, and background 100% unchanged. 
Photorealistic hairstyle copy only — no AI stylization.`;

  let createRes;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    createRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${REPLICATE_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        version: 'black-forest-labs/flux-schnell',
        input: {
          prompt,
          input_image: `data:image/jpeg;base64,${base64Selfie}`,
          guidance_scale: 1.0,      // low = more literal / less creative interpretation
          aspect_ratio: '1:1',
        },
      }),
    });

    if (createRes.status === 429) {
      console.log(`Rate limited - waiting 15s (attempt ${attempts + 1}/${maxAttempts})...`);
      await new Promise(r => setTimeout(r, 15000));
      attempts++;
      continue;
    }

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({}));
      console.error('Flux error:', createRes.status, err);
      throw new Error(`Flux failed: ${createRes.status}`);
    }

    break;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Rate limit retries exhausted. Add credit or wait longer.');
  }

  const prediction = await createRes.json();

  if (prediction.status === 'succeeded' && prediction.output) {
    return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  }

  if (prediction.urls?.get) {
    return await pollReplicate(prediction.urls.get);
  }

  throw new Error('Unexpected Flux response');
}

// ─── Poll Replicate ──────────────────────────────────────────────
async function pollReplicate(getUrl: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const res = await fetch(getUrl, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });

    if (!res.ok) {
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    const data = await res.json();

    if (data.status === 'succeeded') {
      const output = data.output;
      return Array.isArray(output) ? output[0] : output;
    }

    if (data.status === 'failed' || data.status === 'canceled') {
      throw new Error(data.error || 'Generation failed');
    }

    await new Promise(r => setTimeout(r, 3000));
  }

  throw new Error('Generation timed out');
}

// ─── Main export ─────────────────────────────────────────────────
export async function transferHairstyle(
  selfieBase64: string,
  referenceBase64: string,
  onProgress?: (status: string) => void,
): Promise<string> {
  try {
    onProgress?.('Analyzing reference hairstyle...');
    const description = await describeHairstyle(referenceBase64);
    console.log('Description:', description);

    onProgress?.('Generating new look (Flux Schnell)...');
    const resultUrl = await generateWithFlux(selfieBase64, description);

    onProgress?.('Done!');
    return resultUrl;
  } catch (error: any) {
    console.error('Hair transfer error:', error);
    throw new Error(error.message || 'Hair transfer failed. Please try again.');
  }
}