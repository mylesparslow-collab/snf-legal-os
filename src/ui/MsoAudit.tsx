import { useMemo, useState } from 'react';
import { FACTS } from '../compiler/deal';
import { format } from '../compiler/decimal';
import type { EdgeChoice } from '../compiler/graph';
import { fmt } from '../domain/dates';
import { audit, capTable, docTitle, name, npStatuses, traceMatrix, type Outcome } from '../mso/audit';
import { CAP_TABLE, DOC_SHORT, JOC, PE_STATUS } from '../mso/deal';
import { MSO_PARAMS, msoDefaults, type MsoValues } from '../mso/params';
import { SB351_ITEMS } from '../mso/rules';

type Tab = 'scope' | 'clauses' | 'matrix' | 'cap' | 'np' | 'rules';
const TABS: [Tab, string][] = [
  ['scope', 'Who is covered'],
  ['clauses', 'Clauses'],
  ['matrix', 'Trace matrix'],
  ['cap', 'Cap table'],
  ['np', 'Nurse practitioners'],
  ['rules', 'Rules'],
];

const OUTCOME: Record<Outcome, [string, string]> = {
  void: ['bad', 'Void'],
  'void-in-part': ['bad', 'Void in part'],
  unresolved: ['warn', 'Unresolved'],
  review: ['decide', 'Attorney review'],
  'safe-harbor': ['go', 'Allowed (§ 1191(h))'],
  ok: ['go', 'No issue found'],
  outside: ['na', 'Outside SB 351'],
  rejected: ['bad', 'Quote not found'],
};
const STATUS = { 'text-checked': ['go', 'Text checked'], interpretation: ['decide', 'Our reading'], unverified: ['warn', 'Not verified'] } as const;
const REACH = { yes: ['bad', 'Applies'], no: ['na', 'Does not apply'], unresolved: ['warn', 'Unresolved'] } as const;

const Pill = ({ tone, children }: { tone: string; children: React.ReactNode }) => <span className={`pill pill-${tone}`}>{children}</span>;

export function MsoAudit() {
  const [tab, setTab] = useState<Tab>('scope');
  const [params, setParams] = useState<MsoValues>(msoDefaults);
  const [choice, setChoice] = useState<EdgeChoice>({});
  const [proposed, setProposed] = useState(false);

  const a = useMemo(() => audit(params, choice), [params, choice]);
  const matrix = useMemo(() => traceMatrix(a.findings), [a]);
  const cap = useMemo(() => capTable(proposed ? CAP_TABLE.proposed : CAP_TABLE.current, params), [proposed, params]);
  const nps = useMemo(() => npStatuses(FACTS.today, params), [params]);
  const voids = a.findings.filter((f) => f.outcome === 'void' || f.outcome === 'void-in-part').length;
  const open = a.findings.filter((f) => f.outcome === 'unresolved' || f.outcome === 'review').length + (cap.ok ? 0 : 1) + nps.filter((n) => !n.roleOk).length;

  return (
    <div className="page compiler">
      <div className="page-head">
        <div>
          <div className="eyebrow">MSO and friendly-PC audit · {FACTS.firm} (fictional)</div>
          <h1>Alder Springs Medical Group</h1>
          <p className="fine">
            The physician group that staffs {FACTS.facility}, managed by Ridgeline Care Management, Inc. Checked against SB 351 (Health & Saf. Code §§ 1190–1192),
            Corp. Code § 13401.5 and the nurse practitioner statutes.
          </p>
        </div>
        <div className="head-facts">
          <div><span className="fine">Clauses checked</span><strong>{a.findings.length}</strong></div>
          <div><span className="fine">Void or void in part</span><strong>{voids}</strong></div>
          <div><span className="fine">Open items</span><strong>{open}</strong></div>
        </div>
      </div>

      <div className="banner compiler-banner">
        Fictional record. Clauses are coded by hand and each quote is checked against its page. Every rule and setting is listed under Rules with its source; an attorney verifies each one before reliance. Not cleared for firm use.
      </div>

      <nav className="tabs" aria-label="MSO audit sections">
        {TABS.map(([id, label]) => (
          <a key={id} href="#mso" className={tab === id ? 'on' : ''} onClick={(e) => { e.preventDefault(); setTab(id); }}>{label}</a>
        ))}
      </nav>

      {tab === 'scope' && (
        <section>
          <p className="lede">
            SB 351 reaches a private equity group or hedge fund involved with a physician or dental practice, and any entity it controls directly. Ridgeline's ownership comes from the Compiler's record, so the Ridgeline conflict carries over.
          </p>
          <div className="btn-row">
            <span className="fine">Ridgeline ownership figure</span>
            <div className="seg-control" role="group" aria-label="Figure to use">
              {(['intake', 'document'] as const).map((k) => (
                <button key={k} className={(choice.e9 ?? 'intake') === k ? 'on' : ''} onClick={() => setChoice({ e9: k, e10: k })}>
                  {k === 'intake' ? 'Intake (70 / 30)' : 'Management Agreement (65 / 35)'}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap"><table>
            <thead><tr><th>Arrangement</th><th>Practice</th><th>Counterparty</th><th>§ 1191(a), (c)</th><th>§ 1191(d)</th></tr></thead>
            <tbody>{a.gates.map((g) => (
              <tr key={g.arrangement.id}>
                <td><strong>{g.arrangement.title}</strong><div className="fine">{g.arrangement.docIds.map(docTitle).join('; ')}</div></td>
                <td>{g.practiceDetail}</td>
                <td>{g.counterpartyDetail}{g.counterparty === 'controlled' && <> <Pill tone="decide">Our reading</Pill></>}</td>
                <td><Pill tone={REACH[g.powers][0]}>{REACH[g.powers][1]}</Pill></td>
                <td><Pill tone={REACH[g.covenants][0]}>{REACH[g.covenants][1]}</Pill></td>
              </tr>
            ))}</tbody>
          </table></div>
          <h3 className="section-title">Who counts as private equity (§ 1190)</h3>
          <div className="table-wrap"><table>
            <tbody>{PE_STATUS.map((p) => (
              <tr key={p.id}>
                <td style={{ width: '32%' }}>{name(p.id)}</td>
                <td style={{ width: '16%' }}><Pill tone={p.status === 'pe-group' ? 'bad' : 'na'}>{p.status === 'pe-group' ? 'Private equity group' : p.status === 'excluded' ? 'Excluded' : 'Not private equity'}</Pill></td>
                <td>{p.basis} <Pill tone="decide">Our reading</Pill></td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}

      {tab === 'clauses' && (
        <section>
          <p className="lede">
            Each clause was coded with the SB 351 item it touches and who holds the power. Code checks the quote against the page, then applies the rule. A void provision is void on its own; the rest of the contract is a separate question (§ 1192 is the severability clause).
          </p>
          {a.gates.map((g) => {
            const fs = a.findings.filter((f) => f.clause.arrangementId === g.arrangement.id);
            return (
              <div key={g.arrangement.id}>
                <h3 className="section-title">{g.arrangement.title}</h3>
                <div className="table-wrap"><table>
                  <thead><tr><th>Clause</th><th>Quote</th><th>Result</th><th>Why</th></tr></thead>
                  <tbody>{fs.map((f) => (
                    <tr key={f.clause.id}>
                      <td style={{ width: '18%' }}>{SB351_ITEMS.find((i) => i.id === f.clause.items[0])!.label}<div className="fine">{DOC_SHORT[f.clause.docId] ?? docTitle(f.clause.docId)}, p. {f.clause.page}</div></td>
                      <td className="quote">“{f.clause.quote}”</td>
                      <td style={{ width: '12%' }}><Pill tone={OUTCOME[f.outcome][0]}>{OUTCOME[f.outcome][1]}</Pill></td>
                      <td>{f.basis}{f.interpretation && <> <Pill tone="decide">Our reading</Pill></>}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              </div>
            );
          })}
          <p className="fine">Committee seats come from the charter: “{JOC.quote}”</p>
        </section>
      )}

      {tab === 'matrix' && (
        <section>
          <p className="lede">Every SB 351 item against every document in the deal suite. An empty cell means no coded clause in that document touches the item.</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Item</th>{matrix.docIds.map((d) => <th key={d} title={docTitle(d)}>{DOC_SHORT[d] ?? d}</th>)}</tr></thead>
            <tbody>{matrix.rows.map((r) => (
              <tr key={r.item.id}>
                <td>{r.item.label}<div className="fine">{r.item.cite}</div></td>
                {matrix.docIds.map((d) => (
                  <td key={d}>{r.cells[d].map((f) => <Pill key={f.clause.id} tone={OUTCOME[f.outcome][0]}>{OUTCOME[f.outcome][1]}</Pill>)}</td>
                ))}
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}

      {tab === 'cap' && (
        <section>
          <p className="lede">
            Corp. Code § 13401.5 sets two limits for a medical corporation. Listed non-physician licensees may hold at most {params['mk.shareCap']}% of the shares, and there may be no more of them than physician shareholders.
            A nurse practitioner holds shares here as a registered nurse.
          </p>
          <div className="seg-control" role="group" aria-label="Cap table">
            <button className={!proposed ? 'on' : ''} onClick={() => setProposed(false)}>Current</button>
            <button className={proposed ? 'on' : ''} onClick={() => setProposed(true)}>Proposed fix</button>
          </div>
          {proposed && <p className="fine">{CAP_TABLE.proposedNote}</p>}
          <div className="table-wrap"><table>
            <thead><tr><th>Shareholder</th><th>License</th><th className="num">Shares</th><th className="num">%</th></tr></thead>
            <tbody>{cap.rows.map((r) => (
              <tr key={r.partyId}>
                <td>{name(r.partyId)}</td>
                <td>{r.license} <Pill tone={r.category === 'physician' ? 'neutral' : r.category === 'listed' ? 'wait' : 'bad'}>{r.category === 'physician' ? 'physician' : r.category === 'listed' ? 'listed in (a)' : 'not listed'}</Pill></td>
                <td className="num mono">{format(r.shares)}</td>
                <td className="num mono">{format(r.pct, 4)}%</td>
              </tr>
            ))}</tbody>
          </table></div>
          <h3 className="section-title">Tests</h3>
          <div className="table-wrap"><table>
            <tbody>{cap.tests.map((t) => (
              <tr key={t.id}><td style={{ width: '45%' }}>{t.label}</td><td style={{ width: '10%' }}><Pill tone={t.ok ? 'go' : 'bad'}>{t.ok ? 'Pass' : 'Fail'}</Pill></td><td>{t.detail}</td></tr>
            ))}</tbody>
          </table></div>
          <p className="fine">License status was not looked up. A real check would confirm each license with the issuing board.</p>
        </section>
      )}

      {tab === 'np' && (
        <section>
          <p className="lede">
            A nurse practitioner who finishes the transition to practice ({params['np.transitionHours']} hours or {params['np.transitionYears']} full-time years) can work without standardized procedures in the settings § 2837.103 lists, which include a skilled nursing facility where physicians practice.
            Working outside those settings needs a § 2837.104 certificate, which takes {params['np.104Years']} more years. Counted from {fmt(FACTS.today)}.
          </p>
          <div className="table-wrap"><table>
            <thead><tr><th>Nurse practitioner</th><th>Proposed role</th><th>Transition</th><th>104 date</th><th>Result</th></tr></thead>
            <tbody>{nps.map((s) => (
              <tr key={s.np.partyId}>
                <td>{name(s.np.partyId)}<div className="fine">{s.np.rnLicense} · {s.np.npCert} (fictional)</div></td>
                <td>{s.np.role}<div className="fine">{s.np.settingBasis}</div></td>
                <td>{s.transitionMet ? 'Complete' : 'Not complete'}<div className="fine">{s.np.transitionHours.toLocaleString()} hours, done {fmt(s.np.transitionCompletedOn)}</div></td>
                <td className="mono">{fmt(s.eligible104On)}</td>
                <td><Pill tone={s.roleOk ? 'go' : 'bad'}>{s.roleOk ? 'Can do this role' : 'Not yet'}</Pill><div className="fine">{s.detail}</div></td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="fine">
            § 2837.104(h) says corporations have no professional rights under that section, and § 2837.103(b) bars a listed setting from directing an NP's professional judgment. Neither changes SB 351, which covers physician and dental practices only.
          </p>
        </section>
      )}

      {tab === 'rules' && (
        <section>
          <p className="lede">Change a value and every tab re-runs. Status says whether the number was read in the primary text (on 2026-11-25) or is our reading.</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Rule</th><th>Value</th><th>Status</th><th>Source</th></tr></thead>
            <tbody>{MSO_PARAMS.map((p) => (
              <tr key={p.id}>
                <td>{p.label}{p.note && <div className="fine">{p.note}</div>}</td>
                <td><input className="param-input" aria-label={p.label} value={params[p.id]} inputMode={p.unit === 'date' ? 'text' : 'decimal'}
                  onChange={(e) => {
                    const v = e.target.value;
                    const ok = p.unit === 'date' ? /^\d{4}-\d{2}-\d{2}$/.test(v) : /^\d*\.?\d*$/.test(v) && v !== '';
                    if (ok) setParams({ ...params, [p.id]: v });
                  }} /> <span className="fine">{p.unit}</span></td>
                <td><Pill tone={STATUS[p.status][0]}>{STATUS[p.status][1]}</Pill></td>
                <td>{p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.source}</a> : p.source}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <button className="btn small ghost" onClick={() => setParams(msoDefaults())}>Restore defaults</button>

          <h3 className="section-title">Where the research report differs from the text</h3>
          <ul className="fine">
            <li>Attorney General remedies are in § 1191(e). § 1192 is the severability clause.</li>
            <li>The confidentiality limit the report calls a "§ 1191(c) carve-out" is § 1191(d)(3)(B).</li>
            <li>"Clinical staffing ratios" is not in § 1191. The text covers patient counts and hours, and hiring or firing based on clinical competency.</li>
            <li>SB 351 covers physician and dental practices. It does not reach nurse practitioner practices or skilled nursing facilities.</li>
            <li>§ 13401.5 also limits the number of non-physician shareholders, not just their 49% share.</li>
            <li>A nursing corporation can have physician shareholders (§ 13401.5(f)); it is not "100% RN/NP".</li>
            <li>The 104 NP path took effect Jan. 1, 2023, not Jan. 1, 2026.</li>
            <li>Bus. & Prof. Code § 650(b) allows percentage fees that match the value of the services; it does not say "fair market value".</li>
          </ul>
        </section>
      )}
    </div>
  );
}
