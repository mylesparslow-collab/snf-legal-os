// Run the bounded extraction step once against the synthetic deal documents and
// record the model's raw candidates. The app replays this file and verifies
// every candidate in code; it never trusts the model's output directly.
//
//   GEMINI_API_KEY=... node --experimental-strip-types scripts/extract.ts
//
// Writes src/compiler/extraction.recorded.json.
import { writeFileSync } from 'node:fs';
import { DOCS, NODES } from '../src/compiler/deal.ts';

const MODEL = process.env.MODEL ?? 'gemini-flash-latest';
const key = process.env.GEMINI_API_KEY ?? 'unset';

const prompt = `You extract ownership and control facts from deal documents for a California skilled nursing facility acquisition.
Return JSON only: {"candidates":[...]}. Each candidate:
{"kind":"ownership"|"role"|"control","holder":"<exact entity name>","of":"<exact entity name>","pct":"<plain decimal, ownership only, else null>","role":"<short role, else null>","docId":"<id>","page":<n>,"quote":"<verbatim text copied from that page that states the fact>"}
Rules:
- Use entity names exactly as in this list: ${NODES.filter((n) => n.kind !== 'Pool').map((n) => n.name).join('; ')}.
- Copy quotes character for character from the page. Do not paraphrase. Keep each quote to one or two sentences.
- Report every ownership percentage, manager, special member, general partner, officer, director, trustee, management company, landlord, consultant, and any veto or consent right.
- Do not compute indirect ownership or apply any legal test.

Documents:
${DOCS.map((d) => d.pages.map((p) => `[docId=${d.id} page=${p.n}] ${d.title}\n${p.text}`).join('\n\n')).join('\n\n')}`;

const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
  body: JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 },
  }),
});
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const body = await res.json();
const text: string = body.candidates[0].content.parts.map((p: { text?: string }) => p.text ?? '').join('');
const parsed = JSON.parse(text);
const out = { model: body.modelVersion ?? MODEL, recordedAt: new Date().toISOString().slice(0, 10), candidates: parsed.candidates };
writeFileSync(new URL('../src/compiler/extraction.recorded.json', import.meta.url), JSON.stringify(out, null, 2) + '\n');
console.log(`recorded ${out.candidates.length} candidates from ${out.model}`);
