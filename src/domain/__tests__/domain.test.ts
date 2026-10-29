import type { State } from '../types';
import { initialState } from '../../data/seed';
import { reducer } from '../../state/store';
import { addDays, holidayOrWeekend } from '../dates';
import { computeClocks, computeConditions, impactOf, workQueue } from '../derive';
import { computeIndirect, edgesForView } from '../ownership';
import { classify, ruleFor } from '../rules';
import { FACILITIES } from '../../data/seed';

describe('dates', () => {
  it('counts calendar days and flags holidays', () => {
    expect(addDays('2026-10-27', 30)).toBe('2026-11-26');
    expect(holidayOrWeekend('2026-11-26')).toBe('Thanksgiving Day');
    expect(addDays('2027-01-12', -120)).toBe('2026-09-14');
  });
});

describe('ownership', () => {
  const s = initialState();
  it('questionnaire view: Redwood holds 45% economic, no vote', () => {
    const r = computeIndirect(edgesForView(s.edges, 'questionnaire'), 'op-lk');
    const rrc = r.holdings.find((h) => h.holderId === 'rrc')!;
    expect(rrc.economic).toBe(45);
    expect(rrc.voting).toBe(0);
    expect(r.holdings.find((h) => h.holderId === 'hft')!.voting).toBeCloseTo(72.727, 2);
    expect(r.unknownEconomic).toBe(0);
  });
  it('org chart view keeps the unnamed 10% of Tamarack as unknown', () => {
    const r = computeIndirect(edgesForView(s.edges, 'orgchart'), 'op-lk');
    expect(r.holdings.find((h) => h.holderId === 'rrc')!.economic).toBe(40.5);
    expect(r.unknownEconomic).toBe(4.5);
    expect(r.unknownVoting).toBe(0);
  });
});

describe('rules', () => {
  it('selects the OHCA version in force on the transaction date', () => {
    expect(ruleFor('ohca', '2026-10-15')!.version).toMatch(/AB 1415/);
    expect(ruleFor('ohca', '2027-01-12')!.version).toMatch(/amended/);
  });
  it('HUD applies only to the insured facility, with rationale elsewhere', () => {
    const s = initialState();
    const hud = FACILITIES.map((f) => classify(f, s).find((c) => c.regime === 'hud')!);
    expect(hud.map((c) => c.status)).toEqual(['applicable', 'not-applicable', 'not-applicable']);
    expect(hud[1].rationale).toBeTruthy();
  });
  it('OHCA never resolves on its own', () => {
    let s = initialState();
    s = reducer(s, { type: 'sendRequest', id: 'req-ohca' });
    expect(classify(FACILITIES[0], s).find((c) => c.regime === 'ohca')!.status).toBe('unresolved');
  });
});

describe('closing logic', () => {
  it('starts with the schedule as a partner decision and the CDPH clock missed', () => {
    const s = initialState();
    expect(computeConditions(s).find((c) => c.id === 'c-sched')!.status).toBe('decision-required');
    expect(computeClocks(s).find((k) => k.id === 'k-cdph-advance')!.state).toBe('missed');
    expect(computeClocks(s).find((k) => k.id === 'k-9167')!.state).toBe('conflict');
  });

  it('moving the target propagates to drafts and preserves filed records', () => {
    let s = initialState();
    const impacts = impactOf(s, 'target.handover');
    expect(impacts.filter((i) => i.mode === 'preserve').map((i) => i.wp.id).sort()).toEqual(['wp-9167', 'wp-cdph-lk', 'wp-cdph-mh', 'wp-loi']);
    s = reducer(s, { type: 'decide', id: 'd-schedule', optionId: 'move', newTarget: '2027-03-12' });
    expect(s.facts['target.handover'].value).toBe('2027-03-12');
    const lk = s.workProducts.find((w) => w.id === 'wp-cdph-lk')!;
    expect(lk.revisions[0].state).toBe('amendment-required');
    const apa = s.workProducts.find((w) => w.id === 'wp-apa')!;
    expect(apa.revisions[0].state).toBe('proposed');
    expect(computeConditions(s).find((c) => c.id === 'c-sched')!.status).toBe('prepare-now');
    expect(computeClocks(s).find((k) => k.id === 'k-9167')!.state).toBe('ok');
  });

  it('CDPH response stays blocked until all three linked issues resolve', () => {
    let s = initialState();
    s = { ...s, role: 'associate' };
    s = reducer(s, { type: 'approveCorrespondence', id: 'corr-1' });
    expect(computeConditions(s).find((c) => c.id === 'c-cdph-mh')!.status).toBe('blocked');
    s = reducer(s, { type: 'resolveIssue', id: 'i-lessee', optionId: 'per-opco' });
    s = reducer(s, { type: 'resolveIssue', id: 'i-tamarack', optionId: 'accept-v3' });
    expect(computeConditions(s).find((c) => c.id === 'c-cdph-mh')!.status).toBe('blocked');
    s = { ...s, role: 'partner' };
    s = reducer(s, { type: 'resolveIssue', id: 'i-mgmt', optionId: 'defer-start' });
    expect(computeConditions(s).find((c) => c.id === 'c-cdph-mh')!.status).toBe('prepare-now');
    expect(workQueue(s).some((w) => w.id === 'assemble')).toBe(true);
    expect(computeClocks(s).find((k) => k.id === 'k-cdph-resp')!.note).toMatch(/Thanksgiving/);
  });

  it('asking the client keeps an issue open', () => {
    let s: State = { ...initialState(), role: 'associate' };
    s = reducer(s, { type: 'resolveIssue', id: 'i-lessee', optionId: 'ask-client' });
    expect(s.issues.find((i) => i.id === 'i-lessee')!.status).toBe('open');
    expect(s.requests.some((r) => r.id === 'req-i-lessee')).toBe(true);
  });
});
