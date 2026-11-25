/**
 * Three record checks that sit beside the clocks:
 *  - bylaw terms: is the quote on the page, does it state the number, and is
 *    the number consistent with the statute;
 *  - committee records: where each one is kept and who a draft sends it to
 *    (Evid. Code § 1157);
 *  - district board agenda wording for a closed-session hearing
 *    (Health & Saf. Code § 32155; Gov. Code § 54954.5(h)).
 * None of these decides a privilege or Brown Act question. They point at the
 * places an attorney should look.
 */
import type { BylawValues } from './clock';
import { AGENDA, BYLAWS, BYLAW_TERMS, COMMITTEES, COMMITTEE_FOLDERS, DRAFTS, PEOPLE, RECORDS, type AgendaItem, type BylawTerm, type Draft, type FileRecord } from './hospital';
import type { PeerValues } from './params';

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
export const person = (id: string) => PEOPLE.find((x) => x.id === id)!;
export const committee = (id: string) => COMMITTEES.find((x) => x.id === id)!;
export const record = (id: string) => RECORDS.find((x) => x.id === id)!;

// ------------------------------------------------------------------- bylaws

export type BylawOutcome = 'consistent' | 'conflict' | 'bylaws-only' | 'rejected';
export interface BylawFinding { term: BylawTerm; quoteFound: boolean; numberInQuote: boolean; outcome: BylawOutcome; detail: string }

export function bylawFinding(t: BylawTerm, p: PeerValues): BylawFinding {
  const page = BYLAWS.pages.find((x) => x.n === t.page);
  const quoteFound = !!page && t.quote.trim().length > 0 && norm(page.text).includes(norm(t.quote));
  const numberInQuote = new RegExp(`\\(${t.value}\\)`).test(t.quote);
  const f = (outcome: BylawOutcome, detail: string): BylawFinding => ({ term: t, quoteFound, numberInQuote, outcome, detail });
  if (!quoteFound) return f('rejected', 'The quote does not appear word for word on the cited page. Not used.');
  if (!numberInQuote) return f('rejected', `The quote does not state the number ${t.value}. Not used.`);
  if (!t.statuteParamId || !t.relation) return f('bylaws-only', `${t.cite}. The bylaw number is used as written (§ 809.6(a)).`);
  const law = Number(p[t.statuteParamId]);
  const ok = t.relation === 'equal' ? t.value === law : t.relation === 'at-most' ? t.value <= law : t.value >= law;
  if (ok) return f('consistent', `Matches ${t.cite} (${law} ${t.unit}).`);
  const want = t.relation === 'at-most' ? `no more than ${law}` : t.relation === 'at-least' ? `at least ${law}` : `${law}`;
  return f('conflict', `${t.cite} says ${want} ${t.unit}; the bylaws say ${t.value}. Bylaw hearing provisions bind only where they are not inconsistent with §§ 809.1–809.4 (§ 809.6(a)), so the clock uses the statute.`);
}

export const bylawFindings = (p: PeerValues, terms: BylawTerm[] = BYLAW_TERMS) => terms.map((t) => bylawFinding(t, p));

/** Bylaw numbers the clock may use: every term whose quote check passed. */
export function bylawValues(findings: BylawFinding[]): BylawValues {
  const out: BylawValues = {};
  for (const f of findings) if (f.outcome !== 'rejected') out[f.term.id] = f.term.value;
  return out;
}

// ----------------------------------------------------------- committee files

export type RecordOutcome = 'in-place' | 'misfiled' | 'not-committee' | 'outside';
export interface RecordFinding { record: FileRecord; outcome: RecordOutcome; detail: string }

export function recordFinding(r: FileRecord): RecordFinding {
  const inCommitteeFolder = COMMITTEE_FOLDERS.includes(r.folder);
  if (r.kind === 'committee') {
    return inCommitteeFolder
      ? { record: r, outcome: 'in-place', detail: `A record of the ${committee(r.committeeId!).name}, kept in the committee's folder.` }
      : { record: r, outcome: 'misfiled', detail: `A record of the ${committee(r.committeeId!).name}, kept in the ${r.folder} folder. § 1157 covers the records of the committee. Whether a copy held by another department keeps that protection is case law this tool has not read. Move it and ask counsel.` };
  }
  return inCommitteeFolder
    ? { record: r, outcome: 'not-committee', detail: 'Made by hospital staff in the ordinary course, not by a committee. Filing it in the committee folder does not make it a committee record under the text of § 1157. Keep the original where it belongs.' }
    : { record: r, outcome: 'outside', detail: 'An administrative record in an administrative folder. Not treated as a committee record.' };
}

export type DraftOutcome = 'clear' | 'hold' | 'review';
export interface DraftFinding { draft: Draft; outcome: DraftOutcome; outside: { personId: string; recordId: string }[]; detail: string }

/**
 * A draft is held when it sends a committee record to someone who is not a
 * member of that committee, its staff, or its counsel. The governing body is
 * sent to attorney review instead, because it has its own role in peer review
 * (Bus. & Prof. Code § 809.05).
 */
export function draftFinding(d: Draft): DraftFinding {
  const attached = d.attachments.map(record);
  const committeeRecords = attached.filter((r) => r.kind === 'committee');
  if (d.statutoryReport) {
    return { draft: d, outcome: 'clear', outside: [], detail: 'The report § 805 requires. Reporting does not waive the confidentiality of medical records and committee reports (§ 805(g)).' };
  }
  if (!committeeRecords.length) return { draft: d, outcome: 'clear', outside: [], detail: 'No committee record attached.' };
  const outside: DraftFinding['outside'] = [];
  for (const r of committeeRecords) {
    const c = committee(r.committeeId!);
    for (const id of d.to) if (!c.members.includes(id) && !c.staff.includes(id)) outside.push({ personId: id, recordId: r.id });
  }
  if (!outside.length) return { draft: d, outcome: 'clear', outside, detail: 'Every recipient is a member of the committee, its staff, or its counsel.' };
  const names = [...new Set(outside.map((o) => person(o.personId).name))].join(', ');
  if (outside.every((o) => person(o.personId).group === 'governing-body')) {
    return { draft: d, outcome: 'review', outside, detail: `Sends a committee record to the ${names}. The governing body has a role in peer review (§ 809.05), but how and when it receives committee records is for counsel.` };
  }
  return { draft: d, outcome: 'hold', outside, detail: `Sends a committee record to ${names}, who ${outside.length === 1 ? 'is' : 'are'} not on the committee. Check with counsel before sending, or send a version without the committee record.` };
}

export const recordFindings = () => RECORDS.map(recordFinding);
export const draftFindings = () => DRAFTS.map(draftFinding);

// ------------------------------------------------------------- board agenda

export type AgendaOutcome = 'matches' | 'review' | 'public';
export interface AgendaFinding { item: AgendaItem; outcome: AgendaOutcome; detail: string }

/** The subjects Gov. Code § 54954.5(h) lists for a "HEARINGS" closed-session item. */
export const AGENDA_SUBJECTS = ['staff privileges', 'report of medical audit committee', 'report of quality assurance committee'];

export function agendaFinding(a: AgendaItem): AgendaFinding {
  const t = norm(a.text);
  const heading = /\bhearings\b/.test(t);
  const subject = t.includes('subject matter') && AGENDA_SUBJECTS.some((s) => t.includes(s));
  if (a.publicHearingRequested) {
    return { item: a, outcome: 'public', detail: 'The member whose privileges are the subject asked for a public hearing. Under § 32155 the hearing is then not held in closed session; the board\'s deliberations still may be.' };
  }
  if (heading && subject) return { item: a, outcome: 'matches', detail: 'Uses the "HEARINGS" heading and states the subject matter, as § 54954.5(h) describes.' };
  const missing = [!heading && 'the "HEARINGS" heading', !subject && 'a subject matter (staff privileges, medical audit committee report, or quality assurance committee report)'].filter(Boolean).join(' and ');
  return { item: a, outcome: 'review', detail: `Missing ${missing}. § 54954.5 asks for substantial compliance, so this goes to counsel. The suggested wording also does not name the practitioner.` };
}

export const agendaFindings = () => AGENDA.map(agendaFinding);
