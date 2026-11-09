// Perfect Services site generator.
// Run: node scripts/build.mjs
// Generates service pages, area pages, city x service pages, city blogs,
// new blog posts (content/posts/*.json), the FAQ hub, blog index, sitemap and robots.
import fs from 'node:fs';
import path from 'node:path';
import {
  ROOT, site, services, cities, cityBySlug, serviceBySlug, nearby, hash, pick, rotate, shuffle,
  fill, loadPosts, IMAGE_LABELS, slugify, allEligibleCities, topicQueue, baseQueue,
} from './lib.mjs';

const D = site.domain.replace(/\/$/, '');
const TODAY = new Date().toISOString().slice(0, 10);
const posts = loadPosts();
const urls = []; // for sitemap

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const plain = (s) => String(s).replace(/<[^>]+>/g, '');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const titleCase = (s) => s.replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(In|Of|And|Or|The|A|To|For|Vs)\b/g, (m) => m.toLowerCase());
const list = (arr) => (arr.length < 2 ? arr.join('') : `${arr.slice(0, -1).join(', ')} and ${arr[arr.length - 1]}`);
const trim = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

// Forms: on Cloudflare Pages (CF_PAGES is set during its build) they post to /api/lead (functions/api/lead.js);
// anywhere else they stay Netlify Forms. The same repository deploys correctly on both during the move.
const ON_CF = !!process.env.CF_PAGES || process.env.FORMS === 'cloudflare';
const formTag = (cls, name) => (ON_CF
  ? `<form class="${cls}" name="${name}" method="POST" action="/api/lead">`
  : `<form class="${cls}" name="${name}" method="POST" action="/thank-you.html" data-netlify="true" netlify-honeypot="company">`);
const formMode = (html) => html.replace(/<form class="(quote[^"]*)" name="(estimate[\w-]*)" method="POST"[^>]*>/g, (_, c, n) => formTag(c, n));

function write(rel, html, { sitemap = true, priority = 0.6, lastmod = TODAY } = {}) {
  const file = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  if (sitemap) {
    const loc = `${D}/${rel.replace(/index\.html$/, '').replace(/\\/g, '/')}`;
    urls.push({ loc, priority, lastmod });
  }
}

const cityUrl = (c) => `/areas/${c.slug}/`;
const cityServiceUrl = (c, s) => `/areas/${c.slug}/${s.slug}/`;
const serviceUrl = (s) => `/services/${s.slug}/`;
const cityBlogUrl = (c) => `/blog/${c.slug}/`;
const postUrl = (p) => `/blog/${p.slug}.html`;

// ---------- layout ----------
const PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';

// Google Analytics 4 + lead tracking (calls, texts, estimate form). Marker comment keeps patching idempotent.
const ANALYTICS = site.ga4 ? `<!--ps-ga4--><script async src="https://www.googletagmanager.com/gtag/js?id=${site.ga4}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${site.ga4}');</script>
<script src="/js/track.js" defer></script><!--/ps-ga4-->` : '';
const withAnalytics = (html) => {
  const clean = html.replace(/<!--ps-ga4-->[\s\S]*?<!--\/ps-ga4-->\s*/, '');
  return ANALYTICS ? clean.replace('</head>', `${ANALYTICS}\n</head>`) : clean;
};

function footerServices() {
  return `<div><h3>Services</h3><ul>${services.map((s) => `<li><a href="${serviceUrl(s)}">${esc(s.name)}</a></li>`).join('')}<li><a href="/#estimate">Free estimate</a></li></ul></div>`;
}
function layout({ title, description, canonical, image = 'open-floor-plan-greer.jpg', jsonld = [], body, current = '', type = 'website' }) {
  const nav = [['/services/', 'Services', 'services'], ['/areas/', 'Areas', 'areas'], ['/#method', 'Brazilian method', ''], ['/blog.html', 'Blog', 'blog'], ['/faq/', 'FAQ', 'faq']];
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${D}${canonical}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${D}/images/${image}">
<meta property="og:url" content="${D}${canonical}">
<meta property="og:type" content="${type}">
<meta name="geo.region" content="US-SC">
<link rel="icon" href="/images/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/style.css">
<link rel="stylesheet" href="/css/local.css">
${jsonld.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': jsonld })}</script>` : ''}
${ANALYTICS}
</head>
<body>
<div class="strip"><div class="wrap"><div><span>Call <a href="tel:${site.phone.replace(/-/g, '')}">${site.phoneDisplay}</a></span><span>Text <a href="sms:${site.sms}">${site.smsDisplay}</a></span></div><span>★★★★★ 5-star house cleaning in Greer and the Upstate</span></div></div>
<header><div class="wrap">
  <a class="brand" href="/" aria-label="Perfect Services house cleaning home"><img src="/images/logo.png" alt="Perfect Services cleaning company logo" width="150" height="70"></a>
  <nav class="main" aria-label="Main"><ul>${nav.map(([h, t, k]) => `<li><a href="${h}"${k && k === current ? ' aria-current="page"' : ''}>${t}</a></li>`).join('')}</ul></nav>
  <div class="header-cta"><a class="header-phone" href="tel:${site.phone.replace(/-/g, '')}">${site.phoneDisplay}</a><a class="btn btn-blue" href="/#estimate">Get free estimate</a></div>
</div></header>
<main>
${body}
</main>
<footer><div class="wrap">
  <div><img src="/images/logo.png" alt="Perfect Services" loading="lazy"><p>Brazilian-style house cleaning, maid service and commercial cleaning in Greer, South Carolina, and ${cities.length} surrounding communities.</p>
  <ul style="margin-top:16px"><li><a href="tel:${site.phone.replace(/-/g, '')}">${site.phoneDisplay}</a></li><li><a href="sms:${site.sms}">${site.smsDisplay} (text)</a></li><li><a href="mailto:${site.email}">${site.email}</a></li><li>${site.baseCity}, ${site.baseState} ${site.baseZip}</li></ul></div>
  ${footerServices()}
  <div class="f-guides"><h3>Areas we serve</h3><ul>${cities.slice(0, 12).map((c) => `<li><a href="${cityUrl(c)}">House cleaning ${esc(c.full)}</a></li>`).join('')}<li><a href="/areas/">All ${cities.length} areas</a></li></ul></div>
  <p class="copy">© ${TODAY.slice(0, 4)} Perfect Services. House cleaning in Greer, SC and the Upstate. <a href="${site.instagram}" target="_blank" rel="noopener">Instagram @perfectservices</a></p>
</div></footer>
<nav class="callbar" aria-label="Quick contact"><a href="tel:${site.phone.replace(/-/g, '')}">Call</a><a href="sms:${site.sms}">Text</a><a href="/#estimate">Free estimate</a></nav>
</body>
</html>
`;
}

// ---------- shared blocks ----------
const BUSINESS = { '@id': `${D}/#business` };
// ---------- strategic internal linking ----------
// Services that naturally go together (used for in-text links between money pages)
const PAIRS = {
  'house-cleaning': ['deep-cleaning', 'eco-friendly-green-cleaning', 'one-time-cleaning'],
  'deep-cleaning': ['house-cleaning', 'move-in-move-out-cleaning', 'brazilian-house-cleaning'],
  'move-in-move-out-cleaning': ['deep-cleaning', 'apartment-condo-cleaning', 'post-construction-cleaning'],
  'post-construction-cleaning': ['deep-cleaning', 'move-in-move-out-cleaning', 'commercial-office-cleaning'],
  'commercial-office-cleaning': ['post-construction-cleaning', 'eco-friendly-green-cleaning', 'deep-cleaning'],
  'brazilian-house-cleaning': ['deep-cleaning', 'house-cleaning', 'airbnb-vacation-rental-cleaning'],
  'airbnb-vacation-rental-cleaning': ['deep-cleaning', 'one-time-cleaning', 'apartment-condo-cleaning'],
  'apartment-condo-cleaning': ['move-in-move-out-cleaning', 'house-cleaning', 'eco-friendly-green-cleaning'],
  'one-time-cleaning': ['deep-cleaning', 'house-cleaning', 'airbnb-vacation-rental-cleaning'],
  'eco-friendly-green-cleaning': ['house-cleaning', 'deep-cleaning', 'apartment-condo-cleaning'],
};
const pairsOf = (svc) => (PAIRS[svc.slug] || []).map((s) => serviceBySlug[s]).filter(Boolean);
// Keyword anchor for a service, varied per page so anchors are not all identical
const anchorKw = (s, seed) => pick(s.keywords.slice(0, 4), seed);
function pairParagraph(city, svc, seed) {
  const [a, b, c] = pairsOf(svc);
  const L = (s, k) => `<a href="${cityServiceUrl(city, s)}">${esc(anchorKw(s, seed + k))} in ${esc(city.name)}</a>`;
  const n = esc(city.name), me = esc(svc.short.toLowerCase());
  return pick([
    `Many ${n} clients pair ${me} with ${L(a, 1)}. If you need a different kind of visit, we also offer ${L(b, 2)} and ${L(c, 3)}, all with the same checklist and the same local team.`,
    `${me.charAt(0).toUpperCase() + me.slice(1)} is not the only option in ${n}: homes that need extra attention often start with ${L(a, 1)}, while others book ${L(b, 2)} or ${L(c, 3)}. Not sure which fits? We will tell you at the free in-home estimate.`,
    `Planning more than one visit in ${n}? Combine ${me} with ${L(a, 1)}, or look at ${L(b, 2)} and ${L(c, 3)}. Each page lists what is included and what changes the price.`,
  ], seed);
}

// Phrases in article text that become links to the matching page (first mention only)
const GENERIC = new Set(['cleaning service near me', 'detailed house cleaning', 'Brazilian deep cleaning', 'house cleaning', 'residential cleaning']);
const svcPhrases = (s) => [...new Set([s.name, s.short, ...s.keywords])].filter((k) => !GENERIC.has(k));
function autoLink(html, { city, svc, max = 7 }) {
  const targets = [];
  const used = new Set([...String(html).matchAll(/href="([^"]+)"/g)].map((m) => m[1]));
  const add = (phrases, url) => { if (!used.has(url)) phrases.forEach((ph) => targets.push({ ph, url })); };
  // 1) services in the article's city (money pages), own service first
  const order = svc ? [svc, ...pairsOf(svc), ...services.filter((s) => s !== svc && !pairsOf(svc).includes(s))] : services;
  order.forEach((s) => add(svcPhrases(s), city ? cityServiceUrl(city, s) : serviceUrl(s)));
  // 2) other released cities mentioned in the text
  cities.filter((c) => !city || c.slug !== city.slug).forEach((c) => add([c.full, c.name], cityUrl(c)));
  targets.sort((x, y) => y.ph.length - x.ph.length);
  let count = 0; let blocked = 0;
  return String(html).split(/(<[^>]+>)/).map((tok) => {
    if (tok.startsWith('<')) {
      if (/^<(a|h[1-6]|summary|figcaption|button)\b/i.test(tok)) blocked++;
      else if (/^<\/(a|h[1-6]|summary|figcaption|button)>/i.test(tok)) blocked = Math.max(0, blocked - 1);
      return tok;
    }
    if (blocked || count >= max || !tok.trim()) return tok;
    let out = ''; let rest = tok;
    while (count < max) {
      let best = null;
      for (const t of targets) {
        if (used.has(t.url)) continue;
        const re = new RegExp(`(^|[^\\w-])(${t.ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![\\w-])`, 'i');
        const m = re.exec(rest);
        if (m) { const i = m.index + m[1].length; if (!best || i < best.i) best = { i, len: m[2].length, text: m[2], url: t.url }; }
      }
      if (!best) break;
      used.add(best.url); count++;
      out += `${rest.slice(0, best.i)}<a href="${best.url}">${best.text}</a>`;
      rest = rest.slice(best.i + best.len);
    }
    return out + rest;
  }).join('');
}

const faqMore = (slug) => `<p class="faq-more"><a href="/faq/${slug && serviceBySlug[slug] ? `#${slug}` : ''}">More answers in our house cleaning FAQ${slug && serviceBySlug[slug] ? `: ${esc(serviceBySlug[slug].short.toLowerCase())}` : ''} &rarr;</a></p>`;
const crumbs = (items) => `<nav class="crumbs" aria-label="Breadcrumb">${items.map(([t, h], i) => (h && i < items.length - 1 ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`)).join('<span>/</span>')}</nav>`;
const crumbsLD = (items) => ({ '@type': 'BreadcrumbList', itemListElement: items.map(([t, h], i) => ({ '@type': 'ListItem', position: i + 1, name: t, ...(h ? { item: `${D}${h}` } : {}) })) });
const faqLD = (faqs) => ({ '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: plain(q), acceptedAnswer: { '@type': 'Answer', text: plain(a) } })) });
const faqHTML = (faqs, heading = 'Frequently asked questions') => `<section class="post-faq" id="faq"><h2>${esc(heading)}</h2>${faqs.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${a}</p></details>`).join('')}</section>`;

function cta(city) {
  const where = city ? ` in ${esc(city.full)}` : '';
  return `<div class="inline-cta"><div><h2>Get a free estimate${where}</h2><p>Brazilian-style cleaning from a local Greer team. We visit, see the space and give you an exact price, with no commitment.</p></div><div class="ic-actions"><a class="btn btn-white" href="/#estimate">Get my free estimate</a><a class="btn btn-ghost" href="tel:${site.phone.replace(/-/g, '')}">${PHONE_SVG} Call ${site.phoneDisplay}</a></div></div>`;
}
function gallery(images, svc, city, seed) {
  return `<div class="pics">${images.map((img, i) => {
    const label = IMAGE_LABELS[img] || 'Clean home';
    const kw = svc ? pick(svc.keywords, seed + i) : 'house cleaning';
    const place = city ? city.full : 'Greer, SC';
    return `<figure><img src="/images/${img}" alt="${esc(`${label} after ${svc ? svc.short.toLowerCase() : 'house cleaning'} by Perfect Services, ${kw} ${place}`)}" loading="lazy" width="600" height="600"><figcaption><strong>${esc(label)}</strong>Perfect Services ${esc(svc ? svc.short.toLowerCase() : 'cleaning')} · serving ${esc(place)}</figcaption></figure>`;
  }).join('')}</div>`;
}
function postCard(p) {
  return `<a class="post-card" href="${postUrl(p)}" data-cat="${esc(p.category)}">
<div class="pc-img"><img src="/images/${p.image}" alt="${esc(p.title)}" loading="lazy"><span class="pc-cat">${esc(p.category)}</span></div>
<div class="pc-body"><h3>${esc(p.title)}</h3><p>${esc(p.description)}</p><span class="pc-meta">${esc(p.readTime || '4 min read')}</span></div></a>`;
}
function relatedPosts({ city, svc, exclude, n = 3 }) {
  const score = (p) => (city && p.city === city.slug ? 2 : 0) + (svc && p.service === svc.slug ? 3 : 0);
  return posts.filter((p) => p.slug !== exclude).map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || (a.p.date < b.p.date ? 1 : -1)).slice(0, n).map((x) => x.p);
}
const svcCard = (s, href, city) => `<a class="card" href="${href}"><img src="/images/${s.images[0]}" alt="${esc(`${s.name}${city ? ` in ${city.full}` : ''} by Perfect Services`)}" loading="lazy"><div><h3>${esc(s.name)}${city ? ` in ${esc(city.name)}` : ''}</h3><p>${esc(s.summary)}</p><span>See ${esc(s.short.toLowerCase())}${city ? ` in ${esc(city.name)}` : ''} →</span></div></a>`;
const cityLinks = (arr, hrefFn, labelFn) => `<ul class="links">${arr.map((c) => `<li><a href="${hrefFn(c)}">${labelFn(c)}<small>${c.isBase ? 'Our home base' : `${c.distRound} mi from Greer · ${esc(c.county)}`}</small></a></li>`).join('')}</ul>`;

function cityFacts(city) {
  return `<dl><dt>County</dt><dd>${esc(city.county)}</dd><dt>ZIP codes</dt><dd>${esc(city.zips.join(', '))}</dd><dt>Main roads</dt><dd>${esc(city.roads.join(', '))}</dd><dt>From Greer</dt><dd>${city.isBase ? 'Our home base' : `About ${city.distRound} miles ${city.dir}, roughly ${city.drive} minutes`}</dd></dl>`;
}
function localParagraph(city, svc, seed) {
  const s = svc ? svc.short.toLowerCase() : 'house cleaning';
  if (city.isBase) {
    return `Greer is ${city.note}. Perfect Services is based right here in Greer (ZIP ${list(city.zips)}), so our team is usually minutes away from your home, whether you are near ${list(city.roads.slice(0, 2))} or anywhere in ${city.county}.`;
  }
  const v = [
    `${city.name} is ${city.note}. Our Greer-based team is about ${city.distRound} miles away, roughly ${city.drive} minutes via ${city.roads[0]}, and we schedule ${s} visits across ${city.county}, including ZIP code${city.zips.length > 1 ? 's' : ''} ${list(city.zips)}.`,
    `We drive to ${city.full} from our base in Greer, about ${city.distRound} miles to the ${city.dir}. ${city.name} is ${city.note}, and every home we clean there gets the same ${s} checklist and Brazilian attention to detail as our clients next door in Greer.`,
    `Homes in ${city.name} (${list(city.zips)}) are part of our regular service area in ${city.county}. ${cap(city.name)} is ${city.note}. Perfect Services reaches ${city.name} in roughly ${city.drive} minutes from Greer, so booking ${s} here is as easy as anywhere in the Upstate.`,
  ];
  return pick(v, seed);
}
function cityFaqs(city, svc) {
  const s = svc ? svc.short.toLowerCase() : 'house cleaning';
  const near = nearby(city, 4).map((c) => c.name);
  return [
    [`Do you offer ${s} in ${city.full}?`, `Yes. Perfect Services provides ${s} in ${city.name} and across ${city.county}, including ZIP code${city.zips.length > 1 ? 's' : ''} ${list(city.zips)}.`],
    [`How far is ${city.name} from your team?`, city.isBase ? 'Greer is our home base, so we are usually just minutes away.' : `${city.name} is about ${city.distRound} miles ${city.dir} of our base in Greer, roughly ${city.drive} minutes away. We schedule visits there every week.`],
    [`Do you also clean near ${city.name}?`, `Yes. We also serve ${list(near)} and the rest of the Upstate. <a href="/areas/">See all areas we serve</a>.`],
    [`How do I get a cleaning price in ${city.name}?`, `Book a free in-home estimate: fill out our <a href="/#estimate">estimate form</a>, call ${site.phoneDisplay} or text ${site.smsDisplay}. We visit your home in ${city.name}, see the space and give you an exact price, with no commitment.`],
  ];
}

// ---------- service hub pages ----------
function buildServices() {
  const items = [['Home', '/'], ['Services', null]];
  write('services/index.html', layout({
    title: 'House Cleaning Services in Greer & the Upstate SC | Perfect Services',
    description: `All Perfect Services cleaning services: ${services.map((s) => s.short.toLowerCase()).join(', ')}. Serving Greer and ${cities.length - 1} nearby communities.`,
    canonical: '/services/', current: 'services', jsonld: [crumbsLD(items)],
    body: `<section class="page-hero"><div class="wrap">${crumbs(items)}<span class="tag">Every clean starts with the details</span><h1>House cleaning services in Greer and the Upstate</h1><p class="sub">From weekly maid service to post-construction cleanup, every service follows the same room-by-room checklist and the Brazilian detail-first method.</p></div></section>
<section class="lp"><div class="wrap"><div class="cards">${services.map((s) => svcCard(s, serviceUrl(s))).join('')}</div></div></section>
<section class="lp alt"><div class="wrap"><h2>Find your city</h2>${cityLinks(cities, cityUrl, (c) => `House cleaning ${esc(c.full)}`)}</div></section>
<section class="lp"><div class="wrap">${cta()}</div></section>`,
  }), { priority: 0.8 });

  services.forEach((svc, si) => {
    const seed = hash(svc.slug);
    const items2 = [['Home', '/'], ['Services', '/services/'], [svc.name, null]];
    const faqs = svc.faqs.map(([q, a]) => [fill(q), fill(a)]);
    const rel = relatedPosts({ svc });
    write(`services/${svc.slug}/index.html`, layout({
      title: `${svc.name} in Greer, SC & the Upstate | Perfect Services`,
      description: trim(`${svc.summary} Serving Greer and ${cities.length - 1} nearby cities. Free estimate: ${site.phoneDisplay}.`, 158),
      canonical: serviceUrl(svc), image: svc.images[0], current: 'services',
      jsonld: [{ '@type': 'Service', name: svc.name, serviceType: svc.name, description: svc.summary, provider: BUSINESS, areaServed: cities.map((c) => ({ '@type': 'City', name: c.full })), url: `${D}${serviceUrl(svc)}` }, crumbsLD(items2), faqLD(faqs)],
      body: `<section class="page-hero"><div class="wrap">${crumbs(items2)}<span class="tag">${esc(svc.category)}</span><h1>${esc(svc.name)} in Greer and the Upstate</h1><p class="sub">${esc(svc.summary)}</p><div class="hero-actions"><a class="btn btn-white" href="/#estimate">Get my free estimate</a><a class="btn btn-ghost" href="tel:${site.phone.replace(/-/g, '')}">${PHONE_SVG} ${site.phoneDisplay}</a></div></div></section>
<section class="lp"><div class="wrap cols"><div class="prose">${svc.intro.map((p) => `<p>${esc(p)}</p>`).join('')}<h2>What's included</h2><ul class="chk">${svc.includes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><h2>Who it's for</h2><ul>${svc.idealFor.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>
<aside class="side-facts"><h3>${esc(svc.name)} at a glance</h3><dl><dt>Service area</dt><dd>Greer + ${cities.length - 1} nearby cities</dd><dt>Estimate</dt><dd>Free, in your home</dd><dt>Method</dt><dd>Brazilian detail-first</dd><dt>Supplies</dt><dd>We bring everything</dd></dl><a class="btn btn-blue" href="/#estimate">Get my free estimate</a></aside></div></section>
<section class="lp alt"><div class="wrap"><h2>Real homes, real results</h2>${gallery(rotate(svc.images, seed, 4), svc, null, seed)}</div></section>
<section class="lp"><div class="wrap prose"><h2>What affects the price</h2><div class="table-wrap"><table><thead><tr><th>Factor</th><th>Why it matters</th></tr></thead><tbody>${svc.priceFactors.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>${faqHTML(faqs)}${faqMore(svc.slug)}</div></section>
<section class="lp alt"><div class="wrap"><h2>${esc(svc.name)} by city</h2>${cityLinks(cities, (c) => cityServiceUrl(c, svc), (c) => `${esc(svc.short)} ${esc(c.full)}`)}</div></section>
<section class="related"><div class="wrap"><h2>${esc(svc.short)} guides</h2><div class="post-grid">${rel.map(postCard).join('')}</div></div></section>
<section class="lp"><div class="wrap">${cta()}</div></section>`,
    }), { priority: 0.8 });
  });
}

// ---------- areas ----------
function buildAreas() {
  const items = [['Home', '/'], ['Areas we serve', null]];
  const groups = [[0, 10], [10, 15], [15, 20], [20, 25], [25, 31]];
  write('areas/index.html', layout({
    title: `Areas We Serve: House Cleaning Within 30 Miles of Greer, SC | Perfect Services`,
    description: `Perfect Services cleans homes and businesses in ${cities.length} communities within 30 miles of Greer, SC, including ${cities.slice(1, 6).map((c) => c.name).join(', ')} and more.`,
    canonical: '/areas/', current: 'areas', jsonld: [crumbsLD(items)],
    body: `<section class="page-hero"><div class="wrap">${crumbs(items)}<span class="tag">Within 30 miles of Greer</span><h1>House cleaning in ${cities.length} Upstate communities</h1><p class="sub">Based in Greer, SC, Perfect Services cleans homes and businesses across Greenville, Spartanburg, Pickens, Anderson and Laurens counties${site.includeNorthCarolina ? ', plus nearby Polk and Henderson counties in North Carolina' : ''}.</p></div></section>
<section class="lp"><div class="wrap">${groups.map(([a, b]) => {
      const g = cities.filter((c) => c.dist >= a && c.dist < b);
      return g.length ? `<div class="dist-group"><h2>${a === 0 ? 'Within 10 miles' : `${a}–${b - 1} miles`} of Greer</h2>${cityLinks(g, cityUrl, (c) => `House cleaning ${esc(c.full)}`)}</div>` : '';
    }).join('')}</div></section>
<section class="lp alt"><div class="wrap">${cta()}</div></section>`,
  }), { priority: 0.8 });

  cities.forEach((city) => {
    const seed = hash(city.slug);
    const items2 = [['Home', '/'], ['Areas', '/areas/'], [city.full, null]];
    const faqs = shuffle([...cityFaqs(city, null), ...services.slice(0, 3).map((s) => [fill(s.faqs[0][0], city), fill(s.faqs[0][1], city)])], seed);
    const rel = relatedPosts({ city });
    const imgs = shuffle(services.flatMap((s) => s.images.slice(0, 2)).filter((v, i, a) => a.indexOf(v) === i), seed).slice(0, 4);
    write(`areas/${city.slug}/index.html`, layout({
      title: `House Cleaning ${city.full} | Maid Service & Deep Cleaning | Perfect Services`,
      description: trim(`Brazilian-style house cleaning in ${city.full}: maid service, deep cleaning, move-out, Airbnb, post-construction and office cleaning. Free estimate: ${site.phoneDisplay}.`, 158),
      canonical: cityUrl(city), image: imgs[0], current: 'areas',
      jsonld: [{ '@type': 'Service', name: `House cleaning in ${city.full}`, serviceType: 'House cleaning', provider: BUSINESS, areaServed: { '@type': 'City', name: city.full }, url: `${D}${cityUrl(city)}` }, crumbsLD(items2), faqLD(faqs)],
      body: `<section class="page-hero"><div class="wrap">${crumbs(items2)}<span class="tag">${city.isBase ? 'Our home base' : `${city.distRound} miles from Greer`}</span><h1>House cleaning in ${esc(city.full)}</h1><p class="sub">Brazilian-style house cleaning, maid service and commercial cleaning for homes and businesses in ${esc(city.name)}. Every corner, every visit.</p><ul class="facts"><li>${esc(city.county)}</li><li>ZIP ${esc(city.zips.join(', '))}</li><li>Free in-home estimate</li></ul><div class="hero-actions"><a class="btn btn-white" href="/#estimate">Get my free estimate</a></div></div></section>
<section class="lp"><div class="wrap cols"><div class="prose"><p>${esc(localParagraph(city, null, seed))}</p><p>${esc(pick(services[0].intro, seed))}</p><h2>Cleaning services in ${esc(city.name)}</h2><p>Choose the service that fits your home or business. Each one has its own checklist, price factors and answers for ${esc(city.name)} clients.</p></div>
<aside class="side-facts"><h3>${esc(city.full)} service area</h3>${cityFacts(city)}<div class="map-box"><iframe title="Map of ${esc(city.full)}" loading="lazy" src="https://maps.google.com/maps?q=${encodeURIComponent(city.full)}&z=12&output=embed"></iframe></div><a class="btn btn-blue" href="/#estimate">Check my price</a></aside></div>
<div class="wrap"><div class="cards">${services.map((s) => svcCard(s, cityServiceUrl(city, s), city)).join('')}</div></div></section>
<section class="lp alt"><div class="wrap"><h2>Homes we clean around ${esc(city.name)}</h2>${gallery(imgs, null, city, seed)}</div></section>
<section class="lp"><div class="wrap prose">${faqHTML(faqs, `House cleaning FAQ: ${city.full}`)}${faqMore()}</div></section>
<section class="lp alt"><div class="wrap"><h2>Nearby areas we serve</h2>${cityLinks(nearby(city, 9), cityUrl, (c) => `House cleaning ${esc(c.full)}`)}</div></section>
<section class="related"><div class="wrap"><h2>Cleaning guides for ${esc(city.name)}</h2><div class="post-grid">${rel.map(postCard).join('')}</div><p style="margin-top:24px"><a class="blue-link" href="${cityBlogUrl(city)}">See the ${esc(city.name)} cleaning blog →</a></p></div></section>
<section class="lp"><div class="wrap">${cta(city)}</div></section>`,
    }), { priority: city.dist < 15 ? 0.8 : 0.7 });

    services.forEach((svc) => buildCityService(city, svc));
  });
}

// ---------- search-intent content (from Google search suggestions for the Upstate, Nov 2026) ----------
// What people around Greer type: "house cleaning services <city> sc", "how much does house cleaning cost",
// "house cleaners near me prices", "how long does it take a cleaner to clean a house", "maid service today",
// "is deep cleaning worth it", "what is move out cleaning", "what does post construction cleaning include".
const REVIEWS = [
  { who: 'Douglas Meireles', text: 'I highly recommend Regiane’s work. She is an excellent professional, very dedicated and meticulous. She performs her cleaning tasks with great care and attention to detail.' },
  { who: 'Julie Purkhiser', text: 'Regiani is an exceptional cleaner. Reliable, consistent, and always does a fantastic job. Highly recommend her!' },
  { who: 'Kissilla Sanders', text: 'She pays attention to every little detail, and truly cares about making everything look perfect. My house always felt so clean, fresh, and organized after she finished.' },
];
const SERVICE_DEF = {
  'deep-cleaning': ['Is a deep cleaning worth it?', 'For most homes, yes, at least once or twice a year and before starting recurring service. A deep cleaning removes the build-up on baseboards, grout, cabinet fronts, vents and appliances that regular visits only maintain, so every visit after it is faster and the home stays cleaner longer.'],
  'move-in-move-out-cleaning': ['What is move-out cleaning?', 'A move-out cleaning is a top-to-bottom clean of an empty home: inside cabinets, closets and drawers, inside the fridge and oven, bathrooms, floors, baseboards and switches. It is done so the home is ready for the final walkthrough, the deposit and the next family.'],
  'post-construction-cleaning': ['What does post-construction cleaning include?', 'Removing the fine dust that settles everywhere after a build or remodel: on ledges, inside cabinets and drawers, on vents, fixtures, windows sills and floors, plus sticker and residue removal, so the space is ready to live or work in.'],
  'airbnb-vacation-rental-cleaning': ['How fast can you turn over an Airbnb?', 'We plan turnovers around your check-out and check-in times. Send us your calendar and the size of the unit, and we confirm a turnover window and a checklist that matches your listing.'],
  'commercial-office-cleaning': ['Can you clean our office after hours?', 'Yes. Most offices prefer cleaning before opening or after closing, so the work never gets in the way of your team or customers. Tell us your hours and we build the schedule around them.'],
};
function intentBlocks(city, svc, seed) {
  const s = svc.short.toLowerCase();
  const n = esc(city.name);
  const nearMe = pick([`house cleaners near me`, `a cleaning service near me`, `${s} near me`], seed);
  const keywordLine = pick([
    `Searching for <strong>${esc(s)} in ${n}, ${city.st}</strong>, house cleaning services nearby or ${esc(nearMe)}? Here is exactly how pricing, timing and booking work with Perfect Services in ${n}.`,
    `If you typed "${esc(nearMe)}" from ${n}, this page answers the three questions people ask before they book: how much it costs, how long it takes and how soon we can come.`,
    `Most ${n} homeowners who look for ${esc(s)} want to know the price, the time it takes and the next opening. Here are straight answers for ${n}, ${city.st}.`,
  ], seed);
  return `<p>${keywordLine}</p>
<h2>How much does ${esc(s)} cost in ${n}?</h2>
<p>The price of ${esc(s)} in ${n} depends on the size of the home, the number of bedrooms and bathrooms, how long since the last professional clean and any extras you add. We never quote a blind number over the phone: every home is different, so we give you an exact price after a <strong>free in-home estimate</strong>, with no commitment.</p>
<p><strong>How to get your exact price:</strong> use the short form below, call ${site.phoneDisplay} or text ${site.smsDisplay}. We schedule a quick visit to your ${n} home, look at the rooms and the condition, and tell you the price before any work starts. If you want ongoing help, ask about a recurring schedule (weekly, every two weeks or monthly) during the visit.</p>
<h2>How long does ${esc(s)} take?</h2>
<p>It depends on the same factors as the price. A recurring visit in a maintained home is the quickest, while a first-time ${esc(s)} or a home that has not been cleaned in a while takes longer. When we send your price, we also tell you how long the team expects to be at your ${n} home, so you can plan your day.</p>
<h2>Need ${esc(s)} this week in ${n}?</h2>
<p>Our team is based in Greer${city.isBase ? '' : `, about ${city.drive} minutes from ${n}`}. Text or call to schedule your free in-home estimate, and we tell you the next available cleaning date for your ${city.zips[0]} address.</p>`;
}
function bookingBlock(city, svc, seed) {
  const opts = services.map((x) => `<option${x.slug === svc.slug ? ' selected' : ''}>${esc(x.name)}</option>`).join('');
  const revs = rotate(REVIEWS, seed, 2);
  return `<section class="lp alt" id="book"><div class="wrap cols"><div class="prose">
<h2>Book ${esc(svc.short.toLowerCase())} in ${esc(city.name)} in 3 steps</h2>
<ol class="steps"><li><span><strong>Request your free estimate.</strong> Use the form, call ${site.phoneDisplay} or text ${site.smsDisplay}.</span></li><li><span><strong>We visit your home.</strong> A quick walkthrough to see the space, then an exact price, with no commitment.</span></li><li><span><strong>Pick your cleaning day.</strong> We confirm the date and time that work for you.</span></li></ol>
<h2 style="margin-top:32px">What clients say</h2>
${revs.map((r) => `<blockquote class="rv-q"><p>“${esc(r.text)}”</p><cite>${esc(r.who)} · ★★★★★ Google review</cite></blockquote>`).join('')}
</div>
${formTag('quote quote-local', 'estimate-local')}
<input type="hidden" name="form-name" value="estimate-local"><input type="hidden" name="page" value="${esc(svc.name)} – ${esc(city.full)}">
<p class="hidden"><label>Leave this empty <input name="company"></label></p>
<h3>Get your ${esc(city.name)} price</h3><p>Takes about one minute. No commitment.</p>
<div class="field"><label for="q-name">Name</label><input id="q-name" name="name" autocomplete="name" required></div>
<div class="field"><label for="q-phone">Phone</label><input id="q-phone" name="phone" type="tel" autocomplete="tel" required></div>
<div class="field"><label for="q-zip">ZIP code</label><input id="q-zip" name="zip" inputmode="numeric" autocomplete="postal-code" value="${esc(city.zips[0])}" required></div>
<div class="field"><label for="q-service">Type of cleaning</label><select id="q-service" name="service">${opts}</select></div>
<div class="field"><label for="q-msg">Bedrooms, bathrooms, best day (optional)</label><textarea id="q-msg" name="message" rows="3"></textarea></div>
<label class="consent"><input type="checkbox" name="consent" required>I agree that Perfect Services may call or text me about this estimate. Message and data rates may apply. Reply STOP to opt out.</label>
<button class="btn btn-blue" type="submit">Get my free estimate</button>
<p class="after">We call or text you to schedule your free in-home estimate.</p>
</form></div></section>`;
}

function buildCityService(city, svc) {
  const seed = hash(`${city.slug}|${svc.slug}`);
  const kw = rotate(svc.keywords, seed);
  const items = [['Home', '/'], ['Areas', '/areas/'], [city.full, cityUrl(city)], [svc.name, null]];
  const sLow = svc.short.toLowerCase();
  const intentFaqs = [
    [`How much does ${sLow} cost in ${city.name}?`, `It depends on the size of your home, the number of bedrooms and bathrooms, and how long since the last professional clean. We give you an exact price after a free in-home estimate: request it with the form on this page, call ${site.phoneDisplay} or text ${site.smsDisplay}. No commitment.`],
    [`How long does ${sLow} take?`, `A maintained home takes less time than a first-time or overdue clean. With your price, we also tell you how long the team expects to be at your ${city.name} home.`],
    [`Can I book ${sLow} this week in ${city.name}?`, `Often, yes. Text or call ${site.phoneDisplay} and we tell you the next available opening for your ${city.zips[0]} address.`],
    ...(SERVICE_DEF[svc.slug] ? [SERVICE_DEF[svc.slug]] : []),
  ];
  const faqs = [...intentFaqs.slice(0, 2), ...shuffle([...svc.faqs.map(([q, a]) => [fill(q, city), fill(a, city)]), ...cityFaqs(city, svc).slice(0, 3), ...intentFaqs.slice(2)], seed)];
  const rel = relatedPosts({ city, svc });
  const imgs = rotate(svc.images, seed, 4);
  const h1 = pick([`${svc.name} in ${city.full}`, `${titleCase(svc.keywords[0])} in ${city.full}`, `${svc.name} for ${city.name} homes`], seed);
  const audience = pick(['homeowners', 'families', 'clients', 'residents'], seed);
  const others = services.filter((s) => s.slug !== svc.slug);
  const titleKw = titleCase(svc.keywords[0]);
  write(`areas/${city.slug}/${svc.slug}/index.html`, layout({
    title: trim(`${titleKw} ${city.full} | ${pick(['Free Estimate', 'Brazilian Detail', 'Local Greer Team', '5-Star Service'], seed)} | Perfect Services`, 70),
    description: trim(`${svc.name} in ${city.full} (${city.zips[0]}): ${svc.summary.charAt(0).toLowerCase()}${svc.summary.slice(1)} Free estimate: ${site.phoneDisplay}.`, 158),
    canonical: cityServiceUrl(city, svc), image: imgs[0], current: 'areas',
    jsonld: [{ '@type': 'Service', name: `${svc.name} in ${city.full}`, serviceType: svc.name, description: svc.summary, provider: BUSINESS, areaServed: { '@type': 'City', name: city.full }, url: `${D}${cityServiceUrl(city, svc)}` }, crumbsLD(items), faqLD(faqs)],
    body: `<section class="page-hero"><div class="wrap">${crumbs(items)}<span class="tag">${esc(svc.category)} · ${esc(city.name)}</span><h1>${esc(h1)}</h1><p class="sub">${esc(svc.summary)} Serving ${esc(city.name)} and ${esc(city.county)} from our base in Greer.</p><ul class="facts"><li>ZIP ${esc(city.zips.join(', '))}</li><li>${city.isBase ? 'Local Greer team' : `${city.distRound} mi from Greer`}</li><li>Free in-home estimate</li></ul><div class="hero-actions"><a class="btn btn-white" href="#book">Get my free estimate</a><a class="btn btn-ghost" href="tel:${site.phone.replace(/-/g, '')}">${PHONE_SVG} ${site.phoneDisplay}</a></div></div></section>
<section class="lp"><div class="wrap cols"><div class="prose">
<p>${esc(pick(svc.intro, seed))}</p>
<p>${esc(localParagraph(city, svc, seed >> 3))}</p>
<p>Whether you search for ${esc(kw[1])}, ${esc(kw[2])} or ${esc(kw[3])} in ${esc(city.name)}, you get the same thing from Perfect Services: a written checklist, a local team and an exact price after a free in-home estimate.</p>
<p>${pairParagraph(city, svc, seed)}</p>
<h2>What our ${esc(svc.short.toLowerCase())} in ${esc(city.name)} includes</h2><ul class="chk">${shuffle(svc.includes, seed).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<h2>Why ${esc(city.name)} ${audience} choose Perfect Services</h2><ul>
<li><strong>Brazilian detail-first method.</strong> Every surface is hand-wiped, including the edges, corners and baseboards a rushed clean skips.</li>
<li><strong>${city.isBase ? 'Based right here in Greer.' : `A local team ${city.distRound} miles away.`}</strong> ${city.isBase ? 'We are your neighbors, not a call center.' : `We drive to ${esc(city.name)} from Greer every week, roughly ${city.drive} minutes away.`}</li>
<li><strong>Free in-home estimate.</strong> We visit, see the space and give you an exact price before any work starts, with no commitment.</li>
<li><strong>Built for ${esc(svc.idealFor[seed % svc.idealFor.length].charAt(0).toLowerCase() + svc.idealFor[seed % svc.idealFor.length].slice(1))}.</strong> ${esc(svc.name)} is planned around how you actually use your space.</li>
</ul></div>
<aside class="side-facts"><h3>${esc(svc.short)} in ${esc(city.full)}</h3>${cityFacts(city)}<a class="btn btn-blue" href="#book">Get my ${esc(city.name)} price</a><a class="side-phone" style="color:var(--blue)" href="tel:${site.phone.replace(/-/g, '')}">or call ${site.phoneDisplay}</a></aside></div></section>
<section class="lp alt"><div class="wrap"><h2>${esc(svc.short)} results from our team</h2>${gallery(imgs, svc, city, seed)}</div></section>
<section class="lp"><div class="wrap prose">${intentBlocks(city, svc, seed)}
<h3>What changes the price of ${esc(sLow)} in ${esc(city.name)}</h3>
<div class="table-wrap"><table><thead><tr><th>Factor</th><th>Why it matters</th></tr></thead><tbody>${svc.priceFactors.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table></div>
<h2>Who books ${esc(sLow)} in ${esc(city.name)}</h2><ul>${svc.idealFor.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</div></section>
${bookingBlock(city, svc, seed)}
<section class="lp"><div class="wrap prose">
${faqHTML(faqs, `${svc.short} FAQ: ${city.full}`)}${faqMore(svc.slug)}</div></section>
<section class="lp alt"><div class="wrap"><h2>More cleaning services in ${esc(city.name)}</h2><ul class="links">${others.map((s) => `<li><a href="${cityServiceUrl(city, s)}">${esc(s.name)}<small>${esc(city.full)}</small></a></li>`).join('')}<li><a href="${cityUrl(city)}">All services in ${esc(city.name)}<small>${esc(city.county)}</small></a></li></ul>
<h2 style="margin-top:48px">${esc(svc.short)} near ${esc(city.name)}</h2>${cityLinks(nearby(city, 6), (c) => cityServiceUrl(c, svc), (c) => `${esc(svc.short)} ${esc(c.full)}`)}</div></section>
<section class="related"><div class="wrap"><h2>${esc(svc.short)} guides for ${esc(city.name)}</h2><div class="post-grid">${rel.map(postCard).join('')}</div><p style="margin-top:24px"><a class="blue-link" href="${cityBlogUrl(city)}">More from the ${esc(city.name)} cleaning blog →</a></p></div></section>`,
  }), { priority: city.dist < 15 ? 0.7 : 0.6 });
}

// ---------- blog ----------
function buildPosts() {
  posts.filter((p) => !p.legacy).forEach((p) => {
    const city = cityBySlug[p.city];
    const svc = serviceBySlug[p.service];
    const ids = [];
    const html = autoLink(String(p.html), { city, svc }).replace(/<h2(\s[^>]*)?>(.*?)<\/h2>/g, (m, attrs = '', inner) => {
      const idm = /id="([^"]+)"/.exec(attrs);
      const id = idm ? idm[1] : slugify(plain(inner)).slice(0, 50);
      ids.push([id, plain(inner)]);
      return idm ? m : `<h2 id="${id}"${attrs}>${inner}</h2>`;
    });
    const items = [['Home', '/'], ['Blog', '/blog.html'], ...(city ? [[city.full, cityBlogUrl(city)]] : []), [p.title, null]];
    const faqs = p.faqs || [];
    const rel = relatedPosts({ city, svc, exclude: p.slug });
    const words = plain(p.html).split(/\s+/).length;
    write(`blog/${p.slug}.html`, layout({
      title: trim(`${p.title} | Perfect Services`, 70), description: p.description, canonical: postUrl(p), image: p.image, current: 'blog', type: 'article',
      jsonld: [{ '@type': 'BlogPosting', headline: p.title, description: p.description, image: `${D}/images/${p.image}`, datePublished: p.date, dateModified: p.updated || p.date, author: { '@type': 'Organization', name: 'Perfect Services' }, publisher: BUSINESS, keywords: p.keywords || '', articleSection: p.category, wordCount: words, mainEntityOfPage: `${D}${postUrl(p)}`, ...(city ? { about: { '@type': 'City', name: city.full } } : {}) }, crumbsLD(items), ...(faqs.length ? [faqLD(faqs)] : [])],
      body: `<div class="post-head"><div class="wrap">${crumbs(items)}<span class="tag">${esc(p.category)}${city ? ` · ${esc(city.name)}` : ''}</span><h1>${esc(p.h1 || p.title)}</h1><p class="post-dek">${esc(p.description)}</p><div class="post-meta"><img src="/images/logo.png" alt=""><span><strong>Perfect Services Team</strong><br><time datetime="${p.date}">${new Date(`${p.date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time> · ${esc(p.readTime)}</span></div></div></div>
<div class="wrap post-cover"><img src="/images/${p.image}" alt="${esc(`${IMAGE_LABELS[p.image] || 'Clean home'}, ${p.keywords || p.title} - Perfect Services`)}"></div>
<div class="wrap post-layout"><article class="prose">
${p.takeaways && p.takeaways.length ? `<div class="takeaways"><h2>Key takeaways</h2><ul>${p.takeaways.map((t) => `<li>${t}</li>`).join('')}</ul></div>` : ''}
${html}
${cta(city)}
${faqs.length ? faqHTML(faqs) : ''}${faqMore(p.service)}
</article>
<aside class="post-side">${ids.length ? `<div class="side-box toc"><h3>In this article</h3><ol>${ids.map(([id, t]) => `<li><a href="#${id}">${esc(t)}</a></li>`).join('')}${faqs.length ? '<li><a href="#faq">FAQ</a></li>' : ''}</ol></div>` : ''}
${city && svc ? `<div class="side-box"><h3>${esc(svc.short)} in ${esc(city.name)}</h3><p style="font-size:.93rem;color:var(--muted);margin-bottom:12px">${esc(svc.summary)}</p><a class="blue-link" href="${cityServiceUrl(city, svc)}">See ${esc(svc.short.toLowerCase())} in ${esc(city.name)} →</a></div>` : ''}
<div class="side-box side-cta"><h3>Need it done for you?</h3><p>Get a free cleaning estimate${city ? ` in ${esc(city.full)}` : ''}. Takes 1 minute.</p><a class="btn btn-blue" href="/#estimate">Get my free estimate</a><a class="side-phone" href="tel:${site.phone.replace(/-/g, '')}">or call ${site.phoneDisplay}</a></div></aside></div>
<section class="related"><div class="wrap"><h2>Keep reading</h2><div class="post-grid">${rel.map(postCard).join('')}</div></div></section>`,
    }), { priority: 0.6, lastmod: p.updated || p.date });
  });
  // legacy posts are already HTML; add them to the sitemap
  posts.filter((p) => p.legacy).forEach((p) => urls.push({ loc: `${D}/blog/${p.slug}.html`, priority: 0.6, lastmod: p.date }));
}

function buildBlogIndex() {
  const cats = [...new Set(posts.map((p) => p.category))];
  const [feat, ...rest] = posts;
  write('blog.html', layout({
    title: 'House Cleaning Tips & Guides for Greer and the Upstate SC | Perfect Services Blog',
    description: 'Expert house cleaning guides for Greer and the Upstate: prices, deep cleaning, move-out checklists, maid service, Airbnb, post-construction and commercial cleaning.',
    canonical: '/blog.html', current: 'blog',
    jsonld: [{ '@type': 'Blog', name: 'Perfect Services Cleaning Blog', url: `${D}/blog.html`, publisher: BUSINESS, blogPost: posts.slice(0, 50).map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${D}${postUrl(p)}`, datePublished: p.date })) }],
    body: `<section class="blog-hero"><div class="wrap bh-grid">
<div><span class="tag">Perfect Services blog</span><h1>House cleaning guides for Upstate SC homes</h1><p>Checklists, prices and honest advice from a Brazilian cleaning team in Greer, written for homeowners, renters, hosts and small businesses in ${cities.length} Upstate communities.</p><div class="hero-actions"><a class="btn btn-white" href="/#estimate">Get my free estimate</a><a class="btn btn-ghost" href="/faq/">Read the FAQ</a></div></div>
<div class="bh-stats"><div><b>${posts.length}</b><span>cleaning guides</span></div><div><b>${cities.length}</b><span>city blogs</span></div>${site.googleBusinessProfile ? `<a href="${site.googleBusinessProfile}" target="_blank" rel="noopener" style="text-decoration:none;color:#fff"><div><b>★★★★★</b><span>Google reviews</span></div></a>` : '<div><b>Same day</b><span>free estimates</span></div>'}</div>
</div></section>
<section class="blog-list"><div class="wrap">
<div class="featured">${postCard(feat).replace('class="post-card"', 'class="post-card big"')}</div>
<div class="chips" role="group" aria-label="Filter by topic"><button class="chip" aria-pressed="true" data-f="all">All guides</button>${cats.map((c) => `<button class="chip" aria-pressed="false" data-f="${esc(c)}">${esc(c)}</button>`).join('')}</div>
<div class="post-grid" id="grid">${[feat, ...rest].map(postCard).join('')}</div>
<div style="margin-top:64px"><h2>Cleaning blog by city</h2><p class="lead" style="margin-bottom:24px">Local guides for every community we serve.</p>${cityLinks(cities, cityBlogUrl, (c) => `${esc(c.name)} cleaning blog`)}</div>
</div></section>
<section class="blog-cta"><div class="wrap"><div><h2>Rather have it done for you?</h2><p>Perfect Services cleans homes and businesses in Greer and the Upstate. Free in-home estimate, no commitment.</p></div><div class="ic-actions"><a class="btn btn-white" href="/#estimate">Get my free estimate</a><a class="btn btn-ghost" href="tel:${site.phone.replace(/-/g, '')}">Call ${site.phoneDisplay}</a></div></div></section>
<script>
(function(){var chips=document.querySelectorAll('.chip'),cards=document.querySelectorAll('#grid .post-card'),feat=document.querySelector('.featured');
cards[0].hidden=true;
chips.forEach(function(c){c.addEventListener('click',function(){var f=c.dataset.f;
chips.forEach(function(x){x.setAttribute('aria-pressed',x===c?'true':'false')});
feat.hidden=f!=='all';
cards.forEach(function(k,i){k.hidden = f==='all' ? i===0 : k.dataset.cat!==f});})});})();
</script>`,
  }), { priority: 0.8 });

  cities.forEach((city) => {
    const own = posts.filter((p) => p.city === city.slug);
    const general = posts.filter((p) => p.city !== city.slug).slice(0, Math.max(3, 9 - own.length));
    const items = [['Home', '/'], ['Blog', '/blog.html'], [`${city.name} blog`, null]];
    write(`blog/${city.slug}/index.html`, layout({
      title: `${city.name} House Cleaning Blog: Tips, Checklists & Prices | Perfect Services`,
      description: trim(`House cleaning tips, checklists and price guides for ${city.full} homeowners, renters, hosts and businesses, from the Perfect Services team in Greer.`, 158),
      canonical: cityBlogUrl(city), current: 'blog',
      jsonld: [{ '@type': 'Blog', name: `${city.name} House Cleaning Blog`, url: `${D}${cityBlogUrl(city)}`, publisher: BUSINESS, about: { '@type': 'City', name: city.full }, blogPost: own.map((p) => ({ '@type': 'BlogPosting', headline: p.title, url: `${D}${postUrl(p)}`, datePublished: p.date })) }, crumbsLD(items)],
      body: `<section class="blog-hero"><div class="wrap bh-grid"><div>${crumbs(items)}<span class="tag">${esc(city.county)}</span><h1>${esc(city.name)} house cleaning blog</h1><p>Guides, checklists and cleaning advice for homes and businesses in ${esc(city.full)}${city.isBase ? '' : `, ${city.distRound} miles from our Greer base`}.</p><div class="hero-actions"><a class="btn btn-white" href="${cityUrl(city)}">Cleaning services in ${esc(city.name)}</a></div></div>
<div class="bh-stats"><div><b>${own.length}</b><span>${esc(city.name)} guides</span></div><div><b>${services.length}</b><span>cleaning services</span></div><div><b>Same day</b><span>free estimates</span></div></div></div></section>
<section class="blog-list"><div class="wrap">
${own.length ? `<h2 style="margin-bottom:24px">Latest from ${esc(city.name)}</h2><div class="post-grid">${own.map(postCard).join('')}</div>` : ''}
<h2 style="margin:${own.length ? '56px' : '0'} 0 24px">${own.length ? 'More cleaning guides' : `Cleaning guides for ${esc(city.name)} homes`}</h2><div class="post-grid">${general.map(postCard).join('')}</div>
<div style="margin-top:56px"><h2>Services in ${esc(city.name)}</h2><ul class="links" style="margin-top:20px">${services.map((s) => `<li><a href="${cityServiceUrl(city, s)}">${esc(s.name)}<small>${esc(city.full)}</small></a></li>`).join('')}</ul></div>
</div></section>`,
    }), { priority: 0.6 });
  });
}

// ---------- FAQ hub ----------
function buildFaq() {
  const index = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  let general = [];
  try {
    const ld = JSON.parse(index.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    general = ld['@graph'].find((x) => x['@type'] === 'FAQPage').mainEntity.map((q) => [q.name, q.acceptedAnswer.text]);
  } catch { general = []; }
  const items = [['Home', '/'], ['FAQ', null]];
  const groups = services.map((s) => {
    const fromPosts = posts.filter((p) => p.service === s.slug).flatMap((p) => (p.faqs || []).map(([q, a]) => [q, `${a} <a href="${postUrl(p)}">Read: ${esc(p.title)}</a>`]));
    const seen = new Set();
    const all = [...s.faqs.map(([q, a]) => [fill(q), `${fill(a)} <a href="${serviceUrl(s)}">See ${esc(s.short.toLowerCase())}</a>`]), ...fromPosts]
      .filter(([q]) => (seen.has(q) ? false : seen.add(q)));
    return { s, all: all.slice(0, 14) };
  });
  const allFaqs = [...general, ...groups.flatMap((g) => g.all)];
  write('faq/index.html', layout({
    title: 'House Cleaning FAQ: Prices, Services & Areas | Perfect Services Greer SC',
    description: 'Answers about house cleaning prices, deep cleaning, move-out, Airbnb, post-construction and office cleaning, and the areas Perfect Services serves around Greer, SC.',
    canonical: '/faq/', current: 'faq', jsonld: [crumbsLD(items), faqLD(allFaqs)],
    body: `<section class="page-hero"><div class="wrap">${crumbs(items)}<span class="tag">Answers before you book</span><h1>House cleaning FAQ</h1><p class="sub">Prices, services, scheduling and the ${cities.length} communities we serve around Greer, SC. Still have a question? Text ${site.smsDisplay}.</p></div></section>
<section class="lp"><div class="wrap prose">
<div class="faq-group">${faqHTML(general, 'General questions')}</div>
${groups.map((g) => `<div class="faq-group" id="${g.s.slug}">${faqHTML(g.all, `${g.s.name} questions`).replace('id="faq"', '')}</div>`).join('')}
<div class="faq-group"><h2>Questions about your city</h2><p>Each city page has answers about ZIP codes, travel time and local services:</p></div>
</div><div class="wrap">${cityLinks(cities, (c) => `${cityUrl(c)}#faq`, (c) => `${esc(c.full)} FAQ`)}</div></section>
<section class="lp alt"><div class="wrap">${cta()}</div></section>`,
  }), { priority: 0.7 });
}

// ---------- patch the existing home page and legacy posts ----------
function patchExisting() {
  const svcMap = { 'Regular house cleaning': 'house-cleaning', 'Deep cleaning': 'deep-cleaning', 'Move-in / move-out cleaning': 'move-in-move-out-cleaning', 'Post-construction cleaning': 'post-construction-cleaning', 'Commercial and office cleaning': 'commercial-office-cleaning' };
  const fixNav = (html, prefix) => (html.includes('/areas/') ? html : html.replace(/(<li><a href="[^"]*#services">Services<\/a><\/li>)/, `$1<li><a href="/areas/">Areas</a></li>`))
    .replace(/<div><h3>Services<\/h3><ul>[\s\S]*?<\/ul><\/div>/, footerServices());

  const ipath = path.join(ROOT, 'index.html');
  let index = fs.readFileSync(ipath, 'utf8');
  index = fixNav(index);
  index = index.replace(/<div class="svc-body"><h3>(.*?)<\/h3><p>(.*?)<\/p><a href="[^"]*">[^<]*<\/a><\/div>/g, (m, h, p) => (svcMap[h] ? `<div class="svc-body"><h3>${h}</h3><p>${p}</p><a href="${serviceUrl(serviceBySlug[svcMap[h]])}">See ${h.toLowerCase()} →</a></div>` : m));
  index = index.replace(/<ul class="city-list">[\s\S]*?<\/ul>(\s*<a class="btn btn-blue" href="#estimate")/, `<ul class="city-list">${cities.slice(0, 12).map((c) => `<li><a href="${cityUrl(c)}" style="text-decoration:none">${esc(c.name)}<small>${c.isBase ? esc(c.zips.join(', ')) : `${c.distRound} mi · ${esc(c.st)}`}</small></a></li>`).join('')}<li><a href="/areas/" style="text-decoration:none;color:var(--blue)">${cities.length > 12 ? `+ ${cities.length - 12} more areas` : 'All areas we serve'}<small>See the full list</small></a></li></ul>$1`);
  index = index.replace(/"areaServed":\[[\s\S]*?\],\n/, `"areaServed":${JSON.stringify(cities.map((c) => ({ '@type': 'City', name: c.full })))},\n`);
  // Link every directory profile the monitor has found (same business, same details everywhere)
  try {
    const cit = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'citations.json'), 'utf8'));
    const same = [...new Set([site.instagram, site.googleBusinessProfile, ...cit.directories.filter((d) => d.status === 'found' && /^https:\/\//.test(d.url || '')).map((d) => d.url)].filter(Boolean))];
    index = index.replace(/"sameAs":\[[^\]]*\]/, `"sameAs":${JSON.stringify(same)}`);
  } catch { /* no citations file yet */ }
  index = index.replace('"@id":"#business",', `"@id":"${D}/#business",\n    "url":"${D}/",`);
  if (!index.includes('rel="canonical"')) index = index.replace('<meta name="keywords"', `<link rel="canonical" href="${D}/">\n<meta name="keywords"`);
  fs.writeFileSync(ipath, withAnalytics(formMode(index)));
  const ty = path.join(ROOT, 'thank-you.html');
  if (fs.existsSync(ty)) fs.writeFileSync(ty, withAnalytics(fs.readFileSync(ty, 'utf8')));
  urls.unshift({ loc: `${D}/`, priority: 1.0, lastmod: TODAY });

  posts.filter((p) => p.legacy).forEach((p) => {
    const f = path.join(ROOT, 'blog', `${p.slug}.html`);
    let html = fixNav(fs.readFileSync(f, 'utf8')).replace(/<!--ps-links-->[\s\S]*?<!--\/ps-links-->\s*/, '');
    const svc = serviceBySlug[p.service];
    if (svc) {
      const seed = hash(p.slug);
      const block = `<!--ps-links--><section class="lp alt"><div class="wrap"><h2>${esc(svc.name)} near you</h2><p>Perfect Services offers <a href="${serviceUrl(svc)}">${esc(svc.short.toLowerCase())}</a> in Greer and across the Upstate. Pick your city to see what is included, prices and local answers. Related: ${pairsOf(svc).map((s, k) => `<a href="${serviceUrl(s)}">${esc(anchorKw(s, seed + k))}</a>`).join(', ')}.</p>${cityLinks(cities.slice(0, 12), (c) => cityServiceUrl(c, svc), (c) => `${esc(svc.short)} ${esc(c.full)}`)}</div></section><!--/ps-links-->\n`;
      html = html.replace(/(<section class="related")/, `${block}$1`);
    }
    fs.writeFileSync(f, withAnalytics(html));
  });
}

// ---------- sitemap / robots ----------
function buildSitemap() {
  const seen = new Set();
  const body = urls.filter((u) => (seen.has(u.loc) ? false : seen.add(u.loc)))
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`).join('\n');
  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
  fs.writeFileSync(path.join(ROOT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /thank-you.html\nDisallow: /data/\nDisallow: /scripts/\nDisallow: /content/\nDisallow: /painel/\nDisallow: /functions/\nDisallow: /api/\n\nSitemap: ${D}/sitemap.xml\n`);
  return seen.size;
}

// Remove previously generated folders so only released cities are published
for (const dir of ['areas', 'services', 'faq']) fs.rmSync(path.join(ROOT, dir), { recursive: true, force: true });
for (const d of fs.readdirSync(path.join(ROOT, 'blog'), { withFileTypes: true })) {
  if (d.isDirectory()) fs.rmSync(path.join(ROOT, 'blog', d.name), { recursive: true, force: true });
}
// Remove generated post pages whose JSON source was deleted
const postSlugs = new Set(posts.map((p) => p.slug));
for (const f of fs.readdirSync(path.join(ROOT, 'blog'))) {
  if (f.endsWith('.html') && !postSlugs.has(f.replace(/\.html$/, ''))) fs.rmSync(path.join(ROOT, 'blog', f));
}

patchExisting();
buildServices();
buildAreas();
buildPosts();
buildBlogIndex();
buildFaq();
const n = buildSitemap();

// ---------- status file for the monitoring panel (/painel/) ----------
function writeStatus(urlCount) {
  const day = (d) => new Date(d).toISOString().slice(0, 10);
  const launch = Date.parse(`${site.launchDate}T00:00:00Z`);
  const atLaunch = site.citiesAtLaunch || 8, perDay = site.citiesPerDay || 3;
  const cityRows = allEligibleCities.map((c, i) => ({
    name: c.name, st: c.st, slug: c.slug, county: c.county, miles: c.distRound,
    releaseDate: day(launch + (i < atLaunch ? 0 : Math.ceil((i - atLaunch + 1) / perDay)) * 86400000),
    live: !!cityBySlug[c.slug],
    posts: posts.filter((p) => p.city === c.slug).length,
  }));
  const published = new Set(posts.map((p) => p.slug));
  const queue = topicQueue().filter((t) => !published.has(t.slug));
  const perService = Number(site.greerDailyPerService || 0);
  const baseLists = Object.values(baseQueue()).map((l) => l.filter((t) => !published.has(t.slug)));
  const baseNext = perService ? baseLists.flatMap((l) => l.slice(0, perService)) : [];
  const greerDaysLeft = perService && baseLists.length ? Math.min(...baseLists.map((l) => Math.floor(l.length / (perService * (site.runsPerDay || 1))))) : null;
  const status = {
    generatedAt: new Date().toISOString(),
    domain: D,
    settings: { dailyPosts: site.dailyPosts, citiesPerDay: perDay, launchDate: site.launchDate, paused: !!site.paused },
    totals: {
      urls: urlCount,
      citiesLive: cities.length, citiesTotal: allEligibleCities.length,
      fixedPagesLive: urlCount - posts.length, fixedPagesTotal: allEligibleCities.length * (services.length + 2) + services.length + 3 + 2,
      posts: posts.length, legacyPosts: posts.filter((p) => p.legacy).length,
      queueRemaining: queue.length,
      articlesPerDay: ((site.dailyPosts || 0) + baseNext.length) * (site.runsPerDay || 1),
      greerDaysLeft,
    },
    cities: cityRows,
    recentPosts: posts.filter((p) => !p.legacy).slice(0, 40).map((p) => ({ title: p.title, slug: p.slug, url: `${D}${postUrl(p)}`, city: cityBySlug[p.city] ? cityBySlug[p.city].full : p.city, service: serviceBySlug[p.service] ? serviceBySlug[p.service].short : p.service, date: p.date })),
    // Order in which to request indexing in Search Console (10 a day): hubs, then cities by distance,
    // then each city's service pages, then city blogs, then articles (Greer first, newest first).
    inspectQueue: [...new Set([
      `${D}/`, `${D}/services/`, `${D}/areas/`, `${D}/faq/`, `${D}/blog.html`,
      ...cities.map((c) => `${D}${cityUrl(c)}`),
      ...services.map((s) => `${D}${serviceUrl(s)}`),
      ...cities.flatMap((c) => services.map((s) => `${D}${cityServiceUrl(c, s)}`)),
      ...cities.map((c) => `${D}${cityBlogUrl(c)}`),
      ...posts.filter((p) => !p.legacy && p.city === 'greer-sc').map((p) => `${D}${postUrl(p)}`),
      ...posts.filter((p) => !p.legacy && p.city !== 'greer-sc').map((p) => `${D}${postUrl(p)}`),
      ...posts.filter((p) => p.legacy).map((p) => `${D}${postUrl(p)}`),
    ])],
    nextTopics: [...baseNext, ...queue.slice(0, site.dailyPosts || 4)].map((t) => ({ title: t.title, city: t.cityName, service: t.serviceName })),
  };
  fs.mkdirSync(path.join(ROOT, 'data'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'data', 'status.json'), `${JSON.stringify(status, null, 1)}\n`);
}
writeStatus(n);

// Google Business Profile posts: collect content/gbp/*.json into data/gbp.json for the panel
(function writeGbp() {
  const dir = path.join(ROOT, 'content', 'gbp');
  const days = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse().slice(0, 60) : [];
  const out = [];
  for (const f of days) {
    try { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, '')); (j.posts || []).forEach((p) => out.push({ date: j.date || f.slice(0, 10), ...p })); } catch { console.warn(`GBP file skipped (invalid JSON): ${f}`); }
  }
  // One-time setup: the "Services" section of the profile (max 300 characters each)
  const gbpServices = services.map((s) => ({
    name: s.name,
    description: trim(`${s.summary} Serving Greer and the Upstate within 30 miles. Free estimates.`, 300),
    link: `${D}/services/${s.slug}/`,
  }));
  fs.writeFileSync(path.join(ROOT, 'data', 'gbp.json'), `${JSON.stringify({ generatedAt: new Date().toISOString(), dailyPosts: site.gbpDailyPosts || 0, services: gbpServices, posts: out }, null, 1)}\n`);
})();
console.log(`Built ${n} URLs: ${services.length} services x ${cities.length} released cities (of ${allEligibleCities.length}), ${posts.length} posts.`);
