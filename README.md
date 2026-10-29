# Dr Mumbo Jumbo

**dr-mumbo-jumbo.com** — medical jargon, bills, and insurance denials translated into plain English, plus a free appeal-letter generator for denied claims.

Live at https://dr-mumbo-jumbo.com (hosted on Vercel; the domain is registered at Squarespace and pointed at Vercel by DNS).

## What's on the site

| Route | What it does | Served by |
|---|---|---|
| `/` | The translator: paste (or photograph / upload) a visit note, lab report, bill, EOB, or denial letter and get a plain-English translation. Two modes: *Doctor-speak* and *Bill or denial*. | `index.html` → `POST /api/translate` |
| `/appeal` | Free insurance appeal-letter generator: paste or upload a denial letter, get a ready-to-finish internal appeal letter. | `appeal.html` → `POST /api/appeal` |
| `/denials` | The Denial Playbook: the six moves for overturning a denial, with deadlines. | `denials.html` |
| `/codes/` | Plain-English code library (~190 CPT, ICD-10, and denial-reason codes), one page per code. | `api/codelibrary.js`, `api/codepage.js`, data in `lib/` |
| `/sitemap.xml` | Generated sitemap for every page above. | `api/sitemap.js` |
| `POST /api/lead` | Fight Pack waitlist signup (email + what they're fighting). | `api/lead.js` → Supabase |

Routing lives in `vercel.json` (clean URLs, function timeouts, security headers).

## How the AI endpoints work

`api/translate.js` and `api/appeal.js` call the Anthropic Messages API (model `claude-haiku-4-5` by default) with a fixed system prompt per mode. Pasted text and any attached photo or PDF are sent once to generate the result and are never stored or logged. Uploads are prepared in the browser (images downscaled to ≤1800px JPEG, PDFs ≤3 MB) and sent as base64 inside the JSON body, which keeps requests under Vercel's 4.5 MB limit.

The endpoints are education tools, not medical, legal, or financial advice; the prompts and the page footers say so.

## Configuration

Set these in Vercel → Project → Settings → Environment Variables, then redeploy:

| Variable | Required | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | Powers `/api/translate` and `/api/appeal`. Until it is set, both return a friendly 503 "not switched on yet" message. |
| `ANTHROPIC_MODEL` | no | Override the default model. |

Waitlist storage: run `supabase/waitlist.sql` once in the Supabase SQL Editor. `api/lead.js` uses the project's publishable (anon) key, which is public by design; row-level security allows inserts only.

## Deploying

The site is plain static HTML plus Node serverless functions — no build step, no dependencies.

- **From this repo:** import it into the Vercel project (Vercel → Project → Settings → Git) and every push to `main` deploys.
- **Without Git:** `npx vercel --prod` from the project folder does the same thing.

## Repo layout

```
index.html          translator (home)
appeal.html         appeal-letter generator
denials.html        the Denial Playbook
api/                serverless functions (translate, appeal, lead, codelibrary, codepage, sitemap)
lib/                code-library data (CPT in three modules, ICD-10, denial reasons)
scripts/            build-codes.js — validates the data files (legacy static generator)
supabase/           waitlist.sql — one-time table setup
vercel.json         routes, headers, function timeouts
robots.txt
```

## Privacy posture

Nothing a visitor pastes or uploads is stored. The only data kept is the waitlist (email + category). Pages ask visitors to leave out names, birthdates, and ID numbers, and the prompts instruct the model not to repeat them.
