/**
 * Every legal threshold and day count the compiler uses lives here, as data.
 * Nothing in the engine hard-codes a number from a statute.
 *
 * Status meanings (all parameters still need attorney verification before any use):
 *  - 'text-checked': the number was read in the primary text on the date given.
 *  - 'interpretation': the text was read, but applying it here is our reading.
 *  - 'unverified': taken from the research report only; primary text not read.
 */
export type ParamStatus = 'text-checked' | 'interpretation' | 'unverified';

export interface Param {
  id: string;
  label: string;
  value: string; // decimal string; percent, dollars or days per `unit`
  unit: '%' | 'days' | 'USD';
  regime: 'CDPH' | 'CMS' | 'OHCA';
  source: string;
  url?: string;
  status: ParamStatus;
  checkedOn?: string;
  note?: string;
}

const CHECKED = '2026-11-25';
const LEG = (s: string) => `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=HSC&sectionNum=${s}`;
const ECFR_502 = 'https://www.ecfr.gov/current/title-42/chapter-IV/subchapter-B/part-424/subpart-P/section-424.502';
const LII_97435 = 'https://www.law.cornell.edu/regulations/california/22-CCR-97435';

export const PARAMS: Param[] = [
  // CDPH / AB 1502
  { id: 'cdph.owner', label: 'CDPH: beneficial ownership disclosed at or above', value: '5', unit: '%', regime: 'CDPH',
    source: 'Health & Saf. Code § 1267.5(a)(1); § 1253.3(b)(3)', url: LEG('1267.5'), status: 'text-checked', checkedOn: CHECKED,
    note: '§ 1267.5 speaks of "corporation or partnership". Treating LLC members the same way is our reading.' },
  { id: 'cdph.mgmt', label: 'CDPH: management company owners disclosed at or above', value: '5', unit: '%', regime: 'CDPH',
    source: 'Health & Saf. Code § 1267.5(a)(3)(A)', url: LEG('1267.5'), status: 'text-checked', checkedOn: CHECKED },
  { id: 'cdph.file', label: 'CDPH: application filed before acquiring or managing', value: '120', unit: 'days', regime: 'CDPH',
    source: 'Health & Saf. Code § 1253.3(a)(1)', url: LEG('1253.3'), status: 'text-checked', checkedOn: CHECKED },
  { id: 'cdph.sellerNotice', label: 'CDPH: current licensee reports the change before it happens', value: '120', unit: 'days', regime: 'CDPH',
    source: 'Health & Saf. Code § 1253.3(a)(2)', url: LEG('1253.3'), status: 'text-checked', checkedOn: CHECKED },
  { id: 'cdph.review', label: 'CDPH: review time after a complete application', value: '120', unit: 'days', regime: 'CDPH',
    source: 'Health & Saf. Code § 1253.3(h)', url: LEG('1253.3'), status: 'text-checked', checkedOn: CHECKED },
  { id: 'cdph.reviewExt', label: 'CDPH: possible extension of review', value: '60', unit: 'days', regime: 'CDPH',
    source: 'Health & Saf. Code § 1253.3(h)(1)', url: LEG('1253.3'), status: 'text-checked', checkedOn: CHECKED },
  { id: 'cdph.cure', label: 'CDPH: time to complete an application after a missing-information notice', value: '45', unit: 'days', regime: 'CDPH',
    source: 'Health & Saf. Code § 1253.3(h)(2)', url: LEG('1253.3'), status: 'text-checked', checkedOn: CHECKED },
  { id: 'cdph.transfer', label: 'CDPH: transfer of operations must occur within, after approval', value: '120', unit: 'days', regime: 'CDPH',
    source: 'Health & Saf. Code § 1253.3(i)', url: LEG('1253.3'), status: 'text-checked', checkedOn: CHECKED,
    note: 'One 60-day extension may be requested.' },
  { id: 'cdph.postClose', label: 'CDPH: notice after the final transaction', value: '10', unit: 'days', regime: 'CDPH',
    source: 'Health & Saf. Code § 1253.3(i)', url: LEG('1253.3'), status: 'text-checked', checkedOn: CHECKED },

  // CMS-855A
  { id: 'cms.owner', label: 'CMS: direct or indirect owner reported at or above', value: '5', unit: '%', regime: 'CMS',
    source: '42 CFR § 424.502 ("Owner", "Indirect ownership interest")', url: ECFR_502, status: 'text-checked', checkedOn: CHECKED,
    note: 'Any partnership interest is an "Owner" regardless of percentage. Indirect interest is the product of each tier, per the regulation\'s own example.' },
  { id: 'cms.llcMember', label: 'CMS SNF organizational structure: LLC members and managers listed at or above', value: '0', unit: '%', regime: 'CMS',
    source: '42 CFR § 424.502 ("Organizational structure" (2))', url: ECFR_502, status: 'text-checked', checkedOn: CHECKED,
    note: 'Members and managers are listed with their percentage, whatever it is. Applied here to every LLC in the chain; whether it reaches past the enrolling SNF is an attorney question.' },
  { id: 'cms.lpLimited', label: 'CMS SNF organizational structure: limited partners listed at or above', value: '10', unit: '%', regime: 'CMS',
    source: '42 CFR § 424.502 ("Organizational structure" (4))', url: ECFR_502, status: 'text-checked', checkedOn: CHECKED },
  { id: 'cms.corpHolder', label: 'CMS SNF organizational structure: corporate shareholders listed at or above', value: '5', unit: '%', regime: 'CMS',
    source: '42 CFR § 424.502 ("Organizational structure" (1))', url: ECFR_502, status: 'text-checked', checkedOn: CHECKED },
  { id: 'cms.property', label: 'CMS additional disclosable party: interest in the real property at or above', value: '5', unit: '%', regime: 'CMS',
    source: '42 CFR § 424.502 ("Additional disclosable party" (2)(ii))', url: ECFR_502, status: 'text-checked', checkedOn: CHECKED,
    note: 'eCFR shows an amendment at 91 FR 72168 (Nov. 9, 2026) that was not reviewed.' },
  { id: 'cms.chowReport', label: 'CMS: change of ownership reported after the change', value: '30', unit: 'days', regime: 'CMS',
    source: '42 CFR § 424.516 (from the research report)', status: 'unverified',
    note: 'Not read in the primary text. Confirm the reporting window and whether an advance CHOW notice under 42 CFR § 489.18 applies.' },
  { id: 'cms.pecosDraft', label: 'CMS: unsubmitted PECOS draft purged after', value: '120', unit: 'days', regime: 'CMS',
    source: 'Research report only', status: 'unverified',
    note: 'No primary source found. Shown only as a planning reminder.' },

  // OHCA
  { id: 'ohca.notice', label: 'OHCA: material change notice before closing', value: '90', unit: 'days', regime: 'OHCA',
    source: 'Health & Saf. Code § 127507(c)(3); 22 CCR § 97435(a)', url: LEG('127507'), status: 'text-checked', checkedOn: CHECKED,
    note: '§ 97435(a) reads "entering into the agreement" as the closing date.' },
  { id: 'ohca.rev1', label: 'OHCA filer test (b)(1): annual California revenue or assets at least', value: '25000000', unit: 'USD', regime: 'OHCA',
    source: '22 CCR § 97435(b)(1)', url: LII_97435, status: 'text-checked', checkedOn: CHECKED,
    note: 'Read on the LII copy, which reflects the Aug. 22, 2024 refiling. The amended regulations effective Nov. 2, 2026 were not reviewed.' },
  { id: 'ohca.rev2', label: 'OHCA filer test (b)(2): revenue or assets at least, when dealing with a (b)(1) entity', value: '10000000', unit: 'USD', regime: 'OHCA',
    source: '22 CCR § 97435(b)(2)', url: LII_97435, status: 'text-checked', checkedOn: CHECKED, note: 'Same LII caveat as (b)(1).' },
  { id: 'ohca.fmv', label: 'OHCA circumstance (c)(1): transaction value at least', value: '25000000', unit: 'USD', regime: 'OHCA',
    source: '22 CCR § 97435(c)(1)', url: LII_97435, status: 'text-checked', checkedOn: CHECKED, note: 'Same LII caveat.' },
  { id: 'ohca.assets', label: 'OHCA circumstance (c)(3): share of California assets disposed of', value: '25', unit: '%', regime: 'OHCA',
    source: '22 CCR § 97435(c)(3)', url: LII_97435, status: 'text-checked', checkedOn: CHECKED, note: 'Same LII caveat.' },
  { id: 'ohca.vote', label: 'OHCA control test (e)(1): share of governing-body voting power transferred', value: '25', unit: '%', regime: 'OHCA',
    source: '22 CCR § 97435(e)(1)', url: LII_97435, status: 'text-checked', checkedOn: CHECKED,
    note: 'Under (e)(2), veto or supermajority rights can be a change in control below 25%. The research report\'s "10% private equity stake" test was not found in this text.' },
  { id: 'ohca.cmir', label: 'OHCA: added hold if a cost and market impact review opens', value: '60', unit: 'days', regime: 'OHCA',
    source: 'Research report only (cites 22 CCR § 97442)', status: 'unverified',
    note: 'Not read in the primary text. Treat closing as at risk until HCAI responds.' },
];

export type ParamValues = Record<string, string>;

export const defaultValues = (): ParamValues => Object.fromEntries(PARAMS.map((p) => [p.id, p.value]));
export const paramById = (id: string) => {
  const p = PARAMS.find((x) => x.id === id);
  if (!p) throw new Error(`unknown parameter ${id}`);
  return p;
};
