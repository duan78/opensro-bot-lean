// L0.2 bench for the local server (LLM-ROADMAP L0). Prints a markdown table; the keeper
// copies the block into notes/llm/BENCH.md. Sequences one request at a time.
// Usage: node tools/llm/bench.mjs [--quick]
import { chat, askJson, listModels, MODEL, VISION_MODEL, BASE_URL } from './client.mjs';
import { readFileSync } from 'node:fs';

const quick = process.argv.includes('--quick');
const rows = [];
function row(test, result, note = '') {
  rows.push({ test, result, note });
  console.error(`${test}: ${result}${note ? ' — ' + note : ''}`);
}
const question = 'En trois phrases, pourquoi un bot de MMORPG doit-il garder son pathfinding deterministe plutot que de le confier a un LLM ?';

async function streamingTTFT() {
  for (const effort of ['none', 'low']) {
    const out = await chat({ messages: [{ role: 'user', content: question }], effort, maxTokens: 600, timeoutMs: 120000, stream: true });
    const tps = out.usage.completion_tokens ? Math.round(out.usage.completion_tokens / (out.ms / 1000)) : '?';
    row(`TTFT stream (${effort})`, `${out.ttftMs} ms · ${out.ms} ms total · ${out.usage.completion_tokens} tok · ~${tps} tok/s`, `finish=${out.finishReason}`);
  }
}

async function jsonValidity() {
  const schema = { type: 'object', properties: { answer: { type: 'string' }, confidence: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['answer', 'confidence'], additionalProperties: false };
  const n = quick ? 5 : 20;
  let ok = 0, worst = 0;
  for (let i = 0; i < n; i++) {
    const out = await askJson({ messages: [{ role: 'user', content: `Question ${i + 1}: reponds en une phrase (champ "answer") avec une confiance 1-5 (champ "confidence"). Sujet: ${['les potions HP', 'les giants', 'le retour en ville', 'les SoX', 'le pet'][i % 5]}.` }], schema, name: 'bench', maxTokens: 300 });
    if (out.parsed && typeof out.parsed.answer === 'string' && out.parsed.answer.length > 0) ok++;
    worst = Math.max(worst, out.ms);
  }
  row('JSON strict valide', `${ok}/${n} (${Math.round(ok / n * 100)}%)`, `pire latence ${worst} ms · effort=none`);
}

async function toolCalling() {
  // Native tool-calling reliability probe: three rounds, the model must pick the right
  // one of two tools. Per the roadmap the schema channel remains the production path.
  const tools = [
    { type: 'function', function: { name: 'set_hunt_radius', description: 'Change le rayon de chasse en metres', parameters: { type: 'object', properties: { radius: { type: 'integer', minimum: 10, maximum: 60 } }, required: ['radius'], additionalProperties: false } } },
    { type: 'function', function: { name: 'return_to_town', description: 'Termine la chasse et retourne en ville', parameters: { type: 'object', properties: { reason: { type: 'string' } }, required: ['reason'], additionalProperties: false } } },
  ];
  const asks = [
    { q: 'Mes monstres sont trop loin, mets le rayon a 40', tool: 'set_hunt_radius', arg: { radius: 40 } },
    { q: 'Mon sac est plein, rentre en ville pour vendre', tool: 'return_to_town', arg: { reason: 'bag full' } },
    { q: 'Rayon de chasse a 25 metres s il te plait', tool: 'set_hunt_radius', arg: { radius: 25 } },
  ];
  let ok = 0;
  for (const ask of asks) {
    const res = await fetch(`${(await import('./client.mjs')).BASE_URL}/v1/chat/completions`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: ask.q }], tools, tool_choice: 'auto', max_tokens: 300, reasoning_effort: 'none' }),
    });
    const data = await res.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (call?.function?.name === ask.tool) {
      try { if (JSON.parse(call.function.arguments || '{}')[Object.keys(ask.arg)[0]] === Object.values(ask.arg)[0]) ok++; } catch { /* bad json args */ }
    }
  }
  row('Tool-calling natif (3 essais)', `${ok}/3`, 'canal de production = schema JSON, cf. route §0.2');
}

async function contextProbe() {
  const filler = Array.from({ length: 400 }, (_, i) => `Fait ${i + 1}: le groupe ${i % 7} a tue ${i % 13 + 1} monstres du type ${i % 5} pendant la minute ${i}.`).join('\n');
  const promptTokens = Math.round(filler.length / 4);
  const out = await askJson({
    messages: [
      { role: 'system', content: 'Reponds uniquement par le JSON demande. Ignore le remplissage.' },
      { role: 'user', content: `${filler}\n\nQuestion: dans le "Fait 250", combien de monstres ont ete tues ? Reponds avec {"n": <entier>}.` },
    ],
    schema: { type: 'object', properties: { n: { type: 'integer' } }, required: ['n'], additionalProperties: false }, name: 'ctx', maxTokens: 300, timeoutMs: 180000,
  });
  const ok = out.parsed?.n === ((250 - 1) % 13) + 1; // Fait 250 -> i=249 -> 249%13+1 = 3.
  row('Sonde contexte (~' + Math.round(promptTokens / 1000) + 'k tokens)', ok ? 'extraction correcte' : `reponse ${JSON.stringify(out.parsed)}`, `${out.usage.prompt_tokens} tokens reels · ${out.ms} ms`);
}

async function visionProbe() {
  const image = readFileSync(new URL('./assets/sample-minimap.jpg', import.meta.url));
  const out = await chat({
    model: VISION_MODEL, effort: 'none', maxTokens: 300, timeoutMs: 120000,
    messages: [{ role: 'user', content: [
      { type: 'text', text: 'This is a 128x128 minimap tile from Silkroad Online. Answer as JSON: {"terrain": "<one word: water|desert|grass|mountain|town|mixed>", "hasPaths": <true|false>}. A blue-dominant tile is water.' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + image.toString('base64') } },
    ] }],
  });
  let parsed = null;
  try { parsed = JSON.parse(out.content.match(/\{[^}]*\}/s)?.[0] || 'null'); } catch { /* keep null */ }
  row(`Vision (${VISION_MODEL})`, parsed ? `terrain=${parsed.terrain} hasPaths=${parsed.hasPaths}` : `brut: ${out.content.slice(0, 80)}`, `${out.ms} ms`);
}

const models = await listModels();
row('Modeles servis', `${models.length} modeles`, MODEL + (models.includes(MODEL) ? '' : ' (MODELE ABSENT!)'));
await streamingTTFT();
await jsonValidity();
if (!quick) { await toolCalling(); await contextProbe(); }
await visionProbe();
console.log('\n| Test | Resultat | Note |');
console.log('|---|---|---|');
for (const r of rows) console.log(`| ${r.test} | ${r.result} | ${r.note} |`);
