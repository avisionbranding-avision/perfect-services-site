// One-off cleanup: Perfect Services only gives prices after a free in-home estimate.
// Rewrites "price by photo / price the same day" promises in existing content.
// Usage: node scripts/fix-pricing.mjs   (prints how many changes per file)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib.mjs';

const RULES = [
  // whole sentences first
  [/Send photos(?: of [^.<"]*?)? (?:for|and [^.<"]*?(?:give|confirm) you) a fixed (?:price|quote), (?:usually|typically) (?:confirmed )?the same day\./gi, 'We give you an exact price after a free in-home estimate, with no commitment.'],
  [/[^.<>"]*will (?:give you|confirm) a fixed price, (?:usually|typically) the same day\./gi, 'We give you an exact price after a free in-home estimate, with no commitment.'],
  [/how to get a fixed (?:price|quote|number)(?: for a cleaning)?/gi, 'how to book a free in-home estimate'],
  [/with a fixed quote from photos/gi, 'with an exact quote after a free in-home estimate'],
  [/Get a fixed quote this week/g, 'Book a free estimate this week'],
  [/Send photos or use the (?:booking )?form\./gi, 'Use the booking form, call or text us.'],
  [/(?:Yes\. )?Send photos or use the form and we will give you a fixed price, (?:usually|typically) the same day\./gi, 'Yes. Book a free in-home estimate with the form, a call or a text, and we give you an exact price after the visit.'],
  [/Perfect Services usually confirms a fixed price the same day\./gi, 'Perfect Services visits for a free estimate and gives you an exact price.'],
  [/Photos let us give a fixed price the same day\./gi, 'A free in-home estimate lets us give you an exact price.'],
  [/(and )?a few photos get you a fixed quote/gi, '$1a free in-home estimate gets you an exact quote'],
  [/, and most quotes come back the same day\./gi, ', and you get an exact quote after the visit.'],
  [/There is no need to clean before you send photos\./gi, 'There is no need to clean before the estimate visit.'],
  [/send photos today\./gi, 'book your free estimate today.'],
  [/Request a fixed price on the /g, 'Book a free in-home estimate on the '],
  [/The fastest way to get a fixed (?:number|price|quote) is to text a few photos of [^.<"]*? to (?:Perfect Services at )?\(864\) 666-8520/gi, 'The fastest way to get an exact price is to book a free in-home estimate: text Perfect Services at (864) 666-8520'],
  // sentence starts only (case-sensitive), so mid-sentence "for a fixed price" is not touched here
  [/(^|[.>!?]\s*|\\n)For a fixed (price|number|quote), /g, '$1To book a free in-home estimate, '],
  [/(^|[.>!?]\s*|\\n)To get a fixed (price|number|quote), /g, '$1To book a free in-home estimate, '],
  [/The fastest way to a fixed price is to /gi, 'The fastest way to an exact price is a free in-home estimate: '],
  [/(?:text|send) (?:a few |us )?photos?(?: of [^.<"]*?)? to (?:Perfect Services at )?\(864\) 666-8520/gi, 'text (864) 666-8520'],
  [/to request a fixed price and the (?:earliest|next) open dates/gi, 'to book a free in-home estimate'],
  [/Prices are usually confirmed the same day, so you know the number before you commit\./gi, 'You get an exact price after a free walkthrough, before you commit to anything.'],
  [/Perfect Services usually replies the same day\./gi, 'Perfect Services gets back to you quickly to schedule the free estimate.'],
  [/how to get a fixed price quickly/gi, 'how to book a free in-home estimate'],
  [/Most apartments can be quoted from a few photos and scheduled within days\./gi, 'Most apartments can be estimated in a short visit and scheduled within days.'],
  [/You send photos or fill in the form, receive a fixed price, pick a day/gi, 'You text us or fill in the form, we visit for a free estimate and give you an exact price, you pick a day'],
  [/We can usually return a quote the same day and start service within the week\./gi, 'We schedule a free walkthrough, give you an exact quote and can usually start within the week.'],
  [/Send photos of the space for an accurate quote\./gi, 'Book a free walkthrough for an accurate quote.'],
  [/Or text a photo to /g, 'Or text us at '],
  [/or text a photo of the space to \(864\) 666-8520\. Perfect Services usually replies with a clear price the same day\./gi, 'or text (864) 666-8520. We visit your home for a free estimate and give you an exact price.'],
  [/text a photo of the space to /gi, 'text '],
  [/Price usually the same day\./g, 'Free in-home estimate.'],
  [/We reply with a price, usually the same day\./g, 'We call or text you to schedule your free in-home estimate.'],
  [/We reply with a clear price and a date that fits your schedule, usually the same day\./g, 'We visit, see the space and give you an exact price, then book a date that fits your schedule.'],
  [/Free estimates, same day/g, 'Free in-home estimates'],
  [/Most requests get a price the same day\./g, 'We visit your home and give you an exact price, with no commitment.'],
  [/Free estimates?, usually (?:the )?same day/g, 'Free in-home estimate'],
  [/Same day<\/b><span>free estimates/g, 'Free</b><span>in-home estimates'],
];
const VARIANTS = [
  'Book a free in-home estimate: we visit, see the space and give you an exact price, with no commitment.',
  'Every home is different, so the exact price comes after a free walkthrough at your home, with no commitment.',
  'Schedule a free estimate visit and you get an exact price after we see the home, with no commitment.',
];
// Remaining sentences that promise a price by photo or the same day (but not Airbnb same-day turnovers)
const SENT = /[^.!?<>"\\]*\b(?:photos?|same[- ]day|fixed (?:price|quote|number)|clear price|price fast)\b[^.!?<>"\\]*[.!?]/gi;
function fixText(s) {
  let out = String(s);
  for (const [re, to] of RULES) out = out.replace(re, to);
  let k = 0;
  out = out.replace(SENT, (m) => {
    if (!/(price|quote|estimate|repl|confirm|number|cost)/i.test(m)) return m;
    if (/turnover/i.test(m)) return m;
    if (m.trim().split(/\s+/).length > 30) { console.log('  review by hand:', m.trim().slice(0, 140)); return m; }
    const lead = m.match(/^\s*/)[0];
    return lead + VARIANTS[(k++) % VARIANTS.length];
  });
  return out;
}
function fixDeep(v) {
  if (typeof v === 'string') return fixText(v);
  if (Array.isArray(v)) return v.map(fixDeep);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k2, x]) => [k2, (k2 === 'link' || k2 === 'image' || k2 === 'slug') ? x : fixDeep(x)]));
  return v;
}
let total = 0;
const report = (f, before, after) => { if (before !== after) { total++; console.log('fixed', path.relative(ROOT, f)); } };
// JSON content (posts, GBP posts, legacy post data)
const jsonFiles = [
  ...fs.readdirSync(path.join(ROOT, 'content', 'posts')).map((f) => path.join(ROOT, 'content', 'posts', f)),
  ...(fs.existsSync(path.join(ROOT, 'content', 'gbp')) ? fs.readdirSync(path.join(ROOT, 'content', 'gbp')).map((f) => path.join(ROOT, 'content', 'gbp', f)) : []),
  path.join(ROOT, 'data', 'legacy-posts.json'),
].filter((f) => f.endsWith('.json'));
for (const f of jsonFiles) {
  const raw = fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, '');
  const fixed = JSON.stringify(fixDeep(JSON.parse(raw)), null, 2);
  if (JSON.stringify(JSON.parse(raw), null, 2) !== fixed) { fs.writeFileSync(f, `${fixed}\n`); total++; console.log('fixed', path.relative(ROOT, f)); }
}
// Original HTML pages (home, thank-you, the 10 original articles)
const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'legacy-posts.json'), 'utf8'));
const htmlFiles = [path.join(ROOT, 'index.html'), path.join(ROOT, 'thank-you.html'), ...legacy.map((p) => path.join(ROOT, 'blog', `${p.slug}.html`))];
for (const f of htmlFiles) {
  if (!fs.existsSync(f)) continue;
  const before = fs.readFileSync(f, 'utf8');
  const after = fixText(before);
  if (after !== before) fs.writeFileSync(f, after);
  report(f, before, after);
}
console.log(`${total} files changed`);
