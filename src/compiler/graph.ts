import type { Edge, Node } from './deal';
import { HUNDRED, ZERO, add, cmp, div, eq, format, mul, parse, pctOf, sub, sum, type Q } from './decimal';

export interface GraphIssue {
  severity: 'error' | 'warning';
  entityId?: string;
  message: string;
}

export interface PathStep {
  edgeId: string;
  ownerId: string;
  ownedId: string;
  pct: Q;
}

export interface IndirectHolding {
  holderId: string;
  /** Exact total percent of the target, across every path. */
  total: Q;
  /** Each path from holder down to target, with its exact product. */
  paths: { steps: PathStep[]; product: Q }[];
  direct: boolean;
}

/** Which figure to use for an edge: the intake figure or the one stated in a document. */
export type EdgeChoice = Record<string, 'intake' | 'document'>;

export const edgePct = (e: Edge, choice: EdgeChoice = {}): Q =>
  parse(choice[e.id] === 'document' && e.docPct ? e.docPct : e.pct);

/** Check that every entity's stated owners add to exactly 100% and the graph has no cycles. */
export function validate(nodes: Node[], edges: Edge[], choice: EdgeChoice = {}): GraphIssue[] {
  const issues: GraphIssue[] = [];
  const ids = new Set(nodes.map((n) => n.id));
  for (const e of edges) {
    if (!ids.has(e.ownerId) || !ids.has(e.ownedId)) issues.push({ severity: 'error', message: `Edge ${e.id} names an entity that is not in the record.` });
    let p: Q;
    try {
      p = edgePct(e, choice);
    } catch (err) {
      issues.push({ severity: 'error', message: `Edge ${e.id}: ${(err as Error).message}` });
      continue;
    }
    if (cmp(p, ZERO) <= 0 || cmp(p, HUNDRED) > 0) issues.push({ severity: 'error', message: `Edge ${e.id}: ${format(p)}% is outside 0–100.` });
    if (e.docPct && e.docPct !== e.pct && !choice[e.id])
      issues.push({ severity: 'warning', entityId: e.ownedId,
        message: `${nodes.find((n) => n.id === e.ownerId)?.name ?? e.ownerId} in ${nodes.find((n) => n.id === e.ownedId)?.name ?? e.ownedId}: intake says ${e.pct}%, the document says ${e.docPct}%. Using the intake figure until someone chooses.` });
  }
  const owned = new Map<string, Edge[]>();
  for (const e of edges) owned.set(e.ownedId, [...(owned.get(e.ownedId) ?? []), e]);
  for (const [id, es] of owned) {
    const total = sum(es.map((e) => edgePct(e, choice)));
    if (!eq(total, HUNDRED)) {
      const name = nodes.find((n) => n.id === id)?.name ?? id;
      issues.push({ severity: 'error', entityId: id,
        message: `Owners of ${name} add to ${format(total)}%, not 100%. The gap of ${format(sub(HUNDRED, total))}% is unaccounted for.` });
    }
  }
  // cycle check (DFS over owner edges)
  const state = new Map<string, 1 | 2>();
  const visit = (id: string, stack: string[]): void => {
    state.set(id, 1);
    for (const e of owned.get(id) ?? []) {
      const s = state.get(e.ownerId);
      if (s === 1) issues.push({ severity: 'error', message: `Ownership cycle: ${[...stack, id, e.ownerId].join(' → ')}` });
      else if (!s) visit(e.ownerId, [...stack, id]);
    }
    state.set(id, 2);
  };
  for (const n of nodes) if (!state.get(n.id)) visit(n.id, []);
  return issues;
}

/**
 * Every ultimate and intermediate holder of `targetId`, with the exact product
 * along each path (42 CFR § 424.502: multiply the percentages at each tier).
 * Intermediate entities are included because the disclosure tests apply to
 * direct and indirect owners at every tier, not only the top.
 */
export function indirectHoldings(edges: Edge[], targetId: string, choice: EdgeChoice = {}): IndirectHolding[] {
  const owners = new Map<string, Edge[]>();
  for (const e of edges) owners.set(e.ownedId, [...(owners.get(e.ownedId) ?? []), e]);
  const acc = new Map<string, IndirectHolding>();

  const walk = (entityId: string, factor: Q, steps: PathStep[], seen: Set<string>) => {
    for (const e of owners.get(entityId) ?? []) {
      if (seen.has(e.ownerId)) continue;
      const p = edgePct(e, choice);
      const product = pctOf(factor, p);
      const path = [{ edgeId: e.id, ownerId: e.ownerId, ownedId: e.ownedId, pct: p }, ...steps];
      const h = acc.get(e.ownerId) ?? { holderId: e.ownerId, total: ZERO, paths: [], direct: false };
      h.total = add(h.total, product);
      h.paths.push({ steps: path, product });
      if (e.ownedId === targetId) h.direct = true;
      acc.set(e.ownerId, h);
      walk(e.ownerId, product, path, new Set([...seen, e.ownerId]));
    }
  };
  walk(targetId, HUNDRED, [], new Set([targetId]));
  return [...acc.values()].sort((a, b) => cmp(b.total, a.total));
}

/**
 * For an unnamed pool of holders: the smallest share of the pool's parent that
 * one holder would need to cross `threshold` of the target. If that is below
 * the most any one holder can hold, the test cannot be cleared without names.
 */
export function poolCrossing(pool: Node, holding: IndirectHolding, threshold: Q) {
  if (pool.kind !== 'Pool' || holding.paths.length === 0) return null;
  // multiplier from the pool's parent down to the target
  const path = holding.paths[0];
  const below = path.steps.slice(1).reduce((f, s) => pctOf(f, s.pct), HUNDRED);
  const needed = div(mul(threshold, HUNDRED), below); // % of parent one holder needs
  const cap = pool.poolEachBelow ? parse(pool.poolEachBelow) : null;
  return {
    parentId: path.steps[0].ownedId,
    neededOfParent: needed,
    eachBelow: cap,
    canBeCleared: cap ? cmp(cap, needed) <= 0 : false,
  };
}
