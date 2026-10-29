import { useState } from 'react';
import { FACILITIES } from '../data/seed';
import { fmt } from '../domain/dates';
import { applicationIndex, impactOf, readinessMemo } from '../domain/derive';
import type { Fact, WorkProduct } from '../domain/types';
import { useStore } from '../state/store';
import { Evidence, Prov, StatusPill, useDocs } from './common';

const WP_TONE = { draft: 'neutral', 'in-review': 'neutral', executed: 'lock', filed: 'lock' } as const;
const WP_LABEL = { draft: 'Draft', 'in-review': 'In review', executed: 'Executed', filed: 'Filed' } as const;

export function WorkTab({ focus }: { focus?: string }) {
  const { s, dispatch } = useStore();
  const pending = s.workProducts.reduce((n, w) => n + w.revisions.filter((r) => r.state === 'proposed').length, 0);
  const canApprove = s.role !== 'paralegal';
  return (
    <div className="stack">
      <section className="card">
        <div className="card-title-row">
          <h3>Verified facts</h3>
          <span className="fine">Correct a fact once. Every draft that uses it gets a proposed revision; filed and executed records are preserved.</span>
        </div>
        <div className="facts">
          {Object.values(s.facts).map((f) => <FactRow key={f.key} f={f} />)}
        </div>
      </section>

      <section>
        <div className="toolbar">
          <h2 className="section-title">Work products</h2>
          {pending > 0 && (
            <button className="btn primary" disabled={!canApprove} onClick={() => dispatch({ type: 'approveRevisions' })}>
              Approve {pending} proposed revision{pending > 1 ? 's' : ''}
            </button>
          )}
        </div>
        <div className="stack">
          {s.workProducts.map((w) => <WorkProductRow key={w.id} w={w} focused={focus === w.id} />)}
        </div>
      </section>

      <section>
        <h2 className="section-title">CDPH application index</h2>
        <p className="fine">Packet structure is illustrative. Confirm against CDPH's current checklist [6] before relying on it.</p>
        <div className="index-grid">
          {FACILITIES.map((f) => <IndexCard key={f.id} facilityId={f.id} focused={focus === `index-${f.id}`} />)}
        </div>
      </section>

      <Memo />
    </div>
  );
}

function FactRow({ f }: { f: Fact }) {
  const { s, dispatch } = useStore();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(f.value);
  const impacts = impactOf(s, f.key);
  const show = (v: string) => (f.kind === 'date' ? fmt(v) : v);
  return (
    <div className={`fact ${editing ? 'editing' : ''}`}>
      <div className="fact-main">
        <span className="fine">{f.label}</span>
        <strong>{show(f.value)}</strong>
        {f.history.length > 0 && <span className="fine">Was {show(f.history[f.history.length - 1].value)} · changed by {f.history[f.history.length - 1].by}</span>}
      </div>
      <div className="fact-side">
        {f.evidence && <Evidence e={f.evidence} compact />}
        <span className="fine">Used in {impacts.length}</span>
        {!editing && <button className="btn small" onClick={() => { setVal(f.value); setEditing(true); }}>Correct</button>}
      </div>
      {editing && (
        <div className="fact-edit">
          <label className="field grow">
            <span>New value</span>
            <input id={`fact-${f.key}`} type={f.kind === 'date' ? 'date' : 'text'} value={val} onChange={(e) => setVal(e.target.value)} />
          </label>
          <div className="impact">
            <div className="eyebrow">Impact preview: {impacts.length} records</div>
            <ul>
              {impacts.map((i) => (
                <li key={i.wp.id}>
                  <span>{i.wp.title}</span>
                  <span className="fine">{i.where}</span>
                  <StatusPill tone={i.mode === 'revise' ? 'go' : 'lock'}>{i.mode === 'revise' ? 'Revision proposed' : 'Preserved'}</StatusPill>
                </li>
              ))}
            </ul>
          </div>
          <div className="decide-actions">
            <button className="btn primary" disabled={!val || val === f.value} onClick={() => { dispatch({ type: 'correctFact', key: f.key, value: val, note: 'Manual correction' }); setEditing(false); }}>
              Apply one coordinated update
            </button>
            <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkProductRow({ w, focused }: { w: WorkProduct; focused?: boolean }) {
  const { s, dispatch } = useStore();
  const { open } = useDocs();
  const locked = w.status === 'executed' || w.status === 'filed';
  const amend = w.revisions.filter((r) => r.state === 'amendment-required');
  const facLabel = w.facilityIds.length === 3 ? 'All facilities' : w.facilityIds.map((id) => FACILITIES.find((f) => f.id === id)!.shortName).join(', ');
  return (
    <article id={w.id} className={`card wp ${locked ? 'locked' : ''} ${focused ? 'focused' : ''}`}>
      <div className="wp-head">
        <div>
          <strong>{w.title}</strong>
          <div className="fine">{w.kind} · {facLabel}</div>
        </div>
        <div className="wp-actions">
          <StatusPill tone={WP_TONE[w.status]}>{WP_LABEL[w.status]}</StatusPill>
          {w.docId && <button className="btn small ghost" onClick={() => open({ docId: w.docId! })}>Open</button>}
        </div>
      </div>
      {w.revisions.length > 0 && (
        <ul className="revs">
          {w.revisions.map((r) => (
            <li key={r.id} className={`rev rev-${r.state}`}>
              <span className="fine">{s.facts[r.factKey].label} · {w.factRefs.find((x) => x.key === r.factKey)?.where}</span>
              <span className="diff"><del>{r.from}</del> <ins>{r.to}</ins></span>
              <StatusPill tone={r.state === 'approved' ? 'done' : r.state === 'proposed' ? 'go' : 'lock'}>
                {r.state === 'approved' ? 'Approved' : r.state === 'proposed' ? 'Proposed' : 'Preserved; needs a decision'}
              </StatusPill>
            </li>
          ))}
        </ul>
      )}
      {amend.length > 0 && (
        <div className="amend">
          <p className="fine">This {w.status} record was not changed. Choose what follows.</p>
          <div className="btn-row">
            {w.status === 'filed' && w.kind === 'Agency filing' && (
              <button className="btn small" disabled={s.role !== 'partner'} onClick={() => dispatch({ type: 'settleAmendment', wpId: w.id, outcome: 'supplement to be prepared for agency' })}>Prepare supplement</button>
            )}
            {w.status === 'filed' && w.kind !== 'Agency filing' && (
              <button className="btn small" disabled={s.role !== 'partner'} onClick={() => dispatch({ type: 'settleAmendment', wpId: w.id, outcome: 'request sent to seller counsel to update notice' })}>Ask seller to update</button>
            )}
            <button className="btn small ghost" disabled={s.role !== 'partner'} onClick={() => dispatch({ type: 'settleAmendment', wpId: w.id, outcome: 'no action needed, rationale recorded' })}>No action needed</button>
            {s.role !== 'partner' && <span className="fine">Partner decides.</span>}
          </div>
        </div>
      )}
    </article>
  );
}

const IDX_TONE = { present: 'go', filed: 'lock', conflict: 'bad', missing: 'warn' } as const;
const IDX_LABEL = { present: 'Ready', filed: 'Filed', conflict: 'Conflict', missing: 'Missing' } as const;

function IndexCard({ facilityId, focused }: { facilityId: string; focused?: boolean }) {
  const { s } = useStore();
  const items = applicationIndex(s, facilityId);
  const f = FACILITIES.find((x) => x.id === facilityId)!;
  const ready = items.filter((i) => i.status === 'present' || i.status === 'filed').length;
  return (
    <article id={`index-${facilityId}`} className={`card index ${focused ? 'focused' : ''}`}>
      <div className="card-title-row">
        <strong>{f.shortName}</strong>
        <span className="fine num">{ready}/{items.length} ready</span>
      </div>
      <div className="meter" aria-hidden="true"><span style={{ width: `${(ready / items.length) * 100}%` }} /></div>
      <ul className="idx">
        {items.map((i) => (
          <li key={i.label}>
            <span>{i.label}<span className="fine block">{i.note}</span></span>
            <StatusPill tone={IDX_TONE[i.status]}>{IDX_LABEL[i.status]}</StatusPill>
          </li>
        ))}
      </ul>
    </article>
  );
}

function Memo() {
  const { s } = useStore();
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = readinessMemo(s);
  return (
    <section className="card memo">
      <div className="card-title-row">
        <h3>Closing readiness record</h3>
        <Prov kind="record" detail="assembled from conditions and evidence" />
      </div>
      <p className="fine">Evidence for counsel's decision. It is not a legal opinion or a certificate of compliance, and it regenerates whenever the record changes.</p>
      <div className="btn-row">
        <button className="btn" onClick={() => setShown(!shown)}>{shown ? 'Hide' : 'Preview'} record</button>
        <button
          className="btn ghost"
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setShown(true));
          }}
        >
          {copied ? 'Copied' : 'Copy as text'}
        </button>
      </div>
      {shown && <pre className="memo-text">{text}</pre>}
    </section>
  );
}
