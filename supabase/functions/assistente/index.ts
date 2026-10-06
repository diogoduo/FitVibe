/**
 * FitVibe — assistente: ponte entre o app e o Gemini.
 *
 * A chave do Gemini fica só aqui (Edge Functions → Secrets → GEMINI_API_KEY), nunca no app.
 * As instruções e o formato da resposta vêm do app, então esta função quase nunca muda.
 * Só quem está logado no FitVibe consegue usar.
 *
 * Pedido (POST, JSON):
 *   { model?, system, input: [{ type: 'text', text } | { type: 'audio', data, mime_type }],
 *     schema?, thinking? }
 * Resposta: { text, model } ou { error, detail? }.
 */

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/interactions';

/** O primeiro é o padrão. Trocar aqui quando o Google mudar os modelos grátis. */
const MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash'];
const THINKING = ['minimal', 'low', 'medium', 'high'];

/** ~4 MB de áudio em base64: bem mais que uma fala de 1 minuto. */
const MAX_BODY = 6_000_000;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

type Part = { type: 'text'; text: string } | { type: 'audio'; data: string; mime_type: string };

function isPart(value: unknown): value is Part {
  if (!value || typeof value !== 'object') return false;
  const part = value as Record<string, unknown>;
  if (part.type === 'text') return typeof part.text === 'string';
  if (part.type === 'audio') {
    return (
      typeof part.data === 'string' &&
      typeof part.mime_type === 'string' &&
      part.mime_type.startsWith('audio/')
    );
  }
  return false;
}

/** O texto gerado, em qualquer um dos formatos de resposta da API. */
function extractText(data: any): string {
  const texts: string[] = [];
  for (const step of data?.steps ?? []) {
    if (step?.type !== 'model_output') continue;
    for (const content of step.content ?? []) {
      if (content?.type === 'text' && typeof content.text === 'string') texts.push(content.text);
    }
  }
  if (texts.length === 0) {
    for (const output of data?.outputs ?? []) {
      if (output?.type === 'text' && typeof output.text === 'string') texts.push(output.text);
    }
  }
  if (texts.length === 0 && typeof data?.output_text === 'string') texts.push(data.output_text);
  return texts.join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  // Quem chama precisa estar logado: o próprio Supabase confere o token.
  const user = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/user`, {
    headers: {
      Authorization: req.headers.get('Authorization') ?? '',
      apikey: req.headers.get('apikey') ?? '',
    },
  });
  if (!user.ok) return json({ error: 'auth' }, 401);

  const key = Deno.env.get('GEMINI_API_KEY');
  if (!key) return json({ error: 'no_key' }, 500);

  const raw = await req.text();
  if (raw.length > MAX_BODY) return json({ error: 'too_big' }, 413);
  let body: any;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad_request' }, 400);
  }

  const input = Array.isArray(body?.input) ? body.input.filter(isPart).slice(0, 4) : [];
  if (input.length === 0 || typeof body.system !== 'string') {
    return json({ error: 'bad_request' }, 400);
  }
  const model = MODELS.includes(body.model) ? body.model : MODELS[0];

  const request: Record<string, unknown> = {
    model,
    input,
    system_instruction: body.system,
    store: false,
  };
  if (body.schema && typeof body.schema === 'object') {
    request.response_format = { type: 'text', mime_type: 'application/json', schema: body.schema };
  }
  if (THINKING.includes(body.thinking)) {
    request.generation_config = { thinking_level: body.thinking };
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify(request),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return json(
      {
        error: response.status === 429 ? 'limit' : 'gemini',
        status: response.status,
        detail: String(data?.error?.message ?? '').slice(0, 500),
      },
      502,
    );
  }

  const text = extractText(data);
  if (!text) return json({ error: 'empty', detail: JSON.stringify(data).slice(0, 500) }, 502);
  return json({ text, model });
});
