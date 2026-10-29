import { useState } from 'react';
import { MATTER, TEAM } from '../data/seed';
import { fmt } from '../domain/dates';
import { workQueue, type WorkItem } from '../domain/derive';
import { useStore } from '../state/store';
import { DecisionCard, IssueCard } from './cards';
import { CorrespondenceCard } from './Clocks';
import { go, StatusPill } from './common';

const ROLE_BLURB = {
  partner: 'Major legal and commercial decisions, and anything that changes the deal.',
  associate: 'Issues to resolve, agency events to approve, and drafts to review.',
  paralegal: 'Missing information, requests to send, and packets to assemble.',
};

const TAG_TONE: Record<WorkItem['tag'], string> = {
  Decision: 'decide',
  Issue: 'warn',
  Agency: 'bad',
  'Client request': 'wait',
  Revisions: 'go',
  'Missing evidence': 'neutral',
};

export function MyWork() {
  const { s } = useStore();
  const me = TEAM.find((t) => t.role === s.role)!;
  const all = workQueue(s);
  const mine = all.filter((i) => i.role === s.role);
  const others = all.filter((i) => i.role !== s.role);
  const [openId, setOpenId] = useState<string | null>(mine[0]?.id ?? null);

  return (
    <div className="mywork">
      <header className="page-head">
        <div>
          <div className="eyebrow">My Work · {fmt(s.today)}</div>
          <h1>{mine.length ? `${mine.length} item${mine.length > 1 ? 's' : ''} need${mine.length === 1 ? 's' : ''} you, ${me.name.split(' ')[0]}` : `Nothing needs you right now, ${me.name.split(' ')[0]}`}</h1>
          <p className="lede">{ROLE_BLURB[s.role]}</p>
        </div>
      </header>

      <div className="mywork-grid">
        <section className="queue" aria-label="Your queue">
          {mine.length === 0 && (
            <div className="empty">
              Your queue is clear. {others.length} item{others.length === 1 ? '' : 's'} sit with other team members. Switch role at the top to act as them.
            </div>
          )}
          {mine.map((item) => (
            <QueueRow key={item.id} item={item} open={openId === item.id} onToggle={() => setOpenId(openId === item.id ? null : item.id)} />
          ))}
        </section>

        <aside className="side">
          <section className="panel">
            <h2 className="panel-title">With the rest of the team</h2>
            {others.length === 0 && <p className="fine">Nothing outstanding.</p>}
            <ul className="mini-list">
              {others.map((i) => (
                <li key={i.id}>
                  <span className="mini-who">{TEAM.find((t) => t.role === i.role)!.name.split(' ')[0]}</span>
                  <button className="link" onClick={() => go(i.link)}>{i.verb} · {i.title}</button>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel">
            <h2 className="panel-title">Recent activity</h2>
            <ol className="activity">
              {s.log.slice(0, 6).map((l, i) => (
                <li key={i}>
                  <span className="fine">{l.at} · {l.by}</span>
                  <span>{l.text}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="panel">
            <h2 className="panel-title">Active matters</h2>
            <button className="matter-link" onClick={() => go('#matter-overview')}>
              <strong>{MATTER.name}</strong>
              <span className="fine">{MATTER.id} · {MATTER.side} · 3 facilities</span>
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function QueueRow({ item, open, onToggle }: { item: WorkItem; open: boolean; onToggle: () => void }) {
  const { s } = useStore();
  const issue = s.issues.find((i) => i.id === item.id);
  const decision = s.decisions.find((d) => d.id === item.id);
  const corr = s.correspondence.find((c) => c.id === item.id);
  const inline = issue || decision || corr;
  return (
    <article className={`qrow ${open ? 'open' : ''}`}>
      <button className="qrow-head" onClick={inline ? onToggle : () => go(item.link)} aria-expanded={inline ? open : undefined}>
        <span className="qverb">{item.verb}</span>
        <span className="qmain">
          <span className="qtitle">{item.title}</span>
          <span className="qwhy">{item.why}</span>
        </span>
        <span className="qside">
          <StatusPill tone={TAG_TONE[item.tag]}>{item.tag}</StatusPill>
          {item.due && <span className="fine">{item.due}</span>}
        </span>
      </button>
      {open && inline && (
        <div className="qrow-body">
          {issue && <IssueCard issue={issue} focused />}
          {decision && <DecisionCard d={decision} focused />}
          {corr && <CorrespondenceCard c={corr} />}
          <button className="link" onClick={() => go(item.link)}>Open in matter</button>
        </div>
      )}
    </article>
  );
}
