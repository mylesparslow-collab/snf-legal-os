/**
 * Synthetic deal for the compiler: one California SNF acquired by a
 * private-equity-backed buyer, with a third-party management company and a
 * REIT landlord. Every name, number and document is fictional. Counsel of
 * record is the fictional firm Thornwood Garza LLP.
 */

export type NodeKind = 'LLC' | 'LP' | 'Corporation' | 'Trust' | 'Individual' | 'Pool';
export type Tag = 'licensee' | 'private-equity' | 'reit' | 'mso' | 'new-entity' | 'seller';

export interface Node {
  id: string;
  name: string;
  kind: NodeKind;
  tags?: Tag[];
  note?: string;
  /** For a Pool: each unnamed holder is known to hold less than this percent of the owned entity. */
  poolEachBelow?: string;
}

export interface Edge {
  id: string;
  ownerId: string;
  ownedId: string;
  /** Percent of the owned entity, as a plain decimal string. */
  pct: string;
  interest: 'membership' | 'partnership-gp' | 'partnership-lp' | 'stock' | 'beneficial';
  /** Where the figure was entered from (intake = client org chart / questionnaire). */
  source: 'intake' | 'document';
  /** A different figure stated in a document, if any. */
  docPct?: string;
  docRef?: { docId: string; page: number };
}

export type RoleKind =
  | 'llc-manager'
  | 'special-member'
  | 'general-partner'
  | 'officer'
  | 'director'
  | 'trustee'
  | 'management-company'
  | 'landlord'
  | 'consultant';

export interface Role {
  id: string;
  holderId: string;
  ofId: string;
  role: RoleKind;
  detail: string;
}

export interface ControlRight {
  id: string;
  holderId: string;
  ofId: string;
  right: 'veto' | 'supermajority' | 'board-seats';
  detail: string;
}

export interface DealDoc {
  id: string;
  title: string;
  pages: { n: number; text: string }[];
}

export interface DealFacts {
  matter: string;
  firm: string;
  facility: string;
  facilityAddress: string;
  licenseeId: string;
  closing: string; // ISO date
  today: string;
  fairMarketValue: string; // USD
  /** Average annual California revenue, 3 most recent fiscal years, by party. */
  revenue: { partyId: string; label: string; usd: string }[];
  /** Share of the seller's total California assets being sold. */
  sellerAssetsPct: string;
  /** Share of the licensee's governing-body voting power changing hands. */
  votingPowerTransferredPct: string;
  /** Unknown until someone checks HRSA data. */
  inShortageArea: boolean | null;
  sellerIsNonprofit: boolean;
}

export const FACTS: DealFacts = {
  matter: 'Harbor Crest / Cedar Hollow Care Center acquisition (SYN-2026-0417)',
  firm: 'Thornwood Garza LLP',
  facility: 'Cedar Hollow Care Center (99-bed SNF)',
  facilityAddress: '1400 Larkspur Way, Alder Springs, CA (fictional)',
  licenseeId: 'opco',
  closing: '2027-04-30',
  today: '2026-11-25',
  fairMarketValue: '38500000',
  revenue: [
    { partyId: 'hcf', label: 'Harbor Crest Fund IV and affiliates (California health care revenue)', usd: '142000000' },
    { partyId: 'seller', label: 'Valley Oak Care Partners LLC (seller, three facilities)', usd: '61300000' },
    { partyId: 'opco', label: 'Cedar Hollow Care Center (net patient revenue)', usd: '21400000' },
  ],
  sellerAssetsPct: '31',
  votingPowerTransferredPct: '100',
  inShortageArea: null,
  sellerIsNonprofit: false,
};

export const NODES: Node[] = [
  { id: 'opco', name: 'Cedar Hollow Operations LLC', kind: 'LLC', tags: ['licensee', 'new-entity'], note: 'Proposed licensee, formed for this deal' },
  { id: 'bsh', name: 'Bayline Senior Holdings LLC', kind: 'LLC' },
  { id: 'hcf', name: 'Harbor Crest Fund IV, L.P.', kind: 'LP', tags: ['private-equity'] },
  { id: 'hcgp', name: 'Harbor Crest GP IV, LLC', kind: 'LLC', tags: ['private-equity'] },
  { id: 'stc', name: "Sierra Teachers' Co-Invest, L.P.", kind: 'LP' },
  { id: 'lps', name: 'Other limited partners of Harbor Crest Fund IV (not identified)', kind: 'Pool', poolEachBelow: '10',
    note: 'The partnership agreement says none holds 10% or more of the fund. Holders are not named.' },
  { id: 'dw', name: 'Dana Whitcombe', kind: 'Individual' },
  { id: 'oft', name: 'Ojai Family Trust', kind: 'Trust' },
  { id: 'eo', name: 'Elena Ojai', kind: 'Individual' },
  { id: 'mv', name: 'Marisol Vega', kind: 'Individual' },
  { id: 'pn', name: 'Priya Natarajan', kind: 'Individual' },
  { id: 'rcm', name: 'Ridgeline Care Management, Inc.', kind: 'Corporation', tags: ['mso'] },
  { id: 'tr', name: 'Tomas Reyes', kind: 'Individual' },
  { id: 'hco', name: 'Hannah Cole', kind: 'Individual' },
  { id: 'propco', name: 'Cedar Hollow Realty LLC', kind: 'LLC' },
  { id: 'wmr', name: 'Westmark Healthcare REIT, Inc.', kind: 'Corporation', tags: ['reit'] },
  { id: 'lca', name: 'Lumen Clinical Advisors LLC', kind: 'LLC' },
  { id: 'seller', name: 'Valley Oak Care Partners LLC', kind: 'LLC', tags: ['seller'], note: 'Current licensee' },
];

export const EDGES: Edge[] = [
  { id: 'e1', ownerId: 'bsh', ownedId: 'opco', pct: '90', interest: 'membership', source: 'intake' },
  { id: 'e2', ownerId: 'dw', ownedId: 'opco', pct: '10', interest: 'membership', source: 'intake' },
  { id: 'e3', ownerId: 'hcf', ownedId: 'bsh', pct: '62.5', interest: 'membership', source: 'intake' },
  { id: 'e4', ownerId: 'oft', ownedId: 'bsh', pct: '25', interest: 'membership', source: 'intake' },
  { id: 'e5', ownerId: 'mv', ownedId: 'bsh', pct: '12.5', interest: 'membership', source: 'intake' },
  { id: 'e6', ownerId: 'hcgp', ownedId: 'hcf', pct: '1', interest: 'partnership-gp', source: 'intake' },
  { id: 'e7', ownerId: 'stc', ownedId: 'hcf', pct: '33', interest: 'partnership-lp', source: 'intake' },
  { id: 'e8', ownerId: 'lps', ownedId: 'hcf', pct: '66', interest: 'partnership-lp', source: 'intake' },
  { id: 'e9', ownerId: 'hcf', ownedId: 'rcm', pct: '70', interest: 'stock', source: 'intake', docPct: '65', docRef: { docId: 'mgmt', page: 2 } },
  { id: 'e10', ownerId: 'tr', ownedId: 'rcm', pct: '30', interest: 'stock', source: 'intake', docPct: '35', docRef: { docId: 'mgmt', page: 2 } },
  { id: 'e11', ownerId: 'wmr', ownedId: 'propco', pct: '100', interest: 'membership', source: 'intake' },
];

export const ROLES: Role[] = [
  { id: 'r1', holderId: 'pn', ofId: 'opco', role: 'llc-manager', detail: 'Sole Manager; holds no Percentage Interest' },
  { id: 'r2', holderId: 'hcgp', ofId: 'opco', role: 'special-member', detail: 'Special Member with consent rights; holds no Percentage Interest' },
  { id: 'r3', holderId: 'hcgp', ofId: 'hcf', role: 'general-partner', detail: 'General Partner of the fund' },
  { id: 'r4', holderId: 'eo', ofId: 'oft', role: 'trustee', detail: 'Trustee' },
  { id: 'r5', holderId: 'rcm', ofId: 'opco', role: 'management-company', detail: 'Manages day-to-day operations under the Management Agreement' },
  { id: 'r6', holderId: 'tr', ofId: 'rcm', role: 'officer', detail: 'President and Chief Executive Officer' },
  { id: 'r7', holderId: 'hco', ofId: 'rcm', role: 'director', detail: 'Director' },
  { id: 'r8', holderId: 'tr', ofId: 'rcm', role: 'director', detail: 'Director' },
  { id: 'r9', holderId: 'propco', ofId: 'opco', role: 'landlord', detail: 'Landlord under the Master Lease; owns the real property' },
  { id: 'r10', holderId: 'lca', ofId: 'opco', role: 'consultant', detail: 'Clinical consulting services agreement' },
];

export const CONTROL: ControlRight[] = [
  { id: 'c1', holderId: 'hcgp', ofId: 'opco', right: 'veto', detail: 'Consent needed to adopt the annual budget or remove the Administrator' },
];

export const DOCS: DealDoc[] = [
  {
    id: 'opco-oa',
    title: 'Operating Agreement of Cedar Hollow Operations LLC (draft 3)',
    pages: [
      { n: 1, text: 'Section 3.1 Members. As of the Effective Date, Bayline Senior Holdings LLC holds a ninety percent (90%) Percentage Interest and Dana Whitcombe holds a ten percent (10%) Percentage Interest. Harbor Crest GP IV, LLC is admitted as the Special Member and holds no Percentage Interest.' },
      { n: 2, text: 'Section 5.1 Management. The Company shall be managed by a single Manager. The initial Manager is Priya Natarajan, who holds no Percentage Interest and may be removed only by Members holding a majority of the Percentage Interests.' },
      { n: 3, text: 'Section 5.4 Major Decisions. No annual operating budget may be adopted, and no Administrator of the Facility may be removed, without the prior written consent of the Special Member. The Company shall engage Lumen Clinical Advisors LLC to provide clinical consulting services.' },
    ],
  },
  {
    id: 'bsh-oa',
    title: 'Amended and Restated Operating Agreement of Bayline Senior Holdings LLC, Schedule A',
    pages: [
      { n: 1, text: 'Schedule A. Members and Percentage Interests. Harbor Crest Fund IV, L.P.: 62.5%. Ojai Family Trust, Elena Ojai, Trustee: 25%. Marisol Vega: 12.5%. Total: 100%.' },
    ],
  },
  {
    id: 'hcf-lpa',
    title: 'Limited Partnership Agreement of Harbor Crest Fund IV, L.P. (excerpt)',
    pages: [
      { n: 4, text: 'Section 2.3 Partners. Harbor Crest GP IV, LLC, as General Partner, holds a one percent (1%) interest in the Partnership. Sierra Teachers\' Co-Invest, L.P. holds a thirty-three percent (33%) interest as a Limited Partner. No other Limited Partner holds ten percent (10%) or more of the Interests.' },
    ],
  },
  {
    id: 'mgmt',
    title: 'Management Agreement between Cedar Hollow Operations LLC and Ridgeline Care Management, Inc.',
    pages: [
      { n: 1, text: 'Section 2.1 Engagement. Ridgeline Care Management, Inc. shall manage the day-to-day operations of the Facility, prepare the operating budget, and direct the hiring, firing and supervision of direct care staff, subject to the Owner\'s approval rights.' },
      { n: 2, text: 'Schedule 4 Manager Disclosure. Harbor Crest Fund IV, L.P. owns sixty-five percent (65%) of the outstanding shares of Ridgeline Care Management, Inc., and Tomas Reyes owns thirty-five percent (35%). Officers: Tomas Reyes, President and Chief Executive Officer. Directors: Tomas Reyes and Hannah Cole.' },
    ],
  },
  {
    id: 'lease',
    title: 'Master Lease (Cedar Hollow Care Center)',
    pages: [
      { n: 1, text: 'Recital A. Cedar Hollow Realty LLC, a wholly owned subsidiary of Westmark Healthcare REIT, Inc., owns the real property commonly known as Cedar Hollow Care Center and leases it to Cedar Hollow Operations LLC as Tenant under this Master Lease.' },
    ],
  },
];

export const nodeName = (id: string) => NODES.find((n) => n.id === id)?.name ?? id;
