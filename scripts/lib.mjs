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

// Topic queue for the daily article routine
export function topicQueue() {
  const out = [];
  const maxAngles = Math.max(...services.map((s) => s.angles.length));
  for (let a = 0; a < maxAngles; a++) {
    cities.forEach((city, ci) => {
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
