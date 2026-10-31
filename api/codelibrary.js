// Dr Mumbo Jumbo — server-rendered code library index (/codes/). Styled by /nocturne.css.
const cpt = [...require('../lib/codes-cpt-a.js'), ...require('../lib/codes-cpt-b.js'), ...require('../lib/codes-cpt-c.js')];
const icd = require('../lib/codes-icd.js');
const denial = require('../lib/codes-denial.js');

const ALL = [...cpt, ...icd, ...denial];

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SYS_LABEL = {
  'CPT': 'CPT and HCPCS: what you were billed for',
  'HCPCS': 'CPT and HCPCS: what you were billed for',
  'ICD-10': 'ICD-10: the diagnosis codes',
  'Denial code': "Denial and adjustment codes: why insurance didn't pay"
};

function buildSections() {
  const merged = [];
  for (const e of ALL) {
    const label = SYS_LABEL[e.system] || e.system;
    let m = merged.find((x) => x.label === label);
    if (!m) { m = { label, cats: [] }; merged.push(m); }
    let c = m.cats.find((x) => x.name === e.category);
    if (!c) { c = { name: e.category, entries: [] }; m.cats.push(c); }
    c.entries.push(e);
  }
  return merged
    .map(
      (m) => `
<section class="sys">
<h2>${esc(m.label)}</h2>
${m.cats
  .map(
    (c) => `
<h3 class="ovl">${esc(c.name)}</h3>
<div class="grid">
${c.entries.map((e) => `<a class="code-link" href="/codes/${e.slug}" data-q="${esc((e.code + ' ' + e.name).toLowerCase())}"><span class="cc">${esc(e.code)}</span><span class="cn">${esc(e.name)}</span></a>`).join('\n')}
</div>`
  )
  .join('\n')}
</section>`
    )
    .join('\n');
}

const TITLE = 'Medical billing codes in plain English — the code library | Dr Mumbo Jumbo';
const DESC = 'CPT codes, ICD-10 diagnoses and insurance denial codes explained in plain English. Find out what the codes on your medical bill and EOB actually mean.';

let CACHED = null;

function render() {
  if (CACHED) return CACHED;
  CACHED = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(TITLE)}</title>
<meta name="description" content="${esc(DESC)}">
<link rel="canonical" href="https://dr-mumbo-jumbo.com${'/codes/'}">
<meta property="og:site_name" content="Dr Mumbo Jumbo">
<meta property="og:title" content="${esc(TITLE)}">
<meta property="og:description" content="${esc(DESC)}">
<meta property="og:type" content="website">
<meta property="og:url" content="https://dr-mumbo-jumbo.com${'/codes/'}">
<meta property="og:image" content="https://dr-mumbo-jumbo.com/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#07080C">
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%20100%20100'%3E%3Crect%20width='100'%20height='100'%20rx='26'%20fill='%23D7FF3F'/%3E%3Ctext%20x='50'%20y='68'%20font-size='48'%20text-anchor='middle'%20font-family='Inter%2CArial%2Csans-serif'%20font-weight='700'%20fill='%230B0D12'%3E%3F!%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/nocturne.css">
<style>
.search-wrap{position:relative;max-width:560px;margin-top:6px}
.search-wrap .ic{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--muted)}
.search-wrap .input{padding-left:38px;min-height:46px;font-size:16px}
.count-note{margin-top:10px}
.sys{margin-top:34px}
.sys h2{font-size:1.3rem;padding-top:22px;border-top:1px solid var(--divider)}
.sys h3{margin:20px 0 10px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:8px}
.code-link{display:flex;gap:10px;align-items:baseline;padding:10px 12px;border-radius:var(--r-md);background:var(--surface);color:var(--text);text-decoration:none;border:1px solid transparent;transition:border-color .12s ease}
.code-link:hover{border-color:var(--a700);text-decoration:none}
.cc{font-weight:500;color:var(--a300);white-space:nowrap;font-variant-numeric:tabular-nums}
.cn{font-size:13.5px;color:var(--soft)}
.cta{margin:40px 0 0}
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
<symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></symbol>
<symbol id="i-cr" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
<symbol id="i-receipt" viewBox="0 0 24 24"><path d="M4 2v20l2-1.5L8 22l2-1.5L12 22l2-1.5L16 22l2-1.5L20 22V2l-2 1.5L16 2l-2 1.5L12 2l-2 1.5L8 2 6 3.5 4 2z"/><path d="M8 8h8M8 12h8M8 16h5"/></symbol>
<symbol id="i-pen" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></symbol>
<symbol id="i-sig" viewBox="0 0 24 24"><path d="M3 16.5c2.5-5 4.3-7.5 5.4-7.5 1.6 0 .2 5.5-.7 7.2-.5 1 .2 1.3 1 .5 1.5-1.5 2.6-4 3.6-4 .9 0 .5 2.3 1.5 2.3.8 0 1.6-.8 2.2-1.5"/><path d="M3 21h18"/></symbol>
</svg>
<header class="site-header">
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
</header>
<main>
  <div class="wrap">
    <section class="hero">
      <span class="kicker">The code library</span>
      <h1>Every code on your bill, in plain English.</h1>
      <p class="lead">Every code on a medical bill, EOB or denial letter means something specific. Here they are, in plain English, with what's worth double-checking on each one.</p>
      <div class="search-wrap"><svg class="ic" style="width:18px;height:18px" aria-hidden="true"><use href="#i-search"/></svg><input class="input" id="q" type="search" placeholder="Search a code or a word: 99214, colonoscopy, CO-50…" aria-label="Search codes"></div>
      <p class="small count-note">${ALL.length} codes decoded so far. More are added all the time.</p>
    </section>
    ${buildSections()}
    <section class="panel tint cta">
      <span class="kicker">Can't find your code?</span>
      <h2 class="mt-1">Paste the whole bill instead.</h2>
      <p class="lead mt-2">The free translator reads the entire bill, EOB or denial letter and gives it back in plain English: charges, codes and what's worth questioning.</p>
      <div class="row mt-3"><a class="btn btn-primary btn-lg" href="/?mode=bill#translator"><svg class="ic" style="width:18px;height:18px" aria-hidden="true"><use href="#i-receipt"/></svg> Translate my bill</a></div>
    </section>
  </div>
</main>
<footer class="site-footer">
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
</footer>
<script>
(function(){
  var q=document.getElementById('q');
  var links=[].slice.call(document.querySelectorAll('.code-link'));
  var cats=[].slice.call(document.querySelectorAll('.sys h3'));
  var secs=[].slice.call(document.querySelectorAll('.sys'));
  q.addEventListener('input',function(){
    var v=q.value.trim().toLowerCase();
    links.forEach(function(a){a.classList.toggle('hidden',!!(v&&a.getAttribute('data-q').indexOf(v)===-1));});
    cats.forEach(function(h){
      var grid=h.nextElementSibling;
      var any=grid&&grid.querySelector('.code-link:not(.hidden)');
      h.classList.toggle('hidden',!!(v&&!any));
      if(grid)grid.classList.toggle('hidden',!!(v&&!any));
    });
    secs.forEach(function(s){
      var any=s.querySelector('.code-link:not(.hidden)');
      s.classList.toggle('hidden',!!(v&&!any));
    });
  });
})();
</script>
</body>
</html>`;
  return CACHED;
}

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).send(render());
};
