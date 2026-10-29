// Turn the single-file build into an Artifact page body: the host supplies the
// doctype/html/head/body skeleton, so keep only head assets and the app root.
import { readFileSync, writeFileSync } from 'node:fs';

const [src = 'dist-single/index.html', out = 'dist-single/artifact.html'] = process.argv.slice(2);
const html = readFileSync(src, 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
// Title must come first so the host finds it in the first 8KB.
const title = head.match(/<title>[\s\S]*?<\/title>/)[0];
writeFileSync(out, `${title}\n${head.replace(title, '').trim()}\n${body.trim()}\n`);
console.log(`wrote ${out}`);
