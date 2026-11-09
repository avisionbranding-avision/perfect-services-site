// Prints today's unpublished article topics with the context needed to write them.
// Usage: node scripts/next-topics.mjs [N]
//   N = rotation topics across all cities (default: dailyPosts in data/site.json)
//   plus, when greerDailyPerService is set, that many topics per service for the base city (Greer).
import { site, topicQueue, baseQueue, cityBySlug, serviceBySlug, nearby, loadPosts, ALL_IMAGES } from './lib.mjs';

const n = Number(process.argv[2] || site.dailyPosts || 4);
const posts = loadPosts();
const published = new Set(posts.map((p) => p.slug));
const queue = topicQueue().filter((t) => !published.has(t.slug));
const base = baseQueue();
const perService = Number(site.greerDailyPerService || 0);
const baseRemaining = Object.values(base).map((list) => list.filter((t) => !published.has(t.slug)));
const baseToday = perService ? baseRemaining.flatMap((list) => list.slice(0, perService)) : [];

const expand = (t) => {
  const c = cityBySlug[t.city];
  const s = serviceBySlug[t.service];
  return {
    ...t,
    file: `content/posts/${t.slug}.json`,
    cityFacts: { name: c.name, st: c.st, county: c.county, zips: c.zips, roads: c.roads, note: c.note, milesFromGreer: c.distRound, direction: c.dir, driveMinutes: c.drive },
    service: { slug: s.slug, name: s.name, includes: s.includes, idealFor: s.idealFor, priceFactors: s.priceFactors },
    linkTo: {
      cityServicePage: `/areas/${c.slug}/${s.slug}/`,
      cityPage: `/areas/${c.slug}/`,
      servicePage: `/services/${s.slug}/`,
      nearbyCityPages: nearby(c, 3).map((x) => `/areas/${x.slug}/${s.slug}/`),
      existingPosts: posts.filter((p) => p.service === s.slug).slice(0, 3).map((p) => `/blog/${p.slug}.html`),
    },
    allowedImages: ALL_IMAGES,
  };
};

console.log(JSON.stringify({
  remainingInQueue: queue.length,
  greerRemainingPerService: Object.fromEntries(Object.keys(base).map((k, i) => [k, baseRemaining[i].length])),
  totalToday: Math.min(n, queue.length) + baseToday.length,
  topics: [...queue.slice(0, n), ...baseToday].map(expand),
}, null, 2));
