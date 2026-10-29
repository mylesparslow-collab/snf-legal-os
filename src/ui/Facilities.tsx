import { useState } from 'react';
import { ASSERTIONS, FACILITIES, MATTER } from '../data/seed';
import { daysBetween, fmt } from '../domain/dates';
import { computeConditions, target } from '../domain/derive';
import { classify } from '../domain/rules';
import type { Assertion, PassportField } from '../domain/types';
import { useStore } from '../state/store';
import { Evidence, go, StatusPill } from './common';

const FIELDS: [PassportField, string][] = [
  ['licensee', 'Licensed entity'],
  ['propertyOwner', 'Real estate owner'],
  ['operatorManager', 'Operator or manager'],
  ['stateLicense', 'State license'],
  ['ccn', 'Medicare CCN'],
  ['mediCalRoute', 'Medi-Cal enrollment route'],
  ['financing', 'Financing'],
];

const STALE_DAYS = 60;

export function Facilities({ facility }: { facility?: string }) {
  if (facility) return <Passport id={facility} />;
  return <FacilityList />;
}

function FacilityList() {
  const { s } = useStore();
  return (
    <div>
      <header className="page-head">
        <div>
          <div className="eyebrow">Facilities</div>
          <h1>Facility records</h1>
          <p className="lede">The dated legal record of each facility. It outlives any single transaction and starts the next one.</p>
        </div>
      </header>
      <div className="fac-grid">
        {FACILITIES.map((f) => {
          const stale = ASSERTIONS.filter((a) => a.facilityId === f.id && a.status === 'verified' && daysBetween(a.recordedAt, s.today) > STALE_DAYS).length;
          const pending = ASSERTIONS.filter((a) => a.facilityId === f.id && a.status === 'proposed').length;
          return (
            <button key={f.id} className="card fac-card" onClick={() => go({ facility: f.id })}>
              <div className="eyebrow">{f.county} County · {f.beds} beds</div>
              <h3>{f.tradeName}</h3>
              <div className="fine">{f.address}</div>
              <div className="chips">
                <StatusPill tone="neutral">{pending} pending changes</StatusPill>
                {stale > 0 && <StatusPill tone="warn">{stale} to reconfirm</StatusPill>}
                {f.hudInsured && <StatusPill tone="neutral">HUD 232</StatusPill>}
                {f.thirdPartyLandlord && <StatusPill tone="neutral">Ground lease</StatusPill>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function pick(list: Assertion[], effective: string, known: string, closing: string) {
  const knownList = list.filter((a) => a.recordedAt <= known);
  const current = knownList.find((a) => a.status === 'verified' && a.validFrom != null && a.validFrom <= effective && (a.validTo == null || a.validTo! >= effective));
  const proposed = knownList.find((a) => a.status === 'proposed');
  return { current, proposed, afterClosing: effective >= closing };
}

function Passport({ id }: { id: string }) {
  const { s } = useStore();
  const f = FACILITIES.find((x) => x.id === id)!;
  const closing = target(s);
  const [effective, setEffective] = useState(s.today);
  const [known, setKnown] = useState(s.today);
  const cells = classify(f, s);
  const conds = computeConditions(s).filter((c) => c.facilityIds.includes(id) && c.status !== 'complete' && c.status !== 'not-applicable');
  const issues = s.issues.filter((i) => i.facilityIds.includes(id) && i.status === 'open');

  return (
    <div className="passport">
      <header className="page-head">
        <div>
          <button className="link" onClick={() => go('#facilities')}>All facilities</button>
          <div className="eyebrow">{f.county} County · {f.beds} beds · {f.services.join(', ')}</div>
          <h1>{f.tradeName}</h1>
          <p className="lede">{f.address}</p>
        </div>
      </header>

      <section className="asof card">
        <label className="field">
          <span>What was true on</span>
          <input id="asof-effective" type="date" value={effective} onChange={(e) => setEffective(e.target.value)} />
        </label>
        <label className="field">
          <span>Using what we knew on</span>
          <input id="asof-known" type="date" value={known} max={s.today} onChange={(e) => setKnown(e.target.value)} />
        </label>
        <div className="asof-presets">
          <button className="btn small ghost" onClick={() => { setEffective(s.today); setKnown(s.today); }}>Today</button>
          <button className="btn small ghost" onClick={() => { setEffective(closing); setKnown(s.today); }}>Target closing</button>
          <button className="btn small ghost" onClick={() => { setEffective('2026-09-01'); setKnown('2026-09-01'); }}>Sep 1 view</button>
        </div>
        <p className="fine">Two clocks: when something was legally effective, and when the firm learned it. Identities are never merged: trade name, licensee, property owner, license number, and CCN are separate records.</p>
      </section>

      <div className="two-col wide-left">
        <section className="card">
          <h3>Identity and authority</h3>
          <dl className="passport-list">
            {FIELDS.map(([field, label]) => {
              const { current, proposed, afterClosing } = pick(ASSERTIONS.filter((a) => a.facilityId === id && a.field === field), effective, known, closing);
              const stale = current && daysBetween(current.recordedAt, s.today) > STALE_DAYS;
              return (
                <div key={field} className="pp-row">
                  <dt>{label}</dt>
                  <dd>
                    {current ? (
                      <>
                        <div className="pp-value">
                          <strong>{current.value}</strong>
                          {stale && <StatusPill tone="warn">Reconfirm before filing</StatusPill>}
                        </div>
                        <div className="fine">Effective {fmt(current.validFrom)} · learned {fmt(current.recordedAt)}</div>
                        <Evidence e={current.evidence} compact />
                      </>
                    ) : (
                      <span className="fine">Unknown on this date with the information then held</span>
                    )}
                    {proposed && (
                      <div className={`pp-proposed ${afterClosing ? 'emph' : ''}`}>
                        <StatusPill tone="wait">{afterClosing ? 'Expected after closing, not yet effective' : 'Proposed change'}</StatusPill>
                        <span>{proposed.value}</span>
                        {proposed.dependsOn && <span className="fine">Depends on: {proposed.dependsOn}</span>}
                      </div>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </section>

        <aside className="stack">
          <section className="card">
            <h3>Open in {MATTER.name}</h3>
            <ul className="mini-list">
              {issues.map((i) => (
                <li key={i.id}><span className="mini-who">{i.code}</span><button className="link" onClick={() => go({ tab: 'issues', id: i.id })}>{i.title}</button></li>
              ))}
              {conds.slice(0, 6).map((c) => (
                <li key={c.id}><span className="mini-who">Close</span><span>{c.title}</span></li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h3>Regimes for this facility</h3>
            <ul className="regime-list">
              {cells.map((c) => (
                <li key={c.regime}>
                  <StatusPill tone={c.status === 'applicable' ? 'go' : c.status === 'unresolved' ? 'decide' : 'na'}>{c.status === 'applicable' ? 'Applies' : c.status === 'unresolved' ? 'Unresolved' : 'N/A'}</StatusPill>
                  <span>{c.headline}</span>
                </li>
              ))}
            </ul>
            <button className="link" onClick={() => go({ tab: 'classification' })}>Open full matrix</button>
          </section>
          <section className="card">
            <h3>After closing, this record keeps</h3>
            <ul className="plain">
              <li>Executed and filed versions with receipts</li>
              <li>CDPH notice of final transfer, due within 10 days of closing [5]</li>
              <li>Ownership reporting changes on the applicable timeframes [10]</li>
              {f.hudInsured && <li>HUD regulatory agreement covenants and reporting</li>}
              <li>Surviving indemnity and escrow release dates</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
