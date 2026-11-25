/**
 * Fictional record for the peer review clock.
 *
 * Alder Springs District Hospital is the acute care hospital in the same
 * (made-up) town as Cedar Hollow Care Center. It is run by a public health
 * care district, so its board meets under the Brown Act. Thornwood Garza LLP,
 * the Compiler's fictional counsel, advises the medical staff. Every name,
 * date, bylaw and document here is invented.
 */
import type { LicenseRule } from './params';

export const HOSPITAL = {
  name: 'Alder Springs District Hospital',
  district: 'Alder Springs Health Care District',
  counsel: 'Thornwood Garza LLP',
};

// ------------------------------------------------------------------ matters

export type PeerEvent =
  /** § 809.5 immediate suspension. `by` is who imposed it. */
  | { type: 'summary-suspension'; on: string; by: 'peer-review-body' | 'governing-body'; ratifiedOn?: string; liftedOn?: string; note: string }
  /** A restriction on privileges for a medical disciplinary cause. Open-ended when `to` is absent. */
  | { type: 'restriction'; from: string; to?: string; note: string }
  | { type: 'investigation-notice'; on: string; note: string }
  | { type: 'resignation'; on: string; note: string }
  /** § 809.1(a) final proposed action. `act80501` is the § 805.01(b) paragraph, if the body found one may have occurred. */
  | { type: 'final-proposed-action'; on: string; act80501?: '1' | '2' | '3' | '4'; note: string }
  | { type: 'notice-served'; on: string; note: string }
  | { type: 'hearing-requested'; on: string; note: string }
  | { type: 'hearing-set'; on: string; note: string }
  | { type: 'action-effective'; on: string; note: string }
  | { type: 'filed'; on: string; report: '805' | '805.01' | 'npdb'; for: 'summary' | 'cumulative' | 'resignation' | 'final'; note: string };

export interface Matter {
  id: string;
  name: string;
  license: LicenseRule['kind'];
  specialty: string;
  summary: string;
  events: PeerEvent[];
}

export const MATTERS: Matter[] = [
  {
    id: 'raman', name: 'Priya Raman, M.D.', license: 'physician', specialty: 'General surgery',
    summary: 'Suspended on a Tuesday evening by the district CEO, acting for the board, after the chief of staff and vice chief could not be reached. Thanksgiving falls inside the ratification window.',
    events: [
      { type: 'summary-suspension', on: '2026-11-24', by: 'governing-body', note: 'CEO, as the board\'s designee, suspends all clinical privileges after two calls to the chief of staff go unanswered.' },
    ],
  },
  {
    id: 'feld', name: 'Marcus Feld, M.D.', license: 'physician', specialty: 'Orthopedic surgery',
    summary: 'Three separate restrictions in one year. None is long on its own; together they pass 30 days.',
    events: [
      { type: 'restriction', from: '2026-03-02', to: '2026-03-13', note: 'May not operate without a second surgeon present (12 days).' },
      { type: 'restriction', from: '2026-07-06', to: '2026-07-15', note: 'Same restriction, re-imposed after a second case review (10 days).' },
      { type: 'restriction', from: '2026-11-16', note: 'Same restriction, re-imposed with no end date.' },
    ],
  },
  {
    id: 'castellanos', name: 'Helen Castellanos, M.D.', license: 'physician', specialty: 'Pain management',
    summary: 'The Medical Executive Committee recommends ending her privileges after a formal investigation into prescribing. She has asked for a hearing.',
    events: [
      { type: 'final-proposed-action', on: '2026-10-30', act80501: '3', note: 'MEC votes to recommend termination of privileges. Its investigation found repeated clearly excessive prescribing may have occurred.' },
      { type: 'notice-served', on: '2026-11-02', note: 'Written notice of the final proposed action delivered.' },
      { type: 'hearing-requested', on: '2026-11-09', note: 'Chief of staff receives the written request for a hearing.' },
      { type: 'filed', on: '2026-11-16', report: '805.01', for: 'final', note: '805.01 report sent to the Medical Board of California.' },
      { type: 'hearing-set', on: '2027-01-12', note: 'Hearing Committee sets the first hearing session.' },
    ],
  },
  {
    id: 'whitlock', name: 'Dana Whitlock, NP', license: 'nurse practitioner', specialty: 'Hospital outpatient clinic, practicing under § 2837.103',
    summary: 'Resigned nine days after being told an investigation had started.',
    events: [
      { type: 'investigation-notice', on: '2026-11-03', note: 'Written notice that the Interdisciplinary Practice Committee has opened an investigation into three charts.' },
      { type: 'resignation', on: '2026-11-12', note: 'Resigns clinic privileges by letter.' },
    ],
  },
];

// ------------------------------------------------------------------- bylaws

export interface BylawPage { n: number; text: string }

export const BYLAWS = {
  title: 'Medical Staff Bylaws of Alder Springs District Hospital (fictional), Article 8',
  pages: [
    { n: 38, text: '8.1-4 Suspension by the Board. If no person authorized under Section 8.1-2 is available, the Chief Executive Officer, as the designee of the Board of Directors, may summarily suspend a member\'s clinical privileges. A summary suspension imposed under this Section ends at the close of the second (2) working day after it is imposed unless the Medical Executive Committee has ratified it.' },
    { n: 41, text: '8.3-2 Request for Hearing. A member has thirty (30) days after receipt of the notice of the final proposed action to request a hearing in writing, addressed to the Chief of Staff. A member who does not request a hearing within that time has waived the hearing.' },
    { n: 42, text: '8.4-1 Time of Hearing. The hearing shall commence within ninety (90) days after the Chief of Staff receives the request for hearing. The Chief of Staff shall give the member written notice of the place, time and date.' },
    { n: 43, text: '8.4-5 Witnesses and Exhibits. Each party shall give the other its list of witnesses and copies of its exhibits at least ten (10) days before the hearing begins.' },
    { n: 47, text: '8.6-1 Appeal. Either party may request appellate review by the Board of Directors within fifteen (15) days after receipt of the decision of the Hearing Committee.' },
  ] as BylawPage[],
};

/**
 * Bylaw intervals, coded by hand. Code accepts a term only when the quote is
 * on the page word for word and states the number. `relation` says how the
 * bylaw number must compare with the statute's to be consistent with it.
 */
export interface BylawTerm {
  id: 'ratify' | 'hearingRequest' | 'hearingStart' | 'witness' | 'appeal';
  section: string;
  label: string;
  page: number;
  quote: string;
  value: number;
  unit: 'days' | 'working days';
  statuteParamId?: string;
  relation?: 'at-most' | 'at-least' | 'equal';
  cite: string;
}

export const BYLAW_TERMS: BylawTerm[] = [
  { id: 'ratify', section: '8.1-4', label: 'Board-imposed suspension ends unless ratified', page: 38, value: 2, unit: 'working days',
    quote: 'ends at the close of the second (2) working day after it is imposed unless the Medical Executive Committee has ratified it',
    statuteParamId: 's8095.ratifyDays', relation: 'equal', cite: '§ 809.5(b)' },
  { id: 'hearingRequest', section: '8.3-2', label: 'Time to request a hearing', page: 41, value: 30, unit: 'days',
    quote: 'A member has thirty (30) days after receipt of the notice of the final proposed action to request a hearing in writing',
    cite: '§ 809.1(b)(4) requires the notice to state the time limit; the statute sets no number' },
  { id: 'hearingStart', section: '8.4-1', label: 'Hearing starts after the request', page: 42, value: 90, unit: 'days',
    quote: 'The hearing shall commence within ninety (90) days after the Chief of Staff receives the request for hearing',
    statuteParamId: 's8092.hearingStartDays', relation: 'at-most', cite: '§ 809.2(h)' },
  { id: 'witness', section: '8.4-5', label: 'Witness lists and exhibits exchanged before the hearing', page: 43, value: 10, unit: 'days',
    quote: 'at least ten (10) days before the hearing begins',
    statuteParamId: 's8092.witnessDays', relation: 'at-least', cite: '§ 809.2(f)' },
  { id: 'appeal', section: '8.6-1', label: 'Time to request appellate review', page: 47, value: 15, unit: 'days',
    quote: 'within fifteen (15) days after receipt of the decision of the Hearing Committee',
    cite: '§ 809.4(b) allows an appellate mechanism; the statute sets no number' },
];

// ----------------------------------------------------- committees and files

export interface Person {
  id: string;
  name: string;
  role: string;
  /** 'agency' is a licensing board. 'governing-body' is the district board. */
  group: 'medical-staff' | 'committee-staff' | 'counsel' | 'administration' | 'hr' | 'governing-body' | 'agency';
}

export const PEOPLE: Person[] = [
  { id: 'cos', name: 'Nadia Brandt, M.D.', role: 'Chief of Staff; chairs the Medical Executive Committee', group: 'medical-staff' },
  { id: 'vcos', name: 'Owen Tavares, M.D.', role: 'Vice Chief of Staff', group: 'medical-staff' },
  { id: 'surg', name: 'Lucia Hartmann, M.D.', role: 'Chair, Department of Surgery', group: 'medical-staff' },
  { id: 'med', name: 'Samir Aziz, D.O.', role: 'Chair, Department of Medicine', group: 'medical-staff' },
  { id: 'mso', name: 'Renee Calloway', role: 'Medical Staff Services coordinator; keeps the committee files', group: 'committee-staff' },
  { id: 'counsel', name: 'Thornwood Garza LLP', role: 'Counsel to the medical staff', group: 'counsel' },
  { id: 'ceo', name: 'Gordon Ames', role: 'Chief Executive Officer of the district', group: 'administration' },
  { id: 'cno', name: 'Mei Sandoval, RN', role: 'Chief Nursing Officer', group: 'administration' },
  { id: 'hrd', name: 'Paul Dervish', role: 'Director of Human Resources', group: 'hr' },
  { id: 'risk', name: 'Alma Reyes', role: 'Risk manager', group: 'administration' },
  { id: 'board', name: 'Board of Directors', role: 'Governing body of the district', group: 'governing-body' },
  { id: 'mbc', name: 'Medical Board of California', role: 'Licensing agency', group: 'agency' },
];

export interface Committee { id: string; name: string; members: string[]; staff: string[] }

export const COMMITTEES: Committee[] = [
  { id: 'mec', name: 'Medical Executive Committee', members: ['cos', 'vcos', 'surg', 'med'], staff: ['mso', 'counsel'] },
  { id: 'hc', name: 'Hearing Committee (Castellanos)', members: ['vcos', 'med'], staff: ['mso'] },
];

export type Folder = 'MEC-1157' | 'Administration' | 'Human Resources';
export const COMMITTEE_FOLDERS: Folder[] = ['MEC-1157'];

export interface FileRecord {
  id: string;
  title: string;
  /** A record of a committee's own proceedings, or a record made by administration in the ordinary course. */
  kind: 'committee' | 'administrative';
  committeeId?: string;
  folder: Folder;
  matterId: string;
}

export const RECORDS: FileRecord[] = [
  { id: 'r1', title: 'MEC minutes, special session of Oct. 30, 2026', kind: 'committee', committeeId: 'mec', folder: 'MEC-1157', matterId: 'castellanos' },
  { id: 'r2', title: 'Ad hoc investigating committee report on prescribing (Castellanos)', kind: 'committee', committeeId: 'mec', folder: 'MEC-1157', matterId: 'castellanos' },
  { id: 'r3', title: 'MEC case review worksheet, Feld cases 3 and 4', kind: 'committee', committeeId: 'mec', folder: 'Human Resources', matterId: 'feld' },
  { id: 'r4', title: 'Operating room incident report filed by the charge nurse, Nov. 24, 2026', kind: 'administrative', folder: 'MEC-1157', matterId: 'raman' },
  { id: 'r5', title: 'CEO memo to file on the Nov. 24 suspension', kind: 'administrative', folder: 'Administration', matterId: 'raman' },
  { id: 'r6', title: 'Completed 805 report form (Feld)', kind: 'administrative', folder: 'Administration', matterId: 'feld' },
];

export interface Draft {
  id: string;
  subject: string;
  from: string;
  to: string[];
  attachments: string[];
  /** True when the draft is the report § 805 requires. */
  statutoryReport?: boolean;
}

export const DRAFTS: Draft[] = [
  { id: 'd1', subject: 'Castellanos: minutes for approval', from: 'mso', to: ['cos', 'vcos', 'surg', 'med'], attachments: ['r1'] },
  { id: 'd2', subject: 'Castellanos: where things stand', from: 'cos', to: ['ceo', 'hrd', 'counsel'], attachments: ['r2'] },
  { id: 'd3', subject: 'Feld: 805 report for filing', from: 'cos', to: ['mbc'], attachments: ['r6'], statutoryReport: true },
  { id: 'd4', subject: 'Raman: ratification vote, materials', from: 'cos', to: ['vcos', 'surg', 'med', 'risk'], attachments: ['r4', 'r5'] },
  { id: 'd5', subject: 'Feld: case review for the board packet', from: 'ceo', to: ['board'], attachments: ['r3'] },
];

// ------------------------------------------------------------ board agenda

export interface AgendaItem {
  id: string;
  meeting: string;
  text: string;
  /** The member whose privileges are the direct subject asked for a public hearing (Health & Saf. Code § 32155). */
  publicHearingRequested: boolean;
}

export const AGENDA: AgendaItem[] = [
  { id: 'a1', meeting: '2026-12-10', publicHearingRequested: false,
    text: 'CLOSED SESSION. HEARINGS (Health & Saf. Code § 32155). Subject matter: testimony and deliberation will concern staff privileges.' },
  { id: 'a2', meeting: '2026-12-10', publicHearingRequested: false,
    text: 'CLOSED SESSION. Personnel matter: Dr. Feld.' },
  { id: 'a3', meeting: '2027-02-11', publicHearingRequested: true,
    text: 'CLOSED SESSION. HEARINGS (Health & Saf. Code § 32155). Subject matter: testimony and deliberation will concern staff privileges.' },
];
