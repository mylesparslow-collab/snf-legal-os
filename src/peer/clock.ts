/**
 * Peer review clocks. Takes a matter's dated events and returns every clock
 * that is running, done, late or not yet triggered, under three sets of rules:
 * Bus. & Prof. Code §§ 805–809.5, 45 CFR Part 60 (NPDB), and the hospital's
 * bylaws. No day count is written in this file; they come from params.ts and
 * from the quote-checked bylaw terms.
 *
 * Counting choices (each one is our reading, not something the statutes say):
 *  - "Within N days after X" is X plus N calendar days.
 *  - How long something has lasted counts its first day. A suspension imposed
 *    on the 1st has lasted 15 days, and so "more than 14", on the 15th.
 *    This makes thresholds arrive a day earlier than the other reading.
 *  - A deadline that lands on a weekend or holiday is shown as counted, with
 *    an act-by date on the business day before. Whether it rolls forward is
 *    an attorney question.
 */
import { addDays, daysBetween, fmt, holidayOrWeekend } from '../domain/dates';
import type { Matter, PeerEvent } from './hospital';
import { ACTS_80501, LICENSE_RULES, type PeerValues } from './params';

export type ClockGroup = 'Summary suspension' | 'State report' | 'Federal report' | 'Hearing';
export type ClockStatus =
  | 'done' // happened on or before the counted date
  | 'late' // happened after it
  | 'overdue' // counted date has passed and nothing is recorded
  | 'open' // running
  | 'upcoming' // will start running on a known date if nothing changes
  | 'waiting' // depends on an event that has no date yet
  | 'not-triggered'
  | 'not-required'
  | 'conflict' // a scheduled date is outside the statutory limit
  | 'unresolved';

export interface Clock {
  id: string;
  matterId: string;
  group: ClockGroup;
  label: string;
  cite: string;
  paramIds: string[];
  /** The date the count starts from. */
  trigger?: string;
  /** Trigger plus the day count, before any weekend or holiday adjustment. */
  counted?: string;
  /** Counted date, moved to the business day before when it is a weekend or holiday. */
  actBy?: string;
  moved?: string;
  doneOn?: string;
  status: ClockStatus;
  detail: string;
  interpretation: boolean;
  daysLeft?: number;
}

export type BylawValues = Partial<Record<'ratify' | 'hearingRequest' | 'hearingStart' | 'witness' | 'appeal', number>>;

// ---------------------------------------------------------------- date help

export function prevBusiness(d: string): { date: string; moved?: string } {
  let x = d;
  const reasons: string[] = [];
  for (let why = holidayOrWeekend(x); why; why = holidayOrWeekend(x)) {
    reasons.push(`${fmt(x)} is ${why}`);
    x = addDays(x, -1);
  }
  return { date: x, moved: reasons.length ? reasons.join('; ') : undefined };
}

export function nextBusiness(d: string): string {
  let x = d;
  while (holidayOrWeekend(x)) x = addDays(x, 1);
  return x;
}

/** The nth working day after `d`, skipping weekends and the demo holiday calendar. */
export function addWorkingDays(d: string, n: number): string {
  let x = d;
  for (let left = n; left > 0; ) {
    x = addDays(x, 1);
    if (!holidayOrWeekend(x)) left--;
  }
  return x;
}

export function addMonths(d: string, months: number): string {
  const [y, m, day] = d.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString().slice(0, 10);
}

/** Days a period has lasted as of `on`, counting its first day. */
export const lasted = (from: string, on: string) => daysBetween(from, on) + 1;

// ------------------------------------------------- cumulative restrictions

export interface Period { from: string; to?: string }

/** Restricted days falling in the window that ends on `end` and reaches back `months` months. */
export function restrictedDays(periods: Period[], end: string, months: number): number {
  const start = addDays(addMonths(end, -months), 1);
  let total = 0;
  for (const p of periods) {
    const a = p.from > start ? p.from : start;
    const b = !p.to || p.to > end ? end : p.to;
    if (b >= a) total += daysBetween(a, b) + 1;
  }
  return total;
}

/**
 * First date on which some window of `months` months holds `threshold` or more
 * restricted days. An open-ended restriction is assumed to stay in place.
 */
export function cumulativeCrossing(periods: Period[], threshold: number, months: number): string | null {
  if (!periods.length || threshold <= 0) return null;
  const sorted = [...periods].sort((a, b) => a.from.localeCompare(b.from));
  const open = sorted.some((p) => !p.to);
  const lastKnown = sorted.reduce((m, p) => ((p.to ?? p.from) > m ? p.to ?? p.from : m), sorted[0].from);
  const horizon = open ? addDays(lastKnown, threshold) : lastKnown;
  for (let d = sorted[0].from; d <= horizon; d = addDays(d, 1)) {
    if (restrictedDays(sorted, d, months) >= threshold) return d;
  }
  return null;
}

// -------------------------------------------------------------------- clocks

type Ev<T extends PeerEvent['type']> = Extract<PeerEvent, { type: T }>;
const one = <T extends PeerEvent['type']>(m: Matter, type: T) => m.events.find((e) => e.type === type) as Ev<T> | undefined;
const all = <T extends PeerEvent['type']>(m: Matter, type: T) => m.events.filter((e) => e.type === type) as Ev<T>[];

export function clocks(m: Matter, p: PeerValues, today: string, bylaws: BylawValues): Clock[] {
  const n = (id: string) => Number(p[id]);
  const lic = LICENSE_RULES.find((l) => l.kind === m.license)!;
  const out: Clock[] = [];
  const filed = (report: Ev<'filed'>['report'], f: Ev<'filed'>['for']) => all(m, 'filed').find((e) => e.report === report && e.for === f)?.on;

  type Base = Pick<Clock, 'id' | 'group' | 'label' | 'cite' | 'paramIds' | 'detail'> & { interpretation?: boolean };
  const push = (b: Base, rest: Partial<Clock> & { status: ClockStatus }) =>
    out.push({ matterId: m.id, interpretation: false, ...b, ...rest });

  /** A "do this within N days after the trigger" clock. */
  const after = (b: Base, trigger: string, days: number, doneOn?: string, startsOn?: string) => {
    const counted = addDays(trigger, days);
    const adj = prevBusiness(counted);
    let status: ClockStatus;
    let detail = b.detail;
    if (doneOn) {
      if (doneOn <= counted) status = 'done';
      else if (adj.moved && doneOn <= nextBusiness(counted)) {
        status = 'unresolved';
        detail += ` Done on ${fmt(doneOn)}, the next business day after a deadline that fell on a weekend or holiday. Whether that is on time is an attorney question.`;
      } else status = 'late';
    } else if (startsOn && today < startsOn) status = 'upcoming';
    else status = today <= counted ? 'open' : 'overdue';
    push({ ...b, detail }, { trigger, counted, actBy: adj.date, moved: adj.moved, doneOn, status, daysLeft: doneOn ? undefined : daysBetween(today, adj.date) });
  };

  /** A "have this done N days before the hearing" date. */
  const before = (b: Base, hearing: string, days: number) => {
    const counted = addDays(hearing, -days);
    const adj = prevBusiness(counted);
    push(b, { trigger: hearing, counted, actBy: adj.date, moved: adj.moved, status: today <= counted ? 'open' : 'overdue', daysLeft: daysBetween(today, adj.date) });
  };

  const npdbOff = (id: string, what: string) =>
    push({ id, group: 'Federal report', label: `NPDB: ${what}`, cite: '45 CFR § 60.12(a)(2)', paramIds: [], detail: `Reports on a ${m.license} are voluntary. The regulation requires them for physicians and dentists.` }, { status: 'not-required' });

  /** NPDB clock for one action that restricts privileges from `start`, ending on `end` if known. */
  const npdbAction = (id: string, what: string, start: string, end: string | undefined, doneOn: string | undefined, extra: string) => {
    if (!lic.npdbRequired) return npdbOff(id, what);
    const b: Base = { id, group: 'Federal report', label: `NPDB: ${what}`, cite: '45 CFR §§ 60.5, 60.12(a)(1)(i)', paramIds: ['npdb.durationDays', 'npdb.reportDays'], interpretation: true, detail: extra };
    const pass = addDays(start, n('npdb.durationDays'));
    if (end && end < pass) return push({ ...b, detail: `In effect ${lasted(start, end)} days, which is not longer than ${p['npdb.durationDays']}. ${extra}` }, { trigger: start, status: 'not-triggered' });
    after({ ...b, detail: `Reportable once it has affected privileges for longer than ${p['npdb.durationDays']} days (${fmt(pass)}), if it is a professional review action. ${extra}` }, start, n('npdb.reportDays'), doneOn, pass);
  };

  // --- § 809.5 summary suspension
  const s = one(m, 'summary-suspension');
  if (s) {
    let end = s.liftedOn;
    let conditional = '';
    if (s.by === 'governing-body') {
      const ratifyBy = addWorkingDays(s.on, n('s8095.ratifyDays'));
      const inTime = !!s.ratifiedOn && s.ratifiedOn <= ratifyBy;
      const b: Base = { id: 'ratify', group: 'Summary suspension', label: 'Peer review body ratifies the governing body\'s suspension', cite: 'Bus. & Prof. Code § 809.5(b)', paramIds: ['s8095.ratifyDays'], detail: '' };
      const base = { trigger: s.on, counted: ratifyBy, actBy: ratifyBy, doneOn: s.ratifiedOn };
      const count = `${p['s8095.ratifyDays']} working days after ${fmt(s.on)}, leaving out weekends and holidays, is ${fmt(ratifyBy)} (${daysBetween(s.on, ratifyBy)} calendar days).`;
      if (inTime) push({ ...b, detail: count }, { ...base, status: 'done' });
      else if (s.ratifiedOn) push({ ...b, detail: `${count} The ratification on ${fmt(s.ratifiedOn)} came after that. The suspension had already ended by operation of § 809.5(b).` }, { ...base, status: 'late' });
      else if (today <= ratifyBy) push({ ...b, detail: `${count} Without ratification by then the suspension ends automatically.` }, { ...base, status: 'open', daysLeft: daysBetween(today, ratifyBy) });
      else push({ ...b, detail: `${count} No ratification is recorded. The suspension ended automatically.` }, { ...base, status: 'overdue' });
      if (!inTime) {
        if (s.ratifiedOn || today > ratifyBy) end = end && end < ratifyBy ? end : ratifyBy;
        else conditional = ' This assumes the suspension is ratified; if it is not, it ends first.';
      }
    }

    const b805: Base = { id: '805e', group: 'State report', label: `805 report to the ${lic.agency}: summary suspension`, cite: 'Bus. & Prof. Code § 805(e)', paramIds: ['s805.summaryDays', 's805.reportDays'], detail: '' };
    const pass = addDays(s.on, n('s805.summaryDays'));
    if (end && end < pass) {
      push({ ...b805, detail: `The suspension was in effect ${lasted(s.on, end)} days, which is not more than ${p['s805.summaryDays']}. No report under (e).` }, { trigger: s.on, status: 'not-triggered' });
    } else {
      after({ ...b805, interpretation: true, detail: `Due within ${p['s805.reportDays']} days following the imposition, if the suspension stays in effect more than ${p['s805.summaryDays']} days. It passes ${p['s805.summaryDays']} days on ${fmt(pass)}; the report is due ${fmt(addDays(s.on, n('s805.reportDays')))}.${conditional}` },
        s.on, n('s805.reportDays'), filed('805', 'summary'), pass);
    }
    npdbAction('npdb-summary', 'summary suspension', s.on, end, filed('npdb', 'summary'),
      `The regulation does not mention summary suspensions. Counting ${p['npdb.reportDays']} days from the day it was imposed is our reading; the NPDB Guidebook was not read. A pending hearing does not appear in the text as a reason to wait.${conditional}`);
    if (lic.in809) {
      push({ id: 'susp-hearing', group: 'Hearing', label: 'Notice and hearing rights after a summary suspension', cite: 'Bus. & Prof. Code § 809.5(a)', paramIds: [],
        detail: 'The licentiate must then be given the notice and hearing rights in §§ 809.1–809.4. The statute gives no day count for that notice; the bylaws may.' }, { trigger: s.on, status: 'unresolved' });
    }
  }

  // --- § 805(b)(3) cumulative restrictions
  const periods = all(m, 'restriction').map((r) => ({ from: r.from, to: r.to }));
  if (periods.length) {
    const b: Base = { id: '805b3', group: 'State report', label: `805 report to the ${lic.agency}: restrictions adding up to ${p['s805.cumulativeDays']} days`, cite: 'Bus. & Prof. Code § 805(b)(3)', paramIds: ['s805.cumulativeDays', 's805.windowMonths', 's805.reportDays'], interpretation: true, detail: '' };
    const cross = cumulativeCrossing(periods, n('s805.cumulativeDays'), n('s805.windowMonths'));
    const soFar = restrictedDays(periods, today, n('s805.windowMonths'));
    if (!cross) {
      push({ ...b, detail: `${soFar} restricted days in the ${p['s805.windowMonths']} months ending ${fmt(today)}. Below ${p['s805.cumulativeDays']}.` }, { status: 'not-triggered' });
    } else {
      after({ ...b, detail: `The restrictions reach a cumulative ${p['s805.cumulativeDays']} days on ${fmt(cross)} (${soFar} days in the ${p['s805.windowMonths']} months ending ${fmt(today)}). Counted from that day. If one restriction was imposed for a fixed term of ${p['s805.cumulativeDays']} days or more, the count may start on its first day instead.` },
        cross, n('s805.reportDays'), filed('805', 'cumulative'), cross);
    }
    if (!lic.npdbRequired) npdbOff('npdb-restriction', 'restriction of privileges');
    else {
      const long = periods.find((r) => !r.to || r.to >= addDays(r.from, n('npdb.durationDays')));
      const text = `The regulation speaks of one professional review action lasting longer than ${p['npdb.durationDays']} days. It does not add separate restrictions together, so this clock can differ from the state one.`;
      if (long) npdbAction('npdb-restriction', 'restriction of privileges', long.from, long.to, filed('npdb', 'cumulative'), text);
      else push({ id: 'npdb-restriction', group: 'Federal report', label: 'NPDB: restriction of privileges', cite: '45 CFR § 60.12(a)(1)(i)', paramIds: ['npdb.durationDays'], interpretation: true,
        detail: `No single restriction has lasted longer than ${p['npdb.durationDays']} days. ${text}` }, { status: 'not-triggered' });
    }
  }

  // --- § 805(c) resignation after notice of an investigation
  const resign = one(m, 'resignation');
  if (resign) {
    const notice = one(m, 'investigation-notice');
    const b: Base = { id: '805c', group: 'State report', label: `805 report to the ${lic.agency}: resignation after notice of an investigation`, cite: 'Bus. & Prof. Code § 805(c)(1)', paramIds: ['s805.reportDays'], detail: '' };
    if (notice && notice.on <= resign.on) {
      after({ ...b, detail: `Notice of the investigation was received on ${fmt(notice.on)}; the resignation followed on ${fmt(resign.on)}. Due within ${p['s805.reportDays']} days after the resignation.` }, resign.on, n('s805.reportDays'), filed('805', 'resignation'));
      if (!lic.npdbRequired) npdbOff('npdb-surrender', 'surrender of privileges while under investigation');
      else after({ id: 'npdb-surrender', group: 'Federal report', label: 'NPDB: surrender of privileges while under investigation', cite: '45 CFR §§ 60.5, 60.12(a)(1)(ii)', paramIds: ['npdb.reportDays'], interpretation: true,
        detail: 'The regulation covers accepting a surrender while the practitioner is under investigation. Counting from the resignation date is our reading.' }, resign.on, n('npdb.reportDays'), filed('npdb', 'resignation'));
    } else {
      push({ ...b, detail: 'No notice of a pending investigation is recorded before the resignation.' }, { status: 'not-triggered' });
    }
  }

  // --- final proposed action: § 805.01, § 805(b)(1)-(2), NPDB
  const fpa = one(m, 'final-proposed-action');
  if (fpa) {
    if (fpa.act80501) {
      after({ id: '80501', group: 'State report', label: `805.01 report to the ${lic.agency}`, cite: `Bus. & Prof. Code § 805.01(b)(${fpa.act80501})`, paramIds: ['s80501.reportDays'],
        detail: `After a formal investigation the peer review body found this may have occurred: ${ACTS_80501[fpa.act80501].toLowerCase()}. Due within ${p['s80501.reportDays']} days after the final decision or recommendation, whether or not a hearing is held.` },
        fpa.on, n('s80501.reportDays'), filed('805.01', 'final'));
    }
    const eff = one(m, 'action-effective');
    const b805: Base = { id: '805b', group: 'State report', label: `805 report to the ${lic.agency}: denial or termination`, cite: 'Bus. & Prof. Code § 805(b)(1)–(2)', paramIds: ['s805.reportDays'], interpretation: true, detail: '' };
    if (eff) {
      after({ ...b805, detail: `Due within ${p['s805.reportDays']} days after the effective date of the action.` }, eff.on, n('s805.reportDays'), filed('805', 'final'));
      npdbAction('npdb-final', 'final action on privileges', eff.on, undefined, filed('npdb', 'final'), 'Counted from the effective date of the action.');
    } else {
      push({ ...b805, detail: 'Counts from the effective date of the action, which is not in the record yet. When a proposed action takes effect while a hearing is pending is an attorney question.' }, { status: 'waiting' });
      if (lic.npdbRequired) push({ id: 'npdb-final', group: 'Federal report', label: 'NPDB: final action on privileges', cite: '45 CFR §§ 60.5, 60.12(a)(1)(i)', paramIds: ['npdb.reportDays'], interpretation: true,
        detail: 'Counts from the action. No effective date is in the record yet.' }, { status: 'waiting' });
      else npdbOff('npdb-final', 'final action on privileges');
    }
  }

  // --- §§ 809.1-809.2 hearing
  const served = one(m, 'notice-served');
  const requested = one(m, 'hearing-requested');
  const set = one(m, 'hearing-set');
  if (!lic.in809) {
    push({ id: 'hearing-scope', group: 'Hearing', label: 'Statutory hearing rights', cite: 'Bus. & Prof. Code § 809(b)', paramIds: [],
      detail: `The § 809(b) list of licentiates for §§ 809.1–809.8 does not include a ${m.license}, though § 805 does. Hearing rights, if any, come from the bylaws or due process.` }, { status: 'not-required' });
  } else {
    if (served) {
      const b: Base = { id: 'hearing-request', group: 'Hearing', label: 'Licentiate requests a hearing', cite: 'Bylaws § 8.3-2; Bus. & Prof. Code § 809.1(b)(4)', paramIds: [], detail: '' };
      if (bylaws.hearingRequest === undefined) push({ ...b, detail: 'The statute sets no number; the notice must state the time limit. No accepted bylaw term supplies one.' }, { trigger: served.on, status: 'unresolved' });
      else after({ ...b, detail: `The statute sets no number. The bylaws give ${bylaws.hearingRequest} days after receipt of the notice.` }, served.on, bylaws.hearingRequest, requested?.on);
    }
    if (requested) {
      const limit = n('s8092.hearingStartDays');
      const startBy = addDays(requested.on, limit);
      const b: Base = { id: 'hearing-start', group: 'Hearing', label: 'Hearing starts', cite: 'Bus. & Prof. Code § 809.2(h)', paramIds: ['s8092.hearingStartDays'], detail: '' };
      const clash = bylaws.hearingStart !== undefined && bylaws.hearingStart > limit ? ` The bylaws allow ${bylaws.hearingStart} days; the statute's ${limit} controls.` : '';
      if (set && set.on > startBy) {
        push({ ...b, detail: `Set for ${fmt(set.on)}, ${daysBetween(requested.on, set.on)} days after the request was received. The limit is ${limit} days (${fmt(startBy)}) unless the licentiate consented to the delay or the presiding officer made the written finding in § 809.2(h).${clash}` },
          { trigger: requested.on, counted: startBy, actBy: prevBusiness(startBy).date, moved: prevBusiness(startBy).moved, doneOn: set.on, status: 'conflict' });
      } else if (set) {
        push({ ...b, detail: `Set for ${fmt(set.on)}, ${daysBetween(requested.on, set.on)} days after the request was received.${clash}` }, { trigger: requested.on, counted: startBy, actBy: prevBusiness(startBy).date, doneOn: set.on, status: 'done' });
      } else {
        after({ ...b, detail: `Within ${limit} days after the request for hearing is received. No date is set yet.${clash}` }, requested.on, limit);
      }
    }
    if (set) {
      before({ id: 'hearing-docs', group: 'Hearing', label: 'Each side has access to the other\'s relevant documents', cite: 'Bus. & Prof. Code § 809.2(d)', paramIds: ['s8092.documentDays'],
        detail: `Access later than ${p['s8092.documentDays']} days before the hearing is good cause for a continuance.` }, set.on, n('s8092.documentDays'));
      const w = Math.max(n('s8092.witnessDays'), bylaws.witness ?? 0);
      before({ id: 'hearing-witness', group: 'Hearing', label: 'Witness lists and exhibits exchanged', cite: 'Bus. & Prof. Code § 809.2(f)', paramIds: ['s8092.witnessDays'],
        detail: `On request of either side. Disclosure later than ${w} days before the hearing is good cause for a continuance.` }, set.on, w);
    }
  }

  return out;
}

const ATTENTION: ClockStatus[] = ['overdue', 'late', 'conflict'];
export const needsAttention = (c: Clock) => ATTENTION.includes(c.status);
export const isRunning = (c: Clock) => c.status === 'open' || c.status === 'upcoming';

/** Clocks with a date, soonest first, across matters. */
export function agenda(cs: Clock[]): Clock[] {
  return cs.filter((c) => isRunning(c) && c.actBy).sort((a, b) => a.actBy!.localeCompare(b.actBy!));
}

export function eventDate(e: PeerEvent): string {
  return e.type === 'restriction' ? e.from : e.on;
}

const EVENT_LABEL: Record<PeerEvent['type'], string> = {
  'summary-suspension': 'Summary suspension',
  restriction: 'Restriction',
  'investigation-notice': 'Notice of investigation',
  resignation: 'Resignation',
  'final-proposed-action': 'Final proposed action',
  'notice-served': 'Notice served',
  'hearing-requested': 'Hearing requested',
  'hearing-set': 'Hearing date',
  'action-effective': 'Action effective',
  filed: 'Report filed',
};
export const eventLabel = (e: PeerEvent) => EVENT_LABEL[e.type];
