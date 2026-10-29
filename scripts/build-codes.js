// Build script: generates codes/index.html, sitemap.xml, and robots.txt from the data files.
const fs = require('fs');
const path = require('path');

const cpt = require('../lib/codes-cpt.js');
const icd = require('../lib/codes-icd.js');
const denial = require('../lib/codes-denial.js');

const ALL = [...cpt, ...icd, ...denial];
const BASE = 'https://dr-mumbo-jumbo.com';
const root = path.join(__dirname, '..');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---- validation ----
const slugs = new Set();
for (const e of ALL) {
  if (!/^[a-z0-9-]+$/.test(e.slug)) throw new Error('bad slug: ' + e.slug);
  if (slugs.has(e.slug)) throw new Error('duplicate slug: ' + e.slug);
  slugs.add(e.slug);
  for (const k of ['code', 'system', 'category', 'name', 'what', 'seen', 'watch']) {
    if (!e[k]) throw new Error('missing ' + k + ' on ' + e.slug);
  }
}

// ---- group: system -> category -> entries ----
const systems = [];
for (const e of ALL) {
  let sys = systems.find((s) => s.name === e.system);
  if (!sys) { sys = { name: e.system, cats: [] }; systems.push(sys); }
  let cat = sys.cats.find((c) => c.name === e.category);
  if (!cat) { cat = { name: e.category, entries: [] }; sys.cats.push(cat); }
  cat.entries.push(e);
}

const SYS_LABEL = {
  'CPT': 'CPT & HCPCS — what you were billed for',
  'HCPCS': 'CPT & HCPCS — what you were billed for',
  'ICD-10': 'ICD-10 — the diagnosis codes',
  'Denial code': 'Denial & adjustment codes — why insurance didn’t pay'
};

// merge HCPCS entries into the CPT section visually
const merged = [];
for (const sys of systems) {
  const label = SYS_LABEL[sys.name] || sys.name;
  let m = merged.find((x) => x.label === label);
  if (!m) { m = { label, cats: [] }; merged.push(m); }
  for (const cat of sys.cats) {
    let c = m.cats.find((x) => x.name === cat.name);
    if (!c) { c = { name: cat.name, entries: [] }; m.cats.push(c); }
    c.entries.push(...cat.entries);
  }
}

const sections = merged
  .map(
    (m) => `
<section class="sys">
<h2>${esc(m.label)}</h2>
${m.cats
  .map(
    (c) => `
<h3>${esc(c.name)}</h3>
<div class="grid">
${c.entries.map((e) => `<a class="code-link" href="/codes/${e.slug}" data-q="${esc((e.code + ' ' + e.name).toLowerCase())}"><span class="cc">${esc(e.code)}</span><span class="cn">${esc(e.name)}</span></a>`).join('\n')}
</div>`
  )
  .join('\n')}
</section>`
  )
  .join('\n');

const indexHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Medical billing codes in plain English — the code library | Dr Mumbo Jumbo</title>
<meta name="description" content="CPT codes, ICD-10 diagnoses, and insurance denial codes explained in plain English. Find out what the codes on your medical bill and EOB actually mean.">
<link rel="canonical" href="${BASE}/codes/">
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='22'%20fill='%236C3BFF'/%3E%3Ctext%20x='50'%20y='70'%20font-size='54'%20text-anchor='middle'%20font-family='Arial,Helvetica,sans-serif'%20font-weight='900'%20fill='%23FAF3E7'%3E%3F!%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--paper:#FAF3E7;--ink:#1D1033;--ink-soft:#4A3D66;--violet:#6C3BFF;--coral:#FF5A3C;--teal:#0FB5AE;--yellow:#FFC838;--card:#FFFDF7;--border:3px solid var(--ink);--shadow-sm:4px 4px 0 var(--ink);--display:"Bricolage Grotesque",system-ui,sans-serif;--body:"Inter",system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--body);background:var(--paper);color:var(--ink);line-height:1.55;-webkit-font-smoothing:antialiased;background-image:radial-gradient(rgba(29,16,51,.055) 1.2px,transparent 1.2px);background-size:26px 26px}
.wrap{max-width:1020px;margin:0 auto;padding:0 20px}
header{padding:20px 0}
.bar{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.wordmark{font-family:var(--display);font-weight:800;font-size:1.15rem;display:inline-flex;align-items:center;gap:9px;text-decoration:none;color:var(--ink)}
.glyph{width:34px;height:34px;border-radius:10px;background:var(--violet);color:var(--paper);display:inline-flex;align-items:center;justify-content:center;font-size:.95rem;font-weight:800;border:var(--border);box-shadow:var(--shadow-sm)}
.navlink{font-weight:700;font-size:.85rem;color:var(--ink);text-decoration:none;border:var(--border);border-radius:999px;padding:6px 14px;background:var(--yellow);box-shadow:var(--shadow-sm)}
h1{font-family:var(--display);font-weight:800;font-size:clamp(2rem,6vw,3.4rem);line-height:1.05;letter-spacing:-.01em;margin:26px 0 8px}
.sub{color:var(--ink-soft);font-weight:500;max-width:680px;margin-bottom:24px}
.search{width:100%;max-width:520px;font-family:var(--body);font-size:1rem;padding:14px 16px;border:var(--border);border-radius:14px;background:var(--card);margin-bottom:10px}
.search:focus{outline:3px solid var(--violet);outline-offset:2px}
.count-note{font-size:.8rem;font-weight:600;color:var(--ink-soft);margin-bottom:22px}
.sys h2{font-family:var(--display);font-weight:800;font-size:clamp(1.3rem,3vw,1.7rem);margin:34px 0 6px;padding-top:10px;border-top:3px solid var(--ink)}
.sys h3{font-family:var(--display);font-weight:800;font-size:.95rem;letter-spacing:.06em;text-transform:uppercase;color:var(--violet);margin:20px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:10px}
.code-link{display:flex;gap:10px;align-items:baseline;text-decoration:none;color:var(--ink);background:var(--card);border:2px solid var(--ink);border-radius:12px;padding:10px 13px;box-shadow:3px 3px 0 var(--ink)}
.code-link:hover{background:var(--yellow)}
.cc{font-family:var(--display);font-weight:800;font-size:.95rem;white-space:nowrap}
.cn{font-size:.82rem;color:var(--ink-soft);font-weight:500}
.cta{background:var(--ink);color:var(--paper);border:var(--border);border-radius:16px;box-shadow:6px 6px 0 var(--violet);padding:24px;margin:36px 0}
.cta a{color:var(--yellow);font-weight:800;text-decoration:none}
footer{padding:30px 0 50px}
.legal{font-size:.76rem;color:var(--ink-soft);line-height:1.7;max-width:720px;border-top:3px solid var(--ink);padding-top:20px}
.hidden{display:none}
</style>
</head>
<body>
<header class="wrap">
  <div class="bar">
    <a class="wordmark" href="/"><span class="glyph">?!</span> DR MUMBO JUMBO</a>
    <a class="navlink" href="/?mode=bill#translator">Decode a bill free →</a>
  </div>
</header>
<main class="wrap">
  <h1>The code library</h1>
  <p class="sub">Every code on your medical bill, EOB, or denial letter means something specific. Here they are — in plain English, with what's worth double-checking on each one.</p>
  <input class="search" id="q" type="search" placeholder="Search a code or word — try 99214, colonoscopy, CO-50…" aria-label="Search codes">
  <p class="count-note">${ALL.length} codes decoded so far — more added all the time.</p>
  ${sections}
  <div class="cta">Can't find your code, or staring at a whole bill of them? <a href="/?mode=bill#translator">Paste the whole thing into the free decoder</a> and get it back in plain English.</div>
</main>
<footer class="wrap">
  <p class="legal"><strong>The serious bit:</strong> These pages are original plain-language education — not medical, billing, or legal advice, and not official code descriptors. CPT® is a registered trademark of the American Medical Association. Your itemized bill, plan documents, and care team are the source of truth. © 2026 Dr Mumbo Jumbo</p>
</footer>
<script>
(function(){
  var q=document.getElementById('q');
  var links=[].slice.call(document.querySelectorAll('.code-link'));
  var cats=[].slice.call(document.querySelectorAll('.sys h3'));
  var secs=[].slice.call(document.querySelectorAll('.sys'));
  q.addEventListener('input',function(){
    var v=q.value.trim().toLowerCase();
    links.forEach(function(a){a.classList.toggle('hidden',v&&a.getAttribute('data-q').indexOf(v)===-1);});
    cats.forEach(function(h){
      var grid=h.nextElementSibling;
      var any=grid&&grid.querySelector('.code-link:not(.hidden)');
      h.classList.toggle('hidden',v&&!any);
      if(grid)grid.classList.toggle('hidden',v&&!any);
    });
    secs.forEach(function(s){
      var any=s.querySelector('.code-link:not(.hidden)');
      s.classList.toggle('hidden',v&&!any);
    });
  });
})();
</script>
</body>
</html>`;

// ---- sitemap ----
const urls = [`${BASE}/`, `${BASE}/codes/`, ...ALL.map((e) => `${BASE}/codes/${e.slug}`)];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${BASE}/sitemap.xml
`;

fs.mkdirSync(path.join(root, 'codes'), { recursive: true });
fs.writeFileSync(path.join(root, 'codes', 'index.html'), indexHtml);
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(root, 'robots.txt'), robots);
console.log('built codes/index.html (' + indexHtml.length + ' bytes), sitemap.xml (' + urls.length + ' urls), robots.txt');
