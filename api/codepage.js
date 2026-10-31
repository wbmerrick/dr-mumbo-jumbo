// Dr Mumbo Jumbo — server-rendered plain-English code pages (/codes/:slug). Styled by /nocturne.css.
const cpt = [...require('../lib/codes-cpt-a.js'), ...require('../lib/codes-cpt-b.js'), ...require('../lib/codes-cpt-c.js')];
const icd = require('../lib/codes-icd.js');
const denial = require('../lib/codes-denial.js');

const ALL = [...cpt, ...icd, ...denial];
const BY_SLUG = new Map(ALL.map((e) => [e.slug, e]));

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SPRITE = `<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></symbol>
<symbol id="i-cr" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
<symbol id="i-receipt" viewBox="0 0 24 24"><path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z"/><path d="M8 8h8M8 12h8M8 16h5"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></symbol>
<symbol id="i-sig" viewBox="0 0 24 24"><path d="M3 16.5c2.5-5 4.3-7.5 5.4-7.5 1.6 0 .2 5.5-.7 7.2-.5 1 .2 1.3 1 .5 1.5-1.5 2.6-4 3.6-4 .9 0 .5 2.3 1.5 2.3.8 0 1.6-.8 2.2-1.5"/><path d="M3 21h18"/></symbol>
</svg>`;
const HEADER = `<header class="site-header">
  <div class="wrap bar">
    <a class="brand" href="/"><span class="mark">?!</span>Dr Mumbo Jumbo</a>
    <nav class="nav" aria-label="Main">
      <a href="/" class="xl">Translator</a>
      <a href="/appeal">Appeal<span class="xl"> letter</span></a>
      <a href="/denials">Playbook</a>
      <a href="/codes/" aria-current="page">Codes</a>
      <a class="btn btn-primary btn-sm" href="/fightpack">Fight Pack</a>
    </nav>
  </div>
</header>`;
const FOOTER = `<footer class="site-footer">
  <div class="wrap">
    <div class="hr full"></div>
    <div class="cols">
      <div><h4>Tools</h4><ul><li><a href="/">Translator</a></li><li><a href="/appeal">Appeal letter</a></li><li><a href="/fightpack">Fight Pack</a></li></ul></div>
      <div><h4>Learn</h4><ul><li><a href="/denials">Denial Playbook</a></li><li><a href="/codes/">Code library</a></li><li><a href="/how-its-tested">How it's tested</a></li></ul></div>
      <div class="about"><h4>About</h4><p>Built by a practicing physician.</p><p>Nothing you paste or upload is stored.</p><p><a href="mailto:hello@dr-mumbo-jumbo.com">hello@dr-mumbo-jumbo.com</a></p></div>
      <div><h4>Legal</h4><ul><li><a href="/privacy">Privacy</a></li><li><a href="/terms">Terms</a></li></ul></div>
    </div>
    <p class="legal">Dr Mumbo Jumbo is an educational self-advocacy tool, not medical, legal or financial advice, and it does not create a doctor–patient relationship. Letters and kits are drafts for you and your clinician to review, complete and send yourselves; they are written by AI and can contain mistakes, so read every line before you send it. Appeal rights and deadlines vary by plan and state; your denial letter and plan documents control. In an emergency, call 911.</p>
    <p class="copy"><span class="mark">?!</span>© 2026 Dr Mumbo Jumbo</p>
  </div>
</footer>`;

function shell(title, desc, pathname, body) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://dr-mumbo-jumbo.com${esc(pathname)}">
<meta property="og:site_name" content="Dr Mumbo Jumbo">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="https://dr-mumbo-jumbo.com${esc(pathname)}">
<meta property="og:image" content="https://dr-mumbo-jumbo.com/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#07080C">
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='26'%20fill='%23D7FF3F'/%3E%3Ctext%20x='50'%20y='68'%20font-size='48'%20text-anchor='middle'%20font-family='Inter%2CArial%2Csans-serif'%20font-weight='700'%20fill='%230B0D12'%3E%3F!%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/nocturne.css">
<style>
.crumb{font-size:13px;color:var(--muted);margin-top:28px}
.crumb a{color:var(--muted)}
.crumb a:hover{color:var(--text)}
.chips{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0 6px}
.codename{font-size:clamp(1.05rem,2.2vw,1.25rem);color:var(--soft);margin:8px 0 24px}
.cards{display:flex;flex-direction:column;gap:12px}
.cards .card{padding:20px}
.cards .card h2{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:500}
.cards .card p{font-size:16px;color:var(--text);line-height:1.6}
.cards .card.tint h2{color:var(--accent)}
.rel{margin-top:34px}
.rel h2{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:500;margin-bottom:12px}
.relgrid{display:flex;gap:8px;flex-wrap:wrap}
.relgrid a{font-size:13px;padding:6px 12px;border-radius:var(--r-md);border:1px solid var(--divider);color:var(--soft);text-decoration:none}
.relgrid a:hover{border-color:var(--accent);color:var(--text);text-decoration:none}
.cta{margin-top:30px}
</style>
</head>
<body>
${SPRITE}
${HEADER}
<main>
  <div class="wrap wrap-narrow">
${body}
  </div>
</main>
${FOOTER}
</body>
</html>`;
}

function page(entry) {
  const related = ALL.filter((e) => e.category === entry.category && e.slug !== entry.slug).slice(0, 6);
  const title = `${entry.code} in plain English — ${entry.name} | Dr Mumbo Jumbo`;
  const desc = `${entry.code} explained in plain English: ${entry.what}`.slice(0, 155);
  const isCpt = entry.system === 'CPT';
  const isDenial = entry.system === 'Denial code';
  const body = `
    <nav class="crumb" aria-label="Breadcrumb"><a href="/codes/">Code library</a> &nbsp;/&nbsp; ${esc(entry.code)}</nav>
    <div class="chips"><span class="tag tag-neutral">${esc(entry.system)}</span><span class="tag tag-accent">${esc(entry.category)}</span></div>
    <h1>${esc(entry.code)}, in plain English<span class="lime">.</span></h1>
    <p class="codename">${esc(entry.name)}</p>

    <div class="cards">
      <div class="card"><h2>What it means</h2><p>${esc(entry.what)}</p></div>
      <div class="card"><h2>Where you'll see it</h2><p>${esc(entry.seen)}</p></div>
      <div class="card tint"><h2>Worth checking</h2><p>${esc(entry.watch)}</p></div>
    </div>

    ${isDenial ? `<section class="panel tint cta">
      <span class="kicker">Fighting a ${esc(entry.code)} denial?</span>
      <h2 class="mt-1">Fewer than 1 in 100 denials are appealed, and appeals often win.</h2>
      <p class="lead mt-2">Paste your denial letter and get a ready-to-edit appeal letter back, free. The Fight Pack adds the letter your doctor signs.</p>
      <div class="row mt-3">
        <a class="btn btn-primary btn-lg" href="/appeal"><svg class="ic" style="width:18px;height:18px" aria-hidden="true"><use href="#i-pen"/></svg> Draft my appeal letter</a>
        <a class="btn btn-secondary btn-lg" href="/denials">The Denial Playbook</a>
      </div>
    </section>` : `<section class="panel tint cta">
      <span class="kicker">Got a bill or EOB with ${esc(entry.code)} on it?</span>
      <h2 class="mt-1">Paste the whole thing into the free translator.</h2>
      <p class="lead mt-2">It gives the bill back in plain English: charges, codes and what's worth questioning.</p>
      <div class="row mt-3">
        <a class="btn btn-primary btn-lg" href="/?mode=bill#translator"><svg class="ic" style="width:18px;height:18px" aria-hidden="true"><use href="#i-receipt"/></svg> Translate my bill</a>
        <a class="btn btn-secondary btn-lg" href="/fightpack"><svg class="ic" style="width:18px;height:18px" aria-hidden="true"><use href="#i-sig"/></svg> Fight Pack</a>
      </div>
    </section>`}

    ${related.length ? `<div class="rel"><h2>Related codes</h2><div class="relgrid">${related.map((r) => `<a href="/codes/${esc(r.slug)}">${esc(r.code)} · ${esc(r.name.length > 42 ? r.name.slice(0, 40) + '…' : r.name)}</a>`).join('')}</div></div>` : ''}
    <p class="small mt-4">Original plain-language education, not medical, billing or legal advice, and not an official code descriptor. Codes get combined, modified and occasionally mistyped; your itemized bill, your plan documents and your care team are the source of truth.${isCpt ? ' CPT® is a registered trademark of the American Medical Association.' : ''}</p>`;
  return shell(title, desc, '/codes/' + entry.slug, body);
}

function notFound() {
  return shell('Code not found | Dr Mumbo Jumbo', 'That code is not in the library yet.', '/codes/', `
    <section class="hero">
      <span class="kicker">Code library</span>
      <h1>We haven't decoded that one yet.</h1>
      <p class="lead">Browse the <a href="/codes/">code library</a>, or paste your bill into the <a href="/?mode=bill#translator">free translator</a> and it will explain the whole thing.</p>
    </section>`);
}

module.exports = (req, res) => {
  const slug = String((req.query && req.query.slug) || '').toLowerCase().trim();
  const entry = BY_SLUG.get(slug);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!entry) {
    res.setHeader('Cache-Control', 'public, s-maxage=3600');
    res.status(404).send(notFound());
    return;
  }
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(page(entry));
};
