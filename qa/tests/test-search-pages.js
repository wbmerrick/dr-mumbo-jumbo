// The pages a search sends people to end in the Fight Pack, and each tells a search engine
// what it is about.
//
// Why this exists: the Fight Pack became the homepage and the product on November 7, but the
// pages a reader lands on from a search still closed with the older appeal-letter tool. The
// seven denial pages and the 32 denial-code pages each had "Draft my appeal letter" as the
// main button, with the Fight Pack second or not there at all. Someone who arrived with a
// denial was sent to the tool that writes one document instead of the one that writes the kit.
//
// The second half holds the line a search engine prints under a page's name. The page about
// "not medically necessary" denials had straight quotes inside a quoted attribute, which ends
// the attribute early: the description it gave search engines was the two characters "A ".
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');

// The code pages are written by a function on the server. It reads only its own data files,
// but nothing in this file may reach the network, so a call that tries is a failure.
global.fetch = () => { throw new Error('a page test reached for the network'); };
const codepage = require('../../api/codepage.js');
const denialCodes = require('../../lib/codes-denial.js');
const cpt = require('../../lib/codes-cpt-a.js');
const icd = require('../../lib/codes-icd.js');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };

const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const text = (s) => s.replace(/<(svg|script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();

// A code page as the server sends it.
function render(slug) {
  let body = '', code = 0;
  const res = { setHeader() {}, status(c) { code = c; return res; }, send(b) { body = b; } };
  codepage({ query: { slug } }, res);
  return { code, body };
}

// The buttons of a block, in the order they are read.
function buttons(block) {
  const out = [];
  const re = /<a\b([^>]*\bclass="[^"]*\bbtn\b[^"]*"[^>]*)>([\s\S]*?)<\/a>/g;
  let m;
  while ((m = re.exec(block))) {
    const href = /\bhref="([^"]*)"/.exec(m[1]);
    out.push({ primary: /\bbtn-primary\b/.test(m[1]), href: href ? href[1] : '', label: text(m[2]) });
  }
  return out;
}

// The block a page closes with: the last tinted panel before the footer.
function closing(html, f) {
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const at = main.lastIndexOf('class="panel tint');
  ok(at > 0, f + ' closes with a call to act');
  if (at < 0) return '';
  const end = main.indexOf('</section>', at);
  return main.slice(at, end < 0 ? main.length : end);
}

function endsInTheFightPack(block, f) {
  const b = buttons(block);
  const main = b.filter((x) => x.primary);
  ok(main.length === 1, f + ': the closing block has one main button (it has ' + main.length + ')');
  ok(b.length > 0 && b[0].primary, f + ': the main button comes first');
  ok(main.length === 1 && main[0].href === '/', f + ': the main button opens the Fight Pack (it opens ' + (main[0] ? main[0].href : 'nothing') + ')');
  ok(main.length === 1 && /Fight Pack/.test(main[0].label), f + ': the main button names the Fight Pack (it says "' + (main[0] ? main[0].label : '') + '")');
}

// ---------- 1. the denial pages ----------
const DENIAL_PAGES = ['denials.html', 'denials-medical-necessity.html', 'denials-prior-auth.html', 'denials-out-of-network.html', 'denials-not-covered.html', 'denials-experimental.html', 'denials-missing-info.html'];
// A denial page added later is held to the same rule: the list is every denials*.html there is.
const onDisk = fs.readdirSync(root).filter((f) => /^denials.*\.html$/.test(f)).sort();
assert.deepStrictEqual(onDisk, DENIAL_PAGES.slice().sort(), 'the list of denial pages matches the files');
for (const f of DENIAL_PAGES) endsInTheFightPack(closing(read(f), f), f);

// ---------- 2. the denial-code pages ----------
assert(denialCodes.length >= 30, 'the denial codes are there to check');
for (const e of denialCodes) {
  const r = render(e.slug);
  ok(r.code === 200, '/codes/' + e.slug + ' is served');
  endsInTheFightPack(closing(r.body, '/codes/' + e.slug), '/codes/' + e.slug);
}
// A procedure or diagnosis code is not a denial. Its page still ends in the bill translator.
for (const e of [cpt[0], icd[0]]) {
  const b = buttons(closing(render(e.slug).body, '/codes/' + e.slug));
  ok(b.length > 0 && b[0].primary && b[0].href === '/translate?mode=bill#translator', '/codes/' + e.slug + ' (not a denial code) still opens the bill translator first');
}

// ---------- 3. the line a search engine prints under each page ----------
// A whole tag, with a value that holds no straight quote: a quote inside would end it early.
const DESC = /<meta name="description" content="([^"]*)">/;
const OG = /<meta property="og:description" content="([^"]*)">/;
function described(html, f) {
  const d = DESC.exec(html), o = OG.exec(html);
  ok(!!d, f + ' has a description a search engine can read whole');
  ok(!!d && d[1].length >= 50, f + ': the description says something (' + (d ? d[1].length : 0) + ' characters)');
  ok(!!o && o[1].length >= 50, f + ': the description shown when the page is shared is whole (' + (o ? o[1].length : 0) + ' characters)');
}
// Every page that asks to be listed: it names its own address, and does not ask to be left out.
const listed = fs.readdirSync(root).filter((f) => /\.html$/.test(f)).filter((f) => { const h = read(f); return /<link rel="canonical"/.test(h) && !/<meta name="robots" content="[^"]*noindex/.test(h); });
assert(listed.length >= 13, 'the listed pages are there to check (found ' + listed.length + ')');
for (const f of listed) described(read(f), f);
for (const e of [...denialCodes, cpt[0], icd[0]]) described(render(e.slug).body, '/codes/' + e.slug);

if (fails.length) { console.error('search pages: ' + fails.length + ' of ' + n + ' checks failed'); for (const f of fails) console.error('  - ' + f); process.exit(1); }
console.log('search page tests passed (' + n + ' assertions)');
