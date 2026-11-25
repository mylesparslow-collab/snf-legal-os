/**
 * MSO / friendly-PC audit engine. Pure functions over the fictional record in
 * ./deal.ts and the Compiler's ownership graph. Every number comes from
 * ./params.ts; every legal item comes from ./rules.ts.
 */
import { DOCS, EDGES, nodeName } from '../compiler/deal';
import { HUNDRED, ZERO, add, cmp, div, format, mul, parse, sum, type Q } from '../compiler/decimal';
import { edgePct, type EdgeChoice } from '../compiler/graph';
import type { ISODate } from '../domain/types';
import { ARRANGEMENTS, CLAUSES, JOC, MSO_DOCS, NPS, PARTIES, PE_STATUS, type Arrangement, type Clause, type Holding, type NpRecord } from './deal';
import { MEDICAL_CORP_LISTED, type MsoValues } from './params';
import { itemById, SB351_ITEMS } from './rules';

export const name = (id: string) => PARTIES.find((p) => p.id === id)?.name ?? nodeName(id);
const ALL_DOCS = [...MSO_DOCS, ...DOCS];
export const docTitle = (id: string) => ALL_DOCS.find((d) => d.id === id)?.title ?? id;

const norm = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();

/* ---------- Who is covered ---------- */

export type CounterpartyResult = 'pe' | 'controlled' | 'partial' | 'not-pe';

export interface Gate {
  arrangement: Arrangement;
  practiceCovered: boolean;
  practiceDetail: string;
  counterparty: CounterpartyResult;
  counterpartyDetail: string;
  /** Direct holdings of private equity entities in the counterparty, as used. */
  peHoldings: { ownerId: string; pct: Q }[];
  /** Does § 1191(a)/(c) reach the arrangement? */
  powers: 'yes' | 'no' | 'unresolved';
  /** Does § 1191(d) reach it? */
  covenants: 'yes' | 'no' | 'unresolved';
}

const isPe = (id: string) => PE_STATUS.find((p) => p.id === id)?.status === 'pe-group';

export function gate(a: Arrangement, params: MsoValues, choice: EdgeChoice = {}): Gate {
  const practice = PARTIES.find((p) => p.id === a.practiceId);
  const practiceCovered = practice?.practice === 'physician' || practice?.practice === 'dental';
  const practiceDetail = practiceCovered
    ? `${name(a.practiceId)} is a ${practice!.practice} practice doing business in California (§ 1191(a)).`
    : `SB 351 covers physician and dental practices. ${name(a.practiceId)} is a skilled nursing facility, so § 1191 does not reach this contract.`;

  const peHoldings = EDGES.filter((e) => e.ownedId === a.counterpartyId && isPe(e.ownerId)).map((e) => ({ ownerId: e.ownerId, pct: edgePct(e, choice) }));
  const total = sum(peHoldings.map((h) => h.pct));
  let counterparty: CounterpartyResult;
  let counterpartyDetail: string;
  if (isPe(a.counterpartyId)) {
    counterparty = 'pe';
    counterpartyDetail = `${name(a.counterpartyId)} is itself a private equity group (our reading of § 1190(b)).`;
  } else if (cmp(total, parse(params['sb351.control'])) > 0) {
    counterparty = 'controlled';
    counterpartyDetail = `${peHoldings.map((h) => `${name(h.ownerId)} holds ${format(h.pct)}%`).join('; ')} of ${name(a.counterpartyId)} directly. Above ${params['sb351.control']}%, we treat that as control by a private equity group (§ 1191(c)(1), (d)(1)).`;
  } else if (cmp(total, ZERO) > 0) {
    counterparty = 'partial';
    counterpartyDetail = `Private equity holds ${format(total)}% of ${name(a.counterpartyId)} directly. "Controlled ... in part" is not defined, so this stays unresolved.`;
  } else {
    counterparty = 'not-pe';
    counterpartyDetail = `${name(a.counterpartyId)} is not a private equity group or hedge fund, and none holds it directly on this record.`;
  }
  const reach = counterparty === 'not-pe' ? 'no' : counterparty === 'partial' ? 'unresolved' : 'yes';
  const powers = !practiceCovered ? 'no' : reach;
  const covenants = !practiceCovered || a.nature === 'employment' ? 'no' : reach;
  return { arrangement: a, practiceCovered, practiceDetail, counterparty, counterpartyDetail, peHoldings, powers, covenants };
}

/* ---------- Clause findings ---------- */

export type Outcome = 'void' | 'void-in-part' | 'unresolved' | 'review' | 'safe-harbor' | 'ok' | 'outside' | 'rejected';

export interface Finding {
  clause: Clause;
  outcome: Outcome;
  basis: string;
  interpretation: boolean;
  quoteFound: boolean;
}

export function quoteCheck(c: Clause): boolean {
  const page = ALL_DOCS.find((d) => d.id === c.docId)?.pages.find((p) => p.n === c.page);
  return !!page && c.quote.trim().length > 0 && norm(page.text).includes(norm(c.quote));
}

export function finding(c: Clause, g: Gate): Finding {
  const f = (outcome: Outcome, basis: string, interpretation = false): Finding => ({ clause: c, outcome, basis, interpretation, quoteFound: true });
  if (!quoteCheck(c)) return { clause: c, outcome: 'rejected', basis: 'The quote does not appear word for word on the cited page. Not used.', interpretation: false, quoteFound: false };
  const item = itemById(c.items[0]);
  const holder = c.holderId ? name(c.holderId) : '';
  const cv = c.covenant;

  if (!g.practiceCovered) return f('outside', g.practiceDetail);

  if (!cv) {
    if (g.powers === 'no') return f('outside', g.counterpartyDetail);
    if (g.powers === 'unresolved') return f('unresolved', g.counterpartyDetail);
    switch (c.authority) {
      case 'final':
        return f('void', `Gives ${holder} the power over: ${item.label.toLowerCase()} (${item.cite}). § 1191(c)(2) makes the provision void and unenforceable.`);
      case 'tie-break':
        return f('void', `The committee has ${JOC.practiceSeats} practice seats and ${JOC.managerSeats} manager seats, and ${name(JOC.tieBreaker)}'s chair breaks ties, so ${holder} decides any contested ${item.label.toLowerCase()} (${item.cite}). We read a deciding vote as control.`, true);
      case 'recommend':
        return f('safe-harbor', `${holder} only recommends; a physician approves. § 1191(h) allows help or consulting when the physician keeps final approval.`);
      default:
        return f('ok', `The clause gives ${holder || 'the manager'} no power over ${item.label.toLowerCase()} (${item.cite}).`);
    }
  }

  if (cv.kind === 'fee')
    return cv.valuationInRecord
      ? f('review', `A valuation is in the record. Confirm it supports a ${cv.pct}% fee (Bus. & Prof. Code § 650(b)).`)
      : f('unresolved', `A fee of ${cv.pct}% of collections is lawful under Bus. & Prof. Code § 650(b) only if it matches the value of the services. No valuation is in the record. This is a referral-fee statute, separate from SB 351.`);

  if (cv.kind === 'designee')
    return f('review', `${holder} picks who receives the shares, for a nominal price. SB 351 does not address this directly, and § 1191(g) keeps the corporate practice bar in place. An attorney should decide whether it gives ${holder} control the practice's physicians should hold.`, true);

  if (g.covenants === 'no') {
    const why = g.arrangement.nature === 'employment'
      ? '§ 1191(d) covers contracts for managing a practice, or buying its assets, with private equity. This is the practice\'s own employment agreement. Check it under Bus. & Prof. Code § 16600 separately (not read here).'
      : g.counterpartyDetail;
    return f('outside', why, g.arrangement.nature === 'employment');
  }
  if (g.covenants === 'unresolved') return f('unresolved', g.counterpartyDetail);

  switch (cv.kind) {
    case 'noncompete':
      return cv.saleOfBusiness
        ? f('ok', '§ 1191(d)(3)(A) keeps an otherwise enforceable sale-of-business noncompete, but it may not work as an employee noncompete. Whether this one qualifies is an attorney question.', true)
        : f('void', 'Bars a provider from competing after leaving, in a contract for managing the practice. § 1191(d)(2) makes it void.');
    case 'nondisparage':
      return f('void', 'Bars providers from commenting on quality of care and billing. § 1191(d)(1)(B) and (d)(2) make it void.');
    case 'confidentiality': {
      const missing = [
        !cv.mnpiOnly && 'it is not limited to material nonpublic information about the private equity group',
        !cv.requiredByLawCarveOut && 'it has no exception for disclosures the law requires',
        !cv.commentaryCarveOut && 'it would stop the comments § 1191(d)(1)(B) protects',
      ].filter(Boolean);
      return missing.length
        ? f('void-in-part', `§ 1191(d)(3)(B) keeps a confidentiality clause only within limits, and here ${missing.join('; ')}.`)
        : f('ok', 'Limited to material nonpublic information, with the exceptions § 1191(d)(3)(B) requires.');
    }
  }
}

export interface Audit {
  gates: Gate[];
  findings: Finding[];
}

export function audit(params: MsoValues, choice: EdgeChoice = {}): Audit {
  const gates = ARRANGEMENTS.map((a) => gate(a, params, choice));
  const findings = CLAUSES.map((c) => finding(c, gates.find((g) => g.arrangement.id === c.arrangementId)!));
  return { gates, findings };
}

/** SB 351 items down the side, documents across the top. */
export function traceMatrix(findings: Finding[]) {
  const docIds = [...new Set(CLAUSES.map((c) => c.docId))];
  const rows = SB351_ITEMS.map((item) => ({
    item,
    cells: Object.fromEntries(docIds.map((d) => [d, findings.filter((f) => f.clause.docId === d && f.clause.items.includes(item.id))])) as Record<string, Finding[]>,
  }));
  return { docIds, rows };
}

/* ---------- Cap table (Corp. Code § 13401.5) ---------- */

export interface CapRow { partyId: string; shares: Q; pct: Q; category: 'physician' | 'listed' | 'not-listed'; license: string }
export interface CapTest { id: 'listed' | 'share' | 'headcount'; ok: boolean; label: string; detail: string }

export function capTable(holdings: Holding[], params: MsoValues) {
  const total = sum(holdings.map((h) => parse(h.shares)));
  const rows: CapRow[] = holdings.map((h) => {
    const license = PARTIES.find((p) => p.id === h.partyId)?.license ?? 'none';
    const shares = parse(h.shares);
    const category = license === 'physician' ? 'physician' : (MEDICAL_CORP_LISTED as readonly string[]).includes(license) ? 'listed' : 'not-listed';
    return { partyId: h.partyId, shares, pct: div(mul(shares, HUNDRED), total), category, license };
  });
  const listed = rows.filter((r) => r.category === 'listed');
  const physicians = rows.filter((r) => r.category === 'physician').length;
  const listedPct = listed.reduce((a, r) => add(a, r.pct), ZERO);
  const cap = parse(params['mk.shareCap']);
  const allowedCount = Math.floor(physicians * Number(params['mk.headcount']));
  const notListed = rows.filter((r) => r.category === 'not-listed');
  const tests: CapTest[] = [
    { id: 'listed', ok: notListed.length === 0, label: 'Every shareholder is a physician or a licensee listed in § 13401.5(a)',
      detail: notListed.length ? `Not listed: ${notListed.map((r) => name(r.partyId)).join(', ')}.` : 'All are.' },
    { id: 'share', ok: cmp(listedPct, cap) <= 0, label: `Listed licensees hold at most ${params['mk.shareCap']}% of shares`,
      detail: `They hold ${format(listedPct)}%.` },
    { id: 'headcount', ok: listed.length <= allowedCount, label: 'Listed licensee shareholders do not outnumber physician shareholders',
      detail: listed.length <= allowedCount
        ? `${listed.length} listed licensee${listed.length === 1 ? '' : 's'}, ${physicians} physician${physicians === 1 ? '' : 's'}.`
        : `${listed.length} listed licensees but only ${physicians} physician${physicians === 1 ? '' : 's'}. Needs ${listed.length - allowedCount} more physician shareholder${listed.length - allowedCount === 1 ? '' : 's'}, or that many fewer listed licensees.` },
  ];
  return { total, rows, listedPct, tests, ok: tests.every((t) => t.ok) };
}

/* ---------- Nurse practitioners (Bus. & Prof. Code §§ 2837.103, 2837.104) ---------- */

export function addYears(d: ISODate, n: number): ISODate {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y + n, m - 1, day)).toISOString().slice(0, 10);
}

export interface NpStatus {
  np: NpRecord;
  transitionMet: boolean;
  eligible104On: ISODate;
  eligible104: boolean;
  roleOk: boolean;
  detail: string;
}

export function npStatus(np: NpRecord, today: ISODate, params: MsoValues): NpStatus {
  const transitionMet = np.transitionHours >= Number(params['np.transitionHours']) || np.transitionFteYears >= Number(params['np.transitionYears']);
  const eligible104On = addYears(np.transitionCompletedOn, Number(params['np.104Years']));
  const eligible104 = transitionMet && np.graduateDegree && today >= eligible104On;
  const needs104 = np.setting === 'outside-listed';
  const roleOk = needs104 ? eligible104 : transitionMet;
  const detail = !transitionMet
    ? 'Transition to practice not complete, so neither path is open yet.'
    : needs104
      ? eligible104
        ? `Meets the time requirement for a § 2837.104 certificate. The board must still issue it.`
        : `Needs a § 2837.104 certificate, which requires ${params['np.104Years']} years of practice after the transition. Earliest date on this record: ${eligible104On}.`
      : `Transition complete, so § 2837.103 practice without standardized procedures is open in this setting.`;
  return { np, transitionMet, eligible104On, eligible104, roleOk, detail };
}

export const npStatuses = (today: ISODate, params: MsoValues) => NPS.map((n) => npStatus(n, today, params));
