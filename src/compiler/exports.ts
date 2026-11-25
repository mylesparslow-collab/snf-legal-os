import { CA_HOLIDAYS, fmt } from '../domain/dates';
import { FACTS, nodeName } from './deal';
import { format, toNumber } from './decimal';
import { buildDocx, type Block } from './docx';
import type { Verified } from './extract';
import { edgePct, indirectHoldings, validate } from './graph';
import { PARAMS } from './params';
import { schedule } from './schedule';
import { cdphView, cmsView, ohcaView, type Model, type ViewRow } from './views';
import { buildXlsx, serial, type Cell, type Sheet } from './xlsx';

const STATUS_TEXT = { 'text-checked': 'Text checked', interpretation: 'Our reading', unverified: 'Not verified' } as const;
const OUTCOME_TEXT = { disclose: 'Disclose', 'not-required': 'Not required', unresolved: 'Unresolved' } as const;
const BANNER = 'SYNTHETIC DEMO. Fictional parties and documents. Not legal advice and not cleared for firm use. Every rule needs attorney verification.';

/** Workbook where the arithmetic and dates are live Excel formulas over the edge and parameter sheets. */
export function workbook(m: Model, closing: string = FACTS.closing): Uint8Array {
  const paramRow = new Map(PARAMS.map((p, i) => [p.id, i + 2]));
  const pref = (id: string) => `Parameters!$C$${paramRow.get(id)}`;
  const edgeRow = new Map(m.edges.map((e, i) => [e.id, i + 2]));

  const params: Sheet = {
    name: 'Parameters',
    widths: [18, 58, 12, 7, 15, 44, 60],
    rows: [
      ['Id', 'Rule', 'Value', 'Unit', 'Status', 'Source', 'Note'].map((v) => ({ v, s: 3 as const })),
      ...PARAMS.map((p) => [p.id, { v: p.label, s: 4 as const }, Number(m.params[p.id]), p.unit, STATUS_TEXT[p.status], p.source, { v: p.note ?? '', s: 4 as const }]),
    ],
  };

  const edges: Sheet = {
    name: 'Edges',
    widths: [8, 44, 44, 12, 16, 10, 14],
    rows: [
      ['Id', 'Owner', 'Owned', 'Percent', 'Interest', 'Figure from', 'Document says'].map((v) => ({ v, s: 3 as const })),
      ...m.edges.map((e) => [e.id, nodeName(e.ownerId), nodeName(e.ownedId), { v: toNumber(edgePct(e, m.choice)), s: 2 as const }, e.interest,
        m.choice[e.id] === 'document' ? 'document' : 'intake', e.docPct ? Number(e.docPct) : '']),
    ],
  };

  // Paths: product of edge cells, so changing a percent on Edges flows through.
  const holdings = indirectHoldings(m.edges, FACTS.licenseeId, m.choice);
  const pathRows: (Cell | string)[][] = [];
  for (const h of holdings)
    for (const p of h.paths) {
      const cells = p.steps.map((s) => `Edges!$D$${edgeRow.get(s.edgeId)}`);
      const f = cells.length === 1 ? cells[0] : `${cells.join('*')}/${100 ** (cells.length - 1)}`;
      pathRows.push([nodeName(h.holderId), p.steps.map((s) => `${nodeName(s.ownerId)} (${format(s.pct)}%)`).join(' → ') + ` → ${nodeName(FACTS.licenseeId)}`,
        { f, v: toNumber(p.product), s: 2 }, format(p.product)]);
    }
  const paths: Sheet = {
    name: 'Paths',
    widths: [44, 100, 14, 16],
    rows: [['Holder', 'Path', 'Percent (formula)', 'Engine (exact)'].map((v) => ({ v, s: 3 as const })), ...pathRows],
  };

  const n = pathRows.length + 1;
  const holders: Sheet = {
    name: 'Holders',
    widths: [48, 14, 16, 10, 16, 16],
    rows: [
      ['Holder of the licensee', 'Total (formula)', 'Engine (exact)', 'Match', 'CDPH test', 'CMS owner test'].map((v) => ({ v, s: 3 as const })),
      ...holdings.map((h, i) => {
        const r = i + 2;
        return [nodeName(h.holderId), { f: `SUMIF(Paths!$A$2:$A$${n},A${r},Paths!$C$2:$C$${n})`, v: toNumber(h.total), s: 2 as const }, format(h.total),
          { f: `IF(ABS(B${r}-VALUE(SUBSTITUTE(C${r},"…","")))<0.000001,"OK","CHECK")`, v: 'OK' },
          ...(m.nodes.find((x) => x.id === h.holderId)?.kind === 'Pool'
            ? ['Not one holder: see CDPH', 'Not one holder: see CMS-855A']
            : [{ f: `IF(B${r}>=${pref('cdph.owner')},"Disclose","Below")`, v: '' }, { f: `IF(B${r}>=${pref('cms.owner')},"Disclose","Below")`, v: '' }])];
      }),
      [],
      [{ v: 'Unnamed pools (rows marked "Other limited partners") are a total, not one holder. See the CDPH sheet.', s: 4 }],
    ],
  };

  const viewSheet = (name: string, rows: ViewRow[]): Sheet => ({
    name,
    widths: [36, 44, 14, 14, 90],
    rows: [
      ['Section', 'Party', 'Outcome', 'Percent', 'Basis'].map((v) => ({ v, s: 3 as const })),
      ...rows.map((r) => [r.section, r.partyId === '_admin' ? 'Administrator and medical director' : nodeName(r.partyId), OUTCOME_TEXT[r.outcome],
        r.pct ? format(r.pct) : '', { v: r.basis + (r.interpretation ? ' [our reading]' : ''), s: 4 as const }]),
    ],
  });

  const o = ohcaView(m);
  const ohca: Sheet = {
    name: 'OHCA',
    widths: [60, 14, 90],
    rows: [
      ['Test', 'Result', 'Detail'].map((v) => ({ v, s: 3 as const })),
      ...o.tests.map((t) => [t.label, t.result, { v: t.detail, s: 4 as const }]),
      [],
      ...o.noticing.map((r) => [nodeName(r.partyId), 'Noticing entity', r.basis]),
      [],
      [{ v: o.conclusion, s: 4 }],
    ],
  };

  const holidayKeys = Object.keys(CA_HOLIDAYS).sort();
  const hol: Sheet = { name: 'Holidays', widths: [14, 30], rows: [['Date', 'Holiday'].map((v) => ({ v, s: 3 as const })), ...holidayKeys.map((d) => [{ v: serial(d), s: 1 as const }, CA_HOLIDAYS[d]])] };
  const holRange = `Holidays!$A$2:$A$${holidayKeys.length + 1}`;

  const items = schedule(closing, FACTS.today, m.params);
  const sched: Sheet = {
    name: 'Schedule',
    widths: [62, 14, 14, 14, 14, 70],
    rows: [
      [{ v: 'Closing date', s: 3 }, { v: serial(closing), s: 1 }, 'Change this cell to re-run every date.'],
      [],
      ['Item', 'Offset (days)', 'Counted', 'Act by', 'Kind', 'Note'].map((v) => ({ v, s: 3 as const })),
      ...items.map((it, i) => {
        const r = i + 4;
        const sign = it.offsetDays < 0 ? '-' : '';
        const offF = it.paramIds.length === 2 ? `${sign}(${pref(it.paramIds[0])}+${pref(it.paramIds[1])})` : `${sign}${pref(it.paramIds[0])}`;
        const actF = it.kind === 'after-closing' ? `C${r}` : `WORKDAY(C${r}+1,-1,${holRange})`;
        return [it.label, { f: offF, v: it.offsetDays }, { f: `$B$1+B${r}`, v: serial(it.counted), s: 1 as const }, { f: actF, v: serial(it.actBy), s: 1 as const }, it.kind, { v: it.note, s: 4 as const }];
      }),
    ],
  };

  const readme: Sheet = {
    name: 'Read me',
    widths: [110],
    rows: [[{ v: BANNER, s: 3 }], [FACTS.matter], [`Prepared by the compiler for ${FACTS.firm} (fictional). Generated ${FACTS.today}.`], [],
      ['Edges and Parameters drive everything. Paths, Holders and Schedule are live formulas over them; the "Engine (exact)" columns are the app\'s exact decimal result for cross-checking.'],
      ['Status "Text checked" means the number was read in the primary source on 2026-11-25. "Not verified" means it came from the research report only.'],
      ['Holidays is a demo calendar, not a maintained one.']],
  };

  return buildXlsx([readme, params, edges, paths, holders, viewSheet('CDPH', cdphView(m)), viewSheet('CMS-855A', cmsView(m)), ohca, sched, hol]);
}

/** Short Word memo for counsel: views, dates, open items and the rule register. */
export function memo(m: Model, extraction: Verified[], closing: string = FACTS.closing): Uint8Array {
  const issues = validate(m.nodes, m.edges, m.choice);
  const cd = cdphView(m);
  const cm = cmsView(m);
  const o = ohcaView(m);
  const items = schedule(closing, FACTS.today, m.params);
  const open = [...cd.map((r) => ({ ...r, v: 'CDPH' })), ...cm.map((r) => ({ ...r, v: 'CMS' }))].filter((r) => r.outcome === 'unresolved');
  const name = (id: string) => (id === '_admin' ? 'Administrator and medical director' : nodeName(id));
  const rowsFor = (rs: ViewRow[]) => rs.filter((r) => r.outcome !== 'not-required').map((r) => [r.section, name(r.partyId), OUTCOME_TEXT[r.outcome], r.pct ? `${format(r.pct)}%` : '', r.basis + (r.interpretation ? ' [our reading]' : '')]);
  const blocks: Block[] = [
    { t: 'title', text: 'Ownership disclosure and filing schedule' },
    { t: 'note', text: BANNER },
    { t: 'p', text: `Matter: ${FACTS.matter}. Facility: ${FACTS.facility}. Proposed licensee: ${nodeName(FACTS.licenseeId)}. Target closing: ${fmt(closing)}. Counsel (fictional): ${FACTS.firm}.` },
    { t: 'h1', text: '1. Dates counted back from closing' },
    { t: 'table', head: ['Item', 'Act by', 'Basis'], widths: [4200, 1700, 3460],
      rows: items.map((i) => [i.label, `${fmt(i.actBy)}${i.daysFromToday < 0 ? ' (passed)' : ''}`, `${i.note}${i.moved ? ` Moved earlier: ${i.moved}.` : ''}`]) },
    { t: 'h1', text: '2. Open items before anything is filed' },
    { t: 'bullets', items: [...issues.map((i) => i.message), ...open.map((r) => `${r.v}, ${r.section.toLowerCase()}: ${name(r.partyId)}. ${r.basis}`), ...o.tests.filter((t) => t.result === 'needs-input').map((t) => `OHCA ${t.label}: ${t.detail}`)] },
    { t: 'h1', text: '3. CDPH change of ownership (Health & Saf. Code §§ 1253.3, 1267.5)' },
    { t: 'table', head: ['Section', 'Party', 'Outcome', '%', 'Basis'], widths: [1900, 2100, 1000, 900, 3460], rows: rowsFor(cd) },
    { t: 'h1', text: '4. CMS-855A and SNF attachment (42 CFR § 424.502)' },
    { t: 'table', head: ['Section', 'Party', 'Outcome', '%', 'Basis'], widths: [1900, 2100, 1000, 900, 3460], rows: rowsFor(cm) },
    { t: 'h1', text: '5. OHCA material change notice (Health & Saf. Code § 127507; 22 CCR § 97435)' },
    { t: 'table', head: ['Test', 'Result', 'Detail'], widths: [3600, 1100, 4660], rows: o.tests.map((t) => [t.label, t.result, t.detail]) },
    { t: 'p', text: o.conclusion },
    { t: 'h1', text: '6. Document extraction log' },
    { t: 'p', text: `${extraction.filter((v) => v.accepted).length} of ${extraction.length} model-proposed facts passed the quote check. Rejected facts are not used anywhere.` },
    { t: 'table', head: ['Fact', 'Result', 'Why'], widths: [4000, 1300, 4060],
      rows: extraction.map((v) => [`${v.candidate.holder} → ${v.candidate.of}${v.candidate.pct ? ` ${v.candidate.pct}%` : v.candidate.role ? ` (${v.candidate.role})` : ''}`, v.match, v.accepted ? v.note : v.checks.filter((c) => !c.ok).map((c) => c.label).join('; ')]) },
    { t: 'h1', text: '7. Rule register' },
    { t: 'table', head: ['Rule', 'Value', 'Status', 'Source'], widths: [4300, 900, 1300, 2860],
      rows: PARAMS.map((p) => [p.label, `${m.params[p.id]} ${p.unit === 'USD' ? 'USD' : p.unit}`, STATUS_TEXT[p.status], p.source]) },
  ];
  return buildDocx(blocks);
}
