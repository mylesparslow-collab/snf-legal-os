import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DOCS } from '../data/seed';
import { fmt } from '../domain/dates';
import type { EvidenceRef, Link } from '../domain/types';

// ---------------------------------------------------------------- navigation

export type Route =
  | { view: 'my-work' }
  | { view: 'matter'; tab: string; focus?: string }
  | { view: 'facilities'; facility?: string }
  | { view: 'compiler' }
  | { view: 'mso' }
  | { view: 'peer' };

export function parseHash(h: string): Route {
  const x = h.replace(/^#/, '');
  if (x.startsWith('matter')) {
    const [, tab, ...rest] = x.split('-');
    return { view: 'matter', tab: tab || 'overview', focus: rest.join('-') || undefined };
  }
  if (x.startsWith('compiler')) return { view: 'compiler' };
  if (x.startsWith('mso')) return { view: 'mso' };
  if (x.startsWith('peer')) return { view: 'peer' };
  if (x.startsWith('facilities')) return { view: 'facilities' };
  if (x.startsWith('facility-')) return { view: 'facilities', facility: x.slice(9) };
  return { view: 'my-work' };
}

export function hashFor(link: Link): string {
  if ('facility' in link) return `#facility-${link.facility}`;
  return `#matter-${link.tab}${link.id ? `-${link.id}` : ''}`;
}

export function go(link: Link | string) {
  location.hash = typeof link === 'string' ? link : hashFor(link);
}

// ---------------------------------------------------------------- document viewer

interface DocCtx {
  open: (e: EvidenceRef | { docId: string; page?: number; quote?: string }) => void;
}
const DocContext = createContext<DocCtx>({ open: () => {} });
export const useDocs = () => useContext(DocContext);

export function DocProvider({ children }: { children: ReactNode }) {
  const [ref, setRef] = useState<{ docId: string; page?: number; quote?: string } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setRef(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const doc = ref && DOCS.find((d) => d.id === ref.docId);
  return (
    <DocContext.Provider value={{ open: setRef }}>
      {children}
      {doc && (
        <div className="drawer-scrim" onClick={() => setRef(null)}>
          <aside className="drawer" role="dialog" aria-label={doc.title} onClick={(e) => e.stopPropagation()}>
            <header className="drawer-head">
              <div>
                <div className="eyebrow">{doc.docType}</div>
                <h2>{doc.title}</h2>
                <div className="meta-row">
                  <StatusPill tone={doc.status === 'executed' || doc.status === 'filed' ? 'lock' : 'neutral'}>{doc.version}</StatusPill>
                  <span>Dated {fmt(doc.date)}</span>
                  <span>Received {fmt(doc.receivedAt)}</span>
                </div>
              </div>
              <button className="btn ghost" onClick={() => setRef(null)} aria-label="Close document">Close</button>
            </header>
            {(doc.status === 'executed' || doc.status === 'filed') && (
              <p className="note lock-note">This is a {doc.status} record. It is preserved exactly as {doc.status}; corrections require a supplement or amendment.</p>
            )}
            <div className="pages">
              {doc.pages.map((p) => (
                <section key={p.n} className={`page ${ref.page === p.n ? 'page-hit' : ''}`}>
                  <div className="page-no">p. {p.n}</div>
                  <p>{highlight(p.text, ref.page === p.n ? ref.quote : undefined)}</p>
                </section>
              ))}
            </div>
            <p className="fine">Synthetic document. Excerpts shown are the pages the system indexed.</p>
          </aside>
        </div>
      )}
    </DocContext.Provider>
  );
}

function highlight(text: string, quote?: string): ReactNode {
  if (!quote) return text;
  const core = quote.replace(/\s*\.\.\.\s*/g, '…').split('…').map((q) => q.trim()).filter((q) => q.length > 6);
  for (const q of core) {
    const i = text.indexOf(q);
    if (i >= 0)
      return (
        <>
          {text.slice(0, i)}
          <mark>{q}</mark>
          {text.slice(i + q.length)}
        </>
      );
  }
  return text;
}

// ---------------------------------------------------------------- small pieces

export function StatusPill({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function Evidence({ e, compact }: { e: EvidenceRef; compact?: boolean }) {
  const { open } = useDocs();
  const d = DOCS.find((x) => x.id === e.docId);
  return (
    <button className={`evidence ${compact ? 'compact' : ''}`} onClick={() => open(e.quote ? e : { docId: e.docId })} title="Open source page">
      {e.label && <span className="ev-label">{e.label}</span>}
      {!compact && e.quote && <q>{e.quote}</q>}
      <span className="ev-cite">
        {d?.title} · {d?.version}
        {e.quote ? ` · p. ${e.page}` : ''}
      </span>
    </button>
  );
}

export type Provenance = 'ai' | 'rule' | 'counsel' | 'record';

const PROV: Record<Provenance, string> = {
  ai: 'Proposed by document review',
  rule: 'Determined by reviewed rule',
  counsel: 'Counsel decision',
  record: 'Verified record',
};

export function Prov({ kind, detail }: { kind: Provenance; detail?: string }) {
  return (
    <span className={`prov prov-${kind}`}>
      <span className="prov-dot" aria-hidden="true" />
      {PROV[kind]}
      {detail ? ` · ${detail}` : ''}
    </span>
  );
}

export function Sources({ ids }: { ids: number[] }) {
  if (!ids.length) return null;
  return <span className="sources">Sources [{ids.join(', ')}]</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}
