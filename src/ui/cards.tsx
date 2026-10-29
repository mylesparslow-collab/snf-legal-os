import { useState } from 'react';
import { FACILITIES, TEAM } from '../data/seed';
import { addDays, fmt } from '../domain/dates';
import { impactOf, target } from '../domain/derive';
import type { Decision, Issue } from '../domain/types';
import { useStore } from '../state/store';
import { Evidence, Prov, StatusPill } from './common';

const facNames = (ids: string[]) => ids.map((id) => FACILITIES.find((f) => f.id === id)!.shortName).join(', ');
const roleName = (r: string) => TEAM.find((t) => t.role === r)!.name;

const KIND_LABEL = { mismatch: 'Mismatch', absence: 'Missing evidence', control: 'Control rights' };

export function IssueCard({ issue, focused }: { issue: Issue; focused?: boolean }) {
  const { s, dispatch } = useStore();
  const [expanded, setExpanded] = useState(focused || issue.status === 'open');
  const [choice, setChoice] = useState(issue.recommended);
  const canAct = s.role === issue.owner || s.role === 'partner';
  const chosen = issue.options.find((o) => o.id === choice)!;

  return (
    <article id={issue.id} className={`card issue sev-${issue.severity} ${issue.status} ${focused ? 'focused' : ''}`}>
      <header className="card-head" onClick={() => setExpanded(!expanded)}>
        <div className="card-title-row">
          <span className="code">{issue.code}</span>
          <StatusPill tone={issue.severity === 'critical' ? 'bad' : issue.severity === 'high' ? 'warn' : 'neutral'}>{issue.severity}</StatusPill>
          <StatusPill tone="neutral">{KIND_LABEL[issue.kind]}</StatusPill>
          {issue.status === 'resolved' && <StatusPill tone="done">Resolved</StatusPill>}
        </div>
        <h3>{issue.title}</h3>
        <div className="meta-row">
          <span>{facNames(issue.facilityIds)}</span>
          <span>Owner: {roleName(issue.owner)}</span>
          <Prov kind="ai" detail="cross-document check" />
        </div>
      </header>
      {expanded && (
        <div className="card-body">
          <p>{issue.summary}</p>
          <div className="evidence-grid">
            {issue.evidence.map((e, i) => (
              <Evidence key={i} e={e} />
            ))}
          </div>
          <p className="consequence"><strong>Why it matters.</strong> {issue.consequence}</p>
          {issue.affectedWorkProducts.length > 0 && (
            <p className="fine">Affects {issue.affectedWorkProducts.length} work products: {issue.affectedWorkProducts.map((id) => s.workProducts.find((w) => w.id === id)?.title).filter(Boolean).join('; ')}.</p>
          )}
          {issue.status === 'open' ? (
            <div className="decide">
              <div className="options" role="radiogroup" aria-label="Resolution">
                {issue.options.map((o) => (
                  <label key={o.id} className={`option ${choice === o.id ? 'on' : ''}`}>
                    <input type="radio" name={`opt-${issue.id}`} checked={choice === o.id} onChange={() => setChoice(o.id)} />
                    <span className="option-label">{o.label}{o.id === issue.recommended && <em> Recommended</em>}</span>
                    <span className="option-cons">{o.consequence}</span>
                  </label>
                ))}
              </div>
              <div className="decide-actions">
                <button className="btn primary" disabled={!canAct} onClick={() => dispatch({ type: 'resolveIssue', id: issue.id, optionId: choice })}>
                  {chosen.label}
                </button>
                {!canAct && <span className="fine">Assigned to {roleName(issue.owner)}. Switch role to act.</span>}
              </div>
            </div>
          ) : (
            <p className="resolution">
              <Prov kind="counsel" /> {issue.options.find((o) => o.id === issue.resolution!.optionId)!.label}. Recorded by {issue.resolution!.by} on {fmt(issue.resolution!.at)}.
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export function DecisionCard({ d, focused }: { d: Decision; focused?: boolean }) {
  const { s, dispatch } = useStore();
  const [choice, setChoice] = useState(d.recommended);
  const outside = s.facts['contract.outside'].value;
  const [newDate, setNewDate] = useState('2027-03-12');
  const canAct = s.role === d.owner;
  const opt = d.options.find((o) => o.id === choice)!;
  const impacts = d.id === 'd-schedule' ? impactOf(s, 'target.handover') : [];
  const latest = addDays(newDate, -120);
  const dateProblem =
    newDate > outside ? `After the outside date (${fmt(outside)}). Needs an APA extension.` : latest < s.today ? `Complete applications would have been due ${fmt(latest)}, already past.` : null;

  if (d.status === 'decided') {
    const r = d.resolution!;
    return (
      <article id={d.id} className="card decision decided">
        <div className="card-title-row">
          <StatusPill tone="done">Decided</StatusPill>
          <Prov kind="counsel" />
        </div>
        <h3>{d.title}</h3>
        <p>
          {d.options.find((o) => o.id === r.optionId)!.label}
          {d.id === 'd-schedule' && r.optionId === 'move' ? ` to ${fmt(target(s))}` : ''}. Recorded by {r.by} on {fmt(r.at)}.
        </p>
      </article>
    );
  }

  return (
    <article id={d.id} className={`card decision ${focused ? 'focused' : ''}`}>
      <div className="card-title-row">
        <StatusPill tone="decide">Decision required</StatusPill>
        <span className="fine">Owner: {roleName(d.owner)}</span>
      </div>
      <h3>{d.question}</h3>
      <ul className="context">
        {d.context.map((c, i) => (
          <li key={i}>{c}</li>
        ))}
      </ul>
      <div className="options" role="radiogroup" aria-label={d.question}>
        {d.options.map((o) => (
          <label key={o.id} className={`option ${choice === o.id ? 'on' : ''} ${o.disabledReason ? 'disabled' : ''}`}>
            <input type="radio" name={`dec-${d.id}`} disabled={!!o.disabledReason} checked={choice === o.id} onChange={() => setChoice(o.id)} />
            <span className="option-label">{o.label}{o.id === d.recommended && <em> Recommended</em>}</span>
            <span className="option-cons">{o.disabledReason ?? o.consequence}</span>
          </label>
        ))}
      </div>
      {d.id === 'd-schedule' && choice === 'move' && (
        <div className="preview">
          <label className="field">
            <span>New target date</span>
            <input id="new-target" type="date" value={newDate} min={s.today} onChange={(e) => setNewDate(e.target.value)} />
          </label>
          <p className={dateProblem ? 'warn-text' : 'fine'}>
            {dateProblem ?? `Complete applications for all three facilities must be on file by ${fmt(latest)}. That is a work target, not an approval date.`}
          </p>
          <div className="impact">
            <div className="eyebrow">Preview: this change touches {impacts.length} records</div>
            <ul>
              {impacts.map((i) => (
                <li key={i.wp.id}>
                  <span>{i.wp.title}</span>
                  <span className="fine">{i.where}</span>
                  <StatusPill tone={i.mode === 'revise' ? 'go' : 'lock'}>{i.mode === 'revise' ? 'Revision proposed' : 'Preserved; supplement needed?'}</StatusPill>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <p className="fine">Recommendation: {d.reason}</p>
      <div className="decide-actions">
        <button
          className="btn primary"
          disabled={!canAct || !!opt.disabledReason || (choice === 'move' && newDate > outside)}
          onClick={() => dispatch({ type: 'decide', id: d.id, optionId: choice, newTarget: choice === 'move' ? newDate : undefined })}
        >
          {opt.label}
        </button>
        {!canAct && <span className="fine">Reserved for {roleName(d.owner)}. Switch role to decide.</span>}
      </div>
    </article>
  );
}
