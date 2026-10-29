import { useState } from 'react';
import { CONTROL_RIGHTS, partyName } from '../data/seed';
import { computeIndirect, edgesForView } from '../domain/ownership';
import type { OwnershipEdge } from '../domain/types';
import { useStore } from '../state/store';
import { Evidence, go, Prov, StatusPill } from './common';

type View = 'questionnaire' | 'orgchart' | 'working';

const VIEW_LABEL: Record<View, string> = {
  questionnaire: 'Questionnaire (Aug 20)',
  orgchart: 'Org chart v3 (Oct 9)',
  working: 'Working structure',
};

export function OwnershipTab() {
  const { s } = useStore();
  const unresolved = s.issues.find((i) => i.id === 'i-tamarack')!.status === 'open';
  const views: View[] = unresolved ? ['questionnaire', 'orgchart'] : ['working', 'questionnaire', 'orgchart'];
  const [view, setView] = useState<View>(views[0]);
  const active = views.includes(view) ? view : views[0];
  const edges = edgesForView(s.edges, active).filter((e) => active !== 'working' || e.id !== 'e6');

  return (
    <div className="stack">
      {unresolved && (
        <div className="banner warn">
          <strong>Two sources disagree about who holds the Class B interest.</strong> The system keeps both versions until a reviewer resolves ISS-02. It does not pick one.
          <button className="btn small" onClick={() => go({ tab: 'issues', id: 'i-tamarack' })}>Review ISS-02</button>
        </div>
      )}
      <div className="toolbar">
        <div className="seg-control" role="group" aria-label="Source view">
          {views.map((v) => (
            <button key={v} className={active === v ? 'on' : ''} onClick={() => setView(v)}>{VIEW_LABEL[v]}</button>
          ))}
        </div>
        <span className="fine">Percentages are multiplied in code along every path. Unknown portions stay unknown.</span>
      </div>

      <div className="two-col">
        <section className="card">
          <h3>Chart</h3>
          <Chart edges={edges} />
        </section>
        <section className="card">
          <h3>Indirect interests in each operating company</h3>
          <Indirect edges={edges} />
          <p className="fine">Disclosure views apply role- and entity-type-specific definitions. There is no universal 5% cutoff: LLC members and managers, trustees, and parties with managerial control are evaluated separately.</p>
        </section>
      </div>

      <section className="card">
        <h3>Who can actually direct the facilities</h3>
        <p className="fine">Rights pulled from every related agreement. Economic ownership and decision rights are shown separately because they diverge here.</p>
        <div className="table-wrap">
          <table className="rights">
            <thead><tr><th>Right</th><th>Holder</th><th>Instrument</th><th>Effective</th><th>Flag</th></tr></thead>
            <tbody>
              {CONTROL_RIGHTS.map((r) => (
                <tr key={r.id}>
                  <td>{r.right}</td>
                  <td><strong>{partyName(r.holderId)}</strong></td>
                  <td><Evidence e={{ ...r.evidence, label: r.instrument }} compact /></td>
                  <td>{r.effective}</td>
                  <td>{r.flag ? <span className="warn-text">{r.flag}</span> : <span className="fine">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Prov kind="ai" detail="clauses extracted; significance is counsel's call" />
      </section>
    </div>
  );
}

function Chart({ edges }: { edges: OwnershipEdge[] }) {
  // Lay out by distance above the operating companies.
  const depth = new Map<string, number>([['op-lk', 0], ['op-mh', 0], ['op-bv', 0]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const e of edges) {
      const d = depth.get(e.ownedId);
      if (d != null && (depth.get(e.ownerId) ?? -1) < d + 1) {
        depth.set(e.ownerId, d + 1);
        changed = true;
      }
    }
  }
  const unknownAbove = new Map<string, number>();
  for (const owned of new Set(edges.map((e) => e.ownedId))) {
    const sum = edges.filter((e) => e.ownedId === owned).reduce((t, e) => t + (e.pct ?? 0), 0);
    if (sum < 100) unknownAbove.set(owned, 100 - sum);
  }
  const maxD = Math.max(...depth.values());
  const rows: string[][] = [];
  for (let d = maxD; d >= 0; d--) rows.push([...depth.entries()].filter(([, v]) => v === d).map(([k]) => k));

  return (
    <div className="chart">
      {rows.map((row, i) => (
        <div className="chart-row" key={i}>
          {row.map((id) => {
            const out = edges.filter((e) => e.ownerId === id);
            const contested = out.some((e) => e.status !== 'verified');
            return (
              <div key={id} className={`node ${contested ? 'contested' : ''}`}>
                <strong>{partyName(id)}</strong>
                {out.slice(0, 1).map((e) => (
                  <span key={e.id} className="edge-label">
                    {out.length > 1 ? `100% of each Opco` : `${e.pct ?? '?'}% ${e.interestClass} of ${partyName(e.ownedId).replace(' LLC', '')}`}
                  </span>
                ))}
                {out.map((e) => e.status !== 'verified' && <StatusPill key={e.id} tone={e.status === 'contradicted' ? 'bad' : 'warn'}>{e.status === 'asserted' ? 'One source only' : 'Disputed by another source'}</StatusPill>)}
              </div>
            );
          })}
          {[...unknownAbove.entries()]
            .filter(([owned]) => (depth.get(owned) ?? -1) + 1 === maxD - i)
            .map(([owned, pct]) => (
              <div key={`u-${owned}`} className="node unknown">
                <strong>Unidentified holder(s)</strong>
                <span className="edge-label">{pct}% of {partyName(owned).replace(' LLC', '')}</span>
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function Indirect({ edges }: { edges: OwnershipEdge[] }) {
  const r = computeIndirect(edges, 'op-lk');
  return (
    <div className="table-wrap">
      <table className="indirect">
        <thead><tr><th>Ultimate holder</th><th className="num">Economic</th><th className="num">Voting</th><th>Path</th></tr></thead>
        <tbody>
          {r.holdings.map((h) => (
            <tr key={h.holderId}>
              <td><strong>{partyName(h.holderId)}</strong></td>
              <td className="num">{h.economic.toFixed(1)}%</td>
              <td className="num">{h.voting.toFixed(1)}%</td>
              <td className="fine">{h.paths.map((p) => p.map((x) => partyName(x).replace(/ (LLC|LP)$/, '')).join(' → ')).join('; ')}</td>
            </tr>
          ))}
          {r.unknownEconomic > 0 && (
            <tr className="unknown-row">
              <td><strong>Unknown</strong></td>
              <td className="num">{r.unknownEconomic.toFixed(1)}%</td>
              <td className="num">{r.unknownVoting.toFixed(1)}%</td>
              <td className="fine">Not in the record. Shown as unknown, not zero.</td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="fine">Same result for all three operating companies; each is 100% owned by Juniper Care Partners LLC.</p>
    </div>
  );
}
