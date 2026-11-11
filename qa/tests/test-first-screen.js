// The homepage's first screen: the tool comes straight after the headline.
//
// Why this exists: the paste box used to sit under a pitch paragraph and six feature cards.
// On a laptop it started 988 px down the page and the Build button ended at 1,381 px; on a
// phone the box started 1,941 px down, three screens in. Someone who arrived with a denial in
// hand had to scroll past a brochure to reach the thing that fights it. The pitch and the
// cards now follow the tool.
//
// Pixels need a browser (the measured numbers are in docs/fightpack-qa.md). What can be held
// on to here, without one, is what decides those pixels: the order the page is read in, and
// how much there is to read before the button.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'fightpack.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'nocturne.css'), 'utf8');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };

const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
assert(main.length > 1000, 'index.html has a <main>');

// What a visitor reads: no tags, icons, scripts or styles. Placeholders are attributes, so
// they are not counted; they sit inside a box and push nothing down the page.
const text = (s) => s.replace(/<(svg|script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&#?\w+;/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s) => text(s).split(' ').filter((w) => /[A-Za-z0-9]/.test(w)).length;

// Where each block starts, in the order the page is read.
const where = {};
const find = (name, re) => { const m = re.exec(main); ok(!!m, 'the page has ' + name); where[name] = m ? m.index : -1; };
find('the headline', /<h1\b/);
find('the tool', /<section\b[^>]*\bid="tool"/);
find('the Build button', /<button\b[^>]*\bid="buy"/);
find('the progress panel', /<section\b[^>]*\bid="progress"/);
find('the kit', /<section\b[^>]*\bid="kitout"/);
find('the pitch', /<p\b[^>]*\bclass="[^"]*\blead\b/);
find('the cards', /<section\b[^>]*\bclass="[^"]*\btlist\b/);
find('the questions', /<section\b[^>]*\bclass="section"/);
const before = (a, b) => where[a] >= 0 && where[b] >= 0 && where[a] < where[b];

// ---------- 1. the tool is the first thing after the headline ----------
ok(before('the headline', 'the tool'), 'the headline comes before the tool');
ok(before('the tool', 'the pitch'), 'the pitch paragraph comes after the tool, not between the headline and it');
ok(before('the tool', 'the cards'), 'the six cards come after the tool, not between the headline and it');

// ---------- 2. there is little to read before the button ----------
// Headline, kicker and the form's own labels come to about 60 words. A paragraph or a row of
// cards put back above the tool goes straight through this, and takes the button off the
// first screen with it.
const toRead = words(main.slice(0, where['the Build button']));
ok(toRead <= 75, 'no more than 75 words stand between the top of the page and the Build button (there are ' + toRead + ')');

// ---------- 3. what a click on Build shows opens right under the tool ----------
// Progress, then the kit. Marketing between the button and its result would open the result
// off screen.
ok(before('the tool', 'the progress panel') && before('the progress panel', 'the kit'), 'progress and the kit follow the tool directly, in that order');
ok(before('the kit', 'the pitch') && before('the pitch', 'the cards') && before('the cards', 'the questions'), 'then the pitch, the cards and the questions, in that order');
const between = main.slice(where['the tool'], where['the kit']);
ok(!/\blead\b|\btlist\b/.test(between.replace(/<section\b[^>]*\bid="(?:tool|progress)"[\s\S]*?<\/section>/g, '')), 'nothing sits between the tool, the progress panel and the kit');

// ---------- 4. nothing was lost in the move ----------
const section = (start) => main.slice(start, main.indexOf('</section>', start));
const cards = (section(where['the cards']).match(/<div\b[^>]*\bclass="ti\b/g) || []).length;
ok(cards === 6, 'all six parts of the kit are still described (' + cards + ' cards)');
const pitches = (main.match(/<p\b[^>]*\bclass="[^"]*\blead\b/g) || []).length;
ok(pitches === 1, 'there is one pitch paragraph (' + pitches + ')');
const pitchWords = words(main.slice(where['the pitch'], main.indexOf('</p>', where['the pitch'])));
ok(pitchWords >= 30, 'the pitch still makes its case (' + pitchWords + ' words)');

// ---------- 5. every element the page script reaches for is on the page, once ----------
// The script looks its controls up by id as it loads; a control dropped or doubled while
// sections are moved around stops the page at its first line.
const ids = [...new Set([...js.matchAll(/\$\('([^']+)'\)|getElementById\('([^']+)'\)/g)].map((m) => m[1] || m[2]))];
ok(ids.length >= 40, 'found the ids the page script looks up (' + ids.length + ')');
const count = (id) => (html.match(new RegExp('\\bid="' + id + '"', 'g')) || []).length;
const off = ids.filter((id) => count(id) !== 1);
ok(off.length === 0, 'each of them is on the page exactly once; not so: ' + off.map((id) => id + ' ×' + count(id)).join(', '));

// ---------- 6. a printed kit carries no sales pitch ----------
// The pitch used to be hidden on paper along with the headline block it lived in. Moved out
// of that block, it has to be hidden in its own right.
const sheets = [css, ...[...html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1])].join('\n');
const hiddenInPrint = new Set();
for (let i = sheets.indexOf('@media print'); i >= 0; i = sheets.indexOf('@media print', i + 1)) {
  let j = sheets.indexOf('{', i), depth = 0;
  const open = j;
  for (; j < sheets.length; j++) { if (sheets[j] === '{') depth++; else if (sheets[j] === '}' && --depth === 0) break; }
  for (const rule of sheets.slice(open + 1, j).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (/display\s*:\s*none/.test(rule[2])) rule[1].split(',').forEach((sel) => hiddenInPrint.add(sel.trim()));
  }
}
ok(hiddenInPrint.has('.hero'), 'read the print rules (the headline block is hidden on paper)');
// the pitch, and the blocks it sits inside
const upTo = main.slice(0, where['the pitch']);
const around = [];
for (const m of upTo.matchAll(/<(\/?)(section|div)\b([^>]*)>/g)) { if (m[1]) around.pop(); else around.push(m[3]); }
around.push(/<p\b([^>]*)>/.exec(main.slice(where['the pitch']))[1]);
const names = around.flatMap((attrs) => [
  ...((/\bclass="([^"]*)"/.exec(attrs) || [])[1] || '').split(/\s+/).filter(Boolean).map((c) => '.' + c),
  ...(/\bid="([^"]*)"/.test(attrs) ? ['#' + /\bid="([^"]*)"/.exec(attrs)[1]] : []),
]);
ok(names.some((name) => hiddenInPrint.has(name)), 'the pitch is hidden when the kit is printed (it sits in: ' + names.join(' ') + ')');

assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.join('\n  - '));
console.log('first-screen tests passed (' + n + ' checks; ' + toRead + ' words before the Build button, ' + ids.length + ' ids)');
