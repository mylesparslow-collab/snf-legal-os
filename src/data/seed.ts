// Synthetic scenario. Every entity, person, identifier, and document below is
// fictional. Identifiers carry a SYN- prefix so they cannot be mistaken for real ones.
import type {
  Assertion,
  ControlRight,
  Correspondence,
  ClientRequest,
  Decision,
  Doc,
  Facility,
  Fact,
  Issue,
  OwnershipEdge,
  Party,
  State,
  TeamMember,
  WorkProduct,
} from '../domain/types';

export const DEMO_TODAY = '2026-10-29';

export const MATTER = {
  id: 'M-2026-0147',
  name: 'Juniper / Sierra Crest',
  description: 'Acquisition of operating assets of three California SNFs',
  side: 'Buyer counsel',
  client: 'Juniper Care Partners LLC and its three facility operating companies',
  conflicts: 'Cleared Aug 6, 2026 (synthetic check CC-2026-1182). Firm does not represent the seller or the property buyer in this deal.',
  opened: '2026-08-06',
};

export const TEAM: TeamMember[] = [
  { id: 'ana', name: 'Ana Reyes', role: 'partner', title: 'Partner, Senior Care' },
  { id: 'jordan', name: 'Jordan Lee', role: 'associate', title: 'Senior Associate' },
  { id: 'sam', name: 'Sam Whitfield', role: 'paralegal', title: 'Senior Paralegal' },
];

export const FACILITIES: Facility[] = [
  {
    id: 'lk',
    tradeName: 'Larkspur Gardens Post-Acute',
    shortName: 'Larkspur',
    address: '2150 Larkspur Lane, Elk Grove, CA',
    county: 'Sacramento',
    beds: 99,
    services: ['Skilled nursing', 'Subacute respiratory (proposed)'],
    hudInsured: true,
    thirdPartyLandlord: false,
  },
  {
    id: 'mh',
    tradeName: 'Mission Hills Care Center',
    shortName: 'Mission Hills',
    address: '7400 N. Mission Hills Road, Fresno, CA',
    county: 'Fresno',
    beds: 120,
    services: ['Skilled nursing'],
    hudInsured: false,
    thirdPartyLandlord: false,
  },
  {
    id: 'bv',
    tradeName: 'Bayview Terrace Nursing',
    shortName: 'Bayview',
    address: '31 Terrace Point Drive, Martinez, CA',
    county: 'Contra Costa',
    beds: 84,
    services: ['Skilled nursing'],
    hudInsured: false,
    thirdPartyLandlord: true,
  },
];

export const PARTIES: Party[] = [
  { id: 'jcp', name: 'Juniper Care Partners LLC', kind: 'LLC', side: 'buyer', representation: 'client', roleInDeal: 'Buyer parent' },
  { id: 'op-lk', name: 'Larkspur Opco LLC', kind: 'LLC', side: 'buyer', representation: 'client', roleInDeal: 'Proposed licensee, Larkspur' },
  { id: 'op-mh', name: 'Mission Hills Opco LLC', kind: 'LLC', side: 'buyer', representation: 'client', roleInDeal: 'Proposed licensee, Mission Hills' },
  { id: 'op-bv', name: 'Bayview Opco LLC', kind: 'LLC', side: 'buyer', representation: 'client', roleInDeal: 'Proposed licensee, Bayview' },
  { id: 'jrh', name: 'Juniper Realty Holdings LLC', kind: 'LLC', side: 'buyer', representation: 'affiliate-separately-represented', roleInDeal: 'Property buyer and proposed landlord (Larkspur, Mission Hills)', counsel: 'Alder & Finch LLP (synthetic)' },
  { id: 'hft', name: 'Halvorsen Family Trust', kind: 'Trust', side: 'buyer', representation: 'third-party', roleInDeal: 'Member of buyer parent (Class A)' },
  { id: 'okafor', name: 'Dana Okafor', kind: 'Individual', side: 'buyer', representation: 'third-party', roleInDeal: 'Member of buyer parent (Class A)' },
  { id: 'rrc', name: 'Redwood Ridge Capital Fund II LP', kind: 'LP', side: 'buyer', representation: 'third-party', roleInDeal: 'Investor (Class B)' },
  { id: 'tam', name: 'Tamarack Holdings LLC', kind: 'LLC', side: 'buyer', representation: 'third-party', roleInDeal: 'Holding entity shown only in org chart v3' },
  { id: 'mer', name: 'Meridian Clinical Management LLC', kind: 'LLC', side: 'buyer', representation: 'third-party', roleInDeal: 'Proposed manager (all three facilities)' },
  { id: 'scl', name: 'Sierra Crest Senior Living, Inc.', kind: 'Corporation', side: 'seller', representation: 'counterparty', roleInDeal: 'Seller parent', counsel: 'Kestrel Moore LLP (synthetic)' },
  { id: 's-lk', name: 'Larkspur Gardens Operating Co., LLC', kind: 'LLC', side: 'seller', representation: 'counterparty', roleInDeal: 'Current licensee, Larkspur' },
  { id: 's-mh', name: 'Mission Hills Healthcare, LLC', kind: 'LLC', side: 'seller', representation: 'counterparty', roleInDeal: 'Current licensee, Mission Hills' },
  { id: 's-bv', name: 'Bayview Terrace Operations, LLC', kind: 'LLC', side: 'seller', representation: 'counterparty', roleInDeal: 'Current licensee, Bayview' },
  { id: 'scr', name: 'Sierra Crest Realty LLC', kind: 'LLC', side: 'seller', representation: 'counterparty', roleInDeal: 'Current property owner (Larkspur, Mission Hills)' },
  { id: 'hpp', name: 'Hollis Point Properties LP', kind: 'LP', side: 'neutral', representation: 'third-party', roleInDeal: 'Ground lessor, Bayview (not selling)' },
  { id: 'cfm', name: 'Cascade Federal Mortgage', kind: 'Corporation', side: 'neutral', representation: 'third-party', roleInDeal: 'HUD Section 232 lender, Larkspur' },
  { id: 'plb', name: 'Pacific Ledger Bank', kind: 'Corporation', side: 'neutral', representation: 'third-party', roleInDeal: 'Conventional lender, Mission Hills (payoff at closing)' },
  { id: 'cdph', name: 'California Department of Public Health', kind: 'Agency', side: 'agency', representation: 'agency', roleInDeal: 'Licensing and certification' },
  { id: 'cms', name: 'Centers for Medicare & Medicaid Services', kind: 'Agency', side: 'agency', representation: 'agency', roleInDeal: 'Medicare enrollment and provider agreements' },
  { id: 'dhcs', name: 'Department of Health Care Services', kind: 'Agency', side: 'agency', representation: 'agency', roleInDeal: 'Medi-Cal program' },
  { id: 'hcai', name: 'Department of Health Care Access and Information', kind: 'Agency', side: 'agency', representation: 'agency', roleInDeal: 'OHCA notice and review' },
  { id: 'hud', name: 'U.S. Department of Housing and Urban Development', kind: 'Agency', side: 'agency', representation: 'agency', roleInDeal: 'Section 232 program' },
];

export const partyName = (id: string) => PARTIES.find((p) => p.id === id)?.name ?? id;

export const DOCS: Doc[] = [
  {
    id: 'apa', title: 'Asset Purchase Agreement', docType: 'Transaction agreement', version: 'Draft v6', status: 'draft',
    date: '2026-10-21', receivedAt: '2026-10-21', facilityIds: ['lk', 'mh', 'bv'],
    pages: [
      { n: 4, text: '§2.3 Closing. Subject to the satisfaction or waiver of the conditions in Article VIII, the Closing shall occur on January 12, 2027 (the "Target Closing Date"), with operational transfer effective 12:01 a.m. on that date.' },
      { n: 12, text: '§6.4 Interim Period. During the period from the Effective Date through the Closing (the "Interim Period"), Seller shall operate each Facility in the ordinary course and shall cooperate with Buyer\'s Manager as provided in the Management Transition Plan.' },
      { n: 27, text: '§8.1(c) Licenses. Each Buyer Operating Company shall have received from CDPH approval of its application for a license to operate the applicable Facility, subject only to customary post-closing conditions.' },
      { n: 31, text: '§9.1(b) Outside Date. Either party may terminate this Agreement if the Closing has not occurred on or before March 31, 2027 (the "Outside Date").' },
    ],
  },
  {
    id: 'lease', title: 'Master Lease (Larkspur and Mission Hills)', docType: 'Lease', version: 'Draft v4', status: 'draft',
    date: '2026-10-14', receivedAt: '2026-10-15', facilityIds: ['lk', 'mh'],
    pages: [
      { n: 1, text: 'THIS MASTER LEASE is entered into by JUNIPER REALTY HOLDINGS LLC, a Delaware limited liability company ("Landlord"), and JUNIPER CARE OPERATIONS LLC, a California limited liability company ("Tenant").' },
      { n: 3, text: '§2.1 Commencement Date. The Term shall commence on the Closing Date under the Asset Purchase Agreement, anticipated to be January 12, 2027.' },
    ],
  },
  {
    id: 'cdph-lk', title: 'CDPH CHOW application packet — Larkspur', docType: 'Agency filing', version: 'As uploaded', status: 'filed',
    date: '2026-09-30', receivedAt: '2026-09-30', facilityIds: ['lk'],
    pages: [
      { n: 2, text: 'Applicant (proposed licensee): Larkspur Opco LLC. Facility: Larkspur Gardens Post-Acute. Anticipated date of change: January 12, 2027.' },
      { n: 6, text: 'Ownership of applicant: Juniper Care Partners LLC, 100%. Members of Juniper Care Partners LLC: Halvorsen Family Trust 40%; Redwood Ridge Capital Fund II LP 45%; Dana Okafor 15%.' },
      { n: 9, text: 'Management company: Meridian Clinical Management LLC (agreement to be provided).' },
    ],
  },
  {
    id: 'cdph-mh', title: 'CDPH CHOW application packet — Mission Hills', docType: 'Agency filing', version: 'As uploaded', status: 'filed',
    date: '2026-09-30', receivedAt: '2026-09-30', facilityIds: ['mh'],
    pages: [
      { n: 2, text: 'Applicant (proposed licensee): Mission Hills Opco LLC. Facility: Mission Hills Care Center. Anticipated date of change: January 12, 2027.' },
      { n: 6, text: 'Ownership of applicant: Juniper Care Partners LLC, 100%. Members of Juniper Care Partners LLC: Halvorsen Family Trust 40%; Redwood Ridge Capital Fund II LP 45%; Dana Okafor 15%.' },
    ],
  },
  {
    id: 'quest', title: 'Buyer ownership and control questionnaire', docType: 'Questionnaire', version: 'Completed', status: 'received',
    date: '2026-08-20', receivedAt: '2026-08-21', facilityIds: ['lk', 'mh', 'bv'],
    pages: [
      { n: 3, text: 'Q9. List each direct member of Juniper Care Partners LLC. Halvorsen Family Trust — 40% Class A Units. Redwood Ridge Capital Fund II LP — 45% Class B Units (non-voting). Dana Okafor — 15% Class A Units.' },
      { n: 5, text: 'Q14. Does any investor hold management, veto, or other control rights over the facilities or their operations? Answer: No.' },
    ],
  },
  {
    id: 'org2', title: 'Buyer organization chart', docType: 'Organization chart', version: 'v2', status: 'received',
    date: '2026-08-20', receivedAt: '2026-08-21', facilityIds: ['lk', 'mh', 'bv'],
    pages: [{ n: 1, text: 'Halvorsen Family Trust (40%) — Redwood Ridge Capital Fund II LP (45%) — Dana Okafor (15%) → Juniper Care Partners LLC → three facility operating companies (100% each).' }],
  },
  {
    id: 'org3', title: 'Buyer organization chart', docType: 'Organization chart', version: 'v3', status: 'received',
    date: '2026-10-09', receivedAt: '2026-10-09', facilityIds: ['lk', 'mh', 'bv'],
    pages: [{ n: 1, text: 'Redwood Ridge Capital Fund II LP (90%) and "Co-investors" (10%, unnamed) → Tamarack Holdings LLC → 45% Class B of Juniper Care Partners LLC. Halvorsen Family Trust 40% and Dana Okafor 15% unchanged.' }],
  },
  {
    id: 'mgmt', title: 'Management Agreement (Meridian)', docType: 'Management agreement', version: 'Draft v2', status: 'draft',
    date: '2026-10-02', receivedAt: '2026-10-03', facilityIds: ['lk', 'mh', 'bv'],
    pages: [
      { n: 2, text: '§2.1 Term. The term of this Agreement begins on the commencement of the Interim Period (as defined in the Asset Purchase Agreement) and continues for five years after the Closing.' },
      { n: 5, text: '§4.2 Authority. Manager shall have authority to hire, supervise, and terminate the Administrator of each Facility and to approve the annual operating budget, in each case without further approval of Owner.' },
      { n: 8, text: '§6.1 Fee. Owner shall pay Manager a base fee equal to 5.0% of Gross Revenues, payable monthly.' },
    ],
  },
  {
    id: 'side', title: 'Redwood Ridge side letter', docType: 'Side letter', version: 'Executed', status: 'executed',
    date: '2026-07-15', receivedAt: '2026-10-09', facilityIds: ['lk', 'mh', 'bv'],
    pages: [{ n: 2, text: '§3 Consent Rights. The consent of the Class B Majority shall be required to (a) approve the annual budget of any Facility or (b) appoint or remove the Administrator of any Facility.' }],
  },
  {
    id: 'disc', title: 'Seller disclosure schedules', docType: 'Disclosure schedules', version: 'v3', status: 'draft',
    date: '2026-10-18', receivedAt: '2026-10-19', facilityIds: ['lk', 'mh', 'bv'],
    pages: [{ n: 14, text: 'Schedule 4.12 (Regulatory Matters). Mission Hills: CDPH citation No. SYN-2026-0418 (Class B), issued June 2026. No other matters.' }],
  },
  {
    id: 'bv-gl', title: 'Bayview ground lease (Hollis Point)', docType: 'Lease', version: 'Executed 2011', status: 'executed',
    date: '2011-05-02', receivedAt: '2026-08-28', facilityIds: ['bv'],
    pages: [{ n: 22, text: '§14.1 Assignment. Tenant shall not assign this Lease or sublet the Premises, in whole or in part, without Landlord\'s prior written consent.' }],
  },
  {
    id: 'bv-am1', title: 'Bayview ground lease — Amendment No. 1', docType: 'Lease amendment', version: 'Executed 2019', status: 'executed',
    date: '2019-03-11', receivedAt: '2026-08-28', facilityIds: ['bv'],
    pages: [{ n: 1, text: '2. Rent. Commencing April 1, 2019, Base Rent shall be as set forth on Schedule 2 attached hereto and incorporated herein.' }],
  },
  {
    id: 'debt', title: 'Seller debt schedule', docType: 'Diligence response', version: 'v1', status: 'received',
    date: '2026-08-30', receivedAt: '2026-08-30', facilityIds: ['lk', 'mh', 'bv'],
    pages: [{ n: 1, text: 'Larkspur: HUD Section 232 insured mortgage, Cascade Federal Mortgage, to remain in place. Mission Hills: term loan, Pacific Ledger Bank, payoff at closing. Bayview: no mortgage debt (ground lease).' }],
  },
  {
    id: 'hud-letter', title: 'Lender letter re operator change (Larkspur)', docType: 'Lender correspondence', version: 'Received', status: 'received',
    date: '2026-10-01', receivedAt: '2026-10-02', facilityIds: ['lk'],
    pages: [{ n: 1, text: 'Please provide the complete operator change package, including the proposed operator lease and management agreement, no later than 60 days before the anticipated closing date so that it can be submitted for HUD review.' }],
  },
  {
    id: 'sos', title: 'Seller Statement of Information', docType: 'Public record', version: 'Retrieved', status: 'received',
    date: '2026-08-12', receivedAt: '2026-08-12', facilityIds: ['lk', 'mh', 'bv'],
    pages: [{ n: 1, text: 'Sierra Crest Senior Living, Inc. — Type: Stock corporation (for-profit). Status: Active.' }],
  },
  {
    id: 'n9167', title: 'Seller current licensee notice (CDPH 9167)', docType: 'Agency filing', version: 'As filed by seller', status: 'filed',
    date: '2026-09-30', receivedAt: '2026-10-03', facilityIds: ['lk', 'mh', 'bv'],
    pages: [{ n: 1, text: 'Notice of anticipated change of ownership. Facilities: Larkspur Gardens Post-Acute; Mission Hills Care Center; Bayview Terrace Nursing. Anticipated date: January 12, 2027.' }],
  },
  {
    id: 'loi', title: 'Letter of intent', docType: 'Letter of intent', version: 'Executed', status: 'executed',
    date: '2026-08-04', receivedAt: '2026-08-04', facilityIds: ['lk', 'mh', 'bv'],
    pages: [{ n: 2, text: 'The parties anticipate closing on or about January 12, 2027, subject to regulatory approvals. This letter is non-binding except for Sections 7 (Exclusivity) and 8 (Confidentiality).' }],
  },
  {
    id: 'license-lk', title: 'Current license — Larkspur', docType: 'License', version: 'Current', status: 'received',
    date: '2025-03-01', receivedAt: '2026-08-21', facilityIds: ['lk'],
    pages: [{ n: 1, text: 'Licensee: Larkspur Gardens Operating Co., LLC. License No. SYN-030001234. Skilled Nursing Facility, 99 beds. CCN SYN-055901.' }],
  },
  {
    id: 'license-mh', title: 'Current license — Mission Hills', docType: 'License', version: 'Current', status: 'received',
    date: '2025-06-01', receivedAt: '2026-08-21', facilityIds: ['mh'],
    pages: [{ n: 1, text: 'Licensee: Mission Hills Healthcare, LLC. License No. SYN-040005678. Skilled Nursing Facility, 120 beds. CCN SYN-055944.' }],
  },
  {
    id: 'license-bv', title: 'Current license — Bayview', docType: 'License', version: 'Current', status: 'received',
    date: '2025-01-15', receivedAt: '2026-08-21', facilityIds: ['bv'],
    pages: [{ n: 1, text: 'Licensee: Bayview Terrace Operations, LLC. License No. SYN-070009012. Skilled Nursing Facility, 84 beds. CCN SYN-055987.' }],
  },
  {
    id: 'cdph-notice', title: 'CDPH request for additional information — Mission Hills', docType: 'Agency correspondence', version: 'Received', status: 'received',
    date: '2026-10-27', receivedAt: '2026-10-28', facilityIds: ['mh'],
    pages: [{ n: 1, text: 'Your application is incomplete. Please provide: (1) an organizational chart identifying every person and entity with a direct or indirect ownership or control interest in the applicant; (2) a copy of the management agreement for the facility; (3) evidence of the applicant\'s right to possession of the premises. Please submit the requested information within 30 calendar days of the date of this letter.' }],
  },
];

export const docById = (id: string) => DOCS.find((d) => d.id === id);

export const ASSERTIONS: Assertion[] = [
  // Larkspur
  { id: 'a1', facilityId: 'lk', field: 'licensee', value: 'Larkspur Gardens Operating Co., LLC', status: 'verified', validFrom: '2014-03-01', validTo: null, recordedAt: '2026-08-21', evidence: { docId: 'license-lk', page: 1, quote: 'Licensee: Larkspur Gardens Operating Co., LLC.' } },
  { id: 'a2', facilityId: 'lk', field: 'licensee', value: 'Larkspur Opco LLC', status: 'proposed', validFrom: null, recordedAt: '2026-09-30', evidence: { docId: 'cdph-lk', page: 2, quote: 'Applicant (proposed licensee): Larkspur Opco LLC.' }, dependsOn: 'CDPH approval and closing' },
  { id: 'a3', facilityId: 'lk', field: 'propertyOwner', value: 'Sierra Crest Realty LLC', status: 'verified', validFrom: '2014-03-01', recordedAt: '2026-08-21', evidence: { docId: 'debt', page: 1, quote: 'Larkspur: HUD Section 232 insured mortgage' } },
  { id: 'a4', facilityId: 'lk', field: 'propertyOwner', value: 'Juniper Realty Holdings LLC', status: 'proposed', validFrom: null, recordedAt: '2026-10-15', evidence: { docId: 'lease', page: 1, quote: 'JUNIPER REALTY HOLDINGS LLC ... ("Landlord")' }, dependsOn: 'Real estate closing (separately represented buyer)' },
  { id: 'a5', facilityId: 'lk', field: 'operatorManager', value: 'Self-operated by licensee', status: 'verified', validFrom: '2014-03-01', recordedAt: '2026-08-21', evidence: { docId: 'license-lk', page: 1, quote: 'Licensee: Larkspur Gardens Operating Co., LLC.' } },
  { id: 'a6', facilityId: 'lk', field: 'operatorManager', value: 'Meridian Clinical Management LLC (manager)', status: 'proposed', validFrom: null, recordedAt: '2026-10-03', evidence: { docId: 'mgmt', page: 2, quote: 'The term of this Agreement begins on the commencement of the Interim Period' }, dependsOn: 'Management change review (see issue on §4.2)' },
  { id: 'a7', facilityId: 'lk', field: 'stateLicense', value: 'SYN-030001234 (not transferable; successor license required)', status: 'verified', validFrom: '2025-03-01', recordedAt: '2026-08-21', evidence: { docId: 'license-lk', page: 1, quote: 'License No. SYN-030001234.' } },
  { id: 'a8', facilityId: 'lk', field: 'ccn', value: 'SYN-055901', status: 'verified', validFrom: '2014-03-01', recordedAt: '2026-08-21', evidence: { docId: 'license-lk', page: 1, quote: 'CCN SYN-055901.' } },
  { id: 'a9', facilityId: 'lk', field: 'mediCalRoute', value: 'Enrolls through CDPH (SNF), not PAVE', status: 'verified', validFrom: '2014-03-01', recordedAt: '2026-10-29', evidence: { docId: 'license-lk', page: 1, quote: 'Skilled Nursing Facility, 99 beds.' } },
  { id: 'a10', facilityId: 'lk', field: 'financing', value: 'HUD Section 232 insured mortgage (Cascade Federal Mortgage), remains in place', status: 'verified', validFrom: '2019-01-01', recordedAt: '2026-08-30', evidence: { docId: 'debt', page: 1, quote: 'Larkspur: HUD Section 232 insured mortgage, Cascade Federal Mortgage, to remain in place.' } },
  // Mission Hills
  { id: 'b1', facilityId: 'mh', field: 'licensee', value: 'Mission Hills Healthcare, LLC', status: 'verified', validFrom: '2016-07-01', recordedAt: '2026-08-21', evidence: { docId: 'license-mh', page: 1, quote: 'Licensee: Mission Hills Healthcare, LLC.' } },
  { id: 'b2', facilityId: 'mh', field: 'licensee', value: 'Mission Hills Opco LLC', status: 'proposed', validFrom: null, recordedAt: '2026-09-30', evidence: { docId: 'cdph-mh', page: 2, quote: 'Applicant (proposed licensee): Mission Hills Opco LLC.' }, dependsOn: 'CDPH approval and closing' },
  { id: 'b3', facilityId: 'mh', field: 'propertyOwner', value: 'Sierra Crest Realty LLC', status: 'verified', validFrom: '2016-07-01', recordedAt: '2026-08-21', evidence: { docId: 'debt', page: 1, quote: 'Mission Hills: term loan, Pacific Ledger Bank' } },
  { id: 'b4', facilityId: 'mh', field: 'propertyOwner', value: 'Juniper Realty Holdings LLC', status: 'proposed', validFrom: null, recordedAt: '2026-10-15', evidence: { docId: 'lease', page: 1, quote: 'JUNIPER REALTY HOLDINGS LLC ... ("Landlord")' }, dependsOn: 'Real estate closing (separately represented buyer)' },
  { id: 'b5', facilityId: 'mh', field: 'operatorManager', value: 'Self-operated by licensee', status: 'verified', validFrom: '2016-07-01', recordedAt: '2026-08-21', evidence: { docId: 'license-mh', page: 1, quote: 'Licensee: Mission Hills Healthcare, LLC.' } },
  { id: 'b6', facilityId: 'mh', field: 'operatorManager', value: 'Meridian Clinical Management LLC (manager)', status: 'proposed', validFrom: null, recordedAt: '2026-10-03', evidence: { docId: 'mgmt', page: 2, quote: 'begins on the commencement of the Interim Period' }, dependsOn: 'Management change review' },
  { id: 'b7', facilityId: 'mh', field: 'stateLicense', value: 'SYN-040005678 (not transferable; successor license required)', status: 'verified', validFrom: '2025-06-01', recordedAt: '2026-08-21', evidence: { docId: 'license-mh', page: 1, quote: 'License No. SYN-040005678.' } },
  { id: 'b8', facilityId: 'mh', field: 'ccn', value: 'SYN-055944', status: 'verified', validFrom: '2016-07-01', recordedAt: '2026-08-21', evidence: { docId: 'license-mh', page: 1, quote: 'CCN SYN-055944.' } },
  { id: 'b9', facilityId: 'mh', field: 'mediCalRoute', value: 'Enrolls through CDPH (SNF), not PAVE', status: 'verified', validFrom: '2016-07-01', recordedAt: '2026-10-29', evidence: { docId: 'license-mh', page: 1, quote: 'Skilled Nursing Facility, 120 beds.' } },
  { id: 'b10', facilityId: 'mh', field: 'financing', value: 'Conventional term loan (Pacific Ledger Bank), payoff at closing', status: 'verified', validFrom: '2021-02-01', recordedAt: '2026-08-30', evidence: { docId: 'debt', page: 1, quote: 'Mission Hills: term loan, Pacific Ledger Bank, payoff at closing.' } },
  // Bayview
  { id: 'c1', facilityId: 'bv', field: 'licensee', value: 'Bayview Terrace Operations, LLC', status: 'verified', validFrom: '2011-05-02', recordedAt: '2026-08-21', evidence: { docId: 'license-bv', page: 1, quote: 'Licensee: Bayview Terrace Operations, LLC.' } },
  { id: 'c2', facilityId: 'bv', field: 'licensee', value: 'Bayview Opco LLC', status: 'proposed', validFrom: null, recordedAt: '2026-10-21', evidence: { docId: 'apa', page: 27, quote: 'Each Buyer Operating Company shall have received from CDPH approval' }, dependsOn: 'CDPH application not yet submitted' },
  { id: 'c3', facilityId: 'bv', field: 'propertyOwner', value: 'Hollis Point Properties LP (ground lessor; not selling)', status: 'verified', validFrom: '2011-05-02', recordedAt: '2026-08-28', evidence: { docId: 'bv-gl', page: 22, quote: 'Tenant shall not assign this Lease ... without Landlord\'s prior written consent.' } },
  { id: 'c5', facilityId: 'bv', field: 'operatorManager', value: 'Self-operated by licensee', status: 'verified', validFrom: '2011-05-02', recordedAt: '2026-08-21', evidence: { docId: 'license-bv', page: 1, quote: 'Licensee: Bayview Terrace Operations, LLC.' } },
  { id: 'c6', facilityId: 'bv', field: 'operatorManager', value: 'Meridian Clinical Management LLC (manager)', status: 'proposed', validFrom: null, recordedAt: '2026-10-03', evidence: { docId: 'mgmt', page: 2, quote: 'begins on the commencement of the Interim Period' }, dependsOn: 'Management change review' },
  { id: 'c7', facilityId: 'bv', field: 'stateLicense', value: 'SYN-070009012 (not transferable; successor license required)', status: 'verified', validFrom: '2025-01-15', recordedAt: '2026-08-21', evidence: { docId: 'license-bv', page: 1, quote: 'License No. SYN-070009012.' } },
  { id: 'c8', facilityId: 'bv', field: 'ccn', value: 'SYN-055987', status: 'verified', validFrom: '2011-05-02', recordedAt: '2026-08-21', evidence: { docId: 'license-bv', page: 1, quote: 'CCN SYN-055987.' } },
  { id: 'c9', facilityId: 'bv', field: 'mediCalRoute', value: 'Enrolls through CDPH (SNF), not PAVE', status: 'verified', validFrom: '2011-05-02', recordedAt: '2026-10-29', evidence: { docId: 'license-bv', page: 1, quote: 'Skilled Nursing Facility, 84 beds.' } },
  { id: 'c10', facilityId: 'bv', field: 'financing', value: 'No mortgage debt (ground leasehold)', status: 'verified', validFrom: '2011-05-02', recordedAt: '2026-08-30', evidence: { docId: 'debt', page: 1, quote: 'Bayview: no mortgage debt (ground lease).' } },
];

export const CONTROL_RIGHTS: ControlRight[] = [
  { id: 'cr1', right: 'Hire or remove the Administrator', holderId: 'mer', instrument: 'Management Agreement §4.2', effective: 'Start of Interim Period (before closing)', evidence: { docId: 'mgmt', page: 5, quote: 'authority to hire, supervise, and terminate the Administrator' }, flag: 'Operational control could shift before CDPH approval' },
  { id: 'cr2', right: 'Approve annual operating budget', holderId: 'mer', instrument: 'Management Agreement §4.2', effective: 'Start of Interim Period (before closing)', evidence: { docId: 'mgmt', page: 5, quote: 'to approve the annual operating budget, in each case without further approval of Owner' }, flag: 'Conflicts with Class B consent right' },
  { id: 'cr3', right: 'Consent to annual budget', holderId: 'rrc', instrument: 'Side letter §3(a)', effective: 'In force since Jul 15, 2026', evidence: { docId: 'side', page: 2, quote: 'consent of the Class B Majority shall be required to (a) approve the annual budget' }, flag: 'Questionnaire Q14 answered "No" to investor control rights' },
  { id: 'cr4', right: 'Consent to appointing or removing the Administrator', holderId: 'rrc', instrument: 'Side letter §3(b)', effective: 'In force since Jul 15, 2026', evidence: { docId: 'side', page: 2, quote: '(b) appoint or remove the Administrator of any Facility' }, flag: 'Non-voting equity with operational veto' },
  { id: 'cr5', right: 'Elect managers of buyer parent', holderId: 'hft', instrument: 'Operating agreement (Class A majority)', effective: 'Current', evidence: { docId: 'quest', page: 3, quote: 'Halvorsen Family Trust — 40% Class A Units.' } },
];

const fact = (key: string, label: string, value: string, kind: 'date' | 'text', evidence?: Fact['evidence']): Fact => ({
  key, label, value, kind, evidence, history: [],
});

export function initialState(): State {
  const facts: Record<string, Fact> = {};
  for (const f of [
    fact('target.handover', 'Target closing and operational handover', '2027-01-12', 'date', { docId: 'apa', page: 4, quote: 'the Closing shall occur on January 12, 2027 (the "Target Closing Date")' }),
    fact('contract.outside', 'Outside date', '2027-03-31', 'date', { docId: 'apa', page: 31, quote: 'on or before March 31, 2027 (the "Outside Date")' }),
    fact('lease.tenant', 'Master lease tenant', 'Juniper Care Operations LLC', 'text', { docId: 'lease', page: 1, quote: 'JUNIPER CARE OPERATIONS LLC, a California limited liability company ("Tenant")' }),
    fact('manager.name', 'Proposed manager', 'Meridian Clinical Management LLC', 'text', { docId: 'mgmt', page: 2, quote: 'Manager' }),
    fact('owner.redwood', 'Redwood Ridge interest in buyer parent', '45% Class B, held directly', 'text', { docId: 'quest', page: 3, quote: 'Redwood Ridge Capital Fund II LP — 45% Class B Units (non-voting).' }),
    fact('mgmt.start', 'Management agreement start', 'Start of Interim Period', 'text', { docId: 'mgmt', page: 2, quote: 'begins on the commencement of the Interim Period' }),
    fact('control.investors', 'Investor control rights', 'None reported', 'text', { docId: 'quest', page: 5, quote: 'Does any investor hold management, veto, or other control rights ... Answer: No.' }),
  ]) facts[f.key] = f;

  return {
    version: 3,
    today: DEMO_TODAY,
    role: 'partner',
    facts,
    issues: ISSUES.map((i) => ({ ...i })),
    decisions: DECISIONS.map((d) => ({ ...d })),
    edges: EDGES.map((e) => ({ ...e })),
    workProducts: WORK_PRODUCTS.map((w) => ({ ...w, revisions: [] })),
    correspondence: CORRESPONDENCE.map((c) => ({ ...c })),
    requests: REQUESTS.map((r) => ({ ...r })),
    log: [
      { at: '2026-10-28 16:40', by: 'System', text: 'Received CDPH letter for Mission Hills. Proposed a correspondence event and deadline for review.' },
      { at: '2026-10-21 10:05', by: 'System', text: 'Imported APA draft v6. Extracted 4 dated provisions; target date unchanged.' },
      { at: '2026-10-09 14:12', by: 'System', text: 'Imported org chart v3 and Redwood side letter. Proposed 2 issues for review.' },
      { at: '2026-09-30 17:30', by: 'Sam Whitfield', text: 'Recorded CDPH upload for Larkspur and Mission Hills. Completeness not yet confirmed by CDPH.' },
      { at: '2026-08-06 09:00', by: 'Ana Reyes', text: 'Opened matter. Representation: buyer parent and three operating companies.' },
    ],
  };
}

const EDGES: OwnershipEdge[] = [
  { id: 'e1', ownerId: 'jcp', ownedId: 'op-lk', pct: 100, interestClass: 'Membership', voting: true, status: 'verified', recordedAt: '2026-08-21', view: 'both', evidence: [{ docId: 'org2', page: 1, quote: 'three facility operating companies (100% each)' }] },
  { id: 'e2', ownerId: 'jcp', ownedId: 'op-mh', pct: 100, interestClass: 'Membership', voting: true, status: 'verified', recordedAt: '2026-08-21', view: 'both', evidence: [{ docId: 'org2', page: 1, quote: 'three facility operating companies (100% each)' }] },
  { id: 'e3', ownerId: 'jcp', ownedId: 'op-bv', pct: 100, interestClass: 'Membership', voting: true, status: 'verified', recordedAt: '2026-08-21', view: 'both', evidence: [{ docId: 'org2', page: 1, quote: 'three facility operating companies (100% each)' }] },
  { id: 'e4', ownerId: 'hft', ownedId: 'jcp', pct: 40, interestClass: 'Class A', voting: true, status: 'verified', recordedAt: '2026-08-21', view: 'both', evidence: [{ docId: 'quest', page: 3, quote: 'Halvorsen Family Trust — 40% Class A Units.' }, { docId: 'org3', page: 1, quote: 'Halvorsen Family Trust 40% ... unchanged' }] },
  { id: 'e5', ownerId: 'okafor', ownedId: 'jcp', pct: 15, interestClass: 'Class A', voting: true, status: 'verified', recordedAt: '2026-08-21', view: 'both', evidence: [{ docId: 'quest', page: 3, quote: 'Dana Okafor — 15% Class A Units.' }] },
  { id: 'e6', ownerId: 'rrc', ownedId: 'jcp', pct: 45, interestClass: 'Class B (non-voting)', voting: false, status: 'contradicted', recordedAt: '2026-08-21', view: 'questionnaire', evidence: [{ docId: 'quest', page: 3, quote: 'Redwood Ridge Capital Fund II LP — 45% Class B Units (non-voting).' }] },
  { id: 'e7', ownerId: 'tam', ownedId: 'jcp', pct: 45, interestClass: 'Class B (non-voting)', voting: false, status: 'asserted', recordedAt: '2026-10-09', view: 'orgchart', evidence: [{ docId: 'org3', page: 1, quote: 'Tamarack Holdings LLC → 45% Class B of Juniper Care Partners LLC' }] },
  { id: 'e8', ownerId: 'rrc', ownedId: 'tam', pct: 90, interestClass: 'Membership', voting: true, status: 'asserted', recordedAt: '2026-10-09', view: 'orgchart', evidence: [{ docId: 'org3', page: 1, quote: 'Redwood Ridge Capital Fund II LP (90%) and "Co-investors" (10%, unnamed)' }] },
];

const ISSUES: Issue[] = [
  {
    id: 'i-lessee', code: 'ISS-01', kind: 'mismatch', severity: 'critical',
    title: 'Lease tenant is not the proposed licensee',
    summary: 'The master lease names "Juniper Care Operations LLC" as tenant. The CDPH applications name per-facility operating companies as proposed licensees, and no entity called Juniper Care Operations LLC exists in the record.',
    facilityIds: ['lk', 'mh'],
    evidence: [
      { docId: 'lease', page: 1, quote: 'JUNIPER CARE OPERATIONS LLC, a California limited liability company ("Tenant")', label: 'Lease says' },
      { docId: 'cdph-lk', page: 2, quote: 'Applicant (proposed licensee): Larkspur Opco LLC.', label: 'Application says' },
      { docId: 'cdph-mh', page: 2, quote: 'Applicant (proposed licensee): Mission Hills Opco LLC.', label: 'Application says' },
    ],
    consequence: 'Each licensee needs a right to possession of its premises. CDPH has already asked for evidence of it at Mission Hills, and the HUD lender needs the operator lease. Leaving this unresolved affects the CDPH response, the HUD package, the consent matrix, and the signing pack.',
    affectedWorkProducts: ['wp-lease', 'wp-hud', 'wp-consents', 'wp-signing', 'wp-cdph-resp'],
    options: [
      { id: 'per-opco', label: 'Name each Opco as tenant', consequence: 'Updates the lease tenant to the three operating companies and proposes revisions to every draft that names the tenant.' },
      { id: 'sublease', label: 'Keep master tenant, add subleases', consequence: 'Adds a new entity to form and three subleases to draft; CDPH possession evidence would rely on the subleases.' },
      { id: 'ask-client', label: 'Ask the client which entity is intended', consequence: 'Sends a short question to the client. The issue stays open and the CDPH response stays blocked.' },
    ],
    recommended: 'per-opco', owner: 'associate', status: 'open',
  },
  {
    id: 'i-tamarack', code: 'ISS-02', kind: 'mismatch', severity: 'high',
    title: 'Holding company in org chart v3 is missing from the questionnaire',
    summary: 'Org chart v3 shows Redwood Ridge holding its 45% Class B interest through Tamarack Holdings LLC, with 10% of Tamarack held by unnamed co-investors. The questionnaire and both filed CDPH applications show Redwood holding directly.',
    facilityIds: ['lk', 'mh', 'bv'],
    evidence: [
      { docId: 'org3', page: 1, quote: 'Redwood Ridge Capital Fund II LP (90%) and "Co-investors" (10%, unnamed) → Tamarack Holdings LLC', label: 'Org chart v3 says' },
      { docId: 'quest', page: 3, quote: 'Redwood Ridge Capital Fund II LP — 45% Class B Units (non-voting).', label: 'Questionnaire says' },
      { docId: 'cdph-lk', page: 6, quote: 'Redwood Ridge Capital Fund II LP 45%', label: 'Filed application says' },
    ],
    consequence: 'Ownership disclosures for CDPH, the CMS-855A attachment, and any OHCA notice depend on the full chain. Two applications are already filed with the older structure and would need a supplement, not an edit.',
    affectedWorkProducts: ['wp-owner-chart', 'wp-855a', 'wp-cdph-lk', 'wp-cdph-mh', 'wp-cdph-bv', 'wp-cdph-resp'],
    options: [
      { id: 'accept-v3', label: 'Treat org chart v3 as working structure', consequence: 'Marks the direct Redwood edge as superseded, keeps the 10% co-investor portion as unknown, and drafts a request for Tamarack\'s operating agreement.' },
      { id: 'confirm-q', label: 'Ask client to confirm questionnaire', consequence: 'Keeps both views open and sends a reconfirmation request. Ownership disclosures stay blocked.' },
    ],
    recommended: 'accept-v3', owner: 'associate', status: 'open',
  },
  {
    id: 'i-mgmt', code: 'ISS-03', kind: 'control', severity: 'critical',
    title: 'Manager gets operational control before closing',
    summary: 'The management agreement starts at the beginning of the Interim Period and lets Meridian hire and fire the Administrator and approve budgets without owner approval. That authority would begin before any CDPH approval.',
    facilityIds: ['lk', 'mh', 'bv'],
    evidence: [
      { docId: 'mgmt', page: 2, quote: 'begins on the commencement of the Interim Period', label: 'Start date' },
      { docId: 'mgmt', page: 5, quote: 'authority to hire, supervise, and terminate the Administrator of each Facility and to approve the annual operating budget', label: 'Authority' },
      { docId: 'apa', page: 12, quote: 'Seller shall ... cooperate with Buyer\'s Manager as provided in the Management Transition Plan', label: 'APA interim covenant' },
    ],
    consequence: 'CDPH guidance on AB 1502 calls for prior approval of covered management changes, including arrangements that transfer operational responsibilities, and calling them interim does not avoid review [3]. The software flags the clauses; counsel decides their legal significance.',
    affectedWorkProducts: ['wp-mgmt', 'wp-cdph-lk', 'wp-cdph-mh', 'wp-cdph-bv', 'wp-hud'],
    options: [
      { id: 'defer-start', label: 'Start management at closing', consequence: 'Proposes revising §2.1 so authority begins at closing and limiting pre-closing work to consulting without operational authority.' },
      { id: 'seek-approval', label: 'Seek prior approval for interim management', consequence: 'Adds a separate CDPH management-change workstream with its own clock before the Interim Period can start.' },
    ],
    recommended: 'defer-start', owner: 'partner', status: 'open',
  },
  {
    id: 'i-sideletter', code: 'ISS-04', kind: 'control', severity: 'high',
    title: 'Investor veto contradicts questionnaire answer',
    summary: 'The questionnaire says no investor holds control rights. The executed Redwood side letter requires Class B consent for budgets and for appointing or removing an Administrator.',
    facilityIds: ['lk', 'mh', 'bv'],
    evidence: [
      { docId: 'quest', page: 5, quote: 'Does any investor hold management, veto, or other control rights ... Answer: No.', label: 'Questionnaire says' },
      { docId: 'side', page: 2, quote: 'consent of the Class B Majority shall be required to (a) approve the annual budget ... or (b) appoint or remove the Administrator', label: 'Side letter says' },
    ],
    consequence: 'Non-voting equity can still carry control. Disclosure views that reach parties with operational or managerial control may need to include Redwood, and the conflicting budget rights with Meridian need a single answer.',
    affectedWorkProducts: ['wp-owner-chart', 'wp-855a'],
    options: [
      { id: 'disclose', label: 'Treat Redwood as having control rights', consequence: 'Adds Redwood to the control section of the disclosure drafts and asks the client to correct the questionnaire.' },
      { id: 'amend-side', label: 'Ask client to narrow the side letter', consequence: 'Drafts a request to amend §3. Disclosures stay as they are until an executed amendment arrives.' },
    ],
    recommended: 'disclose', owner: 'associate', status: 'open',
  },
  {
    id: 'i-citation', code: 'ISS-05', kind: 'absence', severity: 'medium',
    title: 'Disclosed citation has no underlying record',
    summary: 'Schedule 4.12 lists a Class B citation at Mission Hills. The citation itself, any plan of correction, and its current disposition are not in the data room.',
    facilityIds: ['mh'],
    evidence: [{ docId: 'disc', page: 14, quote: 'Mission Hills: CDPH citation No. SYN-2026-0418 (Class B), issued June 2026.', label: 'Schedule says' }],
    consequence: 'Absence from the data room does not mean the record does not exist. Request it so the indemnity and Medicare liability analysis has the actual order and status.',
    affectedWorkProducts: ['wp-requests'],
    options: [{ id: 'request', label: 'Add to diligence request', consequence: 'Adds the citation, plan of correction, and appeal status to the next seller request list.' }],
    recommended: 'request', owner: 'paralegal', status: 'open',
  },
  {
    id: 'i-schedule2', code: 'ISS-06', kind: 'absence', severity: 'medium',
    title: 'Lease amendment refers to a schedule that was never provided',
    summary: 'Bayview ground lease Amendment No. 1 sets rent "as set forth on Schedule 2". Schedule 2 is not in the data room.',
    facilityIds: ['bv'],
    evidence: [{ docId: 'bv-am1', page: 1, quote: 'Base Rent shall be as set forth on Schedule 2 attached hereto', label: 'Amendment says' }],
    consequence: 'Current rent and escalations are unknown for the leasehold Bayview Opco would take by assignment, which also needs Hollis Point\'s consent.',
    affectedWorkProducts: ['wp-requests', 'wp-consents'],
    options: [{ id: 'request', label: 'Add to diligence request', consequence: 'Adds Schedule 2 and a rent estoppel to the seller request list.' }],
    recommended: 'request', owner: 'paralegal', status: 'open',
  },
];

const DECISIONS: Decision[] = [
  {
    id: 'd-schedule', title: 'Schedule conflicts with CDPH advance filing',
    question: 'How should the team treat the January 12 target date?',
    context: [
      'The target closing and handover is January 12, 2027, 75 days from today.',
      'CDPH guidance calls for a complete application at least 120 days before the intended transaction [3]. For January 12, that date was September 14, 2026.',
      'Larkspur and Mission Hills were uploaded September 30. CDPH has not confirmed either as complete, and on October 27 it asked for more information on Mission Hills.',
      'Bayview has not been submitted.',
      'Elapsed time is not approval. The record contains no document showing an approved exceptional pathway.',
    ],
    options: [
      { id: 'pathway', label: 'Record an approved exceptional pathway', consequence: 'Requires an agency document in the record. None exists, so this cannot be chosen yet.', requiresEvidence: true, disabledReason: 'No agency document in the record supports an exceptional pathway.' },
      { id: 'move', label: 'Move the target date', consequence: 'Changes the target date fact and proposes coordinated revisions to every draft that uses it. Filed and executed records are preserved.' },
      { id: 'keep', label: 'Keep January 12 and report the risk', consequence: 'The path to closing stays blocked and the client update states the conflict plainly.' },
    ],
    recommended: 'move',
    reason: 'No evidence supports closing on January 12 under the ordinary framework, and the outside date still leaves room.',
    owner: 'partner', status: 'open',
  },
  {
    id: 'd-pa', title: 'Medicare provider agreement posture',
    question: 'Should the buyer accept assignment of the existing provider agreements?',
    context: [
      'An asset transfer to a new operator is ordinarily a Medicare CHOW, and the existing provider agreement is ordinarily assigned with continuing conditions [9].',
      'CMS guidance notes that assignment commonly carries outstanding Medicare debt; rejecting assignment puts the buyer in a new-applicant posture [39].',
      'Mission Hills has a disclosed Class B citation whose disposition is not yet known.',
    ],
    options: [
      { id: 'accept', label: 'Accept assignment', consequence: 'Keeps billing continuity. Adds recoupment diligence, a specific indemnity, an escrow proposal, and claims cooperation terms to the APA issues list.' },
      { id: 'reject', label: 'Reject assignment', consequence: 'Avoids successor liability under the agreement but creates a new-applicant posture and a reimbursement gap to model.' },
    ],
    recommended: 'accept',
    reason: 'Continuity matters across three facilities; the exposure can be priced through diligence and contract protection.',
    owner: 'partner', status: 'open',
  },
];

const WORK_PRODUCTS: Omit<WorkProduct, 'revisions'>[] = [
  { id: 'wp-apa', title: 'Asset Purchase Agreement (draft v6)', kind: 'Transaction document', status: 'in-review', facilityIds: ['lk', 'mh', 'bv'], docId: 'apa', factRefs: [{ key: 'target.handover', where: '§2.3 Target Closing Date' }, { key: 'manager.name', where: '§6.4 Management Transition Plan' }] },
  { id: 'wp-lease', title: 'Master Lease (draft v4)', kind: 'Transaction document', status: 'draft', facilityIds: ['lk', 'mh'], docId: 'lease', factRefs: [{ key: 'lease.tenant', where: 'Preamble, Tenant' }, { key: 'target.handover', where: '§2.1 Commencement Date' }] },
  { id: 'wp-mgmt', title: 'Management Agreement (draft v2)', kind: 'Transaction document', status: 'draft', facilityIds: ['lk', 'mh', 'bv'], docId: 'mgmt', factRefs: [{ key: 'manager.name', where: 'Preamble, Manager' }, { key: 'mgmt.start', where: '§2.1 Term' }] },
  { id: 'wp-cdph-lk', title: 'CDPH application — Larkspur (uploaded Sep 30)', kind: 'Agency filing', status: 'filed', facilityIds: ['lk'], docId: 'cdph-lk', factRefs: [{ key: 'target.handover', where: 'Anticipated date of change' }, { key: 'owner.redwood', where: 'Ownership of applicant' }, { key: 'manager.name', where: 'Management company' }] },
  { id: 'wp-cdph-mh', title: 'CDPH application — Mission Hills (uploaded Sep 30)', kind: 'Agency filing', status: 'filed', facilityIds: ['mh'], docId: 'cdph-mh', factRefs: [{ key: 'target.handover', where: 'Anticipated date of change' }, { key: 'owner.redwood', where: 'Ownership of applicant' }] },
  { id: 'wp-cdph-bv', title: 'CDPH application — Bayview (not submitted)', kind: 'Agency filing', status: 'draft', facilityIds: ['bv'], factRefs: [{ key: 'target.handover', where: 'Anticipated date of change' }, { key: 'owner.redwood', where: 'Ownership of applicant' }, { key: 'manager.name', where: 'Management company' }] },
  { id: 'wp-cdph-resp', title: 'Response to CDPH request — Mission Hills', kind: 'Agency response', status: 'draft', facilityIds: ['mh'], factRefs: [{ key: 'owner.redwood', where: 'Item 1, organizational chart' }, { key: 'lease.tenant', where: 'Item 3, right to possession' }, { key: 'mgmt.start', where: 'Item 2, management agreement' }] },
  { id: 'wp-owner-chart', title: 'Ownership and control disclosure chart', kind: 'Disclosure', status: 'draft', facilityIds: ['lk', 'mh', 'bv'], factRefs: [{ key: 'owner.redwood', where: 'Tier 2 owners' }, { key: 'control.investors', where: 'Control without equity' }, { key: 'manager.name', where: 'Managing parties' }] },
  { id: 'wp-855a', title: 'CMS-855A CHOW package with SNF attachment', kind: 'Agency filing', status: 'draft', facilityIds: ['lk', 'mh', 'bv'], factRefs: [{ key: 'owner.redwood', where: 'Section 5/6 owners and managing control' }, { key: 'control.investors', where: 'Managing control' }, { key: 'target.handover', where: 'Effective date of transfer' }, { key: 'manager.name', where: 'Managing organization' }] },
  { id: 'wp-hud', title: 'HUD operator change package — Larkspur', kind: 'Lender submission', status: 'draft', facilityIds: ['lk'], factRefs: [{ key: 'lease.tenant', where: 'Operator lease' }, { key: 'manager.name', where: 'Management agent' }, { key: 'target.handover', where: 'Anticipated closing' }] },
  { id: 'wp-consents', title: 'Consent and approval matrix', kind: 'Closing tool', status: 'draft', facilityIds: ['lk', 'mh', 'bv'], factRefs: [{ key: 'lease.tenant', where: 'Landlord consent rows' }, { key: 'target.handover', where: 'Required-by dates' }] },
  { id: 'wp-signing', title: 'Signing pack index', kind: 'Closing tool', status: 'draft', facilityIds: ['lk', 'mh', 'bv'], factRefs: [{ key: 'lease.tenant', where: 'Lease signature blocks' }, { key: 'target.handover', where: 'Closing date' }] },
  { id: 'wp-requests', title: 'Seller diligence request list #4', kind: 'Diligence', status: 'draft', facilityIds: ['lk', 'mh', 'bv'], factRefs: [] },
  { id: 'wp-update', title: 'Client status update', kind: 'Communication', status: 'draft', facilityIds: ['lk', 'mh', 'bv'], factRefs: [{ key: 'target.handover', where: 'Timeline paragraph' }] },
  { id: 'wp-loi', title: 'Letter of intent (executed Aug 4)', kind: 'Executed record', status: 'executed', facilityIds: ['lk', 'mh', 'bv'], docId: 'loi', factRefs: [{ key: 'target.handover', where: 'Anticipated closing' }] },
  { id: 'wp-9167', title: 'Seller CDPH 9167 notice (filed by seller)', kind: 'Agency filing (seller)', status: 'filed', facilityIds: ['lk', 'mh', 'bv'], docId: 'n9167', factRefs: [{ key: 'target.handover', where: 'Anticipated date' }] },
];

const CORRESPONDENCE: Correspondence[] = [
  {
    id: 'corr-1', from: 'CDPH', facilityId: 'mh', docId: 'cdph-notice', dated: '2026-10-27', received: '2026-10-28',
    subject: 'Request for additional information — Mission Hills Opco LLC',
    proposedDeadline: { days: 30, convention: 'Calendar days from the date of the letter', quote: 'within 30 calendar days of the date of this letter' },
    items: [
      { id: 'r1', request: 'Organizational chart of all direct and indirect owners and controlling parties', matchDocIds: ['org3', 'org2'], note: 'Two versions conflict. The response cannot use either until ISS-02 is resolved.', issueId: 'i-tamarack' },
      { id: 'r2', request: 'Management agreement for the facility', matchDocIds: ['mgmt'], note: 'Draft v2 exists. Its §2.1 and §4.2 are under partner review (ISS-03).', issueId: 'i-mgmt' },
      { id: 'r3', request: "Evidence of applicant's right to possession", matchDocIds: ['lease'], note: 'Lease draft names a different tenant than the applicant (ISS-01).', issueId: 'i-lessee' },
    ],
    status: 'pending-review',
  },
];

const REQUESTS: ClientRequest[] = [
  {
    id: 'req-ohca', title: 'OHCA filer questions for the buyer group', owner: 'paralegal', status: 'draft', origin: 'OHCA classification unresolved',
    questions: [
      'What was the combined California annual revenue of Juniper Care Partners and its affiliates in the last fiscal year?',
      'Does Redwood Ridge Capital Fund II LP, or any affiliate, own or control other California health care entities?',
      'Who are the co-investors holding 10% of Tamarack Holdings LLC?',
    ],
  },
];
