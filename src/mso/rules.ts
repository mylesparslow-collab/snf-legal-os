/**
 * The SB 351 items the audit traces, as data. Labels paraphrase the chaptered
 * text of Health & Saf. Code § 1191 (read 2026-11-25); the citation points at
 * the subdivision.
 */
export type ItemKind = 'judgment' | 'control' | 'covenant';

export interface Sb351Item {
  id: string;
  cite: string;
  kind: ItemKind;
  label: string;
}

export const SB351_ITEMS: Sb351Item[] = [
  { id: 'a1A', cite: '§ 1191(a)(1)(A)', kind: 'judgment', label: 'Which diagnostic tests fit a condition' },
  { id: 'a1B', cite: '§ 1191(a)(1)(B)', kind: 'judgment', label: 'Referrals and consultations' },
  { id: 'a1C', cite: '§ 1191(a)(1)(C)', kind: 'judgment', label: 'Overall care of the patient, including treatment options' },
  { id: 'a1D', cite: '§ 1191(a)(1)(D)', kind: 'judgment', label: 'How many patients a physician sees in a period, or how many hours they work' },
  { id: 'a2A', cite: '§ 1191(a)(2)(A)', kind: 'control', label: 'Owning or setting the content of patient medical records' },
  { id: 'a2B', cite: '§ 1191(a)(2)(B)', kind: 'control', label: 'Hiring or firing clinicians based on clinical competency' },
  { id: 'a2C', cite: '§ 1191(a)(2)(C)', kind: 'control', label: 'Setting the terms for contracts with third-party payers' },
  { id: 'a2D', cite: '§ 1191(a)(2)(D)', kind: 'control', label: 'Clinical competency terms for contracts with other physicians' },
  { id: 'a2E', cite: '§ 1191(a)(2)(E)', kind: 'control', label: 'Coding and billing decisions' },
  { id: 'a2F', cite: '§ 1191(a)(2)(F)', kind: 'control', label: 'Approving medical equipment and supplies' },
  { id: 'd1A', cite: '§ 1191(d)(1)(A)', kind: 'covenant', label: 'Bars a provider from competing after leaving' },
  { id: 'd1B', cite: '§ 1191(d)(1)(B)', kind: 'covenant', label: 'Bars a provider from commenting on quality, utilization, ethics or revenue strategies' },
  { id: 'fee', cite: 'Bus. & Prof. Code § 650(b)', kind: 'covenant', label: 'Percentage-of-revenue management fee' },
  { id: 'designee', cite: '§ 1191(g); Corp. Code § 13401.5', kind: 'covenant', label: 'Manager picks who holds the practice\'s shares' },
];

export const itemById = (id: string) => {
  const x = SB351_ITEMS.find((i) => i.id === id);
  if (!x) throw new Error(`unknown SB 351 item ${id}`);
  return x;
};
