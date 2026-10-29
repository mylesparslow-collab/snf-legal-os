import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import { initialState, TEAM } from '../data/seed';
import { fmt } from '../domain/dates';
import { impactOf } from '../domain/derive';
import type { Role, State } from '../domain/types';

export type Action =
  | { type: 'role'; role: Role }
  | { type: 'resolveIssue'; id: string; optionId: string; note?: string }
  | { type: 'decide'; id: string; optionId: string; newTarget?: string }
  | { type: 'approveCorrespondence'; id: string }
  | { type: 'sendRequest'; id: string }
  | { type: 'correctFact'; key: string; value: string; note: string }
  | { type: 'approveRevisions' }
  | { type: 'settleAmendment'; wpId: string; outcome: string }
  | { type: 'reset' };

const STORAGE_KEY = 'snf-workbench-v3';

function stamp(s: State) {
  return `${s.today} ${new Date().toTimeString().slice(0, 5)}`;
}
const actor = (s: State) => TEAM.find((t) => t.role === s.role)!.name;

function correct(s: State, key: string, value: string, note: string): State {
  const f = s.facts[key];
  if (!f || f.value === value) return s;
  const by = actor(s);
  const impacts = impactOf(s, key);
  const revId = `${key}-${f.history.length + 1}`;
  const display = (v: string) => (f.kind === 'date' ? fmt(v) : v);
  const workProducts = s.workProducts.map((wp) => {
    if (!impacts.some((i) => i.wp.id === wp.id)) return wp;
    const preserve = wp.status === 'executed' || wp.status === 'filed';
    return {
      ...wp,
      revisions: [
        ...wp.revisions,
        { id: `${revId}-${wp.id}`, factKey: key, from: display(f.value), to: display(value), at: s.today, by, state: preserve ? ('amendment-required' as const) : ('proposed' as const) },
      ],
    };
  });
  const revise = impacts.filter((i) => i.mode === 'revise').length;
  const preserve = impacts.length - revise;
  return {
    ...s,
    facts: { ...s.facts, [key]: { ...f, value, history: [...f.history, { value: f.value, at: s.today, by, note }] } },
    workProducts,
    log: [
      { at: stamp(s), by, text: `Changed "${f.label}" from ${display(f.value)} to ${display(value)}. ${revise} draft revision${revise === 1 ? '' : 's'} proposed; ${preserve} filed or executed record${preserve === 1 ? '' : 's'} preserved.` },
      ...s.log,
    ],
  };
}

const ISSUE_EFFECTS: Record<string, (s: State) => State> = {
  'i-lessee:per-opco': (s) => correct(s, 'lease.tenant', 'Larkspur Opco LLC; Mission Hills Opco LLC (each as tenant of its facility)', 'ISS-01 resolved'),
  'i-tamarack:accept-v3': (s) => ({
    ...correct(s, 'owner.redwood', '45% Class B through Tamarack Holdings LLC (Redwood 90%; 10% unknown)', 'ISS-02 resolved'),
    edges: s.edges.map((e) => (e.id === 'e6' ? e : e.id === 'e7' || e.id === 'e8' ? { ...e, status: 'verified' as const } : e)),
  }),
  'i-mgmt:defer-start': (s) => correct(s, 'mgmt.start', 'At closing (pre-closing consulting only, no operational authority)', 'ISS-03 resolved'),
  'i-sideletter:disclose': (s) => correct(s, 'control.investors', 'Redwood Ridge (Class B): consent over facility budgets and Administrator appointment', 'ISS-04 resolved'),
};

/** Options that send a question but leave the issue open. */
const KEEP_OPEN = new Set(['i-lessee:ask-client', 'i-tamarack:confirm-q', 'i-sideletter:amend-side']);

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case 'role':
      return { ...s, role: a.role };
    case 'reset':
      return initialState();
    case 'resolveIssue': {
      const iss = s.issues.find((i) => i.id === a.id)!;
      const opt = iss.options.find((o) => o.id === a.optionId)!;
      const k = `${a.id}:${a.optionId}`;
      const by = actor(s);
      if (KEEP_OPEN.has(k)) {
        return {
          ...s,
          requests: [...s.requests, { id: `req-${a.id}`, title: `Question for client: ${iss.title}`, questions: [opt.consequence], owner: 'associate', status: 'sent', sentAt: s.today, origin: iss.code }],
          log: [{ at: stamp(s), by, text: `${iss.code}: sent a question to the client. Issue stays open.` }, ...s.log],
        };
      }
      let next: State = {
        ...s,
        issues: s.issues.map((i) => (i.id === a.id ? { ...i, status: 'resolved' as const, resolution: { optionId: a.optionId, by, at: s.today, note: a.note } } : i)),
        log: [{ at: stamp(s), by, text: `${iss.code} resolved: ${opt.label}.` }, ...s.log],
      };
      const fx = ISSUE_EFFECTS[k];
      if (fx) next = fx(next);
      return next;
    }
    case 'decide': {
      const d = s.decisions.find((x) => x.id === a.id)!;
      const opt = d.options.find((o) => o.id === a.optionId)!;
      const by = actor(s);
      let next: State = {
        ...s,
        decisions: s.decisions.map((x) => (x.id === a.id ? { ...x, status: 'decided' as const, resolution: { optionId: a.optionId, by, at: s.today } } : x)),
        log: [{ at: stamp(s), by, text: `Decided "${d.title}": ${opt.label}.` }, ...s.log],
      };
      if (a.id === 'd-schedule' && a.optionId === 'move' && a.newTarget) next = correct(next, 'target.handover', a.newTarget, 'Schedule decision');
      return next;
    }
    case 'approveCorrespondence':
      return {
        ...s,
        correspondence: s.correspondence.map((c) => (c.id === a.id ? { ...c, status: 'approved' as const, approvedBy: actor(s) } : c)),
        log: [{ at: stamp(s), by: actor(s), text: 'Approved CDPH correspondence event for Mission Hills and its deadline basis (30 calendar days from Oct 27).' }, ...s.log],
      };
    case 'sendRequest':
      return {
        ...s,
        requests: s.requests.map((r) => (r.id === a.id ? { ...r, status: 'sent' as const, sentAt: s.today } : r)),
        log: [{ at: stamp(s), by: actor(s), text: 'Released OHCA filer questions to the client.' }, ...s.log],
      };
    case 'correctFact':
      return correct(s, a.key, a.value, a.note);
    case 'approveRevisions': {
      const n = s.workProducts.reduce((k, w) => k + w.revisions.filter((r) => r.state === 'proposed').length, 0);
      return {
        ...s,
        workProducts: s.workProducts.map((w) => ({ ...w, revisions: w.revisions.map((r) => (r.state === 'proposed' ? { ...r, state: 'approved' as const } : r)) })),
        log: [{ at: stamp(s), by: actor(s), text: `Approved revision batch (${n} change${n === 1 ? '' : 's'}).` }, ...s.log],
      };
    }
    case 'settleAmendment':
      return {
        ...s,
        workProducts: s.workProducts.map((w) => (w.id === a.wpId ? { ...w, revisions: w.revisions.map((r) => (r.state === 'amendment-required' ? { ...r, state: 'approved' as const } : r)) } : w)),
        log: [{ at: stamp(s), by: actor(s), text: `${s.workProducts.find((w) => w.id === a.wpId)!.title}: ${a.outcome}.` }, ...s.log],
      };
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as State;
      if (parsed.version === initialState().version) return parsed;
    }
  } catch {
    /* storage unavailable; start fresh */
  }
  return initialState();
}

const Ctx = createContext<{ s: State; dispatch: (a: Action) => void } | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, undefined, load);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    } catch {
      /* ignore */
    }
  }, [s]);
  return <Ctx.Provider value={{ s, dispatch }}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}

export { reducer };
