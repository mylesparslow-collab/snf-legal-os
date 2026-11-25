import { DOCS, EDGES, NODES, ROLES, type DealDoc, type Edge } from './deal';

/**
 * The model's only job: propose candidate facts, each with the document, page
 * and a verbatim quote. Code then decides whether to believe it. Nothing a
 * model proposes reaches the ownership graph or the arithmetic.
 */
export interface Candidate {
  kind: 'ownership' | 'role' | 'control';
  holder: string;
  of: string;
  pct?: string | null;
  role?: string | null;
  docId: string;
  page: number;
  quote: string;
}

export type Check = { ok: boolean; label: string };

export interface Verified {
  candidate: Candidate;
  checks: Check[];
  accepted: boolean;
  holderId?: string;
  ofId?: string;
  /** What this does to the intake record. */
  match: 'confirms' | 'conflicts' | 'new' | 'rejected';
  edgeId?: string;
  note: string;
}

const norm = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

const resolve = (name: string) => {
  const x = norm(name).toLowerCase();
  return NODES.find((n) => norm(n.name).toLowerCase() === x)?.id;
};

const NUMBER_WORDS: Record<string, string> = {
  '1': 'one', '10': 'ten', '33': 'thirty-three', '35': 'thirty-five', '65': 'sixty-five', '70': 'seventy', '90': 'ninety', '100': 'one hundred',
};

/** Does the quote state this percentage? Accepts "62.5%", "(65%)" or "sixty-five percent". */
function quoteStatesPct(quote: string, pct: string): boolean {
  const q = norm(quote).toLowerCase();
  const esc = pct.replace('.', '\\.');
  if (new RegExp(`(^|[^\\d.])${esc}\\s?%`).test(q)) return true;
  const w = NUMBER_WORDS[pct];
  return !!w && q.includes(`${w} percent`);
}

export function verify(c: Candidate, docs: DealDoc[] = DOCS, edges: Edge[] = EDGES): Verified {
  const doc = docs.find((d) => d.id === c.docId);
  const page = doc?.pages.find((p) => p.n === c.page);
  const holderId = resolve(c.holder);
  const ofId = resolve(c.of);
  const checks: Check[] = [
    { ok: !!page, label: page ? `Page ${c.page} of "${doc!.title}" exists` : `No page ${c.page} in document "${c.docId}"` },
    { ok: !!page && c.quote.trim().length > 0 && norm(page.text).includes(norm(c.quote)), label: 'Quote appears word for word on that page' },
    { ok: !!holderId && !!ofId, label: holderId && ofId ? 'Both parties match entities in the record' : `Unknown party: ${!holderId ? c.holder : c.of}` },
    { ok: !!page && !!holderId && !!ofId && norm(page.text).includes(norm(c.holder)) && (norm(page.text).includes(norm(c.of)) || norm(doc!.title).includes(norm(c.of))),
      label: 'Holder is named on the page; the other party is on the page or is the document\'s subject' },
  ];
  if (c.kind === 'ownership') checks.push({ ok: !!c.pct && quoteStatesPct(c.quote, c.pct), label: c.pct ? `The quote itself states ${c.pct}%` : 'No percentage given' });
  const accepted = checks.every((x) => x.ok);
  if (!accepted) return { candidate: c, checks, accepted, holderId, ofId, match: 'rejected', note: 'Rejected. Not used anywhere.' };

  if (c.kind === 'ownership') {
    const e = edges.find((x) => x.ownerId === holderId && x.ownedId === ofId);
    if (!e) return { candidate: c, checks, accepted, holderId, ofId, match: 'new', note: 'Not in the intake record. Shown for review; not added automatically.' };
    if (e.pct === c.pct) return { candidate: c, checks, accepted, holderId, ofId, match: 'confirms', edgeId: e.id, note: `Confirms the intake figure of ${e.pct}%.` };
    return { candidate: c, checks, accepted, holderId, ofId, match: 'conflicts', edgeId: e.id, note: `Intake says ${e.pct}%; the document says ${c.pct}%. An attorney chooses.` };
  }
  const known = c.kind === 'role' && ROLES.some((r) => r.holderId === holderId && r.ofId === ofId);
  return { candidate: c, checks, accepted, holderId, ofId, match: known ? 'confirms' : 'new', note: known ? 'Matches a role in the record.' : 'Not in the intake record. Shown for review.' };
}
