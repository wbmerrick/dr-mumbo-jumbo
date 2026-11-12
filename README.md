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
| `/how-its-tested` | How the Fight Pack is tested, with the bottom-line numbers from `docs/fightpack-qa.md`. | `how-its-tested.html` |
| `/privacy`, `/terms` | Privacy and terms, in plain words. | `privacy.html`, `terms.html` |
| `/checkin` | The page a check-in email opens: one question, an answer to tap. Not indexed, not in the sitemap. | `checkin.html` → `POST /api/checkin` |
| `POST /api/app-checkin` | Check-ins asked for from the app: a ticket per question for in-app answers, and the two emails if an address is given. Nothing on the site calls it. | `api/app-checkin.js` |
| `/sitemap.xml` | Generated sitemap for every page above. | `api/sitemap.js` |
| `POST /api/lead` | Fight Pack waitlist signup (email + what they're fighting). | `api/lead.js` → Supabase |

Routing lives in `vercel.json` (clean URLs, function timeouts, security headers).

Every page shares one stylesheet, `nocturne.css`: the layout and components of the Dr Mumbo Jumbo app (the Nocturne design system) in the iSpry.ai palette (near-black, warm off-white text, electric-lime accent, lime pill buttons). Headlines are set in Bricolage Grotesque with the closing punctuation in lime; the documents a person sends (appeal letter, doctor's letter, records and external-review requests) render on off-white paper in a serif, with the brackets to fill highlighted. The server-rendered code pages link it too, so a change there restyles the whole site. `og.png` is the image shown when a link is shared.

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
| `RESEND_API_KEY` | for "Email me my kit" | A Resend API key with **Sending access** (`re_…`). Until it is set, `/api/email-kit` returns a friendly 503 and the page's other two exits (Copy everything, Print) still work. The sender is `hello@dr-mumbo-jumbo.com`, so `dr-mumbo-jumbo.com` must be added and verified at resend.com/domains (DNS records go into Squarespace DNS). |
| `RESEND_FROM` | no | Overrides the sender. Set it to `Dr Mumbo Jumbo <onboarding@resend.dev>` to prove the pipeline before the domain is verified — Resend then delivers only to the account owner's own address — and remove it once the domain shows Verified. A failed send is counted as `kit_email_failed` with a `why` and a `fix` naming what to change. |

Waitlist storage: run `supabase/waitlist.sql` once in the Supabase SQL Editor. `api/lead.js` uses the project's publishable (anon) key, which is public by design; row-level security allows inserts only.

### The Fight Pack is free (for now)

While `FIGHTPACK_FREE` is unset, anyone can build a kit: the page asks `/api/unlock` for a free token and builds. Each kit costs about $0.16–0.24 in model usage (Sonnet 4.5: ~16K input, ~6.6K output and ~35K cached tokens per kit, measured over the ten test cases of run 21). Attachments cost more: of the first two kits built through the free path in production, case G (text) cost $0.18 and case J (a PDF letter plus records) $0.24. So 1,000 kits ≈ $165–240.

Free use is limited per visitor so nobody can run up the bill: 3 free tokens an hour and 10 a day per IP address, and each token covers 24 model calls over its whole life (a kit is 6, plus retries — about four kits) before the page quietly asks for a new one. So one visitor tops out around a dozen kits an hour and forty a day. The free translator and appeal letter use the same account, so they have a per-visitor allowance too: 30 translations an hour and 100 a day, 10 letters an hour and 30 a day (`FREE_USE` in `lib/unlock.js`; a request turned away before the model, such as an empty one, does not count). The counts live in each server instance's memory, so they are a speed bump, not a hard cap. The hard caps:

1. **Claude Console → Billing → Spend limits → Set limit** (platform.claude.com/settings/billing): a monthly cap for the organization. At the cap the model API refuses requests instead of billing more. The Fight Pack then tells visitors plainly that the free kit "has reached its limit for now" (it does not ask them to retry); the appeal letter and the translator share the key and say the same plainly.
2. **Optional — Vercel → Project → Firewall → Rules:** a rate limit on `/api/` (for example 60 requests per 10 minutes per IP), which holds across server instances.

### Where kits come from

Every kit part is counted in `public.dmj_events` (Supabase) with the kit's throwaway tag and one word for where its reader came from, `src`:

- the tag on the link they followed: `https://dr-mumbo-jumbo.com/?utm_source=reddit` is counted as `reddit`. Any tag works; it is cut down to lowercase letters, digits and dashes, 24 at most;
- with no tag, a name for the site that linked here: `reddit`, `x`, `threads`, `bluesky`, `hn`, `facebook`, `linkedin`, `google`, `bing`, `duckduckgo`, `chatgpt`, `perplexity` or `claude`, and `other` for any site not on that list (`fightpack.js`);
- `site` for a reader who arrived from another page of this site, and `direct` when the browser names no page at all. Many links opened inside phone apps arrive that way, so tag the links you post;
- `qa` for the test runner (`qa/fp-run.js`) and `unknown` for a caller that sent no word. Kits built before November 11, 2026 have none.

The word is all that is kept: never the address of the page the reader came from. It lasts for the browser tab, so a look at another page of the site does not lose it, and no longer. Kits by place, test runs left out:

```sql
with k as (
  select data->>'kid' as kid, max(data->>'src') as src, count(distinct data->>'part') as parts
  from public.dmj_events where evt = 'kit_part' group by 1
)
select coalesce(src, '(before sources)') as source, count(*) as started, count(*) filter (where parts = 6) as built
from k where coalesce(src, '') <> 'qa' group by 1 order by built desc, started desc;
```

### Check-ins: was the appeal sent, and did it win

Under "Email me my kit" there is a box, not ticked. A reader who ticks it gets two more emails: 3 days on, "Has your appeal been sent?", and 28 days on, "What happened with your appeal?". `lib/checkin.js` writes them; `api/email-kit.js` schedules both with Resend (`scheduled_at`) the moment the kit goes out, so nothing on our side keeps a list of who asked. Resend holds a scheduled email for 30 days at most, which is why the second is at four weeks and there is no third.

Each email has one signed link per answer. A link opens `/checkin`, and the answer is counted only when the reader taps it there (`POST /api/checkin`), never when the page opens: mail scanners open every link in a message. What a link carries rides after the `#`, so opening it tells the host only that `/checkin` was opened. The count is one row in `public.dmj_events`: `evt = 'checkin'` with the kit's tag (`kid`), the question (`stage`: 1 or 2) and the `answer` (`sent`, `notyet`; `won`, `lost`, `waiting`, `nosend`). No address is in a link or a count.

The latest answer per kit and question (a reader can change their mind):

```sql
with a as (
  select distinct on (data->>'kid', data->>'stage') data->>'kid' as kid, data->>'stage' as stage, data->>'answer' as answer
  from public.dmj_events where evt = 'checkin' order by data->>'kid', data->>'stage', id desc
)
select stage, answer, count(*) as kits from a group by 1, 2 order by 1, 3 desc;
```

How many emailed kits asked for check-ins (what the answers are a share of), by where the reader came from:

```sql
select coalesce(data->>'src', '(before sources)') as source, count(*) as emailed,
       count(*) filter (where (data->>'checkins')::int > 0) as with_checkins
from public.dmj_events where evt = 'kit_emailed' group by 1 order by 2 desc;
```

Answers by where the kit's reader came from (the tag ties an answer to its kit's build rows):

```sql
with a as (
  select distinct on (data->>'kid', data->>'stage') data->>'kid' as kid, data->>'stage' as stage, data->>'answer' as answer
  from public.dmj_events where evt = 'checkin' order by data->>'kid', data->>'stage', id desc
), k as (
  select data->>'kid' as kid, max(data->>'src') as src from public.dmj_events where evt = 'kit_part' group by 1
)
select coalesce(k.src, '(no build row)') as source, a.stage, a.answer, count(*) as kits
from a left join k using (kid) group by 1, 2, 3 order by 1, 2, 4 desc;
```

Things to know before relying on them:

- **A reader who replies to the first email asking not to get the second has been promised it will not come** (the email and `privacy.html` both say so). Cancel it by hand: Resend → Emails → the scheduled email to that address → Cancel. The site's key has Sending access only and cannot cancel for you.
- **A scheduled email is sent with the API key that scheduled it.** If that key is deleted in Resend before the email goes out, it fails. When replacing `RESEND_API_KEY`, add the new key and leave the old one active for 30 days.
- **Rotating `FIGHTPACK_SECRET` closes every check-in link that is out**, as it ends every session: the links are signed with it. A link also stops taking answers 180 days after its kit was emailed.
- The first email says a second is coming, so the second is scheduled first; if it cannot be, the first is not sent either. A check-in that could not be scheduled is counted as `checkin_failed` with `stage`, `why` and `fix`, like `kit_email_failed`, and the reader is told. It never fails the kit email.
- Pressing "Email me my kit" twice does not double them: each carries an idempotency key (kit, question, a hash of the address) that Resend keeps for 24 hours.
- `kit_emailed` now carries `src` and `checkins` (0, 1 or 2 scheduled). It does not carry the kit's tag: that request is the one holding the reader's address, which is kept for launch news in the same second, and a tag there would sit beside it by time.

### Check-ins from the app

The app has no kit to email, so it turns check-ins on with `POST /api/app-checkin` instead. Nothing on the site calls this endpoint.

The request is `{ token, kid, email }`. `token` is a session token from `/api/unlock`, required. `kid` is the app's own random tag for these check-ins (letters and digits, 6 to 24); the app keeps it and sends the same one if it asks again. `email` is optional.

The answer is `{ ok, kid, checkins, tickets, message }`:

- `tickets` has one entry per question, `{ k, s, d, t }`: what a check-in link carries, less the answer. The app asks the question on its own screen (3 days on, then 28) and posts the ticket with the tapped answer, `{ k, s, d, t, a }`, to `/api/checkin`. It is counted as any answer is: `evt = 'checkin'` with `kid`, `stage` and `answer`. A ticket stops working after 180 days, as a link does.
- If an address was given, the two emails are scheduled with Resend as the site's are (week 4 first, the same idempotency keys, the same `checkin_failed` count when one cannot be set), in the app's words: they do not speak of a kit email or numbered sections. `checkins` is how many were set and `message` is what to tell the reader. Their links carry `v=app`, which `/checkin` reads only to choose its words.

One row is counted per request: `evt = 'app_checkin'` with `kid` and `emails` (0, 1 or 2). Answers that came from the app's check-ins, by question:

```sql
with a as (
  select distinct on (data->>'kid', data->>'stage') data->>'kid' as kid, data->>'stage' as stage, data->>'answer' as answer
  from public.dmj_events where evt = 'checkin' order by data->>'kid', data->>'stage', id desc
)
select a.stage, a.answer, count(*) as readers
from a where a.kid in (select data->>'kid' from public.dmj_events where evt = 'app_checkin') group by 1, 2 order by 1, 3 desc;
```

Things to know:

- **The address is not kept.** It goes to Resend for the two emails and nowhere else: not the waitlist (a kit email's address is kept there for launch news; this one is not), not a count.
- **`privacy.html` does not describe this yet.** Its "Check-ins" paragraph says they are asked for under "Email me my kit". Before an app that calls this endpoint reaches a reader, that paragraph needs the app's case: an address typed in the app is handed to Resend for two emails and not kept by us.
- **Turning check-ins off in the app does not cancel emails already scheduled.** The site's key cannot cancel. The emails say to reply to stop the second one, and that is cancelled by hand in Resend, as above.
- Each visitor may ask 10 times a day (per server instance, like the other allowances), on top of the session token.
- **There are no CORS headers.** A native app does not need them. A web page on another origin cannot call this endpoint, or `/api/unlock`, until they are added for that origin.

### The one line the page adds to a kit

Every document in a kit is written by the model except one line. The fourth document is the note the reader hands over with the letter someone else has to sign (the doctor's office, the billing office, or HR). As the kit is put on the page, `fightpack.js` adds one bullet to that note saying what wrote the drafts and where it is (`ORIGIN_LINE`, added by `withOrigin()`): whoever signs a letter should know a tool drafted it, and that office handles denials every week. It is in what is shown, copied, printed and emailed, above the note's closing thank-you, and not in the kit saved in the browser or in `sample-kit.json`, which stay exactly what the writers wrote. No other document gets it. `qa/tests/test-checkin-page.js` pins it against all the recorded kits.

### Switching on Fight Pack payments (later)

1. In Stripe: Products → Add product → "Dr Mumbo Jumbo Fight Pack", one-time, at the chosen price. Copy the price ID (`price_…`).
2. Developers → API keys → copy the secret key. Start with test mode (`sk_test_…`) and Stripe's test card 4242 4242 4242 4242.
3. Vercel → Project → Settings → Environment Variables: add `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID` and `FIGHTPACK_FREE=0` (Production), then Redeploy. The page switches its button back to checkout by itself; the price wording in `fightpack.html`, `index.html`, `appeal.html`, `denials.html` and `api/codepage.js` says "free" and needs the new price.
4. Buy a kit on the live site with the test card; confirm it unlocks and generates. Then swap in the live key and the live price ID and redeploy.
5. In Stripe → Settings → Public details, set the support email/phone that appears on receipts.

How the unlock works: in free mode `/api/unlock` hands the browser a signed token on request; with payments on, Checkout returns to `/fightpack?session_id=…` and `/api/unlock` confirms with Stripe that the session is paid before signing a 72-hour token. `/api/fightpack` only generates for a valid token. Nothing is stored server-side — the kit lives in the buyer's browser (and wherever they copy or print it).

## Deploying

The site is plain static HTML plus Node serverless functions — no build step, no dependencies.

- **From this repo:** import it into the Vercel project (Vercel → Project → Settings → Git) and every push to `main` deploys.
- **Without Git:** `npx vercel --prod` from the project folder does the same thing.
- **What gets deployed:** `.vercelignore` allows only the site itself (`api/`, `lib/`, the `.html` pages, `fightpack.js`, `sample-kit.json`, `nocturne.css`, `og.png`, `robots.txt`, `vercel.json`). The QA harness, evidence, docs, scripts and SQL stay in the repo and are never served from the website. Add any new top-level site file to that list.

## Repo layout

```
index.html          translator (home)
appeal.html         free appeal-letter generator
fightpack.html      the Fight Pack (free unlock or checkout, six-pass kit builder, deadline tracker)
fightpack.js        the Fight Pack page's client code (passes, retries, kit renderer, tracker)
denials.html        the Denial Playbook
how-its-tested.html, privacy.html, terms.html
                    the trust pages
checkin.html        the page a check-in email opens (one question; counts nothing until an answer is tapped)
sample-kit.json     the finished kit shown by "Try an example": the site's own answer to the example letter, never edited by hand
nocturne.css        the shared design system (tokens, components, print styles)
og.png              the share image
api/                serverless functions (translate, appeal, fightpack, checkout, unlock, lead, codelibrary, codepage, sitemap)
api/_lib/           the Fight Pack engine, kept out of the public site (Vercel serves neither functions nor `_` folders under api/)
                    fightpack-preamble.js / -sections.js / -rules.js / -prompts.js — the kit writer's rules, as prose
                    fightpack-guards.js — the deterministic text guards and the safety renderer
                    fightpack-limits.js — settings, vehicles and waits; choice and notice (v9.8.2–v9.8.3)
                    fightpack-facts.js — the ambulance bill, policy numbers, the doctor's expedited request (v9.10), where Original Medicare records go (v9.11–v9.12), the urgent external-review route (v9.13)
lib/                code-library data (CPT in three modules, ICD-10, denial reasons); unlock.js (tokens); files.js (attachments);
                    checkin.js (the two check-in emails and their signed links; api/checkin.js takes the answers;
                    api/app-checkin.js turns them on for the app).
                    These stay publicly readable (static hosting serves them; vercel.json only redirects the plain /lib/ path),
                    so nothing secret or proprietary goes here.
qa/                 the Fight Pack test corpus, live runner, checker, replay, unit tests and evidence
docs/               fightpack-qa.md — how the Fight Pack is tested, the results, and what is unproven
scripts/            build-codes.js — validates the data files (legacy static generator)
                    build-sample-kit.js — rebuilds sample-kit.json on the live site and scores it (one real kit per run)
supabase/           waitlist.sql — one-time table setup
vercel.json         routes, headers, function timeouts
robots.txt
```

## Privacy posture

Nothing a visitor pastes or uploads is stored. The only data kept is the waitlist table (email + category), which also holds the addresses of people who asked to have a kit emailed to them (source `kit-email`). An emailed kit transits Resend once and is not stored on our side; Resend keeps its copy of the message (contents and delivery records) for its fixed 30-day retention, then deletes it — `privacy.html` says exactly that. Pages ask visitors to leave out names, birthdates, and ID numbers, and the prompts instruct the model not to repeat them. The use counter (`public.dmj_events`) holds counts and flags, and for a kit one word for where its reader came from, never an address; `qa/tests/test-count.js` fails if a count line gains a field. Check-ins are sent only to a reader who ticked the box, are held by Resend and not by us, and contain no part of the kit; an answer is counted with the kit's tag and never with an address (`qa/tests/test-checkin.js`, `test-email-kit.js` and `test-checkin-page.js` hold each of those).
