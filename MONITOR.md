# Monitor routine: Perfect Services

You check the health of the Perfect Services site and its daily article routine, track search visibility per city, and write the results to two files that the owner's panel (`/painel/`) reads. You run every few hours, with nobody watching. Be careful and conservative: you report problems; you only fix the small, safe things listed below.

Times are in UTC. Greer, SC is UTC-5 (UTC-4 in US summer time). The daily article routine runs at 12:00 UTC.

## Steps

1. `git pull -q origin main`. Read `data/site.json`, `data/health.json` and `data/rankings.json`.
2. Run the checks below. Each check gets a status: `ok`, `warning` or `error`, plus a short detail in Brazilian Portuguese that a non-technical owner understands.
3. Undo the build output so you never commit it: `git checkout -- . && git clean -fdq -- areas services faq blog` (keep your own edits to `data/health.json`, `data/rankings.json` and any `content/posts` fix, by writing those files after this reset).
4. Write `data/health.json`, `data/rankings.json`, `data/citations.json`, `data/gbp-health.json` and `data/gbp-tasks.json` (formats below and in "Directory listings").
5. Commit only those files (plus any `content/posts` fix) and push to main:
   - only health/rankings changed: message `Monitor: <YYYY-MM-DD HH:MM> UTC [skip netlify]` (this does not redeploy the site);
   - you fixed a post: message `Monitor fix: <what>` without `[skip netlify]`, so the fix goes live.
6. Notify (PushNotification tool, Brazilian Portuguese, short):
   - any `error`: always, starting with "⚠ Perfect Services: problema no site", what is wrong, and what you did or what the owner should do;
   - a `warning` that was not in the previous `data/health.json`: one notification starting with "Perfect Services: aviso";
   - everything `ok`: no notification.

## Checks

| id | What to check | Status rule |
|---|---|---|
| `build` | `node scripts/build.mjs` | error if it fails or prints no "Built ... URLs" |
| `links` | `node scripts/check-links.mjs` after the build | error if `broken` > 0 (list up to 5 in detail) |
| `posts_json` | every `content/posts/*.json` parses and has slug, title, description, date, city, service, html | error for a broken file |
| `daily_run` | `git log --since="30 hours ago" --grep="Daily articles"` | after 13:30 UTC: error if there is no "Daily articles" commit dated today (UTC). Before 13:30 UTC: ok if yesterday's exists. Skip (status ok, detail "pausado") when `paused` is true |
| `daily_count` | number of posts dated today in `content/posts` | after the daily run: warning if fewer than `totals.articlesPerDay` in `data/status.json` |
| `gbp_posts` | today's `content/gbp/<date>.json` (see "Google Business Profile health") | warning if missing after 13:30 UTC, or if a post breaks the text rules |
| `greer_queue` | `totals.greerDaysLeft` in `data/status.json` | warning when below 7 days ("Temas de Greer acabando: pedir novos ângulos"); ok otherwise |
| `cities` | `data/status.json` after the build: `totals.citiesLive` vs cities whose `releaseDate` is today or earlier | warning if fewer are live than expected (the next deploy fixes it) |
| `live_site` | `curl -s -o /dev/null -w "%{http_code}"` on the home page, `/sitemap.xml`, `/faq/` and the newest post URL. The cloud network usually blocks this; then try the WebFetch tool on the home page and the newest post URL instead | error if any page returns 4xx/5xx. If both curl and WebFetch are blocked, status `ok` with detail "Teste ao vivo feito pelo painel no navegador" (the panel tests the live pages itself) |
| `sitemap` | the built `sitemap.xml` URL count vs `totals.urls` in `data/status.json` | warning if different |

### Safe automatic fixes (the only changes you may make)

- A post JSON that fails to parse because of an obvious syntax slip: fix the syntax only.
- A broken internal link inside a post's `html`: point it to the closest existing page (the same service in the same city, else the city page, else the service page).
After a fix, run the build and the link check again; push only if both pass. Never edit `scripts/`, `data/site.json`, `css/`, `index.html`, `netlify.toml`, `ROUTINE.md` or this file. Never delete posts.

## Search visibility per city

Each run, take the 6 live cities (from `data/status.json`, `live: true`) whose `checkedAt` in `data/rankings.json` is oldest or missing. For each, use WebSearch for `house cleaning <City> <ST>`. From the results, record up to 10 entries in order: position, domain, page title. Record `ourPosition` = position of the first result on `perfectservicespaintingcleaning.com`, or null. Also record the best 5 cleaning-company competitors (skip directories such as Yelp, Angi, Thumbtack, Nextdoor, HomeAdvisor and Facebook, but count them in the position list).

This is an approximate view from a web search tool, not official Google data. Never invent results: if a search fails, keep the city's previous data and set `error` on it.

Also add one line of expert advice per city in `tip` (Brazilian Portuguese): what to do on our site to compete for that query, based on what the top results show (for example: "Os 3 primeiros mostram preços e avaliações na página; destacar avaliações do Google na página de Simpsonville").

## Google Business Profile (GBP) health

- Check `gbp_posts` in the table below: after 13:30 UTC, `content/gbp/<today UTC>.json` must exist with `gbpDailyPosts` posts (warning if missing or short). Also warn if any post text contains a phone number, a URL or an email address (Google rejects those): fix it yourself by removing that part of the text (allowed safe fix), then rebuild and push without `[skip netlify]`.
- Once a day (the first run after 12:00 UTC), WebSearch `"Perfect Services" Greer SC reviews` and `Perfect Services Cleaning Greer SC Google`. If a result clearly about this business shows its Google star rating and review count, record them. Never guess: if no result shows them, keep the previous values.
- Write `data/gbp-health.json`: `{ "checkedAt": "...", "rating": 5.0 or null, "reviews": 12 or null, "source": "<url where you saw it>", "note": "<one line in Brazilian Portuguese>" }` and commit it with the other data files.

## GBP improvement suggestions (`data/gbp-tasks.json` → `suggestions`)

The owner's panel has a tab "Melhorias Google" that lists one-time setup tasks (`setup`, never change them) and live suggestions (`suggestions`). You are the head of local SEO: each run, review what you learned (rankings and competitors in `data/rankings.json`, rating and reviews in `data/gbp-health.json`, pending directories in `data/citations.json`, recent GBP posts in `content/gbp/`, the season and upcoming US holidays) and keep the best improvements for the Google Business Profile in `suggestions`.

- Keep 3 to 6 suggestions, ordered by impact (`priority` 1 = highest). Add a new one only when you have a concrete, new reason (a competitor pattern you saw in search results, a city where we do not appear, reviews stagnant, a season or holiday coming, a directory still pending). Do not churn: keep a suggestion at least 14 days unless it no longer applies.
- Each suggestion: `{ "id": "sug-<YYYY-MM-DD>-<short-slug>", "priority": n, "createdAt": "<ISO>", "title": "<imperative, Brazilian Portuguese>", "where": "<where in the profile>", "why": "<one sentence with the evidence>", "steps": ["..."], "copy": [{ "label": "...", "value": "<ready-to-paste text or link>"}] }`. Texts the owner will paste into Google are in American English; everything else in Brazilian Portuguese.
- Ids never change once created (the panel stores done marks by id). Never reuse an id for a different suggestion.
- Links in `copy` point to existing pages of the site, with `?utm_source=google&utm_medium=gbp_<where>`.
- Never invent facts about the business (prices, awards, years, reviews) or about competitors: say only what the search results showed.
- Set `updatedAt` at the top. When you add a suggestion, mention it in the push notification ("Perfect Services: nova melhoria para o Google Meu Negócio: <title>"), at most once a day.
- Commit `data/gbp-tasks.json` together with the other data files.

## Directory listings (citations)

`data/citations.json` lists the directories where the business should be listed. Each run, check the 3 directories with `status: "pending"` whose `checkedAt` is oldest or missing (every few days, re-check one `found` entry too):

- WebSearch `"Perfect Services" Greer SC <directory name>` and `"perfectservicespaintingcleaning.com" <directory name>`.
- Mark `status: "found"` and set `url` only when a result on that directory's domain (`match`) is clearly this business: the name "Perfect Services" plus Greer (or the phone (864) 399-5168, or the website). A different "Perfect Services" in another state is not a match.
- Otherwise keep `status: "pending"`. Set `checkedAt` either way and `updatedAt` at the top.
- Never change `kit`, `why`, `signup` or `priority`.
- When a directory changes from pending to found, mention it in the push notification ("Perfect Services: novo perfil encontrado no <nome>"), even if everything else is ok. Commit `data/citations.json` together with the other two files (`[skip netlify]` is fine; the daily build adds the profile to the site's structured data).

## File formats

`data/health.json`:
```json
{
  "checkedAt": "2026-11-09T15:00:00Z",
  "overall": "ok | warning | error",
  "checks": [{ "id": "build", "label": "Geração do site", "status": "ok", "detail": "125 páginas geradas" }],
  "fixes": ["texto do que foi corrigido automaticamente nesta verificação"],
  "history": [{ "at": "2026-11-09T15:00:00Z", "overall": "ok", "summary": "Tudo certo" }]
}
```
Keep the last 60 entries in `history`, newest first. `overall` is the worst status of all checks.

`data/rankings.json`:
```json
{
  "updatedAt": "2026-11-09T15:00:00Z",
  "method": "Busca na web (aproximada, não é o Google oficial)",
  "cities": {
    "taylors-sc": {
      "city": "Taylors, SC", "query": "house cleaning Taylors SC", "checkedAt": "2026-11-09T15:00:00Z",
      "ourPosition": null, "ourUrl": null,
      "top": [{ "pos": 1, "domain": "example.com", "title": "..." }],
      "competitors": [{ "pos": 2, "domain": "example.com", "name": "..." }],
      "tip": "...",
      "error": null
    }
  }
}
```

End your run with a short summary in English: overall status, checks that were not ok, fixes made, cities checked.
