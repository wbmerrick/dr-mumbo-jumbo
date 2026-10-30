# Dr Mumbo Jumbo

**dr-mumbo-jumbo.com** — medical jargon, bills, and insurance denials translated into plain English, plus a free appeal-letter generator for denied claims.

Live at https://dr-mumbo-jumbo.com (hosted on Vercel; the domain is registered at Squarespace and pointed at Vercel by DNS).

## What's on the site

| Route | What it does | Served by |
|---|---|---|
| `/` | The translator: paste (or photograph / upload) a visit note, lab report, bill, EOB, or denial letter and get a plain-English translation. Two modes: *Doctor-speak* and *Bill or denial*. | `index.html` → `POST /api/translate` |
| `/appeal` | Free insurance appeal-letter generator: paste or upload a denial letter, get a ready-to-finish internal appeal letter. | `appeal.html` → `POST /api/appeal` |
| `/denials` | The Denial Playbook: the six moves for overturning a denial, with deadlines. | `denials.html` |
| `/fightpack` | **The Fight Pack ($39):** the complete kit — appeal letter, Letter of Medical Necessity for the treating doctor to sign, phone scripts, records request, external-review request, deadline tracker with calendar download. | `fightpack.html` → `POST /api/checkout`, `/api/unlock`, `/api/fightpack` |
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
| `ANTHROPIC_MODEL` | no | Override the default model for the free tools. |
| `FIGHTPACK_MODEL` | no | Model for the paid kit (default `claude-sonnet-4-5`). |
| `STRIPE_SECRET_KEY` | for payments | Stripe secret key (`sk_test_…` to rehearse, `sk_live_…` to sell). |
| `STRIPE_PRICE_ID` | for payments | The one-time $39 price (`price_…`) from the Stripe product. |
| `FIGHTPACK_SECRET` | yes (any random string) | Signs the 3-day unlock tokens, combined with the Stripe key. |
| `FIGHTPACK_PREVIEW_CODE` | no | A private code that unlocks the kit without paying — for testing. Remove or rotate after launch. |

Waitlist storage: run `supabase/waitlist.sql` once in the Supabase SQL Editor. `api/lead.js` uses the project's publishable (anon) key, which is public by design; row-level security allows inserts only.

### Switching on Fight Pack payments

1. In Stripe: Products → Add product → "Dr Mumbo Jumbo Fight Pack", one-time, $39. Copy the price ID (`price_…`).
2. Developers → API keys → copy the secret key. Start with test mode (`sk_test_…`) and Stripe's test card 4242 4242 4242 4242.
3. Vercel → Project → Settings → Environment Variables: add `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` (Production), then Redeploy.
4. Buy a kit on the live site with the test card; confirm it unlocks and generates. Then swap in the live key and the live price ID and redeploy.
5. In Stripe → Settings → Public details, set the support email/phone that appears on receipts.

How the unlock works: Checkout returns to `/fightpack?session_id=…`; `/api/unlock` confirms with Stripe that the session is paid and hands the browser a signed 72-hour token; `/api/fightpack` only generates for a valid token. Nothing is stored server-side — the kit lives in the buyer's browser (and wherever they copy or print it).

## Deploying

The site is plain static HTML plus Node serverless functions — no build step, no dependencies.

- **From this repo:** import it into the Vercel project (Vercel → Project → Settings → Git) and every push to `main` deploys.
- **Without Git:** `npx vercel --prod` from the project folder does the same thing.

## Repo layout

```
index.html          translator (home)
appeal.html         free appeal-letter generator
fightpack.html      the paid Fight Pack (checkout, unlock, six-pass kit builder, deadline tracker)
fightpack.js        the Fight Pack page's client code (passes, retries, kit renderer, tracker)
denials.html        the Denial Playbook
api/                serverless functions (translate, appeal, fightpack, checkout, unlock, lead, codelibrary, codepage, sitemap)
lib/                code-library data (CPT in three modules, ICD-10, denial reasons); unlock.js (tokens); files.js (attachments)
                    fightpack-preamble.js / -sections.js / -rules.js — the kit writer's rules, as prose
                    fightpack-guards.js — the deterministic text guards and the safety renderer
qa/                 the Fight Pack test corpus, live runner, checker, replay, unit tests and evidence
docs/               fightpack-qa.md — how the Fight Pack is tested, the results, and what is unproven
scripts/            build-codes.js — validates the data files (legacy static generator)
supabase/           waitlist.sql — one-time table setup
vercel.json         routes, headers, function timeouts
robots.txt
```

## Privacy posture

Nothing a visitor pastes or uploads is stored. The only data kept is the waitlist (email + category). Pages ask visitors to leave out names, birthdates, and ID numbers, and the prompts instruct the model not to repeat them.
