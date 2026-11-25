import { CONTROL, EDGES, FACTS, NODES, ROLES, type Edge, type Node } from './deal';
import { ZERO, cmp, format, gte, parse, type Q } from './decimal';
import { indirectHoldings, poolCrossing, type EdgeChoice, type IndirectHolding } from './graph';
import type { ParamValues } from './params';

export type Outcome = 'disclose' | 'not-required' | 'unresolved';

export interface ViewRow {
  partyId: string;
  section: string;
  outcome: Outcome;
  pct?: Q;
  basis: string;
  paramIds: string[];
  /** True when the basis rests on our reading rather than the plain text. */
  interpretation?: boolean;
}

export interface Model {
  nodes: Node[];
  edges: Edge[];
  choice: EdgeChoice;
  params: ParamValues;
}

export const defaultModel = (params: ParamValues, choice: EdgeChoice = {}): Model => ({ nodes: NODES, edges: EDGES, choice, params });

const node = (m: Model, id: string) => m.nodes.find((n) => n.id === id)!;
const P = (m: Model, id: string) => parse(m.params[id]);
const pctText = (h: IndirectHolding) => `${format(h.total)}%${h.direct ? ' direct' : ' indirect'}${h.paths.length > 1 ? ` via ${h.paths.length} paths` : ''}`;

function ownershipRows(m: Model, targetId: string, thresholdId: string, section: string, cite: string): ViewRow[] {
  const t = P(m, thresholdId);
  return indirectHoldings(m.edges, targetId, m.choice).map((h) => {
    const n = node(m, h.holderId);
    if (n.kind === 'Pool') {
      const c = poolCrossing(n, h, t);
      if (c && c.canBeCleared)
        return { partyId: n.id, section, outcome: 'not-required' as Outcome, pct: h.total, paramIds: [thresholdId],
          basis: `Unnamed holders: each holds under ${format(c.eachBelow!)}% of ${node(m, c.parentId).name}, and ${format(c.neededOfParent, 4)}% is needed to reach ${format(t)}%.` };
      return { partyId: n.id, section, outcome: 'unresolved' as Outcome, pct: h.total, paramIds: [thresholdId],
        basis: `Holders not named. Any one holding ${format(c?.neededOfParent ?? ZERO, 4)}% or more of ${node(m, c?.parentId ?? targetId).name} reaches ${format(t)}% here${c?.eachBelow ? `, and the record only says each holds under ${format(c.eachBelow)}%` : ''}. Names and percentages are needed. (${cite})` };
    }
    const meets = gte(h.total, t);
    return { partyId: n.id, section, outcome: meets ? 'disclose' : 'not-required', pct: h.total, paramIds: [thresholdId],
      basis: `${pctText(h)}; threshold ${format(t)}%. (${cite})` };
  });
}

/** CDPH change of ownership application (AB 1502): Health & Saf. Code §§ 1253.3, 1267.5. */
export function cdphView(m: Model): ViewRow[] {
  const L = FACTS.licenseeId;
  const rows: ViewRow[] = ownershipRows(m, L, 'cdph.owner', 'Beneficial owners of the licensee', '§ 1267.5(a)(1)');
  const parents = indirectHoldings(m.edges, L, m.choice).filter((h) => node(m, h.holderId).kind !== 'Individual' && node(m, h.holderId).kind !== 'Pool');
  for (const h of parents)
    rows.push({ partyId: h.holderId, section: 'Parent organizations', outcome: 'disclose', pct: h.total, paramIds: [],
      basis: '§ 1253.3(c)(6) asks for any and all parent organizations; § 1267.5(a)(4) adds their officers and directors.', interpretation: true });
  for (const r of ROLES) {
    const holder = node(m, r.holderId);
    if (r.ofId === L && r.role === 'llc-manager')
      rows.push({ partyId: holder.id, section: 'Managers and control of the licensee', outcome: 'disclose', paramIds: [], basis: `${r.detail}. § 1253.3(c)(5) asks for managers of the licensee.` });
    if (r.ofId === L && r.role === 'special-member')
      rows.push({ partyId: holder.id, section: 'Managers and control of the licensee', outcome: 'disclose', pct: ZERO, paramIds: [],
        basis: `${r.detail}. § 1253.3(c)(4) asks for all prospective owners; listing a 0% member is the cautious reading.`, interpretation: true });
    if (r.role === 'general-partner' && parents.some((p) => p.holderId === r.ofId))
      rows.push({ partyId: holder.id, section: 'Managers and control of the licensee', outcome: 'disclose', paramIds: [],
        basis: `General partner of parent organization ${node(m, r.ofId).name}; § 1253.3(c)(7) asks for managers of parents.`, interpretation: true });
    if (r.role === 'trustee' && rows.some((x) => x.partyId === r.ofId && x.outcome === 'disclose'))
      rows.push({ partyId: holder.id, section: 'Managers and control of the licensee', outcome: 'unresolved', paramIds: [],
        basis: `Trustee of ${node(m, r.ofId).name}, a disclosed owner. Who holds the beneficial interest in a trust is an attorney question.` });
    if (r.ofId === L && r.role === 'management-company') {
      rows.push({ partyId: holder.id, section: 'Management company', outcome: 'disclose', paramIds: [], basis: `${r.detail}. § 1253.3(b)(1)–(2), (c)(10)(E).` });
      for (const x of ownershipRows(m, holder.id, 'cdph.mgmt', 'Management company', '§ 1267.5(a)(3)(A)'))
        rows.push({ ...x, basis: `Owner of ${holder.name}: ${x.basis}` });
      for (const o of ROLES.filter((y) => y.ofId === holder.id && (y.role === 'officer' || y.role === 'director')))
        rows.push({ partyId: o.holderId, section: 'Management company', outcome: 'disclose', paramIds: [], basis: `${o.detail} of ${holder.name}; § 1253.3(c)(10)(E).` });
    }
    if (r.ofId === L && r.role === 'landlord') {
      rows.push({ partyId: holder.id, section: 'Real property', outcome: 'disclose', paramIds: [], basis: `${r.detail}. § 1253.3(c)(10)(C); copies of the lease are required.` });
      for (const h of indirectHoldings(m.edges, holder.id, m.choice))
        rows.push({ partyId: h.holderId, section: 'Real property', outcome: 'disclose', pct: h.total, paramIds: [],
          basis: `Owns ${format(h.total)}% of ${holder.name}. Whether an upstream owner of the property company must be named is an attorney question.`, interpretation: true });
    }
    if (r.ofId === L && r.role === 'consultant')
      rows.push({ partyId: holder.id, section: 'Other', outcome: 'not-required', paramIds: [], basis: `${r.detail}. No CDPH disclosure basis found in §§ 1253.3 or 1267.5.` });
  }
  return dedupe(rows);
}

/** CMS-855A and the SNF disclosure attachment: 42 CFR § 424.502 definitions. */
export function cmsView(m: Model): ViewRow[] {
  const L = FACTS.licenseeId;
  const rows: ViewRow[] = ownershipRows(m, L, 'cms.owner', 'Owners (5% direct or indirect)', '42 CFR § 424.502 "Owner"');
  // Managing control
  for (const r of ROLES.filter((x) => x.ofId === L)) {
    if (r.role === 'llc-manager')
      rows.push({ partyId: r.holderId, section: 'Managing control', outcome: 'disclose', paramIds: [], basis: `${r.detail}. Exercises operational or managerial control: "Managing employee".` });
    if (r.role === 'management-company')
      rows.push({ partyId: r.holderId, section: 'Managing control', outcome: 'disclose', paramIds: [], basis: `${r.detail}. "Managing organization".` });
  }
  rows.push({ partyId: '_admin', section: 'Managing control', outcome: 'unresolved', paramIds: [],
    basis: 'The facility administrator and medical director are managing employees by definition. Their names are not in the record.' });

  // Organizational structure, for every entity in the licensee's ownership chain plus the licensee itself
  const chain = [L, ...indirectHoldings(m.edges, L, m.choice).map((h) => h.holderId)];
  for (const id of chain) {
    const ent = node(m, id);
    const direct = m.edges.filter((e) => e.ownedId === id);
    if (ent.kind === 'LLC') {
      const t = P(m, 'cms.llcMember');
      for (const e of direct) {
        const pct = parse(m.choice[e.id] === 'document' && e.docPct ? e.docPct : e.pct);
        rows.push({ partyId: e.ownerId, section: `Organizational structure: ${ent.name}`, outcome: gte(pct, t) ? 'disclose' : 'not-required', pct, paramIds: ['cms.llcMember'],
          basis: `Member of an LLC, ${format(pct)}%. Members and managers are listed with their percentage.`, interpretation: id !== L });
      }
      for (const r of ROLES.filter((x) => x.ofId === id && (x.role === 'llc-manager' || x.role === 'special-member')))
        rows.push({ partyId: r.holderId, section: `Organizational structure: ${ent.name}`, outcome: 'disclose', pct: ZERO, paramIds: ['cms.llcMember'],
          basis: `${r.detail}. Listed at 0%.`, interpretation: id !== L });
    }
    if (ent.kind === 'LP') {
      const t = P(m, 'cms.lpLimited');
      for (const e of direct) {
        const pct = parse(e.pct);
        const owner = node(m, e.ownerId);
        if (e.interest === 'partnership-gp') {
          rows.push({ partyId: e.ownerId, section: `Organizational structure: ${ent.name}`, outcome: 'disclose', pct, paramIds: [], basis: 'General partner: listed regardless of percentage.', interpretation: true });
        } else if (owner.kind === 'Pool') {
          const cleared = owner.poolEachBelow && cmp(parse(owner.poolEachBelow), t) <= 0;
          rows.push({ partyId: e.ownerId, section: `Organizational structure: ${ent.name}`, outcome: cleared ? 'not-required' : 'unresolved', pct, paramIds: ['cms.lpLimited'],
            basis: cleared ? `The record says each holds under ${owner.poolEachBelow}%, below the ${format(t)}% limited-partner test.` : 'Unnamed limited partners; percentages are needed.', interpretation: true });
        } else {
          rows.push({ partyId: e.ownerId, section: `Organizational structure: ${ent.name}`, outcome: gte(pct, t) ? 'disclose' : 'not-required', pct, paramIds: ['cms.lpLimited'],
            basis: `Limited partner, ${format(pct)}%; test is ${format(t)}%.`, interpretation: true });
        }
      }
    }
    if (ent.kind === 'Trust')
      for (const r of ROLES.filter((x) => x.ofId === id && x.role === 'trustee'))
        rows.push({ partyId: r.holderId, section: `Organizational structure: ${ent.name}`, outcome: 'disclose', paramIds: [], basis: 'Trustee of a trust: listed.', interpretation: true });
  }

  // Additional disclosable parties
  for (const c of CONTROL.filter((x) => x.ofId === L))
    rows.push({ partyId: c.holderId, section: 'Additional disclosable parties', outcome: 'disclose', paramIds: [], basis: `${c.detail}: financial or managerial control, ADP (1)(i).`, interpretation: true });
  for (const r of ROLES.filter((x) => x.ofId === L)) {
    if (r.role === 'management-company')
      rows.push({ partyId: r.holderId, section: 'Additional disclosable parties', outcome: 'disclose', paramIds: [], basis: 'Provides management services: ADP (1)(i) and (3)(i).' });
    if (r.role === 'consultant')
      rows.push({ partyId: r.holderId, section: 'Additional disclosable parties', outcome: 'disclose', paramIds: [], basis: 'Provides clinical consulting services: ADP (3)(ii).' });
    if (r.role === 'landlord') {
      rows.push({ partyId: r.holderId, section: 'Additional disclosable parties', outcome: 'disclose', pct: parse('100'), paramIds: ['cms.property'], basis: 'Leases real property to the facility and owns it: ADP (2)(i)–(ii).' });
      const t = P(m, 'cms.property');
      for (const h of indirectHoldings(m.edges, r.holderId, m.choice))
        rows.push({ partyId: h.holderId, section: 'Additional disclosable parties', outcome: gte(h.total, t) ? 'disclose' : 'not-required', pct: h.total, paramIds: ['cms.property'],
          basis: `Holds ${format(h.total)}% of the property owner; test is ${format(t)}% of the property's value. Treating an interest in the owner as an interest in the property is our reading.`, interpretation: true });
    }
  }
  // Private equity / REIT identification
  for (const n of m.nodes.filter((x) => x.tags?.includes('private-equity') || x.tags?.includes('reit')))
    if (rows.some((r) => r.partyId === n.id && r.outcome === 'disclose'))
      rows.push({ partyId: n.id, section: 'Private equity and REIT identification', outcome: 'disclose', paramIds: [],
        basis: n.tags!.includes('reit') ? 'Real estate investment trust as defined in 42 CFR § 424.502.' : 'Private equity company as defined in 42 CFR § 424.502.' });
  return dedupe(rows);
}

export interface OhcaTest {
  id: string;
  label: string;
  result: 'met' | 'not-met' | 'needs-input';
  detail: string;
  paramIds: string[];
}

/** OHCA material change notice: Health & Saf. Code § 127507; 22 CCR § 97435. */
export function ohcaView(m: Model): { tests: OhcaTest[]; noticing: ViewRow[]; conclusion: string } {
  const usd = (s: string) => `$${Number(s).toLocaleString('en-US')}`;
  const tests: OhcaTest[] = [];
  const r1 = P(m, 'ohca.rev1');
  const r2 = P(m, 'ohca.rev2');
  const big = FACTS.revenue.filter((r) => gte(parse(r.usd), r1));
  for (const r of FACTS.revenue) {
    const v = parse(r.usd);
    if (gte(v, r1)) tests.push({ id: `b1-${r.partyId}`, label: `Filer test (b)(1): ${r.label}`, result: 'met', detail: `${usd(r.usd)} is at least ${usd(m.params['ohca.rev1'])}.`, paramIds: ['ohca.rev1'] });
    else if (gte(v, r2) && big.some((b) => b.partyId !== r.partyId))
      tests.push({ id: `b2-${r.partyId}`, label: `Filer test (b)(2): ${r.label}`, result: 'met', detail: `${usd(r.usd)} is at least ${usd(m.params['ohca.rev2'])}, and the other side includes a (b)(1) entity.`, paramIds: ['ohca.rev2'] });
    else tests.push({ id: `b-${r.partyId}`, label: `Filer tests (b)(1)–(2): ${r.label}`, result: 'not-met', detail: `${usd(r.usd)} is below both thresholds.`, paramIds: ['ohca.rev1', 'ohca.rev2'] });
  }
  tests.push({ id: 'b3', label: 'Filer test (b)(3): services in a primary care shortage area', result: FACTS.inShortageArea == null ? 'needs-input' : FACTS.inShortageArea ? 'met' : 'not-met',
    detail: FACTS.inShortageArea == null ? 'Not checked. Look the facility up in HRSA shortage area data.' : '', paramIds: [] });
  const fmv = parse(FACTS.fairMarketValue);
  tests.push({ id: 'c1', label: 'Circumstance (c)(1): transaction value', result: gte(fmv, P(m, 'ohca.fmv')) ? 'met' : 'not-met',
    detail: `${usd(FACTS.fairMarketValue)} against ${usd(m.params['ohca.fmv'])}.`, paramIds: ['ohca.fmv'] });
  tests.push({ id: 'c3', label: "Circumstance (c)(3): share of the seller's California assets", result: gte(parse(FACTS.sellerAssetsPct), P(m, 'ohca.assets')) ? 'met' : 'not-met',
    detail: `${FACTS.sellerAssetsPct}% against ${m.params['ohca.assets']}%.`, paramIds: ['ohca.assets'] });
  tests.push({ id: 'e1', label: 'Control test (e)(1): governing-body voting power transferred', result: gte(parse(FACTS.votingPowerTransferredPct), P(m, 'ohca.vote')) ? 'met' : 'not-met',
    detail: `${FACTS.votingPowerTransferredPct}% against ${m.params['ohca.vote']}%.`, paramIds: ['ohca.vote'] });
  const vetoes = CONTROL.filter((c) => c.right === 'veto' || c.right === 'supermajority');
  tests.push({ id: 'e2', label: 'Control test (e)(2): veto or supermajority rights', result: vetoes.length ? 'met' : 'not-met',
    detail: vetoes.length ? vetoes.map((v) => `${node(m, v.holderId).name}: ${v.detail}`).join('; ') : 'None in the record.', paramIds: [] });
  tests.push({ id: 'd', label: 'Exemptions, § 127507(d)', result: FACTS.sellerIsNonprofit ? 'needs-input' : 'not-met',
    detail: FACTS.sellerIsNonprofit ? 'A nonprofit party may be under Attorney General review instead; confirm.' : 'No health plan, insurer, county buyer, or nonprofit subject to Attorney General review in the record.', paramIds: [] });

  const noticing: ViewRow[] = [];
  for (const n of m.nodes) {
    if (n.tags?.includes('private-equity') && n.kind === 'LP')
      noticing.push({ partyId: n.id, section: 'Noticing entities, § 127507(h)', outcome: 'disclose', paramIds: [], basis: 'Private equity group: § 127507(h)(1).' });
    if (n.tags?.includes('new-entity'))
      noticing.push({ partyId: n.id, section: 'Noticing entities, § 127507(h)', outcome: 'disclose', paramIds: [], basis: 'Newly created entity formed for this transaction: § 127507(h)(2).' });
    if (n.tags?.includes('mso'))
      noticing.push({ partyId: n.id, section: 'Noticing entities, § 127507(h)', outcome: 'disclose', paramIds: [], basis: 'Management services organization: § 127507(h)(3) and (c)(2)(B).', interpretation: true });
  }
  const filer = tests.some((t) => t.id.startsWith('b') && t.result === 'met');
  const circ = tests.some((t) => ['c1', 'c3', 'e1', 'e2'].includes(t.id) && t.result === 'met');
  const conclusion = filer && circ
    ? `On these facts a material change notice looks required, at least ${m.params['ohca.notice']} days before closing. Attorney to confirm; this view never clears OHCA on its own.`
    : 'No filer test and circumstance were both met on these facts. That is not a clearance: attorney to confirm.';
  return { tests, noticing, conclusion };
}

function dedupe(rows: ViewRow[]): ViewRow[] {
  const out = new Map<string, ViewRow>();
  for (const r of rows) {
    const k = `${r.section}|${r.partyId}`;
    const prev = out.get(k);
    if (!prev) out.set(k, r);
    else if (!prev.basis.includes(r.basis))
      out.set(k, { ...prev, basis: `${prev.basis} Also: ${r.basis}`, outcome: prev.outcome === 'disclose' || r.outcome === 'disclose' ? 'disclose' : prev.outcome, paramIds: [...prev.paramIds, ...r.paramIds] });
  }
  return [...out.values()];
}
