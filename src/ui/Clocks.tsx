import { FACILITIES } from '../data/seed';
import { addDays, daysBetween, fmt, holidayOrWeekend, weekday } from '../domain/dates';
import { computeClocks } from '../domain/derive';
import type { Clock, Correspondence } from '../domain/types';
import { useStore } from '../state/store';
import { Evidence, Prov, Sources, StatusPill } from './common';

const STATE_META: Record<Clock['state'], [string, string]> = {
  ok: ['On track', 'go'],
  conflict: ['Conflicts with target', 'bad'],
  missed: ['Passed for this target', 'bad'],
  'pending-trigger': ['Starts on a future event', 'na'],
  'not-computed': ['Not computed', 'wait'],
};

export function ClocksTab({ focus }: { focus?: string }) {
  const { s } = useStore();
  const clocks = computeClocks(s);
  return (
    <div className="stack">
      <p className="lede narrow">
        Each date shows what kind of date it is and the event that starts it. A planned submission is not an agency-confirmed date, and a review period is not a promised approval.
      </p>
      {s.correspondence.map((c) => (
        <CorrespondenceCard key={c.id} c={c} focused={focus === c.id} />
      ))}
      <div className="table-wrap">
        <table className="clocks">
          <thead>
            <tr>
              <th>Clock</th>
              <th>Kind of date</th>
              <th>Starts from</th>
              <th className="num">Date</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {clocks.map((k) => (
              <tr key={k.id} className={`clock-${k.state}`}>
                <td>
                  <strong>{k.label}</strong>
                  <div className="fine">{k.rule}</div>
                  <div className="clock-note">{k.note}</div>
                </td>
                <td>
                  <span className="basis">{k.basis}</span>
                  {k.sources && <Sources ids={k.sources} />}
                </td>
                <td>
                  <div>{k.trigger}</div>
                  {k.triggerEvidence ? <Evidence e={k.triggerEvidence} compact /> : <div className="fine warn-text">No evidence of the starting event</div>}
                </td>
                <td className="num">
                  {k.date ? (
                    <>
                      <div className="date">{fmt(k.date)}</div>
                      <div className="fine">{daysBetween(s.today, k.date) >= 0 ? `in ${daysBetween(s.today, k.date)} days` : `${-daysBetween(s.today, k.date)} days ago`}</div>
                    </>
                  ) : (
                    <span className="fine">—</span>
                  )}
                </td>
                <td>
                  <StatusPill tone={STATE_META[k.state][1]}>{STATE_META[k.state][0]}</StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="fine">Date arithmetic is computed in code from the approved basis. The model may read a letter; it never counts the days.</p>
    </div>
  );
}

export function CorrespondenceCard({ c, focused }: { c: Correspondence; focused?: boolean }) {
  const { s, dispatch } = useStore();
  const due = addDays(c.dated, c.proposedDeadline.days);
  const hol = holidayOrWeekend(due);
  const fac = FACILITIES.find((f) => f.id === c.facilityId)!;
  const canAct = s.role === 'associate' || s.role === 'partner';
  return (
    <article id={c.id} className={`card corr ${focused ? 'focused' : ''}`}>
      <div className="card-title-row">
        <StatusPill tone={c.status === 'approved' ? 'done' : 'bad'}>{c.status === 'approved' ? `Approved by ${c.approvedBy}` : 'Needs review'}</StatusPill>
        <span className="fine">{c.from} · {fac.shortName} · dated {fmt(c.dated)} · received {fmt(c.received)}</span>
      </div>
      <h3>{c.subject}</h3>
      <div className="corr-grid">
        <div>
          <div className="eyebrow">Proposed deadline</div>
          <div className="big-date">{fmt(due)}</div>
          <div className="fine">{weekday(due)} · {c.proposedDeadline.days} {c.proposedDeadline.convention.toLowerCase()}</div>
          <Evidence e={{ docId: c.docId, page: 1, quote: c.proposedDeadline.quote, label: 'Letter says' }} />
          {hol && (
            <p className="warn-text">
              Falls on {hol}. The letter does not say whether the date rolls forward. Treat {fmt(addDays(due, -1))} as the working deadline unless CDPH confirms otherwise.
            </p>
          )}
          <Prov kind="ai" detail="date basis read from letter" />
          <Prov kind="rule" detail="days counted in code" />
        </div>
        <div>
          <div className="eyebrow">What CDPH asked for, matched to the record</div>
          <ol className="req-list">
            {c.items.map((it) => {
              const iss = it.issueId ? s.issues.find((i) => i.id === it.issueId) : undefined;
              const ready = !iss || iss.status === 'resolved';
              return (
                <li key={it.id}>
                  <div className="req-head">
                    <strong>{it.request}</strong>
                    <StatusPill tone={ready ? 'go' : 'bad'}>{ready ? 'Supported' : `Blocked by ${iss!.code}`}</StatusPill>
                  </div>
                  <div className="fine">{ready ? 'Responsive evidence is reconciled.' : it.note}</div>
                  <div className="chips">
                    {it.matchDocIds.map((d) => (
                      <Evidence key={d} e={{ docId: d, page: 1, quote: '' }} compact />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {c.status === 'pending-review' && (
        <div className="decide-actions">
          <button className="btn primary" disabled={!canAct} onClick={() => dispatch({ type: 'approveCorrespondence', id: c.id })}>
            Approve event and deadline
          </button>
          {!canAct && <span className="fine">An associate or partner approves agency events.</span>}
        </div>
      )}
    </article>
  );
}
