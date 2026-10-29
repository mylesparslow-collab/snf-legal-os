import { useEffect, useState } from 'react';
import { DOCS, FACILITIES, MATTER, PARTIES, TEAM } from '../data/seed';
import { daysBetween, fmt } from '../domain/dates';
import { computeConditions, statusStatement, STATUS_META, target, workQueue } from '../domain/derive';
import { classify, REGIMES, ruleFor, RULES } from '../domain/rules';
import type { ConditionStatus, RegimeCell } from '../domain/types';
import { useStore } from '../state/store';
import { DecisionCard, IssueCard } from './cards';
import { ClocksTab } from './Clocks';
import { Evidence, go, Prov, Sources, StatusPill, useDocs } from './common';
import { OwnershipTab } from './Ownership';
import { WorkTab } from './WorkProducts';

const TABS: [string, string][] = [
  ['overview', 'Overview'],
  ['issues', 'Issues'],
  ['closing', 'Path to closing'],
  ['classification', 'Classification'],
  ['ownership', 'Ownership'],
  ['clocks', 'Dates and agency'],
  ['work', 'Work products'],
  ['documents', 'Documents'],
  ['parties', 'Parties'],
];

export function Matter({ tab, focus }: { tab: string; focus?: string }) {
  const { s } = useStore();
  const openIssues = s.issues.filter((i) => i.status === 'open').length;
  useEffect(() => {
    if (focus) requestAnimationFrame(() => document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [tab, focus]);

  return (
    <div className="matter">
      <header className="page-head">
        <div>
          <div className="eyebrow">{MATTER.id} · {MATTER.side} · Synthetic matter</div>
          <h1>{MATTER.name}</h1>
          <p className="lede">{MATTER.description}</p>
        </div>
        <div className="head-facts">
          <div><span className="fine">Target</span><strong>{fmt(target(s))}</strong></div>
          <div><span className="fine">Days left</span><strong className="num">{daysBetween(s.today, target(s))}</strong></div>
          <div><span className="fine">Open issues</span><strong className="num">{openIssues}</strong></div>
        </div>
      </header>
      <nav className="tabs" aria-label="Matter sections">
        {TABS.map(([id, label]) => (
          <a key={id} href={`#matter-${id}`} className={tab === id ? 'on' : ''} aria-current={tab === id ? 'page' : undefined}>
            {label}
            {id === 'issues' && openIssues > 0 && <span className="count">{openIssues}</span>}
          </a>
        ))}
      </nav>
      <div className="tab-body">
        {tab === 'overview' && <Overview focus={focus} />}
        {tab === 'issues' && <IssuesTab focus={focus} />}
        {tab === 'closing' && <ClosingTab />}
        {tab === 'classification' && <ClassificationTab />}
        {tab === 'ownership' && <OwnershipTab />}
        {tab === 'clocks' && <ClocksTab focus={focus} />}
        {tab === 'work' && <WorkTab focus={focus} />}
        {tab === 'documents' && <DocumentsTab />}
        {tab === 'parties' && <PartiesTab />}
      </div>
    </div>
  );
}

function Overview({ focus }: { focus?: string }) {
  const { s } = useStore();
  const conds = computeConditions(s);
  const next = workQueue(s).slice(0, 5);
  const counts = Object.entries(STATUS_META)
    .map(([k, m]) => [k as ConditionStatus, m, conds.filter((c) => c.status === k).length] as const)
    .filter(([, , n]) => n > 0);
  const prepared = s.workProducts.filter((w) => w.status === 'draft' || w.status === 'in-review').slice(0, 6);

  return (
    <div className="overview">
      <section className="statement">
        <div className="eyebrow">Where this stands</div>
        <p>{statusStatement(s)}</p>
        <div className="status-bar" role="img" aria-label="Closing conditions by status">
          {counts.map(([k, m, n]) => (
            <span key={k} className={`seg tone-${m.tone}`} style={{ flexGrow: n }} title={`${m.label}: ${n}`} />
          ))}
        </div>
        <div className="legend">
          {counts.map(([k, m, n]) => (
            <button key={k} className="legend-item" onClick={() => go({ tab: 'closing' })}>
              <span className={`dot tone-${m.tone}`} />{m.label} <strong>{n}</strong>
            </button>
          ))}
        </div>
      </section>

      <div className="two-col">
        <section>
          <h2 className="section-title">Decisions in front of the partner</h2>
          <div className="stack">
            {s.decisions.map((d) => (
              <DecisionCard key={d.id} d={d} focused={focus === d.id} />
            ))}
          </div>
        </section>
        <section>
          <h2 className="section-title">Next actions</h2>
          <ol className="next-list">
            {next.map((n) => (
              <li key={n.id}>
                <button className="link-row" onClick={() => go(n.link)}>
                  <span className="qverb small">{n.verb}</span>
                  <span>
                    <span className="qtitle">{n.title}</span>
                    <span className="fine"> · {TEAM.find((t) => t.role === n.role)!.name}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <h2 className="section-title">Prepared for review</h2>
          <ul className="prepared">
            {prepared.map((w) => (
              <li key={w.id}>
                <button className="link-row" onClick={() => go({ tab: 'work', id: w.id })}>
                  <span>{w.title}</span>
                  {w.revisions.some((r) => r.state === 'proposed') ? <StatusPill tone="go">Revisions proposed</StatusPill> : <StatusPill tone="neutral">{w.status === 'in-review' ? 'In review' : 'Draft'}</StatusPill>}
                </button>
              </li>
            ))}
          </ul>
          <h2 className="section-title">Facilities</h2>
          <ul className="prepared">
            {FACILITIES.map((f) => (
              <li key={f.id}>
                <button className="link-row" onClick={() => go({ facility: f.id })}>
                  <span>{f.tradeName}</span>
                  <span className="fine">{f.beds} beds · {f.county}{f.hudInsured ? ' · HUD 232' : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function IssuesTab({ focus }: { focus?: string }) {
  const { s } = useStore();
  const [show, setShow] = useState<'open' | 'all'>('open');
  const list = s.issues.filter((i) => show === 'all' || i.status === 'open');
  return (
    <div className="stack">
      <div className="toolbar">
        <p className="lede narrow">Issues come from comparing documents against each other and from looking for evidence that should exist but does not. Each one cites the pages it relies on. A missing document is a question, not a finding.</p>
        <div className="seg-control" role="group" aria-label="Filter">
          <button className={show === 'open' ? 'on' : ''} onClick={() => setShow('open')}>Open</button>
          <button className={show === 'all' ? 'on' : ''} onClick={() => setShow('all')}>All</button>
        </div>
      </div>
      {list.length === 0 && <div className="empty">No open issues. Switch to All to see how each was resolved.</div>}
      {list.map((i) => (
        <IssueCard key={i.id} issue={i} focused={focus === i.id} />
      ))}
    </div>
  );
}

function ClosingTab() {
  const { s } = useStore();
  const conds = computeConditions(s);
  const groups = (Object.keys(STATUS_META) as ConditionStatus[]).sort((a, b) => STATUS_META[a].order - STATUS_META[b].order);
  const controllable = conds.filter((c) => !c.external && c.status !== 'complete' && c.status !== 'not-applicable').length;
  const external = conds.filter((c) => c.external && c.status !== 'complete').length;
  return (
    <div className="stack">
      <section className="statement">
        <div className="eyebrow">What prevents closing on the intended terms</div>
        <p>
          {controllable} item{controllable === 1 ? ' is' : 's are'} within the team's control. {external} depend{external === 1 ? 's' : ''} on an agency, lender, or landlord whose timing is unknown. No agency review period is shown as a closing date.
        </p>
      </section>
      {groups.map((g) => {
        const items = conds.filter((c) => c.status === g);
        if (!items.length) return null;
        const m = STATUS_META[g];
        return (
          <section key={g} className="cond-group">
            <h2 className="section-title"><span className={`dot tone-${m.tone}`} />{m.label} <span className="fine">{items.length}</span></h2>
            <div className="table-wrap">
              <table className="conds">
                <tbody>
                  {items.map((c) => (
                    <tr key={c.id}>
                      <td className="c-main">
                        <strong>{c.title}</strong>
                        <div>{c.reason}</div>
                        {c.next && <div className="next-step">Next: {c.next}</div>}
                        {c.evidence?.map((e, i) => <Evidence key={i} e={e} compact />)}
                      </td>
                      <td className="c-src">
                        <div className="fine">Created by</div>
                        <div>{c.source}</div>
                      </td>
                      <td className="c-who">
                        <div className="fine">Responsible</div>
                        <div>{c.responsible}</div>
                        <div className="fine">{FACILITIES.filter((f) => c.facilityIds.includes(f.id)).map((f) => f.shortName).join(', ')}</div>
                      </td>
                      <td className="c-act">
                        {c.dependsOn.length > 0 && <div className="fine">After: {c.dependsOn.map((d) => conds.find((x) => x.id === d)?.title).join('; ')}</div>}
                        {c.link && <button className="btn small" onClick={() => go(c.link!)}>Open</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}

const CELL_TONE = { applicable: 'go', 'not-applicable': 'na', unresolved: 'decide' } as const;
const CELL_LABEL = { applicable: 'Applies', 'not-applicable': 'Not applicable', unresolved: 'Unresolved' } as const;

function ClassificationTab() {
  const { s, dispatch } = useStore();
  const matrix = FACILITIES.map((f) => classify(f, s));
  const [sel, setSel] = useState<RegimeCell>(matrix[0][3]);
  const current = matrix.flat().find((c) => c.regime === sel.regime && c.facilityId === sel.facilityId)!;
  const rule = RULES.find((r) => r.ruleId === current.ruleId && r.version === current.ruleVersion);
  const ohca = ruleFor('ohca', target(s));
  const req = s.requests.find((r) => r.id === 'req-ohca')!;

  return (
    <div className="stack">
      <p className="lede narrow">
        One deal, classified separately under each regime. A cell is applicable, not applicable with a stated rationale, or unresolved. Rules are versioned by effective date: for a {fmt(target(s))} transaction the OHCA rule in force is <strong>{ohca?.version}</strong>.
      </p>
      <div className="matrix-wrap">
        <div className="table-wrap">
          <table className="matrix">
            <thead>
              <tr>
                <th>Regime</th>
                {FACILITIES.map((f) => <th key={f.id}>{f.shortName}</th>)}
              </tr>
            </thead>
            <tbody>
              {REGIMES.map((r, ri) => (
                <tr key={r.id}>
                  <th scope="row">{r.label}</th>
                  {matrix.map((col) => {
                    const c = col[ri];
                    const on = c.regime === sel.regime && c.facilityId === sel.facilityId;
                    return (
                      <td key={c.facilityId}>
                        <button className={`cell tone-${CELL_TONE[c.status]} ${on ? 'on' : ''}`} onClick={() => setSel(c)}>
                          <span className="cell-status">{CELL_LABEL[c.status]}</span>
                          <span className="cell-head">{c.headline}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <aside className="card cell-detail" aria-live="polite">
          <div className="card-title-row">
            <StatusPill tone={CELL_TONE[current.status]}>{CELL_LABEL[current.status]}</StatusPill>
            <span className="fine">{REGIMES.find((r) => r.id === current.regime)!.label} · {FACILITIES.find((f) => f.id === current.facilityId)!.shortName}</span>
          </div>
          <h3>{current.headline}</h3>
          <p>{current.rationale}</p>
          {current.route && <p className="route">{current.route}</p>}
          {current.evidence?.map((e, i) => <Evidence key={i} e={e} />)}
          {current.questions && current.status === 'unresolved' && (
            <div className="questions">
              <div className="eyebrow">Facts needed</div>
              <ul>{current.questions.map((q) => <li key={q}>{q}</li>)}</ul>
              {current.regime === 'ohca' && req.status === 'draft' && (
                <button className="btn primary" disabled={s.role === 'partner' ? false : s.role !== 'paralegal'} onClick={() => dispatch({ type: 'sendRequest', id: 'req-ohca' })}>Send questions to client</button>
              )}
              {current.regime === 'ohca' && req.status === 'sent' && <p className="fine">Sent {fmt(req.sentAt)}. Answers go to counsel for review; nothing here clears automatically.</p>}
              {current.regime === 'medicare' && <button className="btn" onClick={() => go({ tab: 'overview', id: 'd-pa' })}>Go to partner decision</button>}
            </div>
          )}
          <div className="rule-meta">
            <Prov kind="rule" detail={`${current.ruleId} v${current.ruleVersion}`} />
            {rule && (
              <dl>
                <dt>In force</dt><dd>{fmt(rule.effectiveFrom)} – {rule.effectiveTo ? fmt(rule.effectiveTo) : 'open'}</dd>
                <dt>Reviewer</dt><dd>{rule.reviewer}</dd>
                <dt>Rule note</dt><dd>{rule.note}</dd>
              </dl>
            )}
            <Sources ids={current.sources} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function DocumentsTab() {
  const { open } = useDocs();
  const [q, setQ] = useState('');
  const list = DOCS.filter((d) => (d.title + d.docType + d.pages.map((p) => p.text).join(' ')).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="stack">
      <div className="toolbar">
        <label className="field grow">
          <span className="sr-only">Search documents</span>
          <input id="doc-search" type="search" placeholder="Search titles and text, e.g. Administrator" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <span className="fine">{list.length} of {DOCS.length} documents</span>
      </div>
      <div className="table-wrap">
        <table className="docs">
          <thead>
            <tr><th>Document</th><th>Type</th><th>Version</th><th>Dated</th><th>Facilities</th></tr>
          </thead>
          <tbody>
            {list.map((d) => (
              <tr key={d.id} onClick={() => open({ docId: d.id })} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && open({ docId: d.id })}>
                <td><strong>{d.title}</strong></td>
                <td>{d.docType}</td>
                <td><StatusPill tone={d.status === 'executed' || d.status === 'filed' ? 'lock' : 'neutral'}>{d.version}</StatusPill></td>
                <td className="num">{fmt(d.date)}</td>
                <td>{d.facilityIds.length === 3 ? 'All' : d.facilityIds.map((id) => FACILITIES.find((f) => f.id === id)!.shortName).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const REP_LABEL = {
  client: 'Client',
  'affiliate-separately-represented': 'Affiliate, separately represented',
  counterparty: 'Counterparty',
  'third-party': 'Recorded, not a client',
  agency: 'Agency',
} as const;

function PartiesTab() {
  return (
    <div className="stack">
      <section className="card">
        <h3>Representation and scope</h3>
        <dl className="kv">
          <dt>Client</dt><dd>{MATTER.client}</dd>
          <dt>Side</dt><dd>{MATTER.side}</dd>
          <dt>Conflicts</dt><dd>{MATTER.conflicts}</dd>
          <dt>Team</dt><dd>{TEAM.map((t) => `${t.name} (${t.title})`).join(', ')}</dd>
          <dt>Sharing</dt><dd>Juniper Realty Holdings has its own counsel. Its confidential material is not visible in this matter, and this matter's analysis is not shared with it without a deliberate release.</dd>
        </dl>
      </section>
      <div className="table-wrap">
        <table className="parties">
          <thead><tr><th>Party</th><th>Type</th><th>Role in deal</th><th>Representation</th></tr></thead>
          <tbody>
            {PARTIES.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong>{p.counsel && <div className="fine">Counsel: {p.counsel}</div>}</td>
                <td>{p.kind}</td>
                <td>{p.roleInDeal}</td>
                <td><StatusPill tone={p.representation === 'client' ? 'go' : p.representation === 'affiliate-separately-represented' ? 'warn' : 'neutral'}>{REP_LABEL[p.representation]}</StatusPill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
