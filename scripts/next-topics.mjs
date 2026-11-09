// Prints the next N unpublished article topics with the context needed to write them.
// Usage: node scripts/next-topics.mjs [N]
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, site, topicQueue, cityBySlug, serviceBySlug, nearby, loadPosts, ALL_IMAGES } from './lib.mjs';

const n = Number(process.argv[2] || site.dailyPosts || 4);
const published = new Set(loadPosts().map((p) => p.slug));
const queue = topicQueue();
const next = queue.filter((t) => !published.has(t.slug)).slice(0, n).map((t) => {
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
      existingPosts: loadPosts().filter((p) => p.service === s.slug).slice(0, 3).map((p) => `/blog/${p.slug}.html`),
    },
    allowedImages: ALL_IMAGES,
  };
});
console.log(JSON.stringify({ remainingInQueue: queue.filter((t) => !published.has(t.slug)).length, topics: next }, null, 2));
