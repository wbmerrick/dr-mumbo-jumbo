// The page's side of two things: the check-in box under "Email me my kit", with the page a
// check-in email opens, and the one line the page adds to the kit to say where it came from.
//
// Why this exists.
//
// Check-ins: the reader can ask to be emailed twice more, 3 days and about four weeks on, to be
// asked whether the appeal was sent and what happened (lib/checkin.js, api/email-kit.js; the
// server side is in test-checkin.js and test-email-kit.js). The privacy page promises that
// nothing is emailed unless you ask, so the box is not ticked for anybody, and the page sends
// "yes" only for a tick. The email's links open /checkin. Mail scanners open every link in a
// message, so that page must count nothing when it loads: only a tap on an answer is an answer.
//
// The line: the kit's fourth document is a note the reader hands to the doctor's office (or the
// billing office) with the letter it is asked to sign. Whoever signs a letter should know a tool
// drafted it, and that office sees denials every week. The page adds one line to that note saying
// what wrote the drafts and where it is. It is the only text in a kit that the writers did not
// write, so it is pinned here exactly: which document, where in it, once, and nothing else in
// the kit changed. It is added as the kit is put on the page, so what is shown, copied, printed
// and emailed all carry it, and the kit saved in the browser stays what the writers wrote.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const js = read('fightpack.js');
const index = read('index.html');
const ci = require('../../lib/checkin.js');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(what + '\n     got:  ' + JSON.stringify(got).slice(0, 300) + '\n     want: ' + JSON.stringify(want).slice(0, 300)); };
const text = (s) => s.replace(/<(svg|script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
const count = (hay, needle) => hay.split(needle).length - 1;

// The helpers live inside the page's closure. Take their source out of the file and run that.
function source(name) {
  const start = js.indexOf('function ' + name + '(');
  assert(start >= 0, name + '() is defined in fightpack.js');
  let i = js.indexOf('{', start), depth = 0;
  for (; i < js.length; i++) { if (js[i] === '{') depth++; else if (js[i] === '}' && --depth === 0) break; }
  return js.slice(start, i + 1);
}
const lineSrc = /var ORIGIN_LINE = ("(?:[^"\\]|\\.)*");/.exec(js);
assert(lineSrc, 'fightpack.js defines ORIGIN_LINE as one double-quoted string');
const ORIGIN_LINE = JSON.parse(lineSrc[1]);
const { withOrigin, splitSections, extractJson, plain, renderBody } = new Function(
  'var ORIGIN_LINE = ' + lineSrc[1] + ';\n' + ['escapeHtml', 'inline', 'renderBody', 'splitSections', 'extractJson', 'plain', 'withOrigin'].map(source).join('\n') +
  '\nreturn { withOrigin: withOrigin, splitSections: splitSections, extractJson: extractJson, plain: plain, renderBody: renderBody };')();
const ORIGIN_PLAIN = plain(ORIGIN_LINE);
// Marks (hashes, asterisks, rule lines) and white space are layout; everything else is the kit.
const bare = (s) => s.split(/\r?\n/).filter((l) => !/^-{3,}$/.test(l.trim())).join('').replace(/[#*\s]/g, '');

// ====================================================================================
// 1. the line itself
// ====================================================================================
ok(/^- \*\*[^*]+:\*\* /.test(ORIGIN_LINE), 'the line is one bullet with a bold label, like the rest of the note');
ok(ORIGIN_LINE.includes('dr-mumbo-jumbo.com'), 'it says where the tool is');
ok(/built by a practicing physician/.test(ORIGIN_LINE), 'it says who built it in the site\'s own words, and no more than the site says');
ok(!/\[|\]|https?:\/\//.test(ORIGIN_LINE), 'it has no blank to fill in and no link markup: it reads the same on paper');
ok(ORIGIN_LINE.length < 220 && !/\n/.test(ORIGIN_LINE), 'it is one line (' + ORIGIN_LINE.length + ' characters)');
same(ORIGIN_PLAIN, ORIGIN_LINE.replace(/\*\*/g, ''), 'as plain text it is the same words without the bold marks');

// ---------- which document gets it ----------
const NOTE = "- **What this is:** A pre-drafted letter for the doctor to review, edit, sign, and send.\n\n- **Deadline:** The appeal must be received by March 31, 2027.";
for (const title of ["4. Note for your doctor's office", '4. Note for the billing office', '4. Note for your HR or benefits office']) {
  const out = withOrigin({ title, body: NOTE });
  same(out.title, title, title + ': the title is left alone');
  same(out.body, NOTE + '\n\n' + ORIGIN_LINE, title + ': the line is added after the last bullet');
}
for (const title of ['3. Letter of medical necessity — for your doctor to sign', '3. Corrected-claim request — for the billing office', '2. Your appeal letter', '5. Peer-to-peer talking points — for your doctor',
  '6. Phone script — calling the insurer', "7. Phone script — calling the hospital or doctor's billing office", '9. If they say no again — external review request', '10. Your deadlines and next moves', '1. Your denial, decoded — and how strong your case is', '']) {
  same(withOrigin({ title, body: NOTE }), { title, body: NOTE }, '"' + title + '" is not the note: nothing is added (a letter goes to the insurer, and says nothing about us)');
}
// ---------- where in the note ----------
same(withOrigin({ title: "4. Note for your doctor's office", body: NOTE + '\n\n- **Thank you** for the few minutes this takes — it makes the difference.' }).body,
  NOTE + '\n\n' + ORIGIN_LINE + '\n\n- **Thank you** for the few minutes this takes — it makes the difference.',
  'a note that closes with a thank-you keeps it last: the line goes just above it');
same(withOrigin({ title: '4. Note for the billing office', body: '- First.\n- Second.\n- Thank you for resolving this promptly.' }).body,
  '- First.\n- Second.\n' + ORIGIN_LINE + '\n- Thank you for resolving this promptly.',
  'bullets written with no blank lines between them stay that way');
same(withOrigin({ title: '4. Note for the billing office', body: '- First.\n- Second.\n\nThank you.' }).body,
  '- First.\n- Second.\n' + ORIGIN_LINE + '\n\nThank you.',
  'a thank-you that is its own paragraph stays last too');
same(withOrigin({ title: "4. Note for your doctor's office", body: NOTE + '\n\n---' }).body, NOTE + '\n\n' + ORIGIN_LINE,
  'a rule the writers left at the end of the note is not left dangling under the line');
// ---------- once ----------
const once = withOrigin({ title: "4. Note for your doctor's office", body: NOTE });
same(withOrigin(once), once, 'a note that already carries the line is left as it is');
ok(/<li><strong>Where this came from:<\/strong> /.test(renderBody(once.body)), 'on the page it is a bullet with a bold label');

// ---------- every recorded kit ----------
const evidence = path.join(root, 'qa/evidence');
const kits = fs.readdirSync(evidence).flatMap((run) => {
  const dir = path.join(evidence, run);
  return fs.statSync(dir).isDirectory() ? fs.readdirSync(dir).filter((f) => f.endsWith('.kit.md')).map((f) => path.join(dir, f)) : [];
});
ok(kits.length >= 150, 'found the recorded kits in qa/evidence (' + kits.length + ')');
const isThanks = (l) => /^(?:[-•*]\s+)?\**\s*thank/i.test(l.trim());
let notes = 0, aboveThanks = 0;
for (const file of kits) {
  const name = path.relative(evidence, file);
  const sections = splitSections(extractJson(fs.readFileSync(file, 'utf8')).text);
  const out = sections.map(withOrigin);
  const changed = out.map((s, i) => (s.body !== sections[i].body || s.title !== sections[i].title ? i : -1)).filter((i) => i >= 0);
  same(changed.map((i) => /^4\. Note for /.test(sections[i].title)), [true], name + ': one document is changed, and it is the note (changed: ' + changed.map((i) => sections[i].title).join(' | ') + ')');
  if (changed.length !== 1) continue;
  notes++;
  const was = sections[changed[0]].body, now = out[changed[0]].body;
  same(count(now, ORIGIN_LINE), 1, name + ': the line is in the note once');
  same(bare(now.replace(ORIGIN_LINE, '')), bare(was), name + ': and nothing else in the note is touched');
  const lines = now.split('\n').filter((l) => l.trim());
  const lastWas = was.split('\n').filter((l) => l.trim() && !/^-{3,}$/.test(l.trim())).pop();
  if (isThanks(lastWas)) { aboveThanks++; same(lines[lines.length - 1], lastWas, name + ': the note still closes with its thank-you'); same(lines[lines.length - 2], ORIGIN_LINE, name + ': with the line just above it'); }
  else same(lines[lines.length - 1], ORIGIN_LINE, name + ': the line closes the note');
}
ok(notes >= 150 && aboveThanks >= 100, 'the recorded kits do have the note, and most close with a thank-you (' + notes + ' notes, ' + aboveThanks + ' with one)');

// ====================================================================================
// 2. the box on the page
// ====================================================================================
const form = (/<form\b[^>]*\bid="mailform"[^>]*>([\s\S]*?)<\/form>/.exec(index) || [])[1] || '';
const box = /<input\b[^>]*\bid="mailcheckin"[^>]*>/.exec(form);
ok(!!box, 'the check-in box is inside the "Email me my kit" form');
ok(box && /\btype="checkbox"/.test(box[0]), 'it is a checkbox');
ok(box && !/\bchecked\b/.test(box[0]), 'it is not ticked for the reader: nothing is emailed unless they ask');
const label = text((/<label\b[^>]*>(?:(?!<\/label>)[\s\S])*\bid="mailcheckin"[\s\S]*?<\/label>/.exec(form) || [''])[0]);
ok(/3 days/.test(label) && /4 weeks/.test(label), 'its label says when the two emails come ("' + label + '")');
ok(/\b(two|2)\b/i.test(label) && /no more|nothing (more|else)|then none/i.test(label), 'and that there are two and no more');
const note = text((/<p\b[^>]*\bclass="[^"]*\bmailkit-note\b[^"]*"[^>]*>([\s\S]*?)<\/p>/.exec(index) || ['', ''])[1]);
ok(/hello@dr-mumbo-jumbo\.com/.test(note) && /check-ins?/.test(note) && /only if you tick/.test(note), 'the note under the form says the check-ins come only for a tick ("' + note + '")');
ok(/launch news only/.test(note) && /isn't stored/.test(note), 'and still says what the address is kept for, and that the kit is not stored');
ok(!/Sent once/.test(note), 'it no longer says "sent once", which a ticked box would make untrue');

// ====================================================================================
// 3. the page, run whole: what it shows, copies, emails and keeps
// ====================================================================================
const stored = read('qa/evidence/runs27/C-prior-auth-biologic.kit.md');
const OWN = { 1: [1], 2: [2], 3: [3, 4], 4: [5, 6], 5: [7, 8], 6: [9, 10] };
const at = {};
for (const m of stored.matchAll(/^## (\d{1,2})\. .*$/gm)) at[m[1]] = m.index;
const section = (k) => stored.slice(at[k], k < 10 ? at[k + 1] : stored.length).trim();
const PART = {};
for (const p of Object.keys(OWN)) PART[p] = OWN[p].map(section).join('\n\n');
const WHOLE = bare(stored.replace(/```json[\s\S]*?```/, ''));
const LETTER = 'NOTICE OF ADVERSE DETERMINATION. Prior authorization for infliximab is denied: step therapy is required first.';
const SERVER_SAYS = "Sent. Check your inbox — and spam, the first time. We'll check in with you in 3 days.";

function element() {
  const on = {}, cls = new Set();
  let html = '', found = {};
  const e = {
    value: '', textContent: '', hidden: false, disabled: false, checked: false, style: {}, children: [],
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    addEventListener: (t, f) => { (on[t] = on[t] || []).push(f); },
    removeEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}, click() {}, reset() {}, select() {},
    querySelector: (sel) => found[sel] || (found[sel] = element()),          // the same element each time, so a listener bound to it can be fired
    appendChild: (k) => { e.children.push(k); return k; }, removeChild() {},
    fire: (t) => (on[t] || []).forEach((f) => f({ preventDefault() {} }))
  };
  Object.defineProperty(e, 'className', { get: () => [...cls].join(' '), set: (v) => { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)); } });
  Object.defineProperty(e, 'innerHTML', { get: () => html, set: (v) => { html = String(v); e.children = []; found = {}; } });
  return e;
}
function open({ saved = {}, sampleFile = null } = {}) {
  const els = {};
  const $ = (id) => els[id] || (els[id] = element());
  const posts = [], copied = [], events = [];
  let session = 0;
  const fetch = (url, opts) => {
    if (!opts || !opts.body) {
      return url === '/sample-kit.json' && sampleFile ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(sampleFile)) })
        : Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('not found')) });
    }
    const body = JSON.parse(opts.body);
    posts.push({ url, body });
    const answer = url === '/api/unlock' ? { token: 'session-' + (++session) }
      : url === '/api/email-kit' ? { ok: true, checkins: body.checkin === true ? 2 : 0, message: body.checkin === true ? SERVER_SAYS : 'Sent.' }
      : { part: body.part, stop: 'end_turn', missing: [], text: PART[body.part] };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(answer) });
  };
  const localStorage = { getItem: (k) => (k in saved ? saved[k] : null), setItem: (k, v) => { saved[k] = String(v); }, removeItem: (k) => { delete saved[k]; } };
  const tab = {};
  const win = { matchMedia: () => ({ matches: true }), location: { hash: sampleFile ? '#sample' : '', search: '?utm_source=reddit', hostname: 'dr-mumbo-jumbo.com' },
    sessionStorage: { getItem: (k) => (k in tab ? tab[k] : null), setItem: (k, v) => { tab[k] = String(v); }, removeItem: (k) => { delete tab[k]; } },
    va: (t, o) => { if (t === 'event') events.push(o); } };
  const soon = (fn, ms) => { if (ms <= 2000) Promise.resolve().then(fn); return 1; };
  new Function('window', 'document', 'localStorage', 'navigator', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'AbortController', js)(
    win, { getElementById: $, createElement: () => element(), body: element(), referrer: '' }, localStorage,
    { clipboard: { writeText: (t) => { copied.push(t); return Promise.resolve(); } } }, fetch, soon, () => {}, () => 0, () => {},
    class { constructor() { this.signal = {}; } abort() {} });
  return {
    $, saved, copied, events,
    cards: () => $('docs').children,
    built: () => posts.filter((c) => c.url === '/api/fightpack').map((c) => c.body),
    mailed: () => posts.filter((c) => c.url === '/api/email-kit').map((c) => c.body)
  };
}
const settle = async () => { for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r)); };
const build = async (page) => { page.$('denial').value = LETTER; page.$('buy').fire('click'); await settle(); };
const email = async (page, tick) => { page.$('mailemail').value = 'reader@example.com'; page.$('mailcheckin').checked = !!tick; page.$('mailform').fire('submit'); await settle(); return page.mailed()[page.mailed().length - 1]; };
const withLine = (page) => page.cards().filter((c) => c.innerHTML.includes('dr-mumbo-jumbo.com'));
const titleOf = (card) => text((/<h3>([\s\S]*?)<\/h3>/.exec(card.innerHTML) || ['', ''])[1]);

(async () => {
  // ---------- 3a. the kit on the page ----------
  let page = open();
  await build(page);
  same(page.cards().length, 10, 'the kit is on the page: ten documents');
  same(withLine(page).map(titleOf), ["4. Note for your doctor's office"], 'one document on the page says where the kit came from, and it is the note for the office');
  const noteCard = withLine(page)[0];
  ok(noteCard && count(noteCard.innerHTML, 'dr-mumbo-jumbo.com') === 1 && /<strong>Where this came from:<\/strong>/.test(noteCard.innerHTML), 'it says so once, as a bullet like the others');
  ok(noteCard && noteCard.innerHTML.indexOf('Where this came from') < noteCard.innerHTML.indexOf('Thank you for advocating'), 'above the note\'s closing thank-you');

  // ---------- 3b. what is copied ----------
  noteCard.querySelector('.copy-btn').fire('click');
  await settle();
  same(count(page.copied[0] || '', ORIGIN_PLAIN), 1, 'Copy on the note copies the line with it, once');
  ok((page.copied[0] || '').startsWith("4. Note for your doctor's office\n\n"), 'under the note\'s own title');
  const letterCard = page.cards().find((c) => /Letter of medical necessity/.test(titleOf(c)));
  letterCard.querySelector('.copy-btn').fire('click');
  await settle();
  ok(page.copied[1] && page.copied[1].length > 400 && !/mumbo/i.test(page.copied[1]), 'Copy on the doctor\'s letter copies the letter and nothing about us: that one goes to the insurer');
  page.$('copyall').fire('click');
  await settle();
  same(count(page.copied[2] || '', ORIGIN_PLAIN), 1, '"Copy everything" carries the line once');

  // ---------- 3c. what is emailed, and what is asked for with it ----------
  const kid = [...new Set(page.built().map((b) => b.kid))];
  same([page.built().length, kid.length], [6, 1], 'the kit was built in six calls under one tag');
  let mail = await email(page, false);
  same(mail.checkin, false, 'no tick: the page tells the server no check-ins');
  same(mail.src, 'reddit', 'the email request carries the one word for where the reader came from');
  same(Object.keys(mail).sort(), ['checkin', 'email', 'kit', 'src', 'token'], 'no tick: the request holds the address, the kit, the session, the tick and the word. The kit\'s tag is not sent: nothing needs it');
  const emailedKit = mail.kit.slice(0, mail.kit.indexOf('\n\n\nYOUR DEADLINES'));
  same(count(emailedKit, ORIGIN_PLAIN), 1, 'the emailed kit carries the line once');
  ok(emailedKit.indexOf("4. Note for your doctor's office") < emailedKit.indexOf(ORIGIN_PLAIN) && emailedKit.indexOf(ORIGIN_PLAIN) < emailedKit.indexOf('5. Peer-to-peer talking points'), 'inside the note, before the next document');
  ok(bare(emailedKit.replace(ORIGIN_PLAIN, '')) === WHOLE, 'and apart from that line the email is the kit the writers wrote: every character, nothing else');
  ok(page.events.some((e) => e.name === 'kit_emailed' && e.data && e.data.checkin === false), 'counted in Web Analytics as a kit emailed without check-ins');

  mail = await email(page, true);
  same(mail.checkin, true, 'a tick: the page asks for check-ins');
  same(mail.kid, kid[0], 'and sends the kit\'s own tag for their links, so an answer lands beside that kit\'s build counts');
  same(Object.keys(mail).sort(), ['checkin', 'email', 'kid', 'kit', 'src', 'token'], 'a tick: the same request, with the tag');
  same(page.$('mailmsg').textContent, SERVER_SAYS, 'and shows the reader what the server answered, check-in and all');
  ok(page.events.some((e) => e.name === 'kit_emailed' && e.data && e.data.checkin === true), 'counted in Web Analytics as a kit emailed with check-ins');
  same(typeof mail.checkin, 'boolean', 'the tick travels as true or false, which is the only thing the server takes');

  // ---------- 3d. what is kept in the browser ----------
  const kept = JSON.parse(page.saved.dmj_fp_kit);
  ok(!/mumbo/i.test(JSON.stringify(kept.parts)), 'the kit saved in the browser is the writers\' own: the line is not written into it');
  same(kept.kid, kid[0], 'the kit\'s tag is saved with it');

  // "Fix a detail everywhere" puts the kit on the page again: still once
  page.$('fixfrom').value = 'PRIYA S. RAMANATHAN'; page.$('fixto').value = 'PRIYA RAMANATHAN';
  page.$('fixform').fire('submit');
  await settle();
  same(withLine(page).map((c) => count(c.innerHTML, 'dr-mumbo-jumbo.com')), [1], 'after "Fix a detail everywhere" the line is still there once');
  ok(!/mumbo/i.test(JSON.stringify(JSON.parse(page.saved.dmj_fp_kit).parts)), 'and still not in the saved kit');

  // a reload: the saved kit, the same tag
  page = open({ saved: page.saved });
  same(withLine(page).map(titleOf), ["4. Note for your doctor's office"], 'reload: the saved kit is shown with the line in its note');
  mail = await email(page, true);
  same([mail.kid, mail.checkin], [kid[0], true], 'reload: the kit is emailed under the tag it was built with');
  same(count(mail.kit, ORIGIN_PLAIN), 1, 'reload: and the email carries the line once');

  // a kit the page saved before it kept tags: no tag to send, and the server makes one if it needs one
  const legacy = { parts: Object.assign({}, PART, { 6: PART[6].replace(/```json[\s\S]*?```/, '').trim() }), meta: null, ts: Date.now() };
  page = open({ saved: { dmj_fp_kit: JSON.stringify(legacy) } });
  mail = await email(page, true);
  same([mail.kid, mail.checkin], ['', true], 'a kit saved without a tag is emailed with none (the server gives its check-ins a fresh one)');

  // "Clear it from this browser" forgets the tag with the kit
  page = open();
  await build(page);
  const first = page.built()[0].kid;
  page.$('forget').fire('click');
  ok(!('dmj_fp_kit' in page.saved), 'cleared: the kit is gone from the browser');
  await build(page);
  mail = await email(page, true);
  ok(mail.kid && mail.kid !== first && mail.kid === page.built()[6].kid, 'a kit built afterwards goes out under its own tag, not the cleared one\'s');

  // ---------- 3e. the example kit shows what a real one carries ----------
  page = open({ sampleFile: read('sample-kit.json') });
  await settle();
  ok(page.$('kitout').classList.contains('sample'), 'the example kit is on the page');
  same(withLine(page).map(titleOf), ["4. Note for your doctor's office"], 'and its note carries the line, as a reader\'s will');
  ok(!/mumbo/i.test(JSON.stringify(JSON.parse(read('sample-kit.json')).parts)), 'the stored example itself is untouched: still exactly what the site returned');

  // ====================================================================================
  // 4. the page a check-in email opens
  // ====================================================================================
  const html = read('checkin.html');
  ok(/<meta\s+name="robots"\s+content="noindex/.test(html), 'checkin.html asks not to be indexed: it is only reached from an email');
  ok(!/checkin/.test(read('api/sitemap.js')), 'and is not in the sitemap');
  ok(/href="\/nocturne\.css"/.test(html) && /<a class="brand" href="\/"/.test(html), 'it is a page of the site: same stylesheet, same way home');
  const rewrites = JSON.parse(read('vercel.json')).rewrites;
  ok(rewrites.some((r) => r.source === '/checkin' && r.destination === '/checkin.html'), 'vercel.json serves it at /checkin, where the emails point');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((s) => s.includes('/api/checkin'));
  same(scripts.length, 1, 'checkin.html has one script that talks to /api/checkin');
  const pageJs = scripts[0] || '';
  ok(!/\bimg\b|sendBeacon|XMLHttpRequest/.test(pageJs), 'which sends nothing by any side door');

  // what the server would answer, and a browser to run the page in
  // where: what follows /checkin in the address. A string is the part after the # (as our links
  // are written); { search } is a link whose details arrive after a ? instead.
  function visit(where, answerWith) {
    const loc = typeof where === 'string' ? { pathname: '/checkin', search: '', hash: where } : Object.assign({ pathname: '/checkin', search: '', hash: '' }, where);
    const els = {};
    const $ = (id) => els[id] || (els[id] = element());
    const asked = [], bar = [];
    const fetch = (url, opts) => {
      asked.push({ url, method: opts && opts.method, body: opts && opts.body ? JSON.parse(opts.body) : null, type: opts && opts.headers && (opts.headers['content-type'] || opts.headers['Content-Type']) });
      const a = (answerWith || (() => ({ status: 200, data: { ok: true } })))(asked.length);
      if (a === 'down') return Promise.reject(new Error('Failed to fetch'));
      return Promise.resolve({ ok: a.status < 300, status: a.status, json: () => (a.data === undefined ? Promise.reject(new Error('not json')) : Promise.resolve(a.data)) });
    };
    new Function('window', 'document', 'fetch', pageJs)({ location: loc, history: { replaceState: (state, title, url) => { bar.push(url); } } }, { getElementById: $, createElement: () => element() }, fetch);
    const buttons = () => $('answers').children;
    return {
      $, asked, buttons, bar,
      labels: () => buttons().map((b) => b.textContent),
      primary: () => buttons().filter((b) => b.classList.contains('btn-primary')).map((b) => b.textContent),
      tap: async (label) => { const b = buttons().find((x) => x.textContent === label); assert(b, 'the page shows a "' + label + '" button'); b.fire('click'); await settle(); }
    };
  }
  process.env.FIGHTPACK_SECRET = 'test-secret-123';
  const NOW = Date.now();
  const linkQ = (stage, answer) => new URL(ci.link('usp722atowp1', stage, answer, NOW)).hash;
  const q1 = Object.fromEntries(new URLSearchParams(linkQ(1, 'sent').slice(1)));

  // ---------- 4a. it asks the email's question and waits ----------
  for (const stage of [1, 2]) {
    const st = ci.STAGES[stage];
    const v = visit(linkQ(stage, st.answers[0][0]));
    same(v.$('q').textContent, st.ask, 'question ' + stage + ': the page asks what the email asked');
    same(v.labels(), st.answers.map((a) => a[1]), 'question ' + stage + ': and offers the same answers, in the same words, in the same order');
    same(v.primary(), [st.answers[0][1]], 'question ' + stage + ': the answer the reader followed from the email is the one picked out');
    same(v.asked.length, 0, 'question ' + stage + ': nothing is sent when the page opens, so a mail scanner that opens the link answers nothing');
    ok(!v.$('ask').hidden && v.$('done').hidden !== false && v.$('nolink').hidden !== false, 'question ' + stage + ': the question is showing, and nothing else');
    // The link is taken out of the address bar as soon as it is read: before the analytics script
    // (which is deferred, so it runs after this one) can see it, and so it is not left in the
    // browser's history or copied with the address.
    same(v.bar, ['/checkin'], 'question ' + stage + ': the address bar is left showing /checkin, without the link\'s details');
  }
  // A mail gateway that rewrites links can move what followed the # to after a ?. The page reads that too.
  {
    const v = visit({ search: '?' + linkQ(1, 'sent').slice(1) });
    same([v.$('q').textContent, v.labels().length, v.bar.join()], [ci.STAGES[1].ask, 2, '/checkin'], 'a link whose details arrive after a ? is read the same way, and cleared the same way');
    await v.tap("Yes, it's sent");
    same(v.asked[0] && v.asked[0].body, Object.assign({}, q1, { a: 'sent' }), 'and its answer is sent the same way');
  }

  // ---------- 4b. a tap is an answer ----------
  let v = visit(linkQ(1, 'sent'));
  await v.tap("Yes, it's sent");
  same(v.asked.length, 1, 'a tap sends one request');
  same([v.asked[0].url, v.asked[0].method, /json/.test(v.asked[0].type || '')], ['/api/checkin', 'POST', true], 'a POST of JSON to /api/checkin');
  same(v.asked[0].body, Object.assign({}, q1, { a: 'sent' }), 'carrying what the link carried, and the answer tapped');
  ok(v.$('done').hidden === false && v.$('ask').hidden === true, 'then the question gives way to a thank-you');
  ok(/counted/i.test(v.$('thanks').textContent) && v.$('next').textContent.length > 40, 'which says the answer was counted, and what comes next ("' + v.$('thanks').textContent + '")');
  await v.tap("Yes, it's sent").catch(() => {});
  same(v.asked.length, 1, 'an answered page does not send again');

  v = visit(linkQ(1, 'sent'));
  await v.tap('Not yet');
  same(v.asked[0].body.a, 'notyet', 'the reader can tap the other answer: what is sent is what was tapped, not what the email link said');
  // every answer has its own next step, and none of them is empty or shared by mistake
  const nexts = {};
  for (const stage of [1, 2]) for (const [key, label] of ci.STAGES[stage].answers) {
    v = visit(linkQ(stage, key));
    await v.tap(label);
    same(v.asked[0].body.a, key, '"' + label + '" is sent as ' + key);
    nexts[key] = v.$('next').textContent;
    ok(nexts[key].length > 40 && !/undefined|\[|\]/.test(nexts[key]), '"' + label + '": the reader is told what comes next');
  }
  same(new Set(Object.values(nexts)).size, 6, 'six answers, six different next steps');
  ok(/section 9/i.test(nexts.lost) && /letter/i.test(nexts.lost), 'denied again: points at the kit\'s round-two document and the deadline on the new letter');
  ok(/section 4/i.test(nexts.notyet), 'not sent yet: points at the note for whoever has to sign');
  ok(/one more|once more/i.test(nexts.sent), 'sent: says one more email is coming, which is true');
  ok(Object.values(nexts).every((t) => !/\b(guarantee|will win|always)\b/i.test(t)), 'no next step promises an outcome');

  // ---------- 4c. when the server says no, the reader hears why, in its words ----------
  v = visit(linkQ(1, 'sent'), () => ({ status: 403, data: { error: 'link', message: "This link doesn't look right. Open it again from your email." } }));
  await v.tap("Yes, it's sent");
  ok(v.$('done').hidden !== false, 'refused: no thank-you is shown for an answer that was not counted');
  same(v.$('msg').textContent, "This link doesn't look right. Open it again from your email.", 'refused: the server\'s reason is shown');
  v = visit(linkQ(2, 'won'), () => ({ status: 410, data: { error: 'expired', message: 'This check-in has closed. Thank you all the same.' } }));
  await v.tap('They approved it');
  same(v.$('msg').textContent, 'This check-in has closed. Thank you all the same.', 'closed: the reader is told');
  // the line is down: say so, and let them try again
  let tries = 0;
  v = visit(linkQ(1, 'sent'), () => (++tries === 1 ? 'down' : { status: 200, data: { ok: true } }));
  await v.tap("Yes, it's sent");
  ok(v.$('done').hidden !== false && /try again/i.test(v.$('msg').textContent), 'no connection: the reader is asked to try again ("' + v.$('msg').textContent + '")');
  ok(v.buttons().every((b) => !b.disabled), 'no connection: the answers can be tapped again');
  await v.tap("Yes, it's sent");
  ok(v.$('done').hidden === false && v.asked.length === 2, 'and the second tap is counted');
  v = visit(linkQ(1, 'sent'), () => ({ status: 502 }));
  await v.tap("Yes, it's sent");
  ok(/try again/i.test(v.$('msg').textContent) && v.$('done').hidden !== false, 'an answer that is not JSON is a failure too, not a thank-you');

  // ---------- 4d. opened without a link of ours ----------
  for (const [what, where] of [['no link at all', ''], ['a question that does not exist', linkQ(1, 'sent').replace('s=1', 's=7')], ['a link with its signature cut off', linkQ(1, 'sent').replace(/&t=[^&]*/, '')], ['a link that cannot be read', '#k=%E0%A4%A&s=1&d=1&t=x']]) {
    v = visit(where);
    ok(v.$('nolink').hidden === false && v.$('ask').hidden === true, what + ': the page says it needs the link from the email');
    same([v.buttons().length, v.asked.length], [0, 0], what + ': there is nothing to tap and nothing is sent');
  }
  // an answer in the link that is not one of the question's: the question is still asked, nothing is picked out
  v = visit(linkQ(1, 'sent').replace('a=sent', 'a=won'));
  same([v.labels().length, v.primary().length], [2, 0], 'a link with an answer from the other question: both real answers are offered and neither is picked out');

  // ====================================================================================
  // 5. the privacy page says what happens
  // ====================================================================================
  const privacy = text(read('privacy.html'));
  ok(/nothing is emailed unless you ask/.test(privacy), 'the privacy page still promises that nothing is emailed unless you ask');
  ok(/check-ins?/i.test(privacy) && /3 days/.test(privacy) && /four weeks/.test(privacy), 'it says what the check-ins are and when they come');
  ok(/tick/i.test(privacy), 'that they come only for a tick');
  ok(/held by Resend|Resend holds/i.test(privacy), 'who holds them until they go out');
  ok(/tag/i.test(privacy) && /never (with|beside|against) your address|not (with|beside) your address/i.test(privacy), 'and that an answer is counted with the kit\'s tag and not with the address');
  ok(/reply/i.test(privacy), 'and how to stop the second one');

  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 16).join('\n  - ') + (fails.length > 16 ? '\n  … and ' + (fails.length - 16) + ' more' : ''));
  console.log('check-in page tests passed (' + n + ' checks; ' + notes + ' recorded notes)');
})().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
