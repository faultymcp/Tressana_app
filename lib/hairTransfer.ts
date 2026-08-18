/**
 * Tressie Hair Transfer Pipeline - Simplified Version
 *
 * Direct transfer using Nano Banana Pro (selfie + reference image)
 * No separate description step needed
 */

const REPLICATE_TOKEN = process.env.EXPO_PUBLIC_REPLICATE_TOKEN || '';

// ─── Main Hair Transfer Function ─────────────────────────────────────
export async function transferHairstyle(
  selfieBase64: string,
  referenceBase64: string,
  onProgress?: (status: string) => void,
): Promise<string> {
  if (!REPLICATE_TOKEN) {
    throw new Error('Replicate token not set. Add EXPO_PUBLIC_REPLICATE_TOKEN to .env');
  }

  onProgress?.('Transferring hairstyle...');

  const prompt = `Transfer the exact hairstyle from the reference image to the person in the main photo. 
Match the color, texture, length, volume, parting, and all details perfectly. 
Do not change or reinterpret the hair. 
Keep the person's face, skin tone, expression, clothing, pose, lighting, and background completely unchanged. 
Make it look photorealistic and natural.`;

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
        version: 'google/nano-banana-pro',
        input: {
          prompt: prompt,
          image_input: [
            `data:image/jpeg;base64,${selfieBase64}`,     // Main image (selfie)
            `data:image/jpeg;base64,${referenceBase64}`,  // Reference hairstyle
          ],
          output_format: 'png',
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
      console.error('Nano Banana Pro error:', createRes.status, err);
      throw new Error(`Generation failed: ${createRes.status}`);
    }

    break;
  }

  if (attempts >= maxAttempts) {
    throw new Error('Rate limit retries exhausted. Add more credit to Replicate or wait.');
  }

  const prediction = await createRes.json();

  if (prediction.status === 'succeeded' && prediction.output) {
    return Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  }

  if (prediction.urls?.get) {
    return await pollReplicate(prediction.urls.get);
  }

  throw new Error('Unexpected response from Nano Banana Pro');
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