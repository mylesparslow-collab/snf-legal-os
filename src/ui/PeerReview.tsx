import { useMemo, useState } from 'react';
import { FACTS } from '../compiler/deal';
import { fmt, weekday } from '../domain/dates';
import { agendaFindings, bylawFindings, bylawValues, draftFindings, person, record, recordFindings, type AgendaOutcome, type BylawOutcome, type DraftOutcome, type RecordOutcome } from '../peer/checks';
import { agenda, clocks, eventDate, eventLabel, isRunning, needsAttention, type Clock, type ClockGroup, type ClockStatus } from '../peer/clock';
import { BYLAWS, HOSPITAL, MATTERS, type Matter } from '../peer/hospital';
import { LICENSE_RULES, PEER_PARAMS, peerDefaults, type PeerValues } from '../peer/params';

type Tab = 'due' | 'matters' | 'bylaws' | 'records' | 'board' | 'rules';
const TABS: [Tab, string][] = [
  ['due', 'What is due'],
  ['matters', 'Matters'],
  ['bylaws', 'Bylaws'],
  ['records', 'Committee records'],
  ['board', 'District board'],
  ['rules', 'Rules'],
];

const STATUS_PILL: Record<ClockStatus, [string, string]> = {
  done: ['go', 'Done'],
  late: ['bad', 'Late'],
  overdue: ['bad', 'Past the date'],
  open: ['wait', 'Running'],
  upcoming: ['neutral', 'Not running yet'],
  waiting: ['na', 'Waiting on a date'],
  'not-triggered': ['na', 'Not triggered'],
  'not-required': ['na', 'Does not apply'],
  conflict: ['bad', 'Outside the limit'],
  unresolved: ['warn', 'Unresolved'],
};
const PARAM_STATUS = { 'text-checked': ['go', 'Text checked'], interpretation: ['decide', 'Our reading'], unverified: ['warn', 'Not verified'] } as const;
const BYLAW: Record<BylawOutcome, [string, string]> = { consistent: ['go', 'Consistent'], conflict: ['bad', 'Conflicts with statute'], 'bylaws-only': ['neutral', 'Bylaws only'], rejected: ['bad', 'Quote not found'] };
const RECORD: Record<RecordOutcome, [string, string]> = { 'in-place': ['go', 'In place'], misfiled: ['bad', 'Outside the committee folder'], 'not-committee': ['decide', 'Not a committee record'], outside: ['na', 'Administrative'] };
const DRAFT: Record<DraftOutcome, [string, string]> = { clear: ['go', 'Clear'], hold: ['bad', 'Hold'], review: ['decide', 'Attorney review'] };
const AGENDA: Record<AgendaOutcome, [string, string]> = { matches: ['go', 'Matches § 54954.5(h)'], review: ['decide', 'Attorney review'], public: ['warn', 'Public hearing requested'] };
const GROUPS: ClockGroup[] = ['Summary suspension', 'State report', 'Federal report', 'Hearing'];
const RATIFY = [['none', 'Not ratified'], ['2026-11-30', 'Ratified Nov 30'], ['2026-12-01', 'Ratified Dec 1']] as const;

const Pill = ({ tone, children }: { tone: string; children: React.ReactNode }) => <span className={`pill pill-${tone}`}>{children}</span>;
const day = (d?: string) => (d ? `${weekday(d).slice(0, 3)}, ${fmt(d)}` : '—');

function left(c: Clock): string {
  if (c.daysLeft === undefined || !isRunning(c)) return '';
  if (c.daysLeft === 0) return 'today';
  return c.daysLeft > 0 ? `in ${c.daysLeft} day${c.daysLeft === 1 ? '' : 's'}` : `${-c.daysLeft} day${c.daysLeft === -1 ? '' : 's'} ago`;
}

function ClockRow({ c, who }: { c: Clock; who?: string }) {
  return (
    <tr>
      <td style={{ width: '24%' }}>
        {who && <div className="fine">{who}</div>}
        <strong>{c.label}</strong>
        <div className="fine">{c.cite}</div>
      </td>
      <td style={{ width: '13%' }}><span className="mono">{day(c.trigger)}</span></td>
      <td style={{ width: '18%' }}>
        <span className="mono">{day(c.actBy)}</span>
        {left(c) && <div className="fine">{left(c)}</div>}
        {c.moved && <div className="fine">Counted date {fmt(c.counted)}. {c.moved}.</div>}
        {c.doneOn && <div className="fine">Recorded {fmt(c.doneOn)}.</div>}
      </td>
      <td style={{ width: '12%' }}><Pill tone={STATUS_PILL[c.status][0]}>{STATUS_PILL[c.status][1]}</Pill></td>
      <td>{c.detail}{c.interpretation && <> <Pill tone="decide">Our reading</Pill></>}</td>
    </tr>
  );
}

const ClockHead = () => <thead><tr><th>Clock</th><th>Counts from</th><th>Act by</th><th>Status</th><th>Why</th></tr></thead>;

export function PeerReview() {
  const [tab, setTab] = useState<Tab>('due');
  const [params, setParams] = useState<PeerValues>(peerDefaults);
  const [today, setToday] = useState(FACTS.today);
  const [matterId, setMatterId] = useState(MATTERS[0].id);
  const [ratified, setRatified] = useState<string>('none');

  const matters = useMemo<Matter[]>(() => MATTERS.map((m) => ({
    ...m,
    events: m.events.map((e) => (e.type === 'summary-suspension' && e.by === 'governing-body' ? { ...e, ratifiedOn: ratified === 'none' ? undefined : ratified } : e)),
  })), [ratified]);
  const bylaws = useMemo(() => bylawFindings(params), [params]);
  const byMatter = useMemo(() => {
    const bv = bylawValues(bylaws);
    return Object.fromEntries(matters.map((m) => [m.id, clocks(m, params, today, bv)])) as Record<string, Clock[]>;
  }, [matters, params, today, bylaws]);
  const allClocks = useMemo(() => Object.values(byMatter).flat(), [byMatter]);
  const due = useMemo(() => agenda(allClocks), [allClocks]);
  const attention = allClocks.filter(needsAttention);
  const records = useMemo(recordFindings, []);
  const drafts = useMemo(draftFindings, []);
  const board = useMemo(agendaFindings, []);
  const matter = matters.find((m) => m.id === matterId)!;
  const name = (id: string) => matters.find((m) => m.id === id)!.name;
  const usd = (id: string) => `$${Number(params[id]).toLocaleString('en-US')}`;

  return (
    <div className="page compiler">
      <div className="page-head">
        <div>
          <div className="eyebrow">Peer review clock · {HOSPITAL.counsel} (fictional)</div>
          <h1>{HOSPITAL.name}</h1>
          <p className="fine">
            The acute care hospital near {FACTS.facility}, run by the {HOSPITAL.district}. Four medical staff matters, each counted under
            Bus. & Prof. Code §§ 805–809.5, the federal data bank rules (45 CFR Part 60) and the hospital's bylaws.
          </p>
        </div>
        <div className="head-facts">
          <div><span className="fine">Matters</span><strong>{matters.length}</strong></div>
          <div><span className="fine">Clocks running</span><strong>{allClocks.filter(isRunning).length}</strong></div>
          <div><span className="fine">Need attention</span><strong>{attention.length}</strong></div>
        </div>
      </div>

      <div className="banner compiler-banner">
        Fictional record. Dates are counted by code from the events in each matter. Every day count is listed under Rules with its source; an attorney verifies each one, and the counting method, before reliance. Not cleared for firm use.
      </div>

      <div className="btn-row compiler-toolbar">
        <label className="fine">Counted as of{' '}
          <input className="param-input" style={{ width: '13ch' }} type="date" aria-label="Counted as of" value={today}
            onChange={(e) => { if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) setToday(e.target.value); }} />
        </label>
        <span className="fine">Raman suspension</span>
        <div className="seg-control" role="group" aria-label="Raman suspension ratification">
          {RATIFY.map(([v, label]) => <button key={v} className={ratified === v ? 'on' : ''} onClick={() => setRatified(v)}>{label}</button>)}
        </div>
      </div>

      <nav className="tabs" aria-label="Peer review sections">
        {TABS.map(([id, label]) => (
          <a key={id} href="#peer" className={tab === id ? 'on' : ''} onClick={(e) => { e.preventDefault(); setTab(id); }}>{label}</a>
        ))}
      </nav>

      {tab === 'due' && (
        <section>
          <p className="lede">
            Every running clock across the four matters, soonest first. A date that lands on a weekend or holiday is shown on the business day before.
            A willful failure to file an 805 report can be fined up to {usd('s805.fineWillful')}, and any other failure up to {usd('s805.fineOther')}.
          </p>
          {attention.length > 0 && (
            <>
              <h3 className="section-title">Needs attention</h3>
              <div className="table-wrap"><table><ClockHead /><tbody>{attention.map((c) => <ClockRow key={c.matterId + c.id} c={c} who={name(c.matterId)} />)}</tbody></table></div>
            </>
          )}
          <h3 className="section-title">Coming up</h3>
          <div className="table-wrap"><table><ClockHead /><tbody>{due.map((c) => <ClockRow key={c.matterId + c.id} c={c} who={name(c.matterId)} />)}</tbody></table></div>
          {due.length === 0 && <p className="fine">No clock is running on this date.</p>}
        </section>
      )}

      {tab === 'matters' && (
        <section>
          <div className="seg-control" role="group" aria-label="Matter">
            {matters.map((m) => <button key={m.id} className={matterId === m.id ? 'on' : ''} onClick={() => setMatterId(m.id)}>{m.name}</button>)}
          </div>
          <p className="lede">{matter.summary}</p>
          <p className="fine">
            {LICENSE_RULES.find((l) => l.kind === matter.license)!.label} · {matter.specialty} · reports go to the {LICENSE_RULES.find((l) => l.kind === matter.license)!.agency}
          </p>
          <h3 className="section-title">Events in the record</h3>
          <div className="table-wrap"><table>
            <tbody>{[...matter.events].sort((a, b) => eventDate(a).localeCompare(eventDate(b))).map((e, i) => (
              <tr key={i}>
                <td className="mono" style={{ width: '18%' }}>{day(eventDate(e))}{e.type === 'restriction' && <div className="fine">{e.to ? `through ${fmt(e.to)}` : 'no end date'}</div>}</td>
                <td style={{ width: '20%' }}>{eventLabel(e)}</td>
                <td>{e.note}{e.type === 'summary-suspension' && e.ratifiedOn && <div className="fine">Ratified by the Medical Executive Committee on {fmt(e.ratifiedOn)}.</div>}</td>
              </tr>
            ))}</tbody>
          </table></div>
          {GROUPS.map((g) => {
            const cs = byMatter[matter.id].filter((c) => c.group === g);
            return cs.length ? (
              <div key={g}>
                <h3 className="section-title">{g}</h3>
                <div className="table-wrap"><table><ClockHead /><tbody>{cs.map((c) => <ClockRow key={c.id} c={c} />)}</tbody></table></div>
              </div>
            ) : null;
          })}
        </section>
      )}

      {tab === 'bylaws' && (
        <section>
          <p className="lede">
            The statute leaves some intervals to the hospital's bylaws and sets limits on others. Each bylaw term below was coded by hand with its page and quote.
            Code checks that the quote is on the page and states the number, then compares it with the statute. Bylaw hearing provisions bind only where they are not inconsistent with §§ 809.1–809.4 (§ 809.6(a)).
          </p>
          <div className="table-wrap"><table>
            <thead><tr><th>Term</th><th>Quote</th><th className="num">Bylaws</th><th>Result</th><th>Why</th></tr></thead>
            <tbody>{bylaws.map((f) => (
              <tr key={f.term.id}>
                <td style={{ width: '20%' }}>{f.term.label}<div className="fine">§ {f.term.section}, p. {f.term.page}</div></td>
                <td className="quote">“{f.term.quote}”</td>
                <td className="num mono">{f.term.value} {f.term.unit}</td>
                <td><Pill tone={BYLAW[f.outcome][0]}>{BYLAW[f.outcome][1]}</Pill></td>
                <td>{f.detail}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="fine">{BYLAWS.title}. Reading bylaws from an uploaded PDF with a model is not part of this demo; the terms are entered by hand.</p>
        </section>
      )}

      {tab === 'records' && (
        <section>
          <p className="lede">
            Evid. Code § 1157 keeps the proceedings and records of medical staff committees out of discovery. The section says nothing about folders or waiver,
            so this check does not decide either. It shows where each record is kept and who a draft would send it to, so counsel can look before it goes out.
          </p>
          <h3 className="section-title">Where each record is kept</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>Record</th><th>Folder</th><th>Result</th><th>Why</th></tr></thead>
            <tbody>{records.map((f) => (
              <tr key={f.record.id}>
                <td style={{ width: '30%' }}>{f.record.title}<div className="fine">{name(f.record.matterId)}</div></td>
                <td className="mono">{f.record.folder}</td>
                <td><Pill tone={RECORD[f.outcome][0]}>{RECORD[f.outcome][1]}</Pill></td>
                <td>{f.detail}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <h3 className="section-title">Drafts waiting to be sent</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>Draft</th><th>To</th><th>Attached</th><th>Result</th><th>Why</th></tr></thead>
            <tbody>{drafts.map((f) => (
              <tr key={f.draft.id}>
                <td style={{ width: '20%' }}>{f.draft.subject}<div className="fine">from {person(f.draft.from).name}</div></td>
                <td>{f.draft.to.map((id) => (
                  <div key={id} className={f.outside.some((o) => o.personId === id) ? '' : 'fine'}>{person(id).name}{f.outside.some((o) => o.personId === id) && <span className="fine"> · {person(id).role}</span>}</div>
                ))}</td>
                <td>{f.draft.attachments.map((id) => <div key={id} className="fine">{record(id).title}</div>)}</td>
                <td><Pill tone={DRAFT[f.outcome][0]}>{DRAFT[f.outcome][1]}</Pill></td>
                <td>{f.detail}</td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      )}

      {tab === 'board' && (
        <section>
          <p className="lede">
            The hospital belongs to a health care district, so its board meets in public. Health & Saf. Code § 32155 lets the board hear staff privilege matters and committee reports in closed session,
            unless the member whose privileges are the subject asks for a public hearing. Gov. Code § 54954.5(h) gives the agenda wording for those items.
          </p>
          <div className="table-wrap"><table>
            <thead><tr><th>Meeting</th><th>Agenda text</th><th>Result</th><th>Why</th></tr></thead>
            <tbody>{board.map((f) => (
              <tr key={f.item.id}>
                <td className="mono" style={{ width: '14%' }}>{fmt(f.item.meeting)}</td>
                <td className="quote">“{f.item.text}”</td>
                <td><Pill tone={AGENDA[f.outcome][0]}>{AGENDA[f.outcome][1]}</Pill></td>
                <td>{f.detail}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="fine">Only the wording is checked. Posting times and the rest of the Brown Act were not read for this tab.</p>
        </section>
      )}

      {tab === 'rules' && (
        <section>
          <p className="lede">Change a value and every clock is counted again. Status says whether the number was read in the primary text (on 2026-11-25) or is our reading.</p>
          <div className="table-wrap"><table>
            <thead><tr><th>Rule</th><th>Value</th><th>Status</th><th>Source</th></tr></thead>
            <tbody>{PEER_PARAMS.map((p) => (
              <tr key={p.id}>
                <td>{p.label}{p.note && <div className="fine">{p.note}</div>}</td>
                <td><input className="param-input" aria-label={p.label} value={params[p.id]} inputMode="numeric"
                  onChange={(e) => { if (/^\d+$/.test(e.target.value)) setParams({ ...params, [p.id]: e.target.value }); }} /> <span className="fine">{p.unit}</span></td>
                <td><Pill tone={PARAM_STATUS[p.status][0]}>{PARAM_STATUS[p.status][1]}</Pill></td>
                <td>{p.url ? <a href={p.url} target="_blank" rel="noreferrer">{p.source}</a> : p.source}</td>
              </tr>
            ))}</tbody>
          </table></div>
          <button className="btn small ghost" onClick={() => setParams(peerDefaults())}>Restore defaults</button>

          <h3 className="section-title">Who each rule covers</h3>
          <div className="table-wrap"><table>
            <thead><tr><th>License</th><th>805 reports (§ 805(a)(2))</th><th>Hearing rights (§ 809(b))</th><th>NPDB report required (45 CFR § 60.12(a)(1))</th><th>Agency</th></tr></thead>
            <tbody>{LICENSE_RULES.map((l) => (
              <tr key={l.kind}><td>{l.label}</td><td>{l.in805 ? 'Yes' : 'No'}</td><td>{l.in809 ? 'Yes' : 'No'}</td><td>{l.npdbRequired ? 'Yes' : 'Voluntary'}</td><td>{l.agency}</td></tr>
            ))}</tbody>
          </table></div>

          <h3 className="section-title">How days are counted</h3>
          <ul className="fine">
            <li>"Within N days after" an event is the event date plus N calendar days. The statutes say "days" and do not say how.</li>
            <li>How long a suspension or restriction has lasted counts its first day, so thresholds arrive a day earlier than under the other reading.</li>
            <li>A date on a weekend or holiday is kept as counted and also shown on the business day before. Whether a deadline rolls forward is an attorney question.</li>
            <li>Working days leave out weekends and the demo holiday list, which is short and not maintained.</li>
          </ul>

          <h3 className="section-title">Where the research report differs from the text</h3>
          <ul className="fine">
            <li>The report says a suspension over 14 days "triggers full § 809.1 notice and hearing rights" under § 809.5(b). The 14-day figure is in § 805(e) and triggers an 805 report. Hearing rights follow any summary suspension under § 809.5(a).</li>
            <li>The two-working-day ratification rule applies only when the governing body suspends because no one authorized by the peer review body was available.</li>
            <li>The report says the physician has "at least 30 days" to request a hearing under § 809.1(b). The statute sets no number; the notice must state the time limit, and the bylaws set it.</li>
            <li>The report says witness and document discovery "locks 30 days prior to hearing". § 809.2(d) makes late document access (under 30 days) good cause for a continuance; § 809.2(f) sets 10 days for witness lists and exhibits.</li>
            <li>The report leaves out § 809.2(h): the hearing must start within 60 days after the request is received.</li>
            <li>The report cites an Attorney General opinion for the § 805.01 deadline. The 15 days is in § 805.01(b) itself, and that report is limited to four kinds of conduct after a formal investigation. The opinion was not read.</li>
            <li>The report gives only the $100,000 fine. § 805(l) adds a fine of up to $50,000 for a failure that is not willful.</li>
            <li>The report says the NPDB requires a report "within 30 days of a summary suspension lasting more than 30 days even while hearings are pending". 45 CFR §§ 60.5 and 60.12 give the 30-day figures but do not mention summary suspensions or pending hearings. That detail would come from the NPDB Guidebook, which was not read.</li>
            <li>The report says filing committee records in administration folders "waives" § 1157 under a named case. § 1157 does not mention waiver or where records are kept. The case was not read, so the app flags location and recipients without calling anything waived.</li>
            <li>§ 809(b) covers fewer license types than § 805. A nurse practitioner's resignation under investigation is reported under § 805 but is outside §§ 809.1–809.4. The report does not mention the difference.</li>
          </ul>
        </section>
      )}
    </div>
  );
}
