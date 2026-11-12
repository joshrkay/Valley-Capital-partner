// The only file that talks to the Anthropic API, through the official SDK. Everything else takes a `client`, so tests pass a fake.

export async function makeClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set. Add it as a repository secret, or export it to run locally.');
  const { default: Anthropic } = await import('@anthropic-ai/sdk');   // imported here so the listener and the tests do not need it
  return new Anthropic({ maxRetries: 3, timeout: 180000 });             // the key is read from the environment
}

// Untrusted data goes into the prompt as JSON with "<" escaped, so it cannot close the tag that wraps it.
export const neutralize = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function estimateCost(usage, price) {
  if (!price || !usage) return null;
  const input = (usage.input_tokens ?? 0) + 1.25 * (usage.cache_creation_input_tokens ?? 0) + 0.1 * (usage.cache_read_input_tokens ?? 0);
  return (input * price.in + (usage.output_tokens ?? 0) * price.out) / 1e6;
}

export const addUsage = (a, b) => {
  const out = { ...a };
  for (const k of ['input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens']) out[k] = (a?.[k] ?? 0) + (b?.[k] ?? 0);
  return out;
};

// One structured request. Never throws: returns { ok: false, reason } for an API error, a refusal, a cut-off reply, or bad JSON.
// cfg: { model, effort, maxTokens, fallbacks? }. No temperature or thinking settings are sent: these models reject non-default values.
export async function callJson({ client, cfg, system, messages, schema }) {
  const params = {
    model: cfg.model,
    max_tokens: cfg.maxTokens,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
    output_config: { effort: cfg.effort, format: { type: 'json_schema', schema } },
  };
  let res;
  try {
    res = cfg.fallbacks
      ? await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: cfg.fallbacks })
      : await client.messages.create(params);
  } catch (e) {
    return { ok: false, reason: 'api_error', detail: `${e?.status ?? ''} ${String(e?.message ?? e).slice(0, 200)}`.trim() };
  }
  const usage = res?.usage ?? {};
  if (res?.stop_reason === 'refusal') return { ok: false, reason: 'refusal', detail: res.stop_details?.category ?? '', usage };
  if (res?.stop_reason === 'max_tokens') return { ok: false, reason: 'max_tokens', usage };
  const text = (res?.content ?? []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  try {
    return { ok: true, data: JSON.parse(text), text, usage, model: res.model ?? cfg.model };
  } catch {
    return { ok: false, reason: 'invalid_json', usage };
  }
}
