// One analytics tag on every page, and it is the one Vercel serves.
//
// Why this exists: every page carried two Vercel Web Analytics tags. /_vercel/insights/script.js
// is the real one. /_vercel/web-analytics/script.js is not a file Vercel serves; it answered
// 404 on every page view, which is a wasted request and a console error for each visitor, on
// all 13 pages. Nothing in the suite looked at the tags, so it shipped and stayed.
//
// A page with no tag is not counted at all, and a page with the tag twice is one edit away
// from the same mistake, so both are checked here too.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };

// The path Vercel serves the Web Analytics script from (the live site answers 200 there).
const REAL = '/_vercel/insights/script.js';

// Every page a visitor can land on: the HTML files, and the pages the API writes out (the
// code library under /codes). Those are the API sources that carry the site's stylesheet;
// the emailed kit is HTML too, but it is a letter, not a page, and must never be tagged.
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html')).map((f) => ({ name: f, src: fs.readFileSync(path.join(root, f), 'utf8'), html: true }));
ok(pages.length >= 13, 'found the HTML pages (' + pages.length + ')');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith('.js') ? [path.join(dir, e.name)] : []);
for (const file of walk(path.join(root, 'api'))) {
  const src = fs.readFileSync(file, 'utf8');
  if (/<\/html>/.test(src) && /href="\/nocturne\.css"/.test(src)) pages.push({ name: path.relative(root, file), src, html: false });
  else ok(!/\/_vercel\//.test(src), path.relative(root, file) + ': is not a page, so it carries no analytics tag');
}
ok(pages.filter((p) => !p.html).length >= 2, 'found the pages the API writes out (' + pages.filter((p) => !p.html).length + ')');

for (const page of pages) {
  const tags = [...page.src.matchAll(/<script\b[^>]*\bsrc="(\/_vercel\/[^"]*)"[^>]*>/g)];
  const paths = tags.map((m) => m[1]);
  ok(paths.filter((p) => p === REAL).length === 1, page.name + ': loads the analytics script once (' + paths.filter((p) => p === REAL).length + ')');
  const others = paths.filter((p) => p !== REAL);
  ok(others.length === 0, page.name + ': asks Vercel for nothing it does not serve; it also loads ' + others.join(', '));
  ok(tags.every((m) => /\bdefer\b/.test(m[0])), page.name + ': the analytics script does not hold up the page');
  // A page that records an action (a kit built, a letter written) can do so before the
  // script arrives; this one line keeps those until it does. Without it they are dropped.
  if (/window\.va\('event'/.test(page.src) || /src="\/fightpack\.js"/.test(page.src)) {
    ok(/window\.va\s*=\s*window\.va\s*\|\|/.test(page.src), page.name + ': keeps early events until the analytics script loads');
  }
}

assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 20).join('\n  - ') + (fails.length > 20 ? '\n  … and ' + (fails.length - 20) + ' more' : ''));
console.log('analytics-tag tests passed (' + n + ' checks; ' + pages.length + ' pages)');
