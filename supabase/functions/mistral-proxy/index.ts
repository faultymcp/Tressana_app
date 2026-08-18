// supabase/functions/mistral-proxy/index.ts
// Authenticates the caller, forwards the chat to Mistral, returns { reply }.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing authorization' }, 401);

  // Verify the caller is a signed-in Supabase user.
  const userRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      Authorization: authHeader,
      apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    },
  });
  if (!userRes.ok) return json({ error: 'Invalid session' }, 401);

  const apiKey = Deno.env.get('MISTRAL_API_KEY');
  if (!apiKey) return json({ error: 'MISTRAL_API_KEY not set' }, 500);

  let system: string;
  let messages: { role: string; content: string }[];
  try {
    const body = await req.json();
    system = body.system ?? '';
    messages = Array.isArray(body.messages) ? body.messages : [];
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (messages.length === 0) return json({ error: 'No messages' }, 400);

  const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      max_tokens: 700,
      temperature: 0.6,
      messages: [{ role: 'system', content: system }, ...messages],
    }),
  });

  if (mistralRes.status === 429) return json({ error: 'Rate limited' }, 429);

  if (!mistralRes.ok) {
    const detail = await mistralRes.text();
    console.error('Mistral error', mistralRes.status, detail);
    return json({ error: 'Upstream error' }, 502);
  }

  const data = await mistralRes.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) return json({ error: 'Empty reply' }, 502);

  return json({ reply });
});