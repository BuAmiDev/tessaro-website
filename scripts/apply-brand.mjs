// Post-build brand rename. The source uses brand.name ('Tessaro') everywhere;
// if the business confirms another spelling (for example 'Tesaro'), set
// BRAND_NAME and run `npm run build` — this rewrites the visible name in dist.
// The logo wordmark is a drawn SVG path and must be replaced by design.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const to = process.env.BRAND_NAME?.trim();
const from = 'Tessaro';
if (!to || to === from) { console.log('[brand] keeping', from); process.exit(0); }
const exts = new Set(['.html', '.xml', '.js', '.css', '.txt', '.json']);
let files = 0;
async function walk(d) {
  for (const e of await readdir(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) await walk(p);
    else if (exts.has(extname(p))) {
      const s = await readFile(p, 'utf8');
      // Only the display name: domains (tessaropro.com) and storage keys (tessaro.*) stay.
      const n = s.replace(/\bTessaro\b/g, to);
      if (n !== s) { await writeFile(p, n); files++; }
    }
  }
}
await walk('dist');
console.log(`[brand] renamed ${from} → ${to} in ${files} files`);
