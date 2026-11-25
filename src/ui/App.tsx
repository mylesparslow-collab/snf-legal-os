import { useEffect, useState } from 'react';
import { TEAM } from '../data/seed';
import { fmt } from '../domain/dates';
import { workQueue } from '../domain/derive';
import type { Role } from '../domain/types';
import { StoreProvider, useStore } from '../state/store';
import { DocProvider, go, parseHash, type Route } from './common';
import { Compiler } from './Compiler';
import { Facilities } from './Facilities';
import { Matter } from './Matter';
import { MsoAudit } from './MsoAudit';
import { MyWork } from './MyWork';
import { PeerReview } from './PeerReview';

export function App() {
  return (
    <StoreProvider>
      <DocProvider>
        <Shell />
      </DocProvider>
    </StoreProvider>
  );
}

function useRoute(): Route {
  const [r, setR] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => {
      setR(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return r;
}

function Shell() {
  const { s, dispatch } = useStore();
  const route = useRoute();
  const [guide, setGuide] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const counts = workQueue(s).reduce<Record<string, number>>((m, i) => ({ ...m, [i.role]: (m[i.role] ?? 0) + 1 }), {});

  return (
    <div className="shell">
      <header className="topbar">
        <a className="brand" href="#my-work">
          <span className="brand-mark" aria-hidden="true">§</span>
          <span>SNF Transaction Workbench</span>
        </a>
        <nav className="primary-nav" aria-label="Primary">
          <a href="#my-work" className={route.view === 'my-work' ? 'on' : ''}>
            My Work{counts[s.role] ? <span className="count">{counts[s.role]}</span> : null}
          </a>
          <a href="#matter-overview" className={route.view === 'matter' ? 'on' : ''}>Matters</a>
          <a href="#facilities" className={route.view === 'facilities' ? 'on' : ''}>Facilities</a>
          <a href="#compiler" className={route.view === 'compiler' ? 'on' : ''}>Compiler</a>
          <a href="#mso" className={route.view === 'mso' ? 'on' : ''}>MSO audit</a>
          <a href="#peer" className={route.view === 'peer' ? 'on' : ''}>Peer review</a>
        </nav>
        <div className="topbar-right">
          <label className="role-switch">
            <span className="sr-only">Acting as</span>
            <select id="role" value={s.role} onChange={(e) => dispatch({ type: 'role', role: e.target.value as Role })}>
              {TEAM.map((t) => (
                <option key={t.id} value={t.role}>
                  {t.name} · {t.role}{counts[t.role] ? ` (${counts[t.role]})` : ''}
                </option>
              ))}
            </select>
          </label>
          <button className="btn small ghost" onClick={() => setGuide(!guide)} aria-expanded={guide}>Demo guide</button>
        </div>
      </header>
      <div className="synthetic-band">
        Synthetic demonstration · all parties, facilities, identifiers and documents are fictional · demo date {fmt(s.today)} · rules are illustrative, not counsel-approved
      </div>

      {guide && (
        <aside className="guide" aria-label="Demo guide">
          <div className="guide-head">
            <strong>Walk through the scenario</strong>
            <button className="btn small ghost" onClick={() => setGuide(false)}>Close</button>
          </div>
          <ol>
            <GuideStep role="partner" link="#matter-parties" text="Representation and scope: who the firm represents, and who is only recorded." />
            <GuideStep role="partner" link="#matter-documents" text="The imported deal package, with versions and filed records locked." />
            <GuideStep role="partner" link="#facility-lk" text="Facility record: separate identities, two dates, proposed changes kept apart from facts." />
            <GuideStep role="associate" link="#matter-issues" text="Mismatches: lease tenant, missing holding company, manager control before closing." />
            <GuideStep role="partner" link="#matter-classification" text="Classification by regime. OHCA stays unresolved; no exemption is invented." />
            <GuideStep role="partner" link="#matter-overview-d-schedule" text="The schedule challenge. Move the target date and preview what changes." />
            <GuideStep role="associate" link="#matter-work" text="One correction, many outputs: approve the revision batch; filed records are preserved." />
            <GuideStep role="associate" link="#matter-clocks-corr-1" text="Approve the CDPH letter. The deadline lands on Thanksgiving and gets flagged." />
            <GuideStep role="partner" link="#matter-closing" text="Path to closing, grouped by why each item is not done." />
            <GuideStep role="partner" link="#matter-work" text="Readiness record for counsel, regenerated from the current evidence." />
          </ol>
          {confirmReset ? (
            <div className="btn-row">
              <span className="fine">Discard all changes made in this demo?</span>
              <button className="btn small danger" onClick={() => { dispatch({ type: 'reset' }); setConfirmReset(false); go('#my-work'); }}>Reset</button>
              <button className="btn small ghost" onClick={() => setConfirmReset(false)}>Keep</button>
            </div>
          ) : (
            <button className="btn small ghost" onClick={() => setConfirmReset(true)}>Reset demo</button>
          )}
        </aside>
      )}

      <main className="main">
        {route.view === 'my-work' && <MyWork key={s.role} />}
        {route.view === 'matter' && <Matter tab={route.tab} focus={route.focus} />}
        {route.view === 'facilities' && <Facilities facility={route.facility} />}
        {route.view === 'compiler' && <Compiler />}
        {route.view === 'mso' && <MsoAudit />}
        {route.view === 'peer' && <PeerReview />}
      </main>
    </div>
  );
}

function GuideStep({ role, link, text }: { role: Role; link: string; text: string }) {
  const { dispatch } = useStore();
  return (
    <li>
      <button className="link" onClick={() => { dispatch({ type: 'role', role }); go(link); }}>{text}</button>
      <span className="fine"> as {TEAM.find((t) => t.role === role)!.name.split(' ')[0]}</span>
    </li>
  );
}
