# Dr Mumbo Jumbo

**dr-mumbo-jumbo.com** — medical jargon, bills, and insurance denials translated into plain English, plus a free appeal-letter generator for denied claims.

Live at https://dr-mumbo-jumbo.com (hosted on Vercel; the domain is registered at Squarespace and pointed at Vercel by DNS).

## What's on the site

| Route | What it does | Served by |
|---|---|---|
| `/` | The translator: paste (or photograph / upload) a visit note, lab report, bill, EOB, or denial letter and get a plain-English translation. Two modes: *Doctor-speak* and *Bill or denial*. | `index.html` → `POST /api/translate` |
| `/appeal` | Free insurance appeal-letter generator: paste or upload a denial letter, get a ready-to-finish internal appeal letter. | `appeal.html` → `POST /api/appeal` |
| `/denials` | The Denial Playbook: the six moves for overturning a denial, with deadlines. | `denials.html` |
| `/fightpack` | **The Fight Pack (free for now):** the complete kit — appeal letter, Letter of Medical Necessity for the treating doctor to sign, phone scripts, records request, external-review request, deadline tracker with calendar download. | `fightpack.html` → `POST /api/checkout`, `/api/unlock`, `/api/fightpack` |
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
| `ANTHROPIC_API_KEY` | yes | Powers the translator, the appeal letter and the Fight Pack (`/api/translate`, `/api/appeal`, `/api/fightpack`). Until it is set, each returns a friendly 503 "not switched on yet" message. |
| `ANTHROPIC_MODEL` | no | Override the default model for the free tools. |
| `FIGHTPACK_MODEL` | no | Model for the Fight Pack (default `claude-sonnet-4-5`). |
| `FIGHTPACK_FREE` | no | The Fight Pack is free unless this is `0` (or `false` / `off`). Set it to `0` when payments go live. |
| `STRIPE_SECRET_KEY` | for payments | Stripe secret key (`sk_test_…` to rehearse, `sk_live_…` to sell). |
| `STRIPE_PRICE_ID` | for payments | The one-time price (`price_…`) from the Stripe product. |
| `FIGHTPACK_SECRET` | yes (any random string) | Signs the unlock tokens (free or paid), combined with the Stripe key when there is one. |
| `FIGHTPACK_PREVIEW_CODE` | no | A private code that unlocks the kit without paying — for testing. Remove or rotate after launch. |

Waitlist storage: run `supabase/waitlist.sql` once in the Supabase SQL Editor. `api/lead.js` uses the project's publishable (anon) key, which is public by design; row-level security allows inserts only.

### The Fight Pack is free (for now)

While `FIGHTPACK_FREE` is unset, anyone can build a kit: the page asks `/api/unlock` for a free token and builds. Each kit costs about $0.16–0.24 in model usage (Sonnet 4.5: ~16K input, ~6.6K output and ~35K cached tokens per kit, measured over the ten test cases of run 21). Attachments cost more: of the first two kits built through the free path in production, case G (text) cost $0.18 and case J (a PDF letter plus records) $0.24. So 1,000 kits ≈ $165–240.

Free use is limited per visitor so nobody can run up the bill: 3 free tokens an hour and 10 a day per IP address, and each token covers 24 model calls over its whole life (a kit is 6, plus retries — about four kits) before the page quietly asks for a new one. So one visitor tops out around a dozen kits an hour and forty a day. The counts live in each server instance's memory, so they are a speed bump, not a hard cap. The hard caps:

1. **Claude Console → Billing → Spend limits → Set limit** (platform.claude.com/settings/billing): a monthly cap for the organization. At the cap the model API refuses requests instead of billing more. The Fight Pack then tells visitors plainly that the free kit "has reached its limit for now" (it does not ask them to retry); the appeal letter and translator share the key and show their usual "try again" message.
2. **Optional — Vercel → Project → Firewall → Rules:** a rate limit on `/api/fightpack` (for example 40 requests per 10 minutes per IP).

### Switching on Fight Pack payments (later)

1. In Stripe: Products → Add product → "Dr Mumbo Jumbo Fight Pack", one-time, at the chosen price. Copy the price ID (`price_…`).
2. Developers → API keys → copy the secret key. Start with test mode (`sk_test_…`) and Stripe's test card 4242 4242 4242 4242.
3. Vercel → Project → Settings → Environment Variables: add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and `FIGHTPACK_FREE=0` (Production), then Redeploy. The page switches its button back to checkout by itself; the price wording in `fightpack.html`, `index.html`, `appeal.html` and `api/codepage.js` says "free" and needs the new price.
4. Buy a kit on the live site with the test card; confirm it unlocks and generates. Then swap in the live key and the live price ID and redeploy.
5. In Stripe → Settings → Public details, set the support email/phone that appears on receipts.

How the unlock works: in free mode `/api/unlock` hands the browser a signed token on request; with payments on, Checkout returns to `/fightpack?session_id=…` and `/api/unlock` confirms with Stripe that the session is paid before signing a 72-hour token. `/api/fightpack` only generates for a valid token. Nothing is stored server-side — the kit lives in the buyer's browser (and wherever they copy or print it).

## Deploying

The site is plain static HTML plus Node serverless functions — no build step, no dependencies.

- **From this repo:** import it into the Vercel project (Vercel → Project → Settings → Git) and every push to `main` deploys.
- **Without Git:** `npx vercel --prod` from the project folder does the same thing.

## Repo layout

```
index.html          translator (home)
appeal.html         free appeal-letter generator
fightpack.html      the Fight Pack (free unlock or checkout, six-pass kit builder, deadline tracker)
fightpack.js        the Fight Pack page's client code (passes, retries, kit renderer, tracker)
denials.html        the Denial Playbook
api/                serverless functions (translate, appeal, fightpack, checkout, unlock, lead, codelibrary, codepage, sitemap)
api/_lib/           the Fight Pack engine, kept out of the public site (Vercel serves neither functions nor `_` folders under api/)
                    fightpack-preamble.js / -sections.js / -rules.js / -prompts.js — the kit writer's rules, as prose
                    fightpack-guards.js — the deterministic text guards and the safety renderer
                    fightpack-limits.js — settings, vehicles and waits; choice and notice (v9.8.2–v9.8.3)
lib/                code-library data (CPT in three modules, ICD-10, denial reasons); unlock.js (tokens); files.js (attachments).
                    These stay publicly readable (static hosting serves them; vercel.json only redirects the plain /lib/ path),
                    so nothing secret or proprietary goes here.
qa/                 the Fight Pack test corpus, live runner, checker, replay, unit tests and evidence
docs/               fightpack-qa.md — how the Fight Pack is tested, the results, and what is unproven
scripts/            build-codes.js — validates the data files (legacy static generator)
supabase/           waitlist.sql — one-time table setup
vercel.json         routes, headers, function timeouts
robots.txt
```

## Privacy posture

Nothing a visitor pastes or uploads is stored. The only data kept is the waitlist (email + category). Pages ask visitors to leave out names, birthdates, and ID numbers, and the prompts instruct the model not to repeat them.
