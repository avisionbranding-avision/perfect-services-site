// Shared data + helpers for the Perfect Services site generator.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

export const site = readJSON('data/site.json');
export const services = readJSON('data/services.json');
const allCities = readJSON('data/cities.json');

export const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const BASE = allCities.find((c) => c.name === site.baseCity);
const rad = (d) => (d * Math.PI) / 180;
function miles(a, b) {
  const dl = rad(b.lat - a.lat), dn = rad(b.lng - a.lng);
  const h = Math.sin(dl / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dn / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}
function bearing(a, b) {
  const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
  const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) - Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
  const deg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(deg / 45) % 8];
}

export const cities = allCities
  .filter((c) => site.includeNorthCarolina || c.st !== 'NC')
  .map((c) => {
    const dist = miles(BASE, c);
    return {
      ...c,
      slug: `${slugify(c.name)}-${c.st.toLowerCase()}`,
      full: `${c.name}, ${c.st}`,
      dist: Math.round(dist * 10) / 10,
      distRound: Math.max(1, Math.round(dist)),
      dir: bearing(BASE, c),
      drive: Math.max(10, Math.round((dist * 1.35 + 6) / 5) * 5),
      isBase: c.name === site.baseCity,
    };
  })
  .sort((a, b) => a.dist - b.dist);

// Gradual release: closest cities first, a few more each day after launch.
// Every daily rebuild (triggered by the article routine) releases the next cities.
export const allEligibleCities = cities.slice();
export const releasedCount = (() => {
  if (!site.launchDate) return cities.length;
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(`${site.launchDate}T00:00:00Z`)) / 86400000));
  return Math.min(cities.length, (site.citiesAtLaunch || 8) + days * (site.citiesPerDay || 3));
})();
cities.splice(releasedCount);

export const cityBySlug = Object.fromEntries(cities.map((c) => [c.slug, c]));
export const serviceBySlug = Object.fromEntries(services.map((s) => [s.slug, s]));

export function nearby(city, n = 6) {
  return cities.filter((c) => c.slug !== city.slug)
    .map((c) => ({ c, d: miles(city, c) }))
    .sort((a, b) => a.d - b.d).slice(0, n).map((x) => x.c);
}

// Deterministic hash + pickers so every page is stable between builds
export function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const pick = (arr, seed) => arr[seed % arr.length];
export function rotate(arr, seed, n = arr.length) {
  const k = seed % arr.length;
  return [...arr.slice(k), ...arr.slice(0, k)].slice(0, n);
}
export function shuffle(arr, seed) {
  const a = [...arr]; let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) { s = (Math.imul(s, 1103515245) + 12345) >>> 0; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const fill = (t, city) => String(t).replaceAll('{city}', city ? city.name : 'Greer and the Upstate')
  .replaceAll('{st}', city ? city.st : 'SC');

// Posts: legacy HTML posts + new JSON posts in content/posts
export function loadPosts() {
  const legacy = readJSON('data/legacy-posts.json').map((p) => ({ ...p, city: 'greer-sc' }));
  const dir = path.join(ROOT, 'content', 'posts');
  const fresh = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
      const p = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^﻿/, ''));
      const svc = serviceBySlug[p.service];
      return { category: svc ? svc.category : 'Cleaning tips', readTime: `${Math.max(3, Math.round(String(p.html).replace(/<[^>]+>/g, ' ').split(/\s+/).length / 220))} min read`, faqs: [], ...p };
    })
    : [];
  return [...fresh, ...legacy].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export const IMAGE_LABELS = {
  'bathroom-cleaning-greer.jpg': 'Bathroom vanity and floor',
  'bonus-room-carpet-cleaning.jpg': 'Bonus room carpet',
  'carpet-hallway-vacuum-lines.jpg': 'Carpeted hallway',
  'dining-room-hardwood-greer.jpg': 'Dining room hardwood',
  'double-vanity-bathroom.jpg': 'Double vanity bathroom',
  'family-room-cleaning-greer.jpg': 'Family room',
  'home-hallway.jpg': 'Hardwood entryway',
  'kitchen-dining-cleaning.jpg': 'Kitchen and dining area',
  'kitchen-dining-greer.jpg': 'Kitchen and dining room',
  'kitchen-island-marble.jpg': 'Marble kitchen island',
  'laundry-room-cleaning.jpg': 'Laundry room',
  'living-kitchen-open-plan.jpg': 'Open living room and kitchen',
  'living-room-greer.jpg': 'Living room',
  'master-bedroom-cleaning-greer.jpg': 'Master bedroom',
  'open-floor-plan-greer.jpg': 'Open floor plan',
  'oven-deep-cleaning.jpg': 'Wall oven and microwave',
  'perfect-services-team.jpg': 'The Perfect Services team',
};
export const ALL_IMAGES = Object.keys(IMAGE_LABELS);

// Extra angles used only for the home base (Greer), which gets one article per service every day.
// {S} = service short name (capitalized), {s} = lowercase, {kw} = main keyword, {zip0}/{zip1}, {road0}/{road1}
const BASE_ANGLES = [
  ['first-time', 'First-time {s} in Greer, SC: what to expect', '{kw} Greer SC'],
  ['how-long', 'How long does {s} take in Greer, SC?', '{kw} Greer how long'],
  ['how-often', 'How often should you book {s} in Greer?', '{kw} Greer how often'],
  ['prepare', 'How to prepare your Greer home for {s}', 'prepare for {kw} Greer'],
  ['after', 'After {s}: keeping your Greer home clean longer', '{kw} Greer tips'],
  ['mistakes', '5 {s} mistakes Greer homeowners make', '{kw} mistakes Greer'],
  ['questions', 'Questions to ask before hiring {s} in Greer', 'hire {kw} Greer SC'],
  ['price-factors', 'What changes the price of {s} in Greer, SC', '{kw} cost Greer SC'],
  ['diy-vs-pro', 'DIY vs. professional {s} in Greer', 'professional {kw} Greer'],
  ['kitchen', '{S} in Greer: the kitchen, step by step', '{kw} kitchen Greer SC'],
  ['bathroom', '{S} in Greer: bathrooms done right', '{kw} bathroom Greer SC'],
  ['bedrooms', '{S} in Greer: bedrooms and closets', '{kw} bedroom Greer'],
  ['living-areas', '{S} in Greer: living rooms and shared spaces', '{kw} living room Greer'],
  ['floors', '{S} in Greer: floors, baseboards and edges', '{kw} floors Greer SC'],
  ['pets', '{S} for pet owners in Greer, SC', '{kw} pet owners Greer'],
  ['families', '{S} for busy families in Greer', '{kw} families Greer SC'],
  ['seniors', '{S} for seniors and their families in Greer', '{kw} seniors Greer'],
  ['professionals', '{S} for busy professionals in Greer', '{kw} Greer professionals'],
  ['renters', '{S} for renters in Greer, SC', '{kw} renters Greer'],
  ['landlords', '{S} for landlords and property managers in Greer', '{kw} landlords Greer SC'],
  ['selling', '{S} before selling a home in Greer', '{kw} home sale Greer'],
  ['spring', 'Spring {s} in Greer, SC', 'spring {kw} Greer'],
  ['summer', 'Summer {s} in Greer: heat, humidity and dust', 'summer {kw} Greer SC'],
  ['fall', 'Fall {s} in Greer, SC', 'fall {kw} Greer'],
  ['winter', 'Winter {s} in Greer: indoor season tips', 'winter {kw} Greer SC'],
  ['holidays', '{S} before the holidays in Greer', 'holiday {kw} Greer'],
  ['pollen', '{S} during Upstate pollen season in Greer', '{kw} pollen Greer SC'],
  ['zip-0', '{S} in Greer ZIP {zip0}', '{kw} {zip0}'],
  ['zip-1', '{S} in Greer ZIP {zip1}', '{kw} {zip1}'],
  ['road-0', '{S} for homes near {road0} in Greer', '{kw} near {road0} Greer'],
  ['road-1', '{S} for homes near {road1} in Greer', '{kw} near {road1} Greer'],
  ['allergies', '{S} for allergy-sensitive homes in Greer', '{kw} allergies Greer'],
  ['large-homes', '{S} for large homes in Greer', '{kw} large home Greer SC'],
  ['small-homes', '{S} for small homes and townhomes in Greer', '{kw} townhome Greer'],
  ['short-notice', 'Booking {s} on short notice in Greer', '{kw} same week Greer'],
  ['full-checklist', 'The complete {s} checklist for Greer homes', '{kw} checklist Greer SC'],
  ['brazilian-way', 'The Brazilian approach to {s} in Greer', 'Brazilian {kw} Greer'],
  ['choose-company', 'How to choose a trustworthy {s} company in Greer', 'best {kw} Greer SC'],
  ['products', 'Safer products for {s} in Greer homes', 'safe {kw} Greer'],
  ['myths', 'Common myths about {s}, answered for Greer homeowners', '{kw} myths Greer'],
];
export function baseQueue() {
  const base = cities.find((c) => c.isBase);
  if (!base) return {};
  const out = {};
  services.forEach((svc) => {
    const s = svc.short.toLowerCase();
    const sub = (t) => t.replaceAll('{S}', svc.short).replaceAll('{s}', s).replaceAll('{kw}', svc.keywords[0])
      .replaceAll('{zip0}', base.zips[0] || base.zips[0]).replaceAll('{zip1}', base.zips[1] || base.zips[0])
      .replaceAll('{road0}', base.roads[0]).replaceAll('{road1}', base.roads[1] || base.roads[0]);
    const list = [];
    svc.angles.forEach((ang, a) => {
      if (a === 0 || (svc.slug === 'house-cleaning' && ang[0] === 'frequency')) return;
      list.push([ang[0], fill(ang[1], base), fill(ang[2], base)]);
    });
    BASE_ANGLES.forEach((ang) => {
      if (ang[0] === 'zip-1' && !base.zips[1]) return;
      if (ang[0] === 'road-1' && !base.roads[1]) return;
      list.push([ang[0], sub(ang[1]), sub(ang[2])]);
    });
    const seen = new Set();
    out[svc.slug] = list.map(([angle, title, keyword]) => ({
      slug: slugify(title).slice(0, 90).replace(/-+$/, ''), title, keyword, angle,
      city: base.slug, cityName: base.full, service: svc.slug, serviceName: svc.name,
      image: pick(svc.images, hash(title)),
    })).filter((t) => (seen.has(t.slug) ? false : seen.add(t.slug)));
  });
  return out;
}

// Google Business Profile (GBP) daily post plan.
// Post 1 every day is about Greer (where the profile is), cycling the 10 services.
// The other posts walk every city x service pair, nearest cities first, so each region gets its turn.
const GBP_ANGLES = ['tip', 'checklist', 'free-estimate', 'season', 'question', 'why-us', 'before-you-book'];
export function gbpPlan(day) {
  const n = Number(site.gbpDailyPosts || 0);
  if (!n) return [];
  const d = Math.max(0, Math.floor((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${site.gbpStart || site.launchDate}T00:00:00Z`)) / 86400000));
  const base = cities.find((c) => c.isBase);
  const others = cities.filter((c) => !c.isBase);
  const pairs = [];
  for (let r = 0; r < services.length; r++) others.forEach((c, ci) => pairs.push([c, services[(ci + r) % services.length]]));
  const plan = [[base, services[d % services.length]]];
  for (let k = 0; k < n - 1 && pairs.length; k++) plan.push(pairs[(d * (n - 1) + k) % pairs.length]);
  return plan.map(([c, s], i) => ({
    id: `${day}-${i + 1}`,
    city: c.slug, cityName: c.full, service: s.slug, serviceName: s.name,
    angle: GBP_ANGLES[(d + i) % GBP_ANGLES.length],
    link: `${site.domain}/areas/${c.slug}/${s.slug}/?utm_source=google&utm_medium=gbp_post&utm_campaign=${s.slug}&utm_content=${c.slug}`,
    image: `${site.domain}/images/${pick(s.images, hash(`${day}|${i}`))}`,
    keyword: `${s.keywords[0]} ${c.name} ${c.st}`,
  }));
}

// Topic queue for the daily article routine
export function topicQueue() {
  const out = [];
  const maxAngles = Math.max(...services.map((s) => s.angles.length));
  for (let a = 0; a < maxAngles; a++) {
    cities.forEach((city, ci) => {
      if (site.greerDailyPerService && city.isBase) return; // the base city has its own daily queue
      rotate(services, ci + a).forEach((svc) => {
        const ang = svc.angles[a];
        if (!ang) return;
        // Greer already has legacy articles for these angles: skip them to avoid duplicate content
        if (city.isBase && (a === 0 || (svc.slug === 'house-cleaning' && ang[0] === 'frequency'))) return;
        const title = fill(ang[1], city);
        out.push({
          slug: slugify(title).slice(0, 90).replace(/-+$/, ''),
          title, keyword: fill(ang[2], city), angle: ang[0],
          city: city.slug, cityName: city.full, service: svc.slug, serviceName: svc.name,
          image: pick(svc.images, hash(title)),
        });
      });
    });
  }
  return out;
}
