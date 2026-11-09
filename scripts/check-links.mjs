// Checks every internal link and image in the built site.
// Usage: node scripts/check-links.mjs   (run after node scripts/build.mjs)
// Prints a JSON summary; exit code 1 when something is broken.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const SKIP = new Set(['.git', '.claude', 'node_modules', 'scripts', 'data', 'content', 'painel']);
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!SKIP.has(e.name)) walk(p); } else if (p.endsWith('.html')) files.push(p);
  }
})(ROOT);

const broken = [];
let total = 0;
for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"#?]+)/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|tel:|sms:|data:)/.test(u)) continue;
    total++;
    const target = u.startsWith('/') ? path.join(ROOT, u) : path.join(path.dirname(f), u);
    // Clean URLs (/blog, /blog/post) are served from /blog.html and /blog/post.html
    const ok = (fs.existsSync(target) && (fs.statSync(target).isFile() || fs.existsSync(path.join(target, 'index.html'))))
      || (!path.extname(target) && fs.existsSync(`${target}.html`));
    if (!ok) broken.push({ page: path.relative(ROOT, f).replace(/\\/g, '/'), link: u });
  }
}
console.log(JSON.stringify({ pages: files.length, links: total, broken: broken.length, examples: broken.slice(0, 20) }, null, 1));
process.exit(broken.length ? 1 : 0);
