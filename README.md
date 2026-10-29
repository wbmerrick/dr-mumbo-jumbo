# Dr Mumbo Jumbo

**[dr-mumbo-jumbo.com](https://dr-mumbo-jumbo.com)** — Your doctor said what?

An AI-powered tool that translates medical jargon into plain English. Paste a visit note, lab report, discharge summary, medication list, or insurance/billing document and get it back in everyday words. Also generates insurance denial appeal letters and hosts a plain-English library of common CPT, ICD-10, and denial codes.

## Stack

Zero-dependency static site + Vercel serverless functions (Node). No build step, no framework.

## Structure

```
index.html            Landing page + translator UI
appeal.html           Appeal letter generator UI
denials.html          Insurance denials explainer
api/translate.js      Plain-English translation endpoint (Claude API)
api/appeal.js         Appeal-letter generator endpoint (Claude API)
api/lead.js           Fight Pack waitlist signup (Supabase, insert-only via RLS)
api/codelibrary.js    Server-rendered code library index (/codes/)
api/codepage.js       Server-rendered per-code pages (/codes/:slug)
api/sitemap.js        sitemap.xml generated from the code data
lib/codes-*.js        CPT / ICD-10 / denial code datasets
vercel.json           Function config, rewrites, security headers
```

## Environment variables (set in Vercel project settings)

- `ANTHROPIC_API_KEY` — required for `/api/translate` and `/api/appeal`
- `ANTHROPIC_MODEL` — optional, defaults to `claude-haiku-4-5`

The Supabase key embedded in `api/lead.js` is the publishable (anon) key — public by design; the waitlist table is protected by insert-only row-level security.

## Deploy

Hosted on Vercel (project `dr-mumbo-jumbo`). Deploy from the repo root:

```
vercel deploy --prod
```
