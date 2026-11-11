// "Try an example" shows a finished kit at once, and never passes it off as the reader's own.
//
// Why this exists: the example button only filled the two boxes. To see what the Fight Pack
// makes, a first-time visitor still had to press Build and wait about a minute, and every one
// of those waits was a real kit: six model calls paid for, to rewrite the same example. The
// page now shows a kit the site wrote for that letter earlier (sample-kit.json).
//
// A stored kit shown in place of a built one can go wrong in ways a built one cannot. It can
// be saved over the kit a reader built from their own letter, or emailed to them as theirs.
// It can stand in for a real build of somebody's own letter. It can be edited by hand, or left
// behind when the example letter changes, and then it is no longer what the tool writes. And
// the file can simply be missing from the deploy. Each of those is checked here.
//
// The example's letter and its story can also ride along into a real kit. The button fills both
// boxes; a reader who then pastes their own letter in the first box, or photographs it, used to
// send the example's "eight weeks of physical therapy ... new left-leg weakness" with it, and the
// kit put somebody else's symptoms in their appeal and their doctor's letter. Showing the
// example first makes that path the usual one, so it is closed here too.
//
// The second half runs fightpack.js itself, whole, against a browser small enough to read
// (as test-kit-complete.js does): the elements it looks up, a fetch that answers from a
// script, and timers that do not wait. None of the page's own logic is replaced.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const js = fs.readFileSync(path.join(root, 'fightpack.js'), 'utf8');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (got !== want) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };

// ---------- the file ----------
const file = path.join(root, 'sample-kit.json');
assert(fs.existsSync(file), 'sample-kit.json exists (build it with scripts/build-sample-kit.js)');
const sampleText = fs.readFileSync(file, 'utf8');
const sample = JSON.parse(sampleText);

// 1. It is what the site returned, not a word changed: the raw answers are on record next to it.
for (let p = 1; p <= 6; p++) {
  const raw = JSON.parse(fs.readFileSync(path.join(root, 'qa/evidence/sample/S-homepage-example/part' + p + '.json'), 'utf8')).data.text;
  ok(typeof sample.parts[p] === 'string' && sample.parts[p] === raw, 'part ' + p + ' of the sample is exactly what the site returned (qa/evidence/sample)');
}

// 2. It was built from the letter the example button puts in the boxes today.
const literal = (name) => new Function('return ' + js.match(new RegExp('var ' + name + " = ('(?:[^'\\\\\\n]|\\\\.)*');"))[1])();
const EXAMPLE_DENIAL = literal('EXAMPLE_DENIAL'), EXAMPLE_EXTRA = literal('EXAMPLE_EXTRA');
ok(sample.from && sample.from.denial === EXAMPLE_DENIAL && sample.from.extra === EXAMPLE_EXTRA, "the sample was built from the page's current example letter and note (if the example changed, rebuild the sample)");

// 3. It is a whole kit: the ten documents a medical-necessity denial gets, in order.
const TITLES = [
  '1. Your denial, decoded — and how strong your case is',
  '2. Your appeal letter',
  '3. Letter of medical necessity — for your doctor to sign',
  "4. Note for your doctor's office",
  '5. Peer-to-peer talking points — for your doctor',
  '6. Phone script — calling the insurer',
  "7. Phone script — calling the hospital or doctor's billing office",
  '8. Records and itemized-bill request letter',
  '9. If they say no again — external review request',
  '10. Your deadlines and next moves'
];
const whole = [1, 2, 3, 4, 5, 6].map((p) => sample.parts[p] || '').join('\n\n');
same((whole.match(/^## .+$/gm) || []).map((h) => h.replace(/^## /, '').trim()).join(' | '), TITLES.join(' | '), 'the sample has the ten documents, once each, in order');

// 4. Its facts are the example letter's: notice 10/02/2026, 180 days to appeal (March 31, 2027),
//    care already received, $1,650.00 billed. Worked out from the letter, not from the kit.
const tracker = JSON.parse((sample.parts[6].match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i) || [])[1] || 'null');
ok(!!tracker, 'the sample carries its deadline tracker data');
same(tracker && tracker.denial_date, '2026-10-02', "tracker: the letter's notice date");
same(tracker && tracker.appeal_window_days, 180, "tracker: the letter's appeal window");
same(tracker && tracker.service_type, 'post-service', 'tracker: care already received');
same(tracker && tracker.urgent, false, 'tracker: care already received is never expedited');
ok(/March 31, 2027/.test(whole), 'the kit states the appeal deadline: March 31, 2027');
const money = [...new Set((whole.replace(/\[[^\[\]]{0,300}\]/g, ' ').match(/\$\s?\d[\d,]*(?:\.\d{2})?/g) || []).map((m) => parseFloat(m.replace(/[^\d.]/g, ''))))];
same(money.join(','), '1650', 'the only dollar amount in the kit is the $1,650.00 on the letter');

// 5. The deploy carries it. Only what .vercelignore lets back in is served.
const allowed = fs.readFileSync(path.join(root, '.vercelignore'), 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.startsWith('!'))
  .map((l) => new RegExp('^' + l.slice(1).replace(/^\//, '').replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*') + '$'));
ok(allowed.length >= 5, 'read the deploy allow-list (' + allowed.length + ' entries)');
ok(allowed.some((re) => re.test('fightpack.js')), 'the allow-list is read correctly (the page script is on it)');
ok(allowed.some((re) => re.test('sample-kit.json')), 'sample-kit.json is on the deploy allow-list (.vercelignore), so the page can load it');

// ---------- the page ----------
// A kit of the reader's own: a stored one from another case, cut into the six answers the page asks for.
const stored = fs.readFileSync(path.join(root, 'qa/evidence/runs27/C-prior-auth-biologic.kit.md'), 'utf8');
const OWN = { 1: [1], 2: [2], 3: [3, 4], 4: [5, 6], 5: [7, 8], 6: [9, 10] };
const at = {};
for (const m of stored.matchAll(/^## (\d{1,2})\. .*$/gm)) at[m[1]] = m.index;
const cut = (k) => stored.slice(at[k], k < 10 ? at[k + 1] : stored.length).trim();
const MINE = {};
for (const p of Object.keys(OWN)) MINE[p] = OWN[p].map(cut).join('\n\n');
const MY_LETTER = 'NOTICE OF ADVERSE DETERMINATION. Prior authorization for infliximab is denied: step therapy with an immunomodulator is required first.';

function element() {
  const on = {}, cls = new Set();
  let html = '';
  const e = {
    value: '', textContent: '', hidden: false, disabled: false, style: {}, children: [],
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    addEventListener: (t, f) => { (on[t] = on[t] || []).push(f); },
    removeEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}, click() {}, reset() {}, select() {},
    querySelector: () => element(), appendChild: (k) => { e.children.push(k); return k; }, removeChild() {},
    fire: (t) => (on[t] || []).forEach((f) => f({ preventDefault() {} }))
  };
  Object.defineProperty(e, 'className', { get: () => [...cls].join(' '), set: (v) => { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)); } });
  Object.defineProperty(e, 'innerHTML', { get: () => html, set: (v) => { html = String(v); e.children = []; } });
  return e;
}
// file: 'ok' the sample is served · 'missing' the deploy does not have it · 'offline' the request fails ·
// 'broken' what comes back is not a whole kit. page.serve() changes it while the page is open.
function open({ file = 'ok', saved = {}, hash = '', hold = false } = {}) {
  const els = {};
  const $ = (id) => els[id] || (els[id] = element());
  const posts = [], gets = [], events = [], held = [];
  const fetch = (url, opts) => {
    if (!opts || !opts.body) {
      gets.push(url);
      if (url !== '/sample-kit.json' || file === 'missing') return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('not json')) });
      if (file === 'offline') return Promise.reject(new Error('offline'));
      const kit = JSON.parse(sampleText);
      if (file === 'broken') delete kit.parts[6];
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(kit) });
    }
    const body = JSON.parse(opts.body);
    posts.push({ url, body });
    const answer = url === '/api/unlock' ? { token: 'session-1' }
      : url === '/api/email-kit' ? { ok: true, message: 'Sent.' }
      : { part: body.part, text: MINE[body.part], stop: 'end_turn', missing: [] };
    const res = { ok: true, status: 200, json: () => Promise.resolve(answer) };
    return hold && url === '/api/fightpack' && body.part > 1 ? new Promise((r) => held.push(() => r(res))) : Promise.resolve(res);
  };
  const localStorage = { getItem: (k) => (k in saved ? saved[k] : null), setItem: (k, v) => { saved[k] = String(v); }, removeItem: (k) => { delete saved[k]; } };
  const soon = (fn, ms) => { if (ms <= 2000) Promise.resolve().then(fn); return 1; };
  // a chosen PDF is read at once, as the browser would hand it over
  class FileReader { readAsDataURL() { this.result = 'data:application/pdf;base64,JVBERi0x'; Promise.resolve().then(() => this.onload()); } }
  new Function('window', 'document', 'localStorage', 'navigator', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'AbortController', 'FileReader', js)(
    { matchMedia: () => ({ matches: true }), location: { hash }, va: (kind, e) => { if (kind === 'event') events.push(e.name); } },
    { getElementById: $, createElement: () => element(), body: element() }, localStorage, {}, fetch, soon, () => {}, () => 0, () => {},
    class { constructor() { this.signal = {}; } abort() {} }, FileReader);
  return {
    $, saved, events, gets,
    serve: (what) => { file = what; },
    posts: (url) => posts.filter((c) => !url || c.url === url).length,
    sent: () => posts.filter((c) => c.url === '/api/fightpack').map((c) => c.body),          // what each part's request carried
    choose: async (id) => { $(id).files = [{ name: 'my-denial.pdf', type: 'application/pdf', size: 20000 }]; $(id).fire('change'); await settle(); },
    release: () => held.splice(0).forEach((f) => f()),
    shown: () => ($('kitout').classList.contains('on') ? $('docs').children.map((c) => ((c.innerHTML.match(/<h3>([^<]*)/) || [])[1] || '').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&')) : []),
    asExample: () => $('kitout').classList.contains('sample'),
    error: () => ($('error').classList.contains('on') ? $('error').textContent : '')
  };
}
const settle = async () => { for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r)); };
const press = async (page, id) => { page.$(id).fire(id === 'mailform' || id === 'fixform' ? 'submit' : 'click'); await settle(); };
const type = (page, letter) => { page.$('denial').value = letter; page.$('extra').value = ''; };
const SAMPLE_TITLES = TITLES.join(' | ');
const MY_TITLES = Object.keys(at).sort((a, b) => a - b).map((k) => cut(+k).split('\n')[0].replace(/^## /, '').trim()).join(' | ');
// as the page saves it; this reader's letter printed its deadline as a date
const ownKit = () => JSON.stringify({ parts: MINE, meta: { denial_date: '2026-10-20', stated_appeal_deadline: '2027-01-15', appeal_window_days: 60 }, gaps: {}, ts: Date.now() });

(async () => {
  // ---------- 6. one press shows the whole example, and asks the server for nothing ----------
  {
    const page = open();
    await press(page, 'example');
    same(page.$('denial').value, EXAMPLE_DENIAL, 'the example letter is in the box, as before');
    same(page.$('extra').value, EXAMPLE_EXTRA, 'the example note is in the box, as before');
    same(page.shown().join(' | '), SAMPLE_TITLES, 'the finished example kit is on the page: ten documents, in order');
    ok(page.asExample(), 'it is marked as the example');
    same(page.posts(), 0, 'showing the example asks the server for nothing (no session, no model call)');
    same(page.$('dlDenial').value, '2026-10-02', "the deadline tracker is filled from the example's notice date");
    same(page.$('dlDays').value, '180', "the deadline tracker is filled from the example's appeal window");
    ok(!('dmj_fp_kit' in page.saved), 'the example is not saved in the browser as a kit');
    ok(page.events.includes('example_opened') && !page.events.includes('kit_start') && !page.events.includes('kit_built'), 'it is counted as an example opened, not as a kit built (' + page.events.join(',') + ')');

    // ---------- 7. it is never the reader's own kit ----------
    page.$('mailemail').value = 'reader@example.com';
    await press(page, 'mailform');
    same(page.posts('/api/email-kit') + page.posts('/api/unlock'), 0, 'the example is not emailed');
    ok(/example/i.test(page.$('mailmsg').textContent), 'and the reader is told why ("' + page.$('mailmsg').textContent + '")');
    page.$('fixfrom').value = '00000000'; page.$('fixto').value = 'ABC123';
    await press(page, 'fixform');
    ok(!('dmj_fp_kit' in page.saved), 'correcting a detail in the example does not save it either');

    // ---------- 8. Build on the unchanged example shows the same kit; it does not write it again ----------
    await press(page, 'buy');
    same(page.posts(), 0, 'pressing Build with the example unchanged calls nothing');
    ok(page.asExample() && page.shown().length === 10 && !page.error(), 'the example kit stays on the page, with no error');
  }
  {
    const page = open();
    page.$('denial').value = EXAMPLE_DENIAL; page.$('extra').value = EXAMPLE_EXTRA;      // typed or pasted, not from the button
    await press(page, 'buy');
    same(page.posts(), 0, 'the example pasted in by hand is still the example: Build shows the stored kit');
    same(page.shown().join(' | '), SAMPLE_TITLES, 'and the kit shown is the example kit');
  }

  // ---------- 9. change a word, and Build is a real build ----------
  {
    const page = open();
    await press(page, 'example');
    page.$('denial').value = EXAMPLE_DENIAL + ' The member is 54.';
    await press(page, 'buy');
    same(page.posts('/api/fightpack'), 6, 'an edited example is built for real: all six parts are asked for');
    ok(!page.asExample(), 'the kit that comes back is not marked as the example');
    same(page.shown().join(' | '), MY_TITLES, 'and it is the kit the server wrote, not the stored one');
    ok('dmj_fp_kit' in page.saved, "the reader's own kit is saved in the browser");
    page.$('mailemail').value = 'reader@example.com';
    await press(page, 'mailform');
    same(page.posts('/api/email-kit'), 1, "and the reader's own kit can be emailed");
  }
  {
    const page = open();
    await press(page, 'example');
    page.$('extra').value = 'Six weeks of physical therapy; no weakness.';          // the letter is the example's, the story is not
    await press(page, 'buy');
    same(page.posts('/api/fightpack'), 6, 'the example letter with a different note is built for real');
    ok(!page.asExample(), 'and that kit is not marked as the example');
  }
  {
    const page = open();
    type(page, MY_LETTER);
    await press(page, 'buy');
    same(page.posts('/api/fightpack'), 6, "a reader's own letter is always built for real");
    same(page.gets.length, 0, 'and the stored example is not even fetched');
  }

  // ---------- 9b. the example never rides along in a reader's kit ----------
  {
    const page = open();
    await press(page, 'example');
    page.$('denial').value = MY_LETTER; page.$('denial').fire('input');                 // their own letter, pasted over the example's
    same(page.$('extra').value, '', "pasting a letter over the example's takes the example's note out of the second box");
    await press(page, 'buy');
    const sent = page.sent();
    ok(sent.length === 6 && sent.every((b) => b.denial === MY_LETTER && b.extra === ''), "the kit is built from the reader's letter alone, with none of the example's story (" + JSON.stringify(sent.map((b) => b.extra.slice(0, 24))) + ')');
  }
  {
    const page = open();
    await press(page, 'example');
    await page.choose('file');                                                             // their own denial, as a file
    same([page.$('denial').value, page.$('extra').value].join('|'), '|', "choosing a file of their own clears the example's letter and note from the boxes");
    await press(page, 'buy');
    const sent = page.sent();
    ok(sent.length === 6 && sent.every((b) => b.denial === '' && b.extra === '' && b.file && b.file.kind === 'pdf'), "the kit is built from the reader's file alone, not from the example's letter with it");
    ok(!page.asExample(), 'and it is their kit, not the example');
  }
  {
    const page = open();
    await press(page, 'example');
    await page.choose('recfile');                                                          // their doctor's note, as a file
    same([page.$('denial').value, page.$('extra').value].join('|'), '|', "choosing their own records clears the example's letter and note too");
    await press(page, 'buy');
    same(page.posts('/api/fightpack'), 0, 'with no denial of their own yet, nothing is built');
    ok(/denial letter/i.test(page.error()), 'and they are asked for their denial letter ("' + page.error() + '")');
  }
  {
    const page = open();
    await press(page, 'example');
    page.$('denial').value = EXAMPLE_DENIAL + ' The member is 54.'; page.$('denial').fire('input');
    same(page.$('extra').value, EXAMPLE_EXTRA, "adding to the example's letter keeps its note: that is still the example");
    const mine = open();
    type(mine, MY_LETTER); mine.$('extra').value = 'Two flares this year; on prednisone now.'; mine.$('denial').fire('input');
    same(mine.$('extra').value, 'Two flares this year; on prednisone now.', "a reader's own note is never cleared");
    await mine.choose('file');
    same([mine.$('denial').value, mine.$('extra').value].join('|'), MY_LETTER + '|Two flares this year; on prednisone now.', "and choosing a file leaves a reader's own letter and note where they are");
  }

  // ---------- 10. a kit the reader built stays theirs ----------
  {
    const mine = ownKit();
    const page = open({ saved: { dmj_fp_kit: mine } });
    await settle();
    same(page.shown().join(' | '), MY_TITLES, "a returning reader's saved kit is shown");
    same(page.$('dlStated').value, '2027-01-15', "the tracker holds the reader's own printed deadline");
    await press(page, 'example');
    ok(page.asExample() && page.shown().join(' | ') === SAMPLE_TITLES, 'the example can still be opened');
    same([page.$('dlDenial').value, page.$('dlStated').value, page.$('dlDays').value].join(' / '), '2026-10-02 /  / 180', "the tracker then shows the example's dates, with nothing left over from the reader's kit");
    same(page.saved.dmj_fp_kit, mine, "the reader's saved kit is untouched by it");
    ok(/still saved/i.test(page.$('notice').textContent), 'and the reader is told their own kit is still saved ("' + page.$('notice').textContent + '")');
  }

  // ---------- 11. the example does not cut in on a kit that is being written ----------
  {
    const page = open({ hold: true });
    type(page, MY_LETTER);
    await press(page, 'buy');                                 // the decode is in; parts 2-6 are still out
    await press(page, 'example');
    ok(!page.asExample(), 'pressing the example while a kit is being written does not swap it in');
    page.release(); await settle();
    same(page.shown().join(' | '), MY_TITLES, "the reader's kit finishes and is the one shown");
    ok(!page.asExample() && 'dmj_fp_kit' in page.saved, 'and it is saved as theirs');
  }

  // ---------- 12. no file, no harm: the button does what it always did ----------
  for (const file of ['missing', 'offline', 'broken']) {
    const page = open({ file });
    await press(page, 'example');
    same(page.$('denial').value, EXAMPLE_DENIAL, 'sample ' + file + ': the example letter is still put in the box');
    ok(page.shown().length === 0 && !page.error(), 'sample ' + file + ': nothing is shown and nothing is reported as an error');
    await press(page, 'buy');
    same(page.posts('/api/fightpack'), 6, 'sample ' + file + ': Build then writes the example for real, as it used to');
    ok(!page.asExample(), 'sample ' + file + ': and that kit is not marked as the example');
  }

  {
    const page = open({ file: 'offline' });
    await press(page, 'example');
    ok(page.shown().length === 0, 'a request that failed shows nothing');
    page.serve('ok');
    await press(page, 'example');
    same(page.shown().join(' | '), SAMPLE_TITLES, 'and the next press looks again, and shows the example once it can be had');
  }

  // ---------- 13. a link that opens straight to it ----------
  {
    const page = open({ hash: '#sample' });
    await settle();
    same(page.shown().join(' | '), SAMPLE_TITLES, '/#sample opens with the example kit on the page');
    ok(page.asExample() && page.$('denial').value === EXAMPLE_DENIAL && page.posts() === 0, 'marked as the example, with its letter in the box and nothing asked of the server');
    const mine = ownKit();
    const back = open({ hash: '#sample', saved: { dmj_fp_kit: mine } });
    await settle();
    ok(back.asExample() && back.saved.dmj_fp_kit === mine, "/#sample leaves a returning reader's saved kit untouched");
    const plain = open();
    await settle();
    ok(plain.shown().length === 0 && plain.gets.length === 0, 'without the link, the page opens as before and does not fetch the example');
  }

  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 14).join('\n  - ') + (fails.length > 14 ? '\n  … and ' + (fails.length - 14) + ' more' : ''));
  console.log('sample-kit tests passed (' + n + ' checks)');
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
