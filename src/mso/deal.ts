/**
 * Fictional extension of the Cedar Hollow deal for the MSO audit.
 *
 * Ridgeline Care Management, Inc. (the Compiler's management company, owned
 * mostly by Harbor Crest Fund IV) also manages Alder Springs Medical Group,
 * a friendly professional medical corporation whose physicians and nurse
 * practitioners cover Cedar Hollow Care Center. Ridgeline also bought the
 * equipment and office lease of a physician's prior practice. Every name,
 * number, license and document here is made up.
 */
import type { DealDoc } from '../compiler/deal';
import type { MEDICAL_CORP_LISTED } from './params';

export type PracticeKind = 'physician' | 'dental' | 'snf';

export interface Party {
  id: string;
  name: string;
  /** Set for a practice or facility. */
  practice?: PracticeKind;
  license?: 'physician' | (typeof MEDICAL_CORP_LISTED)[number];
  note?: string;
}

/** Parties new to this module. Compiler entities (rcm, hcf, hcgp, stc, lps, opco) are reused by id. */
export const PARTIES: Party[] = [
  { id: 'asmg', name: 'Alder Springs Medical Group, a Professional Medical Corporation', practice: 'physician',
    note: 'Provides the medical director and attending physicians at Cedar Hollow Care Center' },
  { id: 'lfm', name: 'Liu Family Medicine', practice: 'physician', note: "Dr. Liu's prior practice, a sole proprietorship" },
  { id: 'opco', name: 'Cedar Hollow Operations LLC', practice: 'snf', note: 'The SNF licensee from the Compiler' },
  { id: 'al', name: 'Ana Liu, M.D.', license: 'physician' },
  { id: 'bo', name: 'Benjamin Okafor, M.D.', license: 'physician' },
  { id: 'jp', name: 'Jordan Pike, NP', license: 'registered nurse', note: 'Nurse practitioner; holds shares as a registered nurse' },
  { id: 'so', name: 'Samuel Ortiz, PA-C', license: 'physician assistant' },
  { id: 'mr', name: 'Marco Ruiz, NP', license: 'registered nurse' },
];

/**
 * Who counts as a "private equity group" or "hedge fund" under § 1190.
 * Each answer is our reading of the definitions against the record.
 */
export interface PeStatus {
  id: string;
  status: 'pe-group' | 'excluded' | 'not-pe';
  basis: string;
}

export const PE_STATUS: PeStatus[] = [
  { id: 'hcf', status: 'pe-group', basis: 'Raises capital from limited partners and invests it in operating companies (§ 1190(b)(1)).' },
  { id: 'hcgp', status: 'pe-group', basis: 'Manages the fund as its general partner, so it takes part in managing the group (§ 1190(b)(1)).' },
  { id: 'stc', status: 'excluded', basis: 'A limited partner that contributes funds and, on this record, does not take part in management (§ 1190(b)(2)(A)).' },
  { id: 'lps', status: 'excluded', basis: 'Same exclusion, assuming the unnamed limited partners are passive. The record does not say.' },
  { id: 'tr', status: 'not-pe', basis: 'An individual shareholder and officer of Ridgeline.' },
];

/** A contract or set of contracts between a practice and a counterparty. */
export interface Arrangement {
  id: string;
  title: string;
  practiceId: string;
  counterpartyId: string;
  /** What the contract is, for § 1191(d)(1): management of the practice, or a sale of its assets. */
  nature: 'management' | 'asset-sale' | 'employment';
  docIds: string[];
}

export const ARRANGEMENTS: Arrangement[] = [
  { id: 'msa', title: 'Ridgeline manages Alder Springs Medical Group', practiceId: 'asmg', counterpartyId: 'rcm', nature: 'management', docIds: ['asmg-msa', 'asmg-joc', 'asmg-str'] },
  { id: 'apa', title: 'Ridgeline buys the assets of Liu Family Medicine', practiceId: 'lfm', counterpartyId: 'rcm', nature: 'asset-sale', docIds: ['lfm-apa'] },
  { id: 'emp', title: 'Alder Springs Medical Group employs Dr. Okafor', practiceId: 'asmg', counterpartyId: 'bo', nature: 'employment', docIds: ['asmg-emp'] },
  { id: 'snf', title: 'Ridgeline manages Cedar Hollow Care Center (from the Compiler)', practiceId: 'opco', counterpartyId: 'rcm', nature: 'management', docIds: ['mgmt'] },
];

/**
 * One clause, coded by a reviewer (or proposed by a model and checked).
 * `quote` must appear word for word on the page or the clause is not used.
 */
export interface Clause {
  id: string;
  arrangementId: string;
  docId: string;
  page: number;
  quote: string;
  /** SB 351 items the clause touches. */
  items: string[];
  /** Who gets the power. Omit for covenants that bind providers. */
  holderId?: string;
  /**
   * final: the holder decides. tie-break: the holder's appointee breaks ties on a committee.
   * recommend: the holder proposes and a physician approves. none: the clause gives the holder nothing.
   */
  authority?: 'final' | 'tie-break' | 'recommend' | 'none';
  covenant?:
    | { kind: 'noncompete'; saleOfBusiness: boolean }
    | { kind: 'nondisparage' }
    | { kind: 'confidentiality'; mnpiOnly: boolean; requiredByLawCarveOut: boolean; commentaryCarveOut: boolean }
    | { kind: 'fee'; basis: 'percent-of-collections' | 'fixed'; pct?: string; valuationInRecord: boolean }
    | { kind: 'designee' };
}

export const MSO_DOCS: DealDoc[] = [
  {
    id: 'asmg-msa',
    title: 'Management Services Agreement between Alder Springs Medical Group and Ridgeline Care Management, Inc.',
    pages: [
      { n: 1, text: 'Section 3.2 Payers. Manager shall negotiate and execute all agreements with third-party payers on behalf of the Group on rates and terms determined by Manager. Section 3.4 Equipment. Manager shall recommend medical equipment and supplies; the Medical Director shall approve all selections.' },
      { n: 2, text: 'Section 4.1 Productivity. Each full-time Physician shall maintain a minimum of 2.8 patient encounters per scheduled clinical hour, as set annually by Manager. Section 4.3 Records. Manager shall maintain the Group\'s electronic health record system, and the Group shall own all patient medical records. Section 5.1 Fee. The Group shall pay Manager a management fee equal to eighteen percent (18%) of Net Collections.' },
      { n: 3, text: 'Section 9.2 Restrictive Covenant. The Group shall cause each Provider to agree that, for two (2) years after leaving the Group, the Provider will not practice medicine within fifteen (15) miles of any Group office. Section 11.1 Confidentiality. Neither the Group nor any Provider shall disclose any information concerning Manager, its affiliates, or the operation of the Practice to any third party. Section 11.3 Non-Disparagement. No Provider shall make any statement that disparages Manager or comments on the Practice\'s quality of care or billing practices.' },
    ],
  },
  {
    id: 'asmg-joc',
    title: 'Joint Operating Committee Charter (Alder Springs Medical Group)',
    pages: [
      { n: 1, text: 'Section 2 Members. The Committee consists of two members appointed by the Group and two members appointed by Manager. The chair is appointed by Manager and casts the deciding vote on any tie. Section 3 Authority. The Committee approves coding templates, charge capture rules and billing policies for the Practice. Section 4 Credentialing. The Committee sets the clinical competency criteria used to hire and terminate Physicians and advanced practice providers.' },
    ],
  },
  {
    id: 'asmg-str',
    title: 'Stock Transfer Restriction Agreement (Alder Springs Medical Group)',
    pages: [
      { n: 1, text: 'Section 2 Transfer Event. Upon a Transfer Event, the Shareholder shall transfer all shares to a licensed physician designated by Manager for a price of one thousand dollars ($1,000).' },
    ],
  },
  {
    id: 'lfm-apa',
    title: 'Asset Purchase Agreement: Liu Family Medicine to Ridgeline Care Management, Inc.',
    pages: [
      { n: 1, text: 'Section 1 Sale. Seller sells to Ridgeline Care Management, Inc. the furniture, equipment, goodwill and office lease of Liu Family Medicine.' },
      { n: 2, text: 'Section 7 Covenant. As part of the sale of the business and its goodwill, Ana Liu, M.D. agrees not to open a competing primary care practice within the City of Alder Springs for three (3) years after the Closing.' },
    ],
  },
  {
    id: 'asmg-emp',
    title: 'Physician Employment Agreement: Alder Springs Medical Group and Benjamin Okafor, M.D.',
    pages: [
      { n: 1, text: 'Section 8 Covenant. Physician shall not practice medicine within ten (10) miles of any Group office for one (1) year after termination.' },
    ],
  },
];

export const CLAUSES: Clause[] = [
  { id: 'msa-3.2', arrangementId: 'msa', docId: 'asmg-msa', page: 1, items: ['a2C'], holderId: 'rcm', authority: 'final',
    quote: 'Manager shall negotiate and execute all agreements with third-party payers on behalf of the Group on rates and terms determined by Manager.' },
  { id: 'msa-3.4', arrangementId: 'msa', docId: 'asmg-msa', page: 1, items: ['a2F'], holderId: 'rcm', authority: 'recommend',
    quote: 'Manager shall recommend medical equipment and supplies; the Medical Director shall approve all selections.' },
  { id: 'msa-4.1', arrangementId: 'msa', docId: 'asmg-msa', page: 2, items: ['a1D'], holderId: 'rcm', authority: 'final',
    quote: 'Each full-time Physician shall maintain a minimum of 2.8 patient encounters per scheduled clinical hour, as set annually by Manager.' },
  { id: 'msa-4.3', arrangementId: 'msa', docId: 'asmg-msa', page: 2, items: ['a2A'], holderId: 'rcm', authority: 'none',
    quote: 'Manager shall maintain the Group\'s electronic health record system, and the Group shall own all patient medical records.' },
  { id: 'msa-5.1', arrangementId: 'msa', docId: 'asmg-msa', page: 2, items: ['fee'],
    quote: 'The Group shall pay Manager a management fee equal to eighteen percent (18%) of Net Collections.',
    covenant: { kind: 'fee', basis: 'percent-of-collections', pct: '18', valuationInRecord: false } },
  { id: 'msa-9.2', arrangementId: 'msa', docId: 'asmg-msa', page: 3, items: ['d1A'],
    quote: 'The Group shall cause each Provider to agree that, for two (2) years after leaving the Group, the Provider will not practice medicine within fifteen (15) miles of any Group office.',
    covenant: { kind: 'noncompete', saleOfBusiness: false } },
  { id: 'msa-11.1', arrangementId: 'msa', docId: 'asmg-msa', page: 3, items: ['d1B'],
    quote: 'Neither the Group nor any Provider shall disclose any information concerning Manager, its affiliates, or the operation of the Practice to any third party.',
    covenant: { kind: 'confidentiality', mnpiOnly: false, requiredByLawCarveOut: false, commentaryCarveOut: false } },
  { id: 'msa-11.3', arrangementId: 'msa', docId: 'asmg-msa', page: 3, items: ['d1B'],
    quote: 'No Provider shall make any statement that disparages Manager or comments on the Practice\'s quality of care or billing practices.',
    covenant: { kind: 'nondisparage' } },
  { id: 'joc-3', arrangementId: 'msa', docId: 'asmg-joc', page: 1, items: ['a2E'], holderId: 'rcm', authority: 'tie-break',
    quote: 'The Committee approves coding templates, charge capture rules and billing policies for the Practice.' },
  { id: 'joc-4', arrangementId: 'msa', docId: 'asmg-joc', page: 1, items: ['a2B'], holderId: 'rcm', authority: 'tie-break',
    quote: 'The Committee sets the clinical competency criteria used to hire and terminate Physicians and advanced practice providers.' },
  { id: 'str-2', arrangementId: 'msa', docId: 'asmg-str', page: 1, items: ['designee'], holderId: 'rcm',
    quote: 'the Shareholder shall transfer all shares to a licensed physician designated by Manager for a price of one thousand dollars ($1,000).',
    covenant: { kind: 'designee' } },
  { id: 'apa-7', arrangementId: 'apa', docId: 'lfm-apa', page: 2, items: ['d1A'],
    quote: 'As part of the sale of the business and its goodwill, Ana Liu, M.D. agrees not to open a competing primary care practice within the City of Alder Springs for three (3) years after the Closing.',
    covenant: { kind: 'noncompete', saleOfBusiness: true } },
  { id: 'emp-8', arrangementId: 'emp', docId: 'asmg-emp', page: 1, items: ['d1A'],
    quote: 'Physician shall not practice medicine within ten (10) miles of any Group office for one (1) year after termination.',
    covenant: { kind: 'noncompete', saleOfBusiness: false } },
  { id: 'snf-2.1', arrangementId: 'snf', docId: 'mgmt', page: 1, items: ['a2B'], holderId: 'rcm', authority: 'final',
    quote: 'direct the hiring, firing and supervision of direct care staff' },
];

/** The Joint Operating Committee seats, for the tie-break reading. */
export const JOC = { docId: 'asmg-joc', page: 1, quote: 'The chair is appointed by Manager and casts the deciding vote on any tie.', practiceSeats: 2, managerSeats: 2, tieBreaker: 'rcm' };

/** Alder Springs Medical Group cap table. `proposed` is a fix someone has suggested. */
export interface Holding { partyId: string; shares: string }
export const CAP_TABLE: { current: Holding[]; proposed: Holding[]; proposedNote: string } = {
  current: [
    { partyId: 'al', shares: '600' },
    { partyId: 'jp', shares: '250' },
    { partyId: 'so', shares: '150' },
  ],
  proposed: [
    { partyId: 'al', shares: '500' },
    { partyId: 'bo', shares: '100' },
    { partyId: 'jp', shares: '250' },
    { partyId: 'so', shares: '150' },
  ],
  proposedNote: 'Dr. Okafor buys 100 shares from Dr. Liu.',
};

/** Nurse practitioners and what the deal asks them to do. Licenses are fictional and were not looked up. */
export interface NpRecord {
  partyId: string;
  rnLicense: string;
  npCert: string;
  graduateDegree: boolean;
  transitionHours: number;
  transitionFteYears: number;
  transitionCompletedOn: string;
  role: string;
  /** Setting of the proposed role, against the list in § 2837.103(a)(2). */
  setting: 'listed-with-physicians' | 'outside-listed';
  settingBasis: string;
}

export const NPS: NpRecord[] = [
  { partyId: 'jp', rnLicense: 'SYN-RN-480112', npCert: 'SYN-NP-22017', graduateDegree: true, transitionHours: 4710, transitionFteYears: 3,
    transitionCompletedOn: '2023-03-01', role: 'Attending nurse practitioner at Cedar Hollow Care Center, without standardized procedures',
    setting: 'listed-with-physicians', settingBasis: 'A skilled nursing facility is a health facility under Health & Saf. Code § 1250, listed in § 2837.103(a)(2)(B), and Group physicians practice there.' },
  { partyId: 'mr', rnLicense: 'SYN-RN-512904', npCert: 'SYN-NP-24388', graduateDegree: true, transitionHours: 4620, transitionFteYears: 3,
    transitionCompletedOn: '2024-09-16', role: 'Runs a stand-alone wound care clinic in Alder Springs with no physician on site',
    setting: 'outside-listed', settingBasis: 'A stand-alone NP clinic with no physicians is outside the settings in § 2837.103(a)(2), so it needs a § 2837.104 certificate.' },
];

/** Short column labels for the trace matrix. */
export const DOC_SHORT: Record<string, string> = {
  'asmg-msa': 'Management Services Agreement', 'asmg-joc': 'Committee Charter', 'asmg-str': 'Stock Transfer Restriction',
  'lfm-apa': 'Asset Purchase (Liu)', 'asmg-emp': 'Employment (Okafor)', mgmt: 'SNF Management Agreement',
};

export const partyName = (id: string, fallback: (id: string) => string) => PARTIES.find((p) => p.id === id)?.name ?? fallback(id);
