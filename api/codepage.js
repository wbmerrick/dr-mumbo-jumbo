// Dr Mumbo Jumbo — server-rendered plain-English code pages (/codes/:slug).
const cpt = [...require('../lib/codes-cpt-a.js'), ...require('../lib/codes-cpt-b.js'), ...require('../lib/codes-cpt-c.js')];
const icd = require('../lib/codes-icd.js');
const denial = require('../lib/codes-denial.js');

const ALL = [...cpt, ...icd, ...denial];
const BY_SLUG = new Map(ALL.map((e) => [e.slug, e]));

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CSS = `
:root{--paper:#FAF3E7;--ink:#1D1033;--ink-soft:#4A3D66;--violet:#6C3BFF;--coral:#FF5A3C;--teal:#0FB5AE;--yellow:#FFC838;--card:#FFFDF7;--border:3px solid var(--ink);--shadow:6px 6px 0 var(--ink);--shadow-sm:4px 4px 0 var(--ink);--display:"Bricolage Grotesque",system-ui,sans-serif;--body:"Inter",system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--body);background:var(--paper);color:var(--ink);line-height:1.6;-webkit-font-smoothing:antialiased;background-image:radial-gradient(rgba(29,16,51,.055) 1.2px,transparent 1.2px);background-size:26px 26px}
.wrap{max-width:860px;margin:0 auto;padding:0 20px}
header{padding:20px 0}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.wordmark{font-family:var(--display);font-weight:800;font-size:1.15rem;display:inline-flex;align-items:center;gap:9px;text-decoration:none;color:var(--ink)}
.glyph{width:34px;height:34px;border-radius:10px;background:var(--violet);color:var(--paper);display:inline-flex;align-items:center;justify-content:center;font-size:.95rem;font-weight:800;border:var(--border);box-shadow:var(--shadow-sm)}
.navlink{font-weight:700;font-size:.85rem;color:var(--ink);text-decoration:none;border:var(--border);border-radius:999px;padding:6px 14px;background:var(--card);box-shadow:var(--shadow-sm)}
.crumb{font-size:.8rem;font-weight:600;color:var(--ink-soft);margin:18px 0 10px}
.crumb a{color:var(--violet);text-decoration:none;font-weight:700}
.chips{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 6px}
.chip{font-size:.72rem;font-weight:700;letter-spacing:.05em;text-transform:uppercase;border:2px solid var(--ink);border-radius:999px;padding:3px 10px;background:var(--yellow)}
.chip.sys{background:var(--card)}
h1{font-family:var(--display);font-weight:800;font-size:clamp(1.9rem,5.5vw,3rem);line-height:1.05;letter-spacing:-.01em;margin:6px 0 4px}
.codename{font-size:clamp(1.05rem,2.5vw,1.3rem);font-weight:600;color:var(--ink-soft);margin-bottom:26px}
.card{background:var(--card);border:var(--border);border-radius:16px;box-shadow:var(--shadow-sm);padding:22px;margin-bottom:18px}
.card h2{font-family:var(--display);font-weight:800;font-size:1.05rem;letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px}
.card p{color:#2A1E4A;font-size:1rem}
.card.watch{background:#FFF1ED;border-color:var(--ink)}
.card.watch h2{color:#A32B14}
.cta{background:var(--ink);color:var(--paper);border:var(--border);border-radius:16px;box-shadow:6px 6px 0 var(--violet);padding:26px;margin:28px 0}
.cta h2{font-family:var(--display);font-weight:800;font-size:1.3rem;margin-bottom:6px;color:var(--yellow)}
.cta p{color:#EDE6F6;font-size:.95rem;margin-bottom:16px}
.btnrow{display:flex;gap:12px;flex-wrap:wrap}
.btn{font-family:var(--display);font-weight:800;font-size:.95rem;border:3px solid var(--paper);border-radius:12px;padding:11px 18px;text-decoration:none;display:inline-block}
.btn.primary{background:var(--coral);color:#fff}
.btn.ghost{background:transparent;color:var(--paper)}
.rel{margin:30px 0 10px}
.rel h2{font-family:var(--display);font-weight:800;font-size:1.05rem;letter-spacing:.07em;text-transform:uppercase;margin-bottom:12px}
.relgrid{display:flex;gap:10px;flex-wrap:wrap}
.relgrid a{font-size:.85rem;font-weight:700;color:var(--ink);text-decoration:none;border:2px solid var(--ink);border-radius:10px;padding:8px 12px;background:var(--card);box-shadow:3px 3px 0 var(--ink)}
footer{padding:40px 0 50px}
.rule{border:none;border-top:3px solid var(--ink);margin-bottom:24px}
.legal{font-size:.76rem;color:var(--ink-soft);line-height:1.7;max-width:720px}
@media (max-width:640px){.card{padding:18px}.cta{padding:20px}}
`;

function page(entry) {
  const related = ALL.filter((e) => e.category === entry.category && e.slug !== entry.slug).slice(0, 6);
  const title = `${entry.code} in plain English — ${entry.name}`;
  const desc = `${entry.code} explained in plain English: ${entry.what}`.slice(0, 155);
  const isCpt = entry.system === 'CPT';
  const isDenial = entry.system === 'Denial code';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Dr Mumbo Jumbo</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="https://dr-mumbo-jumbo.com/codes/${esc(entry.slug)}">
<meta property="og:title" content="${esc(entry.code)} in plain English">
<meta property="og:description" content="${esc(entry.name)} — decoded by Dr Mumbo Jumbo.">
<meta property="og:type" content="article">
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='22'%20fill='%236C3BFF'/%3E%3Ctext%20x='50'%20y='70'%20font-size='54'%20text-anchor='middle'%20font-family='Arial,Helvetica,sans-serif'%20font-weight='900'%20fill='%23FAF3E7'%3E%3F!%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
<header class="wrap">
  <div class="bar">
    <a class="wordmark" href="/"><span class="glyph">?!</span> DR MUMBO JUMBO</a>
    <a class="navlink" href="/codes/">Code library</a>
  </div>
</header>
<main class="wrap">
  <nav class="crumb"><a href="/codes/">Code library</a> &nbsp;/&nbsp; ${esc(entry.code)}</nav>
  <div class="chips"><span class="chip sys">${esc(entry.system)}</span><span class="chip">${esc(entry.category)}</span></div>
  <h1>${esc(entry.code)}, in plain English</h1>
  <p class="codename">${esc(entry.name)}</p>

  <div class="card"><h2>What it means</h2><p>${esc(entry.what)}</p></div>
  <div class="card"><h2>Where you'll see it</h2><p>${esc(entry.seen)}</p></div>
  <div class="card watch"><h2>Worth checking</h2><p>${esc(entry.watch)}</p></div>

  ${isDenial ? `<div class="cta">
    <h2>Fighting a ${esc(entry.code)} denial?</h2>
    <p>Fewer than 1 in 100 denials ever get appealed — and appeals often win. Paste your denial letter and get a ready-to-edit appeal letter back, free.</p>
    <div class="btnrow">
      <a class="btn primary" href="/appeal">Draft my appeal letter free →</a>
      <a class="btn ghost" href="/denials">The Denial Playbook</a>
    </div>
  </div>` : `<div class="cta">
    <h2>Got a bill or EOB with ${esc(entry.code)} on it?</h2>
    <p>Paste the whole thing into the free decoder and get it back in plain English — charges, codes, and what's worth questioning.</p>
    <div class="btnrow">
      <a class="btn primary" href="/?mode=bill#translator">Decode my bill free →</a>
      <a class="btn ghost" href="/fightpack">Fight Pack — free</a>
    </div>
  </div>`}

  ${related.length ? `<div class="rel"><h2>Related codes</h2><div class="relgrid">${related.map((r) => `<a href="/codes/${esc(r.slug)}">${esc(r.code)} · ${esc(r.name.length > 42 ? r.name.slice(0, 40) + '…' : r.name)}</a>`).join('')}</div></div>` : ''}
</main>
<footer class="wrap">
  <hr class="rule">
  <p class="legal"><strong>The serious bit:</strong> This page is original plain-language education from Dr Mumbo Jumbo — it is not medical, billing, or legal advice, and it is not an official code descriptor. Codes get combined, modified, and occasionally mistyped; your itemized bill, your plan documents, and your own care team are the source of truth.${isCpt ? ' CPT® is a registered trademark of the American Medical Association.' : ''} In an emergency, call 911.</p>
  <p class="legal" style="margin-top:10px">© 2026 Dr Mumbo Jumbo · <a href="/" style="color:var(--violet);font-weight:700;text-decoration:none">dr-mumbo-jumbo.com</a></p>
</footer>
</body>
</html>`;
}

function notFound() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Code not found | Dr Mumbo Jumbo</title><style>${CSS}</style>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet"></head>
<body><main class="wrap" style="padding-top:60px">
<h1>Hmm — we haven't decoded that one yet.</h1>
<p class="codename">Browse the <a href="/codes/" style="color:var(--violet);font-weight:700">code library</a>, or paste your bill into the <a href="/" style="color:var(--violet);font-weight:700">free decoder</a> and we'll translate the whole thing.</p>
</main></body></html>`;
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
