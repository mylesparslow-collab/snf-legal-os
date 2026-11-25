import { useMemo, useState } from 'react';
import { fmt, weekday } from '../domain/dates';
import { DOCS, EDGES, FACTS, NODES, nodeName } from '../compiler/deal';
import { format } from '../compiler/decimal';
import { verify, type Candidate } from '../compiler/extract';
import recorded from '../compiler/extraction.recorded.json';
import { memo, workbook } from '../compiler/exports';
import { indirectHoldings, validate, type EdgeChoice } from '../compiler/graph';
import { PARAMS, defaultValues, type ParamValues } from '../compiler/params';
import { schedule } from '../compiler/schedule';
import { cdphView, cmsView, defaultModel, ohcaView, type ViewRow } from '../compiler/views';

type Tab = 'graph' | 'cdph' | 'cms' | 'ohca' | 'dates' | 'extraction' | 'rules';
const TABS: [Tab, string][] = [
  ['graph', 'Ownership'],
  ['cdph', 'CDPH'],
  ['cms', 'CMS-855A'],
  ['ohca', 'OHCA'],
  ['dates', 'Dates'],
  ['extraction', 'Document check'],
  ['rules', 'Rules'],
];
const OUTCOME = { disclose: ['go', 'Disclose'], 'not-required': ['na', 'Not required'], unresolved: ['bad', 'Unresolved'] } as const;
const STATUS = { 'text-checked': ['go', 'Text checked'], interpretation: ['decide', 'Our reading'], unverified: ['warn', 'Not verified'] } as const;

function download(bytes: Uint8Array, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const Pill = ({ tone, children }: { tone: string; children: React.ReactNode }) => <span className={`pill pill-${tone}`}>{children}</span>;

export function Compiler() {
  const [tab, setTab] = useState<Tab>('graph');
  const [params, setParams] = useState<ParamValues>(defaultValues);
  const [choice, setChoice] = useState<EdgeChoice>({});
  const [closing, setClosing] = useState(FACTS.closing);

  const m = useMemo(() => defaultModel(params, choice), [params, choice]);
  const issues = useMemo(() => validate(m.nodes, m.edges, choice), [m, choice]);
  const cd = useMemo(() => cdphView(m), [m]);
  const cm = useMemo(() => cmsView(m), [m]);
  const oh = useMemo(() => ohcaView(m), [m]);
  const dates = useMemo(() => schedule(closing, FACTS.today, params), [closing, params]);
  const extraction = useMemo(() => (recorded.candidates as Candidate[]).map((c) => verify(c)), []);
  const unresolved = [...cd, ...cm].filter((r) => r.outcome === 'unresolved').length;
  const next = dates.find((d) => d.kind === 'deadline' && d.daysFromToday >= 0);

  const doExport = (kind: 'xlsx' | 'docx') => {
    if (kind === 'xlsx') download(workbook(m, closing), 'cedar-hollow-disclosures.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    else download(memo(m, extraction, closing), 'cedar-hollow-memo.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  };

  return (
    <div className="page compiler">
      <div className="page-head">
        <div>
          <div className="eyebrow">Transaction compiler · {FACTS.firm} (fictional)</div>
          <h1>{FACTS.facility}</h1>
          <p className="fine">{FACTS.matter}. One ownership record, three agency views, dates counted back from closing.</p>
        </div>
        <div className="head-facts">
          <div><span className="fine">Closing</span><strong>{fmt(closing)}</strong></div>
          <div><span className="fine">Next deadline (from {fmt(FACTS.today)})</span><strong>{next ? `${next.daysFromToday} days` : '—'}</strong></div>
          <div><span className="fine">Unresolved</span><strong>{unresolved + issues.length}</strong></div>
        </div>
      </div>

      <div className="banner compiler-banner">
        Every threshold and day count below is a setting with its source and verification status (see Rules). Nothing here is cleared for firm use; an attorney verifies each rule before reliance.
      </div>

      <div className="toolbar compiler-toolbar">
        <label className="field">
          <span>Closing date</span>
          <input type="date" value={closing} onChange={(e) => e.target.value && setClosing(e.target.value)} />
        </label>
        <div className="btn-row">
          <button className="btn small" onClick={() => doExport('xlsx')}>Download Excel (live formulas)</button>
          <button className="btn small ghost" onClick={() => doExport('docx')}>Download Word memo</button>
        </div>
      </div>

      <nav className="tabs" aria-label="Compiler sections">
        {TABS.map(([id, label]) => (
          <a key={id} href="#compiler" className={tab === id ? 'on' : ''} onClick={(e) => { e.preventDefault(); setTab(id); }}>{label}</a>
        ))}
      </nav>

      {tab === 'graph' && <GraphTab choice={choice} setChoice={setChoice} issues={issues.map((i) => i.message)} />}
      {tab === 'cdph' && <ViewTable rows={cd} intro="Change of ownership application under AB 1502 (Health & Saf. Code §§ 1253.3, 1267.5), for the proposed licensee." />}
      {tab === 'cms' && <ViewTable rows={cm} intro="CMS-855A owners and managing control, plus the SNF organizational structure and additional disclosable parties defined in 42 CFR § 424.502." />}
      {tab === 'ohca' && (
        <section>
          <p className="lede">{oh.conclusion}</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Test</th><th>Result</th><th>Detail</th></tr></thead>
            <tbody>{oh.tests.map((t) => (
              <tr key={t.id}><td>{t.label}</td><td><Pill tone={t.result === 'met' ? 'go' : t.result === 'needs-input' ? 'bad' : 'na'}>{t.result === 'met' ? 'Met' : t.result === 'needs-input' ? 'Needs input' : 'Not met'}</Pill></td><td>{t.detail}</td></tr>
            ))}</tbody>
          </table></div>
          <h3 className="section-title">Noticing entities</h3>
          <ViewTable rows={oh.noticing} />
        </section>
      )}
      {tab === 'dates' && (
        <section>
          <p className="lede">Counted from a closing on {weekday(closing)}, {fmt(closing)}. A "before" date that lands on a weekend or holiday moves to the business day before it. Demo holiday calendar.</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Act by</th><th>Item</th><th className="num">From closing</th><th>Note</th></tr></thead>
            <tbody>{dates.map((d) => (
              <tr key={d.id}>
                <td><strong>{fmt(d.actBy)}</strong><div className="fine">{d.daysFromToday < 0 ? 'passed' : `in ${d.daysFromToday} days`}</div></td>
                <td>{d.label} <Pill tone={d.kind === 'deadline' ? 'bad' : d.kind === 'planning' ? 'wait' : 'na'}>{d.kind === 'after-closing' ? 'after closing' : d.kind}</Pill>
                  {d.paramIds.some((p) => PARAMS.find((x) => x.id === p)?.status === 'unverified') && <> <Pill tone="warn">Not verified</Pill></>}</td>
                <td className="num">{d.offsetDays > 0 ? '+' : ''}{d.offsetDays}</td>
                <td>{d.note}{d.moved && <div className="fine">Moved earlier: {d.moved}.</div>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
      {tab === 'extraction' && (
        <section>
          <p className="lede">
            A model read the five deal documents once ({recorded.model}, {recorded.recordedAt}) and proposed {extraction.length} facts, each with a page and a quote.
            Code then checked every one: {extraction.filter((v) => v.accepted).length} passed. A fact that fails any check is not used. The model does no arithmetic and applies no legal test.
          </p>
          <div className="table-wrap"><table>
            <thead><tr><th>Proposed fact</th><th>Quote</th><th>Checks</th><th>Result</th></tr></thead>
            <tbody>{extraction.map((v, i) => (
              <tr key={i}>
                <td>{v.candidate.holder} → {v.candidate.of}{v.candidate.pct ? ` · ${v.candidate.pct}%` : v.candidate.role ? ` · ${v.candidate.role}` : ` · ${v.candidate.kind}`}<div className="fine">{DOCS.find((d) => d.id === v.candidate.docId)?.title ?? v.candidate.docId}, p. {v.candidate.page}</div></td>
                <td className="quote">“{v.candidate.quote}”</td>
                <td><ul className="checks">{v.checks.map((c, j) => <li key={j} className={c.ok ? 'ok' : 'fail'}>{c.ok ? '✓' : '✗'} {c.label}</li>)}</ul></td>
                <td><Pill tone={v.match === 'rejected' ? 'bad' : v.match === 'conflicts' ? 'decide' : v.match === 'new' ? 'wait' : 'go'}>{v.match}</Pill><div className="fine">{v.note}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}
      {tab === 'rules' && (
        <section>
          <p className="lede">Change a value and every view, date and export re-runs. Status says whether the number was read in the primary text (on 2026-11-25) or only taken from the research report.</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Rule</th><th>Value</th><th>Status</th><th>Source</th></tr></thead>
            <tbody>{PARAMS.map((p) => (
              <tr key={p.id}>
                <td>{p.label}{p.note && <div className="fine">{p.note}</div>}</td>
                <td><input className="param-input" aria-label={p.label} value={params[p.id]} inputMode="decimal"
                  onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && e.target.value !== '' && setParams({ ...params, [p.id]: e.target.value })} /> <span className="fine">{p.unit}</span></td>
                <td><Pill tone={STATUS[p.status][0]}>{STATUS[p.status][1]}</Pill></td>
                <td>{p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.source}</a> : p.source}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <button className="btn small ghost" onClick={() => setParams(defaultValues())}>Restore defaults</button>
        </section>
      )}
    </div>
  );
}

function GraphTab({ choice, setChoice, issues }: { choice: EdgeChoice; setChoice: (c: EdgeChoice) => void; issues: string[] }) {
  const holdings = indirectHoldings(EDGES, FACTS.licenseeId, choice);
  const conflicts = EDGES.filter((e) => e.docPct && e.docPct !== e.pct);
  return (
    <section>
      {issues.length > 0 && <div className="panel issues-panel"><h2 className="panel-title">Needs a decision</h2><ul>{issues.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {conflicts.length > 0 && (
        <div className="btn-row">
          <span className="fine">Ridgeline ownership: intake vs. Management Agreement, Schedule 4</span>
          <div className="seg-control" role="group" aria-label="Figure to use">
            {(['intake', 'document'] as const).map((k) => (
              <button key={k} className={(choice.e9 ?? 'intake') === k ? 'on' : ''} onClick={() => setChoice(Object.fromEntries(conflicts.map((e) => [e.id, k])))}>
                {k === 'intake' ? 'Use intake (70 / 30)' : 'Use document (65 / 35)'}
              </button>
            ))}
          </div>
        </div>
      )}
      <h3 className="section-title">Who holds {nodeName(FACTS.licenseeId)}</h3>
      <p className="fine">Exact decimal arithmetic: each path multiplies the percentage at every tier. A result marked … does not terminate and is shown rounded.</p>
      <div className="table-wrap"><table>
        <thead><tr><th>Holder</th><th className="num">Share</th><th>Path</th></tr></thead>
        <tbody>{holdings.map((h) => {
          const n = NODES.find((x) => x.id === h.holderId)!;
          return (
            <tr key={h.holderId}>
              <td>{n.name}{n.tags?.filter((t) => t !== 'new-entity').map((t) => <span key={t} className="pill pill-neutral tag-pill">{t}</span>)}{n.note && <div className="fine">{n.note}</div>}</td>
              <td className="num mono">{format(h.total)}%</td>
              <td className="fine">{h.paths.map((p, i) => <div key={i}>{p.steps.map((s) => `${format(s.pct)}%`).join(' × ')} = {format(p.product)}%</div>)}</td>
            </tr>
          );
        })}</tbody>
      </table></div>
      <h3 className="section-title">Direct ownership record</h3>
      <div className="table-wrap"><table>
        <thead><tr><th>Owner</th><th>Owned</th><th className="num">%</th><th>Interest</th></tr></thead>
        <tbody>{EDGES.map((e) => (
          <tr key={e.id}><td>{nodeName(e.ownerId)}</td><td>{nodeName(e.ownedId)}</td>
            <td className="num mono">{choice[e.id] === 'document' && e.docPct ? e.docPct : e.pct}{e.docPct && <div className="fine">doc: {e.docPct}</div>}</td><td>{e.interest}</td></tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}

function ViewTable({ rows, intro }: { rows: ViewRow[]; intro?: string }) {
  const [hide, setHide] = useState(true);
  const shown = hide ? rows.filter((r) => r.outcome !== 'not-required') : rows;
  const sections = [...new Set(shown.map((r) => r.section))];
  return (
    <section>
      {intro && <p className="lede">{intro}</p>}
      <div className="seg-control" role="group" aria-label="Filter">
        <button className={hide ? 'on' : ''} onClick={() => setHide(true)}>Disclose and unresolved</button>
        <button className={!hide ? 'on' : ''} onClick={() => setHide(false)}>Everyone checked</button>
      </div>
      {sections.map((s) => (
        <div key={s}>
          <h3 className="section-title">{s}</h3>
          <div className="table-wrap"><table>
            <tbody>{shown.filter((r) => r.section === s).map((r, i) => (
              <tr key={i}>
                <td style={{ width: '30%' }}>{r.partyId === '_admin' ? 'Administrator and medical director' : nodeName(r.partyId)}</td>
                <td style={{ width: '11%' }}><Pill tone={OUTCOME[r.outcome][0]}>{OUTCOME[r.outcome][1]}</Pill></td>
                <td className="num mono" style={{ width: '11%' }}>{r.pct ? `${format(r.pct, 6)}%` : ''}</td>
                <td>{r.basis}{r.interpretation && <> <Pill tone="decide">Our reading</Pill></>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </div>
      ))}
    </section>
  );
}
