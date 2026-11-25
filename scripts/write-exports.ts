// Write the sample workbook and memo to disk: npx vite-node scripts/write-exports.ts [outDir]
import { mkdirSync, writeFileSync } from 'node:fs';
import { memo, workbook } from '../src/compiler/exports';
import { verify, type Candidate } from '../src/compiler/extract';
import recorded from '../src/compiler/extraction.recorded.json';
import { defaultValues } from '../src/compiler/params';
import { defaultModel } from '../src/compiler/views';

const out = process.argv[2] ?? 'dist-exports';
mkdirSync(out, { recursive: true });
const m = defaultModel(defaultValues());
writeFileSync(`${out}/cedar-hollow-disclosures.xlsx`, workbook(m));
writeFileSync(`${out}/cedar-hollow-memo.docx`, memo(m, (recorded.candidates as Candidate[]).map((c) => verify(c))));
console.log(`wrote ${out}`);
