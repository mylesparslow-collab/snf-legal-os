import { strToU8, zipSync } from 'fflate';

export type Block =
  | { t: 'title' | 'h1' | 'h2' | 'p' | 'note'; text: string }
  | { t: 'bullets'; items: string[] }
  | { t: 'table'; head: string[]; rows: string[][]; widths?: number[] };

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const run = (text: string, o: { b?: boolean; sz?: number; i?: boolean; color?: string } = {}) =>
  `<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.color ? `<w:color w:val="${o.color}"/>` : ''}<w:sz w:val="${o.sz ?? 21}"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const para = (inner: string, o: { after?: number; before?: number; keep?: boolean } = {}) =>
  `<w:p><w:pPr><w:spacing w:before="${o.before ?? 0}" w:after="${o.after ?? 120}"/>${o.keep ? '<w:keepNext/>' : ''}</w:pPr>${inner}</w:p>`;

function table(head: string[], rows: string[][], widths?: number[]): string {
  const total = 9360;
  const w = widths ?? head.map(() => Math.floor(total / head.length));
  const cell = (text: string, i: number, bold: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${w[i]}" w:type="dxa"/>${bold ? '<w:shd w:val="clear" w:color="auto" w:fill="E7ECEA"/>' : ''}</w:tcPr>${para(run(text, { b: bold, sz: 18 }), { after: 40 })}</w:tc>`;
  const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="BFC8C4"/>`;
  return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders>${['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('')}</w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${w.map((x) => `<w:gridCol w:w="${x}"/>`).join('')}</w:tblGrid><w:tr><w:trPr><w:tblHeader/></w:trPr>${head.map((h, i) => cell(h, i, true)).join('')}</w:tr>${rows
    .map((r) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c, i) => cell(c, i, false)).join('')}</w:tr>`)
    .join('')}</w:tbl>${para('', { after: 120 })}`;
}

export function buildDocx(blocks: Block[]): Uint8Array {
  const body = blocks
    .map((b) => {
      switch (b.t) {
        case 'title': return para(run(b.text, { b: true, sz: 32 }), { after: 120 });
        case 'h1': return para(run(b.text, { b: true, sz: 26, color: '1D5A66' }), { before: 240, after: 100, keep: true });
        case 'h2': return para(run(b.text, { b: true, sz: 22 }), { before: 160, after: 80, keep: true });
        case 'p': return para(run(b.text));
        case 'note': return para(run(b.text, { i: true, sz: 19, color: '5A6662' }));
        case 'bullets': return b.items.map((x) => para(run(`• ${x}`), { after: 60 })).join('');
        case 'table': return table(b.head, b.rows, b.widths);
      }
    })
    .join('');
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1260" w:right="1440" w:bottom="1260" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return zipSync({ '[Content_Types].xml': strToU8(types), '_rels/.rels': strToU8(rels), 'word/document.xml': strToU8(doc) });
}
