/**
 * Every number and date the MSO audit uses, as data, with its source and
 * status. Same status meanings as src/compiler/params.ts. All of it still
 * needs attorney verification before anyone relies on it.
 */
import type { ParamStatus } from '../compiler/params';

export interface MsoParam {
  id: string;
  label: string;
  value: string;
  unit: '%' | 'hours' | 'years' | 'date' | 'per physician';
  source: string;
  url?: string;
  status: ParamStatus;
  checkedOn?: string;
  note?: string;
}

const CHECKED = '2026-11-25';
const LEG = (code: string, s: string) => `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=${code}&sectionNum=${s}`;
export const SB351_URL = 'https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202520260SB351';

export const MSO_PARAMS: MsoParam[] = [
  { id: 'sb351.operative', label: 'SB 351: rules apply to arrangements in effect on or after', value: '2026-01-01', unit: 'date',
    source: 'SB 351 (Ch. 409, Stats. 2025), approved Oct. 6, 2025', url: SB351_URL, status: 'interpretation', checkedOn: CHECKED,
    note: 'The chaptered bill has no urgency clause, so it would take effect on Jan. 1, 2026. The constitutional effective-date rule was not re-read, and whether the bill reaches contracts signed earlier is an attorney question.' },
  { id: 'sb351.control', label: 'SB 351 § 1191(c)(1): a direct private equity holding above this is treated as control', value: '50', unit: '%',
    source: 'Health & Saf. Code § 1191(c)(1) ("controlled directly, in whole or in part")', url: SB351_URL, status: 'interpretation', checkedOn: CHECKED,
    note: 'The statute gives no percentage. A majority holding is used as the clear case. Any smaller direct holding is shown as unresolved, because "in part" is not defined.' },
  { id: 'mk.shareCap', label: 'Medical corporation: shares held by listed non-physician licensees, at most', value: '49', unit: '%',
    source: 'Corp. Code § 13401.5 (opening paragraph)', url: LEG('CORP', '13401.5'), status: 'text-checked', checkedOn: CHECKED },
  { id: 'mk.headcount', label: 'Medical corporation: non-physician licensee shareholders per physician shareholder, at most', value: '1', unit: 'per physician',
    source: 'Corp. Code § 13401.5 (opening paragraph)', url: LEG('CORP', '13401.5'), status: 'text-checked', checkedOn: CHECKED,
    note: 'The number of those licensed persons owning shares may not exceed the number of physicians owning shares. The research report left this test out.' },
  { id: 'np.transitionHours', label: 'Nurse practitioner transition to practice: hours', value: '4600', unit: 'hours',
    source: 'Bus. & Prof. Code § 2837.103(a)(1)(D)', url: LEG('BPC', '2837.103'), status: 'text-checked', checkedOn: CHECKED,
    note: 'Or three full-time-equivalent years. Either one satisfies the requirement.' },
  { id: 'np.transitionYears', label: 'Nurse practitioner transition to practice: full-time-equivalent years', value: '3', unit: 'years',
    source: 'Bus. & Prof. Code § 2837.103(a)(1)(D)', url: LEG('BPC', '2837.103'), status: 'text-checked', checkedOn: CHECKED },
  { id: 'np.104Years', label: '104 nurse practitioner: years of practice after the transition', value: '3', unit: 'years',
    source: 'Bus. & Prof. Code § 2837.104(b)(3)', url: LEG('BPC', '2837.104'), status: 'text-checked', checkedOn: CHECKED,
    note: 'Not counting the transition period. The board may lower this for a DNP holder.' },
];

export type MsoValues = Record<string, string>;
export const msoDefaults = (): MsoValues => Object.fromEntries(MSO_PARAMS.map((p) => [p.id, p.value]));

/**
 * Licensed persons who may hold shares in a medical corporation, within the
 * caps above (Corp. Code § 13401.5(a), read 2026-11-25). Physicians are the
 * regulated profession and are not on this list.
 */
export const MEDICAL_CORP_LISTED = [
  'podiatrist', 'psychologist', 'registered nurse', 'optometrist', 'marriage and family therapist', 'clinical social worker',
  'physician assistant', 'chiropractor', 'acupuncturist', 'naturopathic doctor', 'professional clinical counselor',
  'physical therapist', 'pharmacist', 'midwife', 'occupational therapist',
] as const;
