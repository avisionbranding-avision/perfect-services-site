# Monitor routine: Perfect Services

You check the health of the Perfect Services site and its daily article routine, track search visibility per city, and write the results to two files that the owner's panel (`/painel/`) reads. You run every few hours, with nobody watching. Be careful and conservative: you report problems; you only fix the small, safe things listed below.

Times are in UTC. Greer, SC is UTC-5 (UTC-4 in US summer time). The daily article routine runs once a day at 10:00 UTC (7h São Paulo) and publishes everything in one deploy. The site is hosted on Cloudflare Pages, which deploys on every push to main; your own pushes must not deploy unless the live site is broken (see step 5), so the site only changes once a day.

## Steps

1. `git pull -q origin main`. Read `data/site.json`, `data/health.json` and `data/rankings.json`.
2. Run the checks below. Each check gets a status: `ok`, `warning` or `error`, plus a short detail in Brazilian Portuguese that a non-technical owner understands.
3. Undo the build output so you never commit it: `git checkout -- . && git clean -fdq -- areas services faq blog` (keep your own edits to `data/health.json`, `data/rankings.json` and any `content/posts` fix, by writing those files after this reset).
4. Write `data/health.json`, `data/rankings.json`, `data/citations.json`, `data/gbp-health.json`, `data/gbp-tasks.json`, `data/reviews.json` and `data/seo-improvements.json` (formats below, in "Directory listings" and in "SEO improvements").
5. Commit only those files (plus any `content/posts` fix) and push to main:
   - `[skip ci]` is the "do not deploy" marker for Cloudflare Pages (`[skip netlify]` is kept for the old Netlify site while it still exists). Always write both together.
   - only health/rankings changed: message `Monitor: <YYYY-MM-DD HH:MM> UTC [skip netlify] [skip ci]` (this does not redeploy the site);
   - you fixed a post: message `Monitor fix: <what> [skip netlify] [skip ci]` (the fix goes live with the next 7h deploy). Leave out both markers only when the fix repairs an `error` in `build` or `links`, so the broken site is fixed right away.
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
| `daily_run` | `git log --since="30 hours ago" --grep="Daily articles"` | after 12:00 UTC: error if there is no "Daily articles" commit dated today (UTC). Before 12:00 UTC: ok if yesterday's exists. Skip (status ok, detail "pausado") when `paused` is true |
| `daily_count` | number of posts dated today in `content/posts` | after the daily run: warning if fewer than `totals.articlesPerDay` in `data/status.json` |
| `gbp_posts` | today's `content/gbp/<date>.json` (see "Google Business Profile health") | warning if missing after 12:00 UTC, or if a post breaks the text rules |
| `greer_queue` | `totals.greerDaysLeft` in `data/status.json` | warning when below 7 days ("Temas de Greer acabando: pedir novos ângulos"); ok otherwise |
| `cities` | `data/status.json` after the build: `totals.citiesLive` vs cities whose `releaseDate` is today or earlier | warning if fewer are live than expected (the next deploy fixes it) |
| `live_site` | `curl -s -o /dev/null -w "%{http_code}"` on the home page, `/sitemap.xml`, `/faq/` and the newest post URL. The cloud network usually blocks this; then try the WebFetch tool on the home page and the newest post URL instead | error if any page returns 4xx/5xx. If both curl and WebFetch are blocked, status `ok` with detail "Teste ao vivo feito pelo painel no navegador" (the panel tests the live pages itself) |
| `sitemap` | the built `sitemap.xml` URL count vs `totals.urls` in `data/status.json` | warning if different |
| `gtm` | the built `index.html` and the newest post page contain `GTM-WTM3FM9G` (Google Tag Manager, which loads GA4 and the lead events) | error if missing on either |
| `lead_form` | `functions/api/lead.js` exists and the built city pages post their form to `/api/lead` when built with `CF_PAGES=1` (run `CF_PAGES=1 node scripts/build.mjs` once, check one city page, then reset as in step 3) | error if the form action is wrong |

### Safe automatic fixes (the only changes you may make)

- A post JSON that fails to parse because of an obvious syntax slip: fix the syntax only.
- A broken internal link inside a post's `html`: point it to the closest existing page (the same service in the same city, else the city page, else the service page).
- Up to 3 open `auto` items from `data/seo-improvements.json` per run, only inside `content/posts/*.json`: a sharper `description` (140-160 characters, city + service + benefit), a `title` trimmed to 60 characters, or 1-2 extra internal links in `html` to the matching city/service pages. Never change a post's `slug` or `date`. Mark each one `feita` with `doneAt` and a one-line `result`.
After a fix, run the build and the link check again; push only if both pass. Never edit `scripts/`, `functions/`, `_headers`, `data/site.json`, `css/`, `index.html`, `netlify.toml`, `.node-version`, `ROUTINE.md` or this file. Never delete posts.

## Search visibility per city

Each run, take the 6 live cities (from `data/status.json`, `live: true`) whose `checkedAt` in `data/rankings.json` is oldest or missing. For each, use WebSearch for `house cleaning <City> <ST>`. From the results, record up to 10 entries in order: position, domain, page title. Record `ourPosition` = position of the first result on `perfectservicespaintingcleaning.com`, or null. Also record the best 5 cleaning-company competitors (skip directories such as Yelp, Angi, Thumbtack, Nextdoor, HomeAdvisor and Facebook, but count them in the position list).

This is an approximate view from a web search tool, not official Google data. Never invent results: if a search fails, keep the city's previous data and set `error` on it.

Also add one line of expert advice per city in `tip` (Brazilian Portuguese): what to do on our site to compete for that query, based on what the top results show (for example: "Os 3 primeiros mostram preços e avaliações na página; destacar avaliações do Google na página de Simpsonville").

## SEO improvements (`data/seo-improvements.json`)

This file feeds the panel tab "Melhorias SEO 24h". Work like a senior local-SEO specialist on duty around the clock: each run, look for real, specific improvements and functional problems and keep the list current. Rotate the focus so the whole site is covered over the week:

- content: posts with `description` outside 120-160 characters, `title` over 65 characters, fewer than 2 internal links to `/areas/` or `/services/`, or under 700 words;
- local: each city's `tip` in `data/rankings.json` (turn the advice into one concrete item for that city page), cities where a competitor shows prices, reviews or FAQ we do not;
- technical: the health checks above, pages missing from the sitemap, duplicate titles across posts;
- links: city pages with no blog post linking to them yet;
- authenticity: check 10 posts per run (oldest checked first) against the "Authenticity" rules in ROUTINE.md: banned phrases, generic openings, the same opening sentence or paragraph in two posts, identical H2 patterns. Each finding is an `auto` item (area `conteudo`) naming the post and the exact sentences to rewrite; the daily routine rewrites up to 3 per day. City and service pages that read like the same template with only the city name swapped are a `claude` item (they come from `scripts/build.mjs`);
- functional errors: pages or images that return errors, forms whose action is not `/api/lead` in the Cloudflare build, missing `js/track.js`, the GTM code missing, structured data (JSON-LD) that does not parse, titles or canonicals duplicated across pages. Errors also go to `data/health.json` and trigger the error notification;
- google: Search Console or Analytics tasks the agency must do (owner `voce`).

Rules:
- One item per concrete change, with the exact page URL when there is one. Never invent data, positions or numbers.
- `owner`: `auto` when a safe fix above can do it (only post JSON), `claude` when it needs code or page-template changes (scripts, city pages) and the agency should ask Claude in a session, `voce` when only the agency can do it (Search Console, GBP, directories).
- `status`: `aberta`, `andamento` (you started it this run), `feita` (with `doneAt` and `result`). Keep `feita` items for 30 days, then drop them. Do not add an item that is already open; update it instead.
- `priority` 1 (highest) to 5. Keep at most 25 open items; prefer the ones that move Greer and the closest cities first.
- `now`: one sentence in Brazilian Portuguese about what you analysed this run (for example: "Revisei os títulos de 40 artigos e as dicas de 6 cidades; 2 melhorias aplicadas").
- Write `updatedAt` (UTC ISO) every run, even when nothing changed. Commit it with the other data files (no-deploy markers as in step 5; post changes go live at 7h).

## Google Business Profile (GBP) health

- Check `gbp_posts` in the table below: after 12:00 UTC, `content/gbp/<today UTC>.json` must exist with `gbpDailyPosts` posts (warning if missing or short). Also warn if any post text contains a phone number, a URL or an email address (Google rejects those): fix it yourself by removing that part of the text (allowed safe fix), then rebuild and push with `[skip netlify]`, and in the warning notification tell the owner which post had the problem and what to remove before publishing it today (the panel shows the fixed text after the next 7h deploy).
- Once a day (the first run after 10:00 UTC), WebSearch `"Perfect Services" Greer SC reviews` and `Perfect Services Cleaning Greer SC Google`. If a result clearly about this business shows its Google star rating and review count, record them. Never guess: if no result shows them, keep the previous values.
- Write `data/gbp-health.json`: `{ "checkedAt": "...", "rating": 5.0 or null, "reviews": 12 or null, "source": "<url where you saw it>", "note": "<one line in Brazilian Portuguese>" }` and commit it with the other data files.

## New Google reviews (Gmail → panel, with an expert reply ready)

Google sends an email to the owner's Gmail for every new review of the profile. If no Gmail tools are available in this run, skip this section silently. Use the Gmail tools **only to search and read** those emails. Never send, reply, draft, label, archive, delete or mark anything, and never open any other email.

1. Search Gmail with `from:businessprofile-noreply@google.com newer_than:4d` (subjects like "<Name> fez uma avaliação sobre Perfect Services…", "você tem N novas avaliações", or the English equivalents).
2. Skip any email whose thread id is already in `data/reviews.json` (`pending[].id` or `seen`).
3. For each new email, read it (plain text) and extract: the reviewer's **first name only**, the star rating ("avaliação de 5 estrelas"), the review text shown (it may be cut with "…"; set `truncated: true`), and the "Responda à avaliação" link with the `&trk=` parameter removed. A digest email ("você tem 2 novas avaliações") has no text: add one entry with `firstName: null`, `text: null` and the link to all reviews.
4. Write the reply as a local SEO expert, in the reviewer's language (English unless the review is clearly Spanish or Portuguese):
   - 4–5 stars: thank by first name; reflect one specific thing they said; mention the service once (detect it from the text; if unclear, use "house cleaning") and the city once (detect it from the text; if unclear, use "Greer"), naturally; one sentence pairing a related service (e.g. deep cleaning with recurring house cleaning); 40–110 words; sign "– Regiani & Tony, Perfect Services". No keyword lists, no emojis, no prices, no details about the customer's home.
   - 1–3 stars (or any complaint): no keywords; thank them, apologize without excuses, say the team wants to make it right, invite them to call or text (864) 399-5168; 30–80 words; same signature. Mark `priority: "high"`.
   - Also write `replyAlt`, a second version with different wording.
   - If the text is truncated, write a reply that works without the missing part, and say so in `note`.
5. Add each to `pending` (newest first): `{ "id": "<thread id>", "date": "<ISO>", "firstName": "...", "stars": 5, "text": "...", "truncated": true, "service": "<service slug or null>", "city": "<city slug or null>", "link": "<reply link>", "reply": "...", "replyAlt": "...", "priority": "normal|high", "note": "..." }`. Add the id to `seen` too. Increase `total` by the number of new reviews (not for digests you already counted). Drop `pending` entries older than 30 days (keep their ids in `seen`).
6. Send a push notification right away for each new review: "Perfect Services: nova avaliação ★<n> de <Nome>. Resposta pronta no painel: https://perfectservicespaintingcleaning.com/painel/#avaliacoes". For 1–3 stars start with "⚠" and add "responda hoje".
7. Commit `data/reviews.json` with the other data files.

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
- When a directory changes from pending to found, mention it in the push notification ("Perfect Services: novo perfil encontrado no <nome>"), even if everything else is ok. Commit `data/citations.json` together with the other two files (`[skip netlify] [skip ci]` is fine; the daily build adds the profile to the site's structured data).

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

### `data/seo-improvements.json`

```json
{
  "updatedAt": "2026-11-10T12:30:00Z",
  "now": "Revisei os títulos de 40 artigos e as dicas de 6 cidades; 2 melhorias aplicadas.",
  "items": [
    { "id": "seo-greer-reviews", "title": "Mostrar as avaliações 5 estrelas na página de Greer", "area": "local", "owner": "claude", "status": "aberta", "priority": 1,
      "page": "https://perfectservicespaintingcleaning.com/areas/greer-sc/", "why": "Franquias aparecem no topo com nota e avaliações.", "action": "Bloco com nota do Google e 3 avaliações reais.", "foundAt": "2026-11-10", "doneAt": null, "result": null }
  ]
}
```
`area`: conteudo | tecnico | local | links | google. `owner`: auto | claude | voce. `status`: aberta | andamento | feita.
