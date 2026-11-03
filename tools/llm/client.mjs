// Tiny OpenAI-compatible client for the local LM Studio server (LLM-ROADMAP L0).
// One request at a time; every call is timed; reasoning_effort is the only thinking
// switch this server honours (see notes/llm/BENCH.md) and defaults to "none".
export const BASE_URL = (process.env.LMSTUDIO_URL || 'http://127.0.0.1:1234').replace(/\/+$/, '');
export const MODEL = process.env.LLM_MODEL || 'qwen/qwen3.8-27b';
export const VISION_MODEL = process.env.LLM_VISION_MODEL || 'qwen2-vl-7b-instruct';

export async function listModels(timeoutMs = 8000) {
  const res = await fetch(`${BASE_URL}/v1/models`, { signal: signal(timeoutMs) });
  if (!res.ok) throw new Error(`models: HTTP ${res.status}`);
  const data = await res.json();
  return (data.data || []).map(m => m.id);
}

export function signal(timeoutMs) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs).unref?.();
  return controller.signal;
}

// chat({ messages, effort, schema, name, maxTokens, timeoutMs, stream, model })
// Returns { content, reasoning, usage, ms, ttftMs, finishReason }.
// - effort: 'none' | 'low' | undefined (undefined = server default thinking; production
//   code must never use it — the default thinking does not terminate on open questions).
// - schema: a JSON Schema; the response is forced through it and returned parsed.
// - stream: measures time-to-first-token while collecting the same result.
export async function chat({ messages, effort = 'none', schema, name = 'reply', maxTokens = 800, timeoutMs = 60000, stream = false, model = MODEL }) {
  const body = { model, messages, max_tokens: maxTokens, temperature: 0.2 };
  if (effort) body.reasoning_effort = effort;
  if (stream) body.stream = true;
  if (schema) body.response_format = { type: 'json_schema', json_schema: { name, strict: true, schema } };
  const started = performance.now();
  const res = await fetch(`${BASE_URL}/v1/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body), signal: signal(timeoutMs),
  });
  if (!res.ok) throw new Error(`chat: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  if (!stream) {
    const data = await res.json();
    const msg = data.choices?.[0]?.message || {};
    return {
      content: msg.content || '',
      reasoning: msg.reasoning_content || '',
      parsed: schema ? JSON.parse(msg.content || 'null') : undefined,
      usage: data.usage || {}, finishReason: data.choices?.[0]?.finish_reason,
      ms: Math.round(performance.now() - started), ttftMs: null,
    };
  }
  // Streaming: measure the first token, then rebuild the full message from the chunks.
  let ttftMs = null;
  let content = '', reasoning = '', finishReason, usage = {};
  for await (const event of sse(res)) {
    if (event.usage) usage = event.usage;
    const delta = event.choices?.[0]?.delta || {};
    if (delta.content || delta.reasoning_content) {
      if (ttftMs === null) ttftMs = Math.round(performance.now() - started);
      content += delta.content || '';
      reasoning += delta.reasoning_content || '';
    }
    if (event.choices?.[0]?.finish_reason) finishReason = event.choices[0].finish_reason;
  }
  return { content, reasoning, parsed: schema ? JSON.parse(content || 'null') : undefined, usage, finishReason, ms: Math.round(performance.now() - started), ttftMs };
}

async function* sse(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let index;
    while ((index = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') return;
      try { yield JSON.parse(payload); } catch { /* partial line, ignored */ }
    }
  }
}

// Convenience: ask for a strict JSON object and return it parsed.
export async function askJson({ messages, effort = 'none', schema, name = 'reply', maxTokens = 800, timeoutMs = 60000, model }) {
  const out = await chat({ messages, effort, schema, name, maxTokens, timeoutMs, model });
  if (out.finishReason === 'length') throw new Error('length: the budget ran out before an answer (thinking did not terminate?)');
  return out;
}
