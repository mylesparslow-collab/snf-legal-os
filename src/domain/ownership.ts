import type { OwnershipEdge } from './types';

export interface Holding {
  holderId: string;
  /** Economic share of the target, as a percentage. */
  economic: number;
  /** Voting share of the target, as a percentage. */
  voting: number;
  paths: string[][];
}

export interface IndirectResult {
  holdings: Holding[];
  /** Portion of the target whose ultimate holder is not in the record. */
  unknownEconomic: number;
  unknownVoting: number;
}

/**
 * Trace every path from ultimate holders down to `targetId`, multiplying stated
 * percentages. An edge with a null percentage, or an entity whose stated owners
 * sum to less than 100%, contributes to the unknown portion instead of being
 * guessed. Voting share follows voting interests only.
 */
export function computeIndirect(edges: OwnershipEdge[], targetId: string): IndirectResult {
  const byOwned = new Map<string, OwnershipEdge[]>();
  for (const e of edges) {
    const list = byOwned.get(e.ownedId) ?? [];
    list.push(e);
    byOwned.set(e.ownedId, list);
  }

  const acc = new Map<string, Holding>();
  let unknownEconomic = 0;
  let unknownVoting = 0;

  function walk(entityId: string, econ: number, vote: number, path: string[], seen: Set<string>) {
    const owners = byOwned.get(entityId);
    if (!owners || owners.length === 0) {
      if (path.length === 1) return; // the target itself has no owners recorded
      const h = acc.get(entityId) ?? { holderId: entityId, economic: 0, voting: 0, paths: [] };
      h.economic += econ;
      h.voting += vote;
      h.paths.push([...path].reverse());
      acc.set(entityId, h);
      return;
    }
    const statedEcon = owners.reduce((s, o) => s + (o.pct ?? 0), 0);
    const missingPct = Math.max(0, 100 - statedEcon);
    const votingTotal = owners.filter((o) => o.voting).reduce((s, o) => s + (o.pct ?? 0), 0);
    // An unidentified holder might hold voting interests, so it stays in the voting denominator.
    const votingDenominator = votingTotal + missingPct;
    for (const o of owners) {
      if (seen.has(o.ownerId)) continue; // guard against cycles in bad data
      if (o.pct == null) continue;
      const share = o.pct / 100;
      const voteShare = o.voting && votingDenominator > 0 ? o.pct / votingDenominator : 0;
      const next = new Set(seen);
      next.add(o.ownerId);
      walk(o.ownerId, econ * share, vote * voteShare, [...path, o.ownerId], next);
    }
    unknownEconomic += (econ * missingPct) / 100;
    if (votingDenominator > 0) unknownVoting += (vote * missingPct) / votingDenominator;
  }

  walk(targetId, 100, 100, [targetId], new Set([targetId]));

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const holdings = [...acc.values()]
    .map((h) => ({ ...h, economic: round(h.economic), voting: round(h.voting) }))
    .sort((a, b) => b.economic - a.economic);
  return { holdings, unknownEconomic: round(unknownEconomic), unknownVoting: round(unknownVoting) };
}

/** Edges visible in one source view; 'reconciled' uses accepted edges only. */
export function edgesForView(
  edges: OwnershipEdge[],
  view: 'questionnaire' | 'orgchart' | 'working',
): OwnershipEdge[] {
  if (view === 'working') return edges.filter((e) => e.status !== 'contradicted');
  return edges.filter((e) => e.view === 'both' || e.view === view);
}
