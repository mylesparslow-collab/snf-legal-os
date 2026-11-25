import { describe, expect, it } from 'vitest';
import { agendaFinding, bylawFinding, bylawFindings, bylawValues, draftFinding, recordFinding } from '../checks';
import { addMonths, addWorkingDays, clocks, cumulativeCrossing, lasted, restrictedDays, type Clock } from '../clock';
import { AGENDA, BYLAW_TERMS, DRAFTS, MATTERS, RECORDS, type Matter, type PeerEvent } from '../hospital';
import { PEER_PARAMS, peerDefaults } from '../params';

const P = peerDefaults();
const BV = bylawValues(bylawFindings(P));
const TODAY = '2026-11-25';
const m = (id: string) => MATTERS.find((x) => x.id === id)!;
const run = (matter: Matter, today = TODAY, p = P, bv = BV) => clocks(matter, p, today, bv);
const get = (cs: Clock[], id: string) => cs.find((c) => c.id === id)!;
const withEvents = (id: string, f: (e: PeerEvent[]) => PeerEvent[]): Matter => ({ ...m(id), events: f(m(id).events) });

describe('date arithmetic', () => {
  it('counts working days around Thanksgiving', () => {
    // Tue Nov 24 -> Wed Nov 25 is day 1; Thu and Fri are holidays; Mon Nov 30 is day 2.
    expect(addWorkingDays('2026-11-24', 2)).toBe('2026-11-30');
    expect(addWorkingDays('2026-11-16', 2)).toBe('2026-11-18');
    expect(addWorkingDays('2026-11-20', 1)).toBe('2026-11-23');
  });
  it('moves back by months and clamps the day', () => {
    expect(addMonths('2026-11-23', -12)).toBe('2025-11-23');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
  });
  it('counts the first day of a period', () => {
    expect(lasted('2026-11-24', '2026-11-24')).toBe(1);
    expect(lasted('2026-11-24', '2026-12-08')).toBe(15);
  });
});

describe('parameters', () => {
  it('every parameter has a source and a status', () => {
    for (const p of PEER_PARAMS) {
      expect(p.source.length, p.id).toBeGreaterThan(0);
      expect(['text-checked', 'interpretation', 'unverified'], p.id).toContain(p.status);
      expect(/^\d+$/.test(p.value), p.id).toBe(true);
    }
  });
  it('the engine source contains no day counts of its own', () => {
    // Guard against a statutory number being typed into engine code.
    const src = (import.meta as unknown as { glob: (p: string, o: object) => Record<string, string> }).glob('../clock.ts', { query: '?raw', import: 'default', eager: true });
    const code = Object.values(src)[0].replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(code).not.toMatch(/addDays\([^)]*,\s*-?(1[0-9]|[2-9][0-9])\)/);
  });
});

describe('governing-body summary suspension (§ 809.5(b))', () => {
  it('needs ratification by the second working day, six calendar days later', () => {
    const c = get(run(m('raman')), 'ratify');
    expect(c.counted).toBe('2026-11-30');
    expect(c.status).toBe('open');
    expect(c.daysLeft).toBe(5);
  });
  it('is done when ratified in time and late when ratified after', () => {
    const rat = (on: string) => withEvents('raman', (es) => es.map((e) => (e.type === 'summary-suspension' ? { ...e, ratifiedOn: on } : e)));
    expect(get(run(rat('2026-11-30')), 'ratify').status).toBe('done');
    expect(get(run(rat('2026-12-01'), '2026-12-02'), 'ratify').status).toBe('late');
  });
  it('ends automatically when not ratified, so no 805 or NPDB report follows', () => {
    const cs = run(m('raman'), '2026-12-02');
    expect(get(cs, 'ratify').status).toBe('overdue');
    expect(get(cs, '805e').status).toBe('not-triggered');
    expect(get(cs, 'npdb-summary').status).toBe('not-triggered');
  });
  it('has no ratification clock when the peer review body itself suspends', () => {
    const own = withEvents('raman', (es) => es.map((e) => (e.type === 'summary-suspension' ? { ...e, by: 'peer-review-body' as const } : e)));
    expect(run(own).find((c) => c.id === 'ratify')).toBeUndefined();
  });
});

describe('summary suspension reports', () => {
  const ratified = withEvents('raman', (es) => es.map((e) => (e.type === 'summary-suspension' ? { ...e, ratifiedOn: '2026-11-30' } : e)));
  it('805(e): passes 14 days on Dec 8 and the report is due Dec 9', () => {
    expect(get(run(ratified), '805e')).toMatchObject({ status: 'upcoming', counted: '2026-12-09' });
    expect(get(run(ratified, '2026-12-07'), '805e').status).toBe('upcoming');
    expect(get(run(ratified, '2026-12-08'), '805e').status).toBe('open');
    expect(get(run(ratified, '2026-12-10'), '805e').status).toBe('overdue');
  });
  it('805(e): not triggered when lifted on day 14, triggered when lifted on day 15', () => {
    const lift = (on: string) => withEvents('raman', (es) => es.map((e) => (e.type === 'summary-suspension' ? { ...e, ratifiedOn: '2026-11-30', liftedOn: on } : e)));
    expect(get(run(lift('2026-12-07'), '2026-12-20'), '805e').status).toBe('not-triggered');
    expect(get(run(lift('2026-12-08'), '2026-12-20'), '805e').status).toBe('overdue');
  });
  it('NPDB runs on a different date from the state report', () => {
    const c = get(run(ratified), 'npdb-summary');
    expect(c.counted).toBe('2026-12-24');
    expect(c.interpretation).toBe(true);
    expect(c.counted).not.toBe(get(run(ratified), '805e').counted);
  });
  it('records a filed 805 report as done', () => {
    const filed = withEvents('raman', (es) => [...es.map((e) => (e.type === 'summary-suspension' ? { ...e, ratifiedOn: '2026-11-30' } : e)),
      { type: 'filed', on: '2026-12-09', report: '805', for: 'summary', note: '' }]);
    expect(get(run(filed, '2026-12-15'), '805e').status).toBe('done');
  });
});

describe('cumulative restrictions (§ 805(b)(3))', () => {
  const periods = [{ from: '2026-03-02', to: '2026-03-13' }, { from: '2026-07-06', to: '2026-07-15' }, { from: '2026-11-16' }];
  it('adds 12 + 10 + 8 days to reach 30 on Nov 23', () => {
    expect(restrictedDays(periods, '2026-11-22', 12)).toBe(29);
    expect(cumulativeCrossing(periods, 30, 12)).toBe('2026-11-23');
  });
  it('drops days that fall outside the 12-month window', () => {
    const old = [{ from: '2025-01-05', to: '2025-01-24' }, { from: '2026-02-01', to: '2026-02-15' }];
    expect(cumulativeCrossing(old, 30, 12)).toBeNull();
    expect(restrictedDays(old, '2026-02-15', 12)).toBe(15);
  });
  it('the state report is running while the NPDB clock has not started', () => {
    const cs = run(m('feld'));
    expect(get(cs, '805b3')).toMatchObject({ status: 'open', trigger: '2026-11-23', counted: '2026-12-08' });
    expect(get(cs, 'npdb-restriction')).toMatchObject({ status: 'upcoming', counted: '2026-12-16' });
  });
  it('no NPDB clock when every restriction is short', () => {
    const closed = withEvents('feld', (es) => es.map((e) => (e.type === 'restriction' && !e.to ? { ...e, to: '2026-11-30' } : e)));
    const cs = run(closed, '2026-12-20');
    expect(get(cs, 'npdb-restriction').status).toBe('not-triggered');
    expect(get(cs, '805b3').status).toBe('overdue');
  });
  it('follows the parameter when the threshold changes', () => {
    expect(get(run(m('feld'), TODAY, { ...P, 's805.cumulativeDays': '45' }), '805b3').status).toBe('upcoming');
  });
});

describe('final proposed action and hearing', () => {
  const cs = run(m('castellanos'));
  it('805.01: deadline on a Saturday, filed the next Monday, is left unresolved', () => {
    const c = get(cs, '80501');
    expect(c).toMatchObject({ counted: '2026-11-14', actBy: '2026-11-13', doneOn: '2026-11-16', status: 'unresolved' });
  });
  it('805.01: filed two days later than that is late', () => {
    const later = withEvents('castellanos', (es) => es.map((e) => (e.type === 'filed' ? { ...e, on: '2026-11-18' } : e)));
    expect(get(run(later), '80501').status).toBe('late');
  });
  it('no 805.01 clock without one of the four listed acts', () => {
    const plain = withEvents('castellanos', (es) => es.map((e) => (e.type === 'final-proposed-action' ? { ...e, act80501: undefined } : e)));
    expect(run(plain).find((c) => c.id === '80501')).toBeUndefined();
  });
  it('the 805 report waits for an effective date, then counts 15 days', () => {
    expect(get(cs, '805b').status).toBe('waiting');
    const eff = withEvents('castellanos', (es) => [...es, { type: 'action-effective', on: '2027-02-01', note: '' }]);
    expect(get(run(eff, '2027-02-02'), '805b')).toMatchObject({ status: 'open', counted: '2027-02-16' });
    expect(get(run(eff, '2027-02-02'), 'npdb-final').counted).toBe('2027-03-03');
  });
  it('uses the bylaw number for the hearing request', () => {
    expect(get(cs, 'hearing-request')).toMatchObject({ counted: '2026-12-02', status: 'done' });
    expect(get(run(m('castellanos'), TODAY, P, {}), 'hearing-request').status).toBe('unresolved');
  });
  it('flags a hearing set 64 days after the request against the 60-day limit', () => {
    const c = get(cs, 'hearing-start');
    expect(c).toMatchObject({ counted: '2027-01-08', status: 'conflict' });
    expect(c.detail).toContain('64 days');
    const ok = withEvents('castellanos', (es) => es.map((e) => (e.type === 'hearing-set' ? { ...e, on: '2027-01-08' } : e)));
    expect(get(run(ok), 'hearing-start').status).toBe('done');
  });
  it('counts back from the hearing and moves off weekends and holidays', () => {
    expect(get(cs, 'hearing-docs')).toMatchObject({ counted: '2026-12-13', actBy: '2026-12-11' });
    expect(get(cs, 'hearing-witness')).toMatchObject({ counted: '2027-01-02', actBy: '2026-12-31' });
  });
});

describe('resignation under investigation, nurse practitioner', () => {
  const cs = run(m('whitlock'));
  it('805(c) is due 15 days after the resignation; act-by date moves before Thanksgiving', () => {
    expect(get(cs, '805c')).toMatchObject({ counted: '2026-11-27', actBy: '2026-11-25', status: 'open', daysLeft: 0 });
    expect(get(cs, '805c').label).toContain('Board of Registered Nursing');
  });
  it('NPDB is voluntary and § 809 hearing rights do not cover the license', () => {
    expect(get(cs, 'npdb-surrender').status).toBe('not-required');
    expect(get(cs, 'hearing-scope').status).toBe('not-required');
  });
  it('a physician in the same position gets an NPDB clock', () => {
    const md: Matter = { ...m('whitlock'), license: 'physician' };
    expect(get(run(md), 'npdb-surrender')).toMatchObject({ status: 'open', counted: '2026-12-12' });
  });
  it('no report when there was no notice of an investigation first', () => {
    const none = withEvents('whitlock', (es) => es.filter((e) => e.type !== 'investigation-notice'));
    expect(get(run(none), '805c').status).toBe('not-triggered');
  });
});

describe('bylaws', () => {
  it('every coded term quotes its page and states its number', () => {
    for (const f of bylawFindings(P)) expect(f.quoteFound && f.numberInQuote, f.term.id).toBe(true);
  });
  it('flags the 90-day hearing bylaw against the 60-day statute', () => {
    const f = bylawFindings(P).find((x) => x.term.id === 'hearingStart')!;
    expect(f.outcome).toBe('conflict');
    expect(bylawFinding(f.term, { ...P, 's8092.hearingStartDays': '90' }).outcome).toBe('consistent');
  });
  it('rejects a term whose quote is not on the page, and the clock does not use it', () => {
    const terms = BYLAW_TERMS.map((t) => (t.id === 'hearingRequest' ? { ...t, quote: 'A member has forty-five (45) days to request a hearing', value: 45 } : t));
    const fs = bylawFindings(P, terms);
    expect(fs.find((x) => x.term.id === 'hearingRequest')!.outcome).toBe('rejected');
    expect(bylawValues(fs).hearingRequest).toBeUndefined();
  });
  it('rejects a term whose quote does not state the number', () => {
    const t = { ...BYLAW_TERMS.find((x) => x.id === 'witness')!, value: 14 };
    expect(bylawFinding(t, P).outcome).toBe('rejected');
  });
});

describe('committee records and drafts', () => {
  const rec = (id: string) => recordFinding(RECORDS.find((r) => r.id === id)!).outcome;
  const draft = (id: string) => draftFinding(DRAFTS.find((d) => d.id === id)!);
  it('classifies records by kind and folder', () => {
    expect(rec('r1')).toBe('in-place');
    expect(rec('r3')).toBe('misfiled');
    expect(rec('r4')).toBe('not-committee');
    expect(rec('r5')).toBe('outside');
  });
  it('holds a draft that sends a committee record outside the committee', () => {
    const f = draft('d2');
    expect(f.outcome).toBe('hold');
    expect(f.outside.map((o) => o.personId).sort()).toEqual(['ceo', 'hrd']);
  });
  it('clears committee-only drafts, the 805 report, and drafts with no committee record', () => {
    expect(draft('d1').outcome).toBe('clear');
    expect(draft('d3').outcome).toBe('clear');
    expect(draft('d4').outcome).toBe('clear');
  });
  it('sends a governing-body recipient to attorney review', () => {
    expect(draft('d5').outcome).toBe('review');
  });
});

describe('district board agenda', () => {
  const out = (id: string) => agendaFinding(AGENDA.find((a) => a.id === id)!).outcome;
  it('checks the closed-session wording and a public hearing request', () => {
    expect(out('a1')).toBe('matches');
    expect(out('a2')).toBe('review');
    expect(out('a3')).toBe('public');
  });
});
