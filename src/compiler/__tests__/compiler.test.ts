import { unzipSync, strFromU8 } from 'fflate';
import { EDGES, NODES } from '../deal';
import { add, eq, format, parse, pctOf, q } from '../decimal';
import { verify, type Candidate } from '../extract';
import recorded from '../extraction.recorded.json';
import { memo, workbook } from '../exports';
import { indirectHoldings, poolCrossing, validate } from '../graph';
import { defaultValues } from '../params';
import { schedule } from '../schedule';
import { cdphView, cmsView, defaultModel, ohcaView } from '../views';

const m = defaultModel(defaultValues());
const holding = (id: string) => indirectHoldings(EDGES, 'opco').find((h) => h.holderId === id)!;
const row = (rows: ReturnType<typeof cdphView>, id: string, section?: string) => rows.find((r) => r.partyId === id && (!section || r.section.startsWith(section)));

describe('decimal', () => {
  it('is exact where floating point is not', () => {
    expect(0.1 + 0.2 === 0.3).toBe(false);
    expect(eq(add(parse('0.1'), parse('0.2')), parse('0.3'))).toBe(true);
    expect(format(pctOf(pctOf(parse('90'), parse('62.5')), parse('33')))).toBe('18.5625');
    expect(format(q(1n, 3n), 4)).toBe('0.3333…');
    expect(() => parse('1e2')).toThrow();
  });
});

describe('graph', () => {
  it('matches the 42 CFR 424.502 worked example', () => {
    const e = [
      { id: 'a', ownerId: 'A', ownedId: 'C', pct: '10', interest: 'stock' as const, source: 'intake' as const },
      { id: 'b', ownerId: 'C', ownedId: 'P', pct: '80', interest: 'stock' as const, source: 'intake' as const },
    ];
    expect(format(indirectHoldings(e, 'P').find((h) => h.holderId === 'A')!.total)).toBe('8');
  });
  it('multiplies every tier exactly', () => {
    expect(format(holding('bsh').total)).toBe('90');
    expect(format(holding('hcf').total)).toBe('56.25');
    expect(format(holding('stc').total)).toBe('18.5625');
    expect(format(holding('hcgp').total)).toBe('0.5625');
    expect(format(holding('oft').total)).toBe('22.5');
    expect(format(holding('lps').total)).toBe('37.125');
  });
  it('owners of every entity add to exactly 100 and only the Ridgeline figures are flagged', () => {
    const issues = validate(NODES, EDGES);
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(issues.filter((i) => i.severity === 'warning')).toHaveLength(2);
  });
  it('catches a schedule that does not add to 100', () => {
    const bad = EDGES.map((e) => (e.id === 'e5' ? { ...e, pct: '12.4' } : e));
    expect(validate(NODES, bad).some((i) => i.message.includes('99.9%'))).toBe(true);
  });
  it('works out the fund share that would push an unnamed LP over 5%', () => {
    const c = poolCrossing(NODES.find((n) => n.id === 'lps')!, holding('lps'), parse('5'))!;
    expect(format(c.neededOfParent, 4)).toBe('8.8889…');
    expect(c.canBeCleared).toBe(false);
    expect(poolCrossing(NODES.find((n) => n.id === 'lps')!, holding('lps'), parse('10'))!.canBeCleared).toBe(true);
  });
});

describe('views', () => {
  it('CDPH: 5% owners disclosed, GP below 5% not, unnamed LPs unresolved', () => {
    const v = cdphView(m);
    expect(row(v, 'stc', 'Beneficial')!.outcome).toBe('disclose');
    expect(row(v, 'hcgp', 'Beneficial')!.outcome).toBe('not-required');
    expect(row(v, 'lps', 'Beneficial')!.outcome).toBe('unresolved');
    expect(row(v, 'pn')!.outcome).toBe('disclose');
    expect(row(v, 'tr', 'Management')!.outcome).toBe('disclose');
  });
  it('CMS: 0% LLC manager and special member listed; LP pool cleared at the 10% test', () => {
    const v = cmsView(m);
    expect(row(v, 'pn', 'Organizational structure: Cedar Hollow Operations')!.outcome).toBe('disclose');
    expect(format(row(v, 'hcgp', 'Organizational structure: Cedar Hollow Operations')!.pct!)).toBe('0');
    expect(row(v, 'lps', 'Organizational structure: Harbor Crest Fund')!.outcome).toBe('not-required');
    expect(row(v, 'wmr', 'Additional')!.outcome).toBe('disclose');
    expect(row(v, 'lca', 'Additional')!.outcome).toBe('disclose');
  });
  it('threshold is a parameter, not a constant', () => {
    const v = cdphView(defaultModel({ ...defaultValues(), 'cdph.owner': '20' }));
    expect(row(v, 'stc', 'Beneficial')!.outcome).toBe('not-required');
  });
  it('choosing the document figure for Ridgeline changes the management-company owners', () => {
    const v = cdphView(defaultModel(defaultValues(), { e9: 'document', e10: 'document' }));
    expect(format(row(v, 'tr', 'Management')!.pct ?? parse('0'))).toBe('35');
  });
  it('OHCA: notice looks required, but shortage area still needs input', () => {
    const o = ohcaView(m);
    expect(o.conclusion).toMatch(/looks required/);
    expect(o.tests.find((t) => t.id === 'b3')!.result).toBe('needs-input');
    expect(o.tests.find((t) => t.id === 'e2')!.result).toBe('met');
  });
});

describe('schedule', () => {
  const s = schedule('2027-04-30', '2026-11-25', defaultValues());
  const get = (id: string) => s.find((x) => x.id === id)!;
  it('counts back from closing', () => {
    expect(get('cdph-app').actBy).toBe('2026-12-31');
    expect(get('cdph-plan').counted).toBe('2026-11-01');
    expect(get('cdph-plan').daysFromToday).toBeLessThan(0);
    expect(get('cdph-post').actBy).toBe('2027-05-10');
  });
  it('moves a weekend "before" deadline to the prior business day', () => {
    expect(get('ohca').counted).toBe('2027-01-30');
    expect(get('ohca').actBy).toBe('2027-01-29');
    expect(get('ohca').moved).toMatch(/Saturday/);
  });
});

describe('extraction', () => {
  const results = (recorded.candidates as Candidate[]).map((c) => verify(c));
  it('replays the recorded model run and accepts only quote-backed facts', () => {
    expect(results.length).toBeGreaterThan(10);
    for (const r of results) if (r.accepted) expect(r.checks.every((c) => c.ok)).toBe(true);
    expect(results.some((r) => r.match === 'conflicts' && r.edgeId === 'e9')).toBe(true);
    const rejected = results.filter((r) => !r.accepted).map((r) => r.candidate.holder);
    // The veto page calls the holder "the Special Member" without naming it, and "wholly owned" is not a stated 100%.
    expect(rejected).toEqual(['Harbor Crest GP IV, LLC', 'Westmark Healthcare REIT, Inc.']);
  });
  it('rejects a percentage the quote does not state', () => {
    const r = verify({ kind: 'ownership', holder: 'Westmark Healthcare REIT, Inc.', of: 'Cedar Hollow Realty LLC', pct: '100', docId: 'lease', page: 1,
      quote: 'Cedar Hollow Realty LLC, a wholly owned subsidiary of Westmark Healthcare REIT, Inc.' });
    expect(r.accepted).toBe(false);
  });
  it('rejects an invented quote', () => {
    const r = verify({ kind: 'ownership', holder: 'Marisol Vega', of: 'Bayline Senior Holdings LLC', pct: '15', docId: 'bsh-oa', page: 1, quote: 'Marisol Vega: 15%.' });
    expect(r.accepted).toBe(false);
    expect(r.checks.find((c) => c.label.startsWith('Quote'))!.ok).toBe(false);
  });
});

describe('exports', () => {
  it('workbook carries formulas over the edge and parameter sheets', () => {
    const files = unzipSync(workbook(m));
    const paths = strFromU8(files['xl/worksheets/sheet4.xml']);
    expect(paths).toContain('<f>Edges!$D$8*Edges!$D$4*Edges!$D$2/10000');
    const sched = strFromU8(files['xl/worksheets/sheet9.xml']);
    expect(sched).toContain('WORKDAY(');
  });
  it('memo is a Word document with the open items', () => {
    const doc = strFromU8(unzipSync(memo(m, []))['word/document.xml']);
    expect(doc).toContain('Open items before anything is filed');
    expect(doc).toContain('SYNTHETIC DEMO');
  });
});
