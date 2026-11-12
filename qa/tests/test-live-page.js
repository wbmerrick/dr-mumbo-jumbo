// The live first read, on the page: the kit's first section drawn line by line while the server is
// still sending it (fightpack.js; the server's half is checked in test-live-read.js).
//
// Why this exists: for about 25 seconds after "Build my Fight Pack" a reader saw a progress panel
// and nothing about their own letter. Now the first section's lines appear as they are written.
// What that must never do is treat half a section as a kit. Text that is still arriving is not
// saved, not copied, not printed, not emailed, and not handed to the writers of the other five
// parts: they get the finished section only. And when the stream is not there to be had (an old
// browser, a network that holds the reply back, the off switch, a failure part-way) the reader must
// end up exactly where they did before, with nothing half-drawn left behind.
//
// Runs fightpack.js itself, whole, against a small scripted browser (as test-source.js does): the
// elements it looks up, timers that do not wait, and a fetch whose reply to the live request is a
// stream this test feeds piece by piece.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const js = fs.readFileSync(path.join(root, 'fightpack.js'), 'utf8');
const sampleText = fs.readFileSync(path.join(root, 'sample-kit.json'), 'utf8');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };
// A build that never finishes would leave nothing for Node to wait on, and the script would end
// quietly with exit code 0. Ending before the last line is a failure.
let complete = false;
process.on('exit', () => {
  if (complete) return;
  console.error('test-live-page stopped before its end: a build never finished. ' + fails.length + ' of ' + n + ' checks had failed so far' + (fails.length ? ':\n  - ' + fails.slice(0, 6).join('\n  - ') : '.'));
  process.exitCode = 1;
});

// A kit for the server to answer with: a stored one, cut into the six answers the page asks for.
const stored = fs.readFileSync(path.join(root, 'qa/evidence/runs27/C-prior-auth-biologic.kit.md'), 'utf8');
const at = {};
for (const m of stored.matchAll(/^## (\d{1,2})\. .*$/gm)) at[m[1]] = m.index;
const cut = (k) => stored.slice(at[k], k < 10 ? at[k + 1] : stored.length).trim();
const HOLDS = { 1: [1], 2: [2], 3: [3, 4], 4: [5, 6], 5: [7, 8], 6: [9, 10] };
const ANSWER = {};
for (const p of Object.keys(HOLDS)) ANSWER[p] = HOLDS[p].map(cut).join('\n\n');
const LETTER = 'NOTICE OF ADVERSE DETERMINATION. Prior authorization for infliximab is denied: step therapy with an immunomodulator is required first.';
// The first section as the server would send it: its lines, and where two of them are.
const L = ANSWER[1].split('\n');
const iType = L.findIndex((l) => /\*\*Type of denial/.test(l));
const iGrade = L.findIndex((l) => /\*\*Case strength/.test(l));
const HICCUP = { status: 502, error: 'upstream', message: 'The kit engine hiccuped. Try again in a moment.' };

const bytes = (text) => new Uint8Array(Buffer.from(text, 'utf8'));
const frame = (message) => bytes('data: ' + JSON.stringify(message) + '\n\n');
const join = (list) => new Uint8Array(Buffer.concat(list.map((u) => Buffer.from(u))));
const whole = (text, more) => ({ done: Object.assign({ part: 1, text, stop: 'end_turn', missing: [] }, more || {}) });
const plainReply = (status, data) => ({ ok: status >= 200 && status < 300, status, headers: { get: () => 'application/json; charset=utf-8' }, json: () => Promise.resolve(data) });

function element() {
  const on = {}, cls = new Set(), found = {};
  let html = '';
  const e = {
    value: '', textContent: '', hidden: false, disabled: false, style: {}, children: [], scrolls: 0, seen: new Set(),
    classList: { add: (c) => { cls.add(c); e.seen.add(c); }, remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    addEventListener: (t, f) => { (on[t] = on[t] || []).push(f); },
    removeEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() { e.scrolls++; }, click() {}, reset() {}, select() {},
    querySelector: (sel) => found[sel] || (found[sel] = element()), appendChild: (k) => { e.children.push(k); return k; }, removeChild() {},
    fire: (t) => (on[t] || []).forEach((f) => f({ preventDefault() {} }))
  };
  Object.defineProperty(e, 'className', { get: () => [...cls].join(' '), set: (v) => { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => { cls.add(c); e.seen.add(c); }); } });
  Object.defineProperty(e, 'innerHTML', { get: () => html, set: (v) => { html = String(v); e.children = []; } });
  return e;
}

// One page load.
//   hash        what follows the address the reader opened ('#sample' opens the example)
//   canStream   false: a browser with no way to read a reply piece by piece
//   first       a plain reply to give the first live request, instead of a stream
//   holdRetry   the plain re-ask for part 1 stays unanswered until page.release()
//   retryFails  that re-ask is then answered with a server error
//   holdRest    parts 2-6 stay unanswered until page.releaseRest()
//   later       a plain reply to give every live request after the first
//   failParts   these parts (of 2-6) are answered with a server error, every time they are asked for
function open({ hash = '', canStream = true, first = null, holdRetry = false, retryFails = false, holdRest = false, later = null, failParts = [] } = {}) {
  const els = {};
  const $ = (id) => els[id] || (els[id] = element());
  const posts = [];
  const saved = {};
  const copied = [];
  let printed = 0;
  let stream = null;          // the live reply being fed: { queue, waiting, ended }
  let liveAsked = 0;
  let release = null;
  const rest = [];
  // A stand-in for layout, on a screen 664 high. A build leaves the progress panel at the top of the screen
  // (the page scrolls it there). Under it, top to bottom: the panel itself (shrunk or full, while it is up),
  // the kit's heading (a row taller once the strength tag is on it), the kit's controls (hidden while the kit
  // is built in view of the reader), and then the documents. Everything moves up the screen by however far
  // the page has been scrolled since: by the page to make up for a change (window.scrollBy), or by the reader.
  let movedBy = 0;
  const moves = [];
  const has = (id, c) => $(id).classList.contains(c);
  const above = () => (has('progress', 'on') ? (has('progress', 'slim') ? 124 : 392) : 0) + 60 + ($('strength').style.display === 'inline-flex' ? 40 : 0) + (has('kitout', 'live') ? 0 : 540);
  $('progress').getBoundingClientRect = () => ({ top: -movedBy });
  $('docs').getBoundingClientRect = () => ({ top: above() - movedBy });
  const read = () => new Promise((resolve) => {
    if (stream.queue.length) resolve({ done: false, value: stream.queue.shift() });
    else if (stream.ended) resolve({ done: true, value: undefined });
    else stream.waiting = resolve;
  });
  const feed = (piece) => {
    assert(stream, 'the page has asked for the live reply');
    if (stream.waiting) { const w = stream.waiting; stream.waiting = null; w({ done: false, value: piece }); } else stream.queue.push(piece);
  };
  const end = () => { stream.ended = true; if (stream.waiting) { const w = stream.waiting; stream.waiting = null; w({ done: true, value: undefined }); } };
  const fetch = (url, opts) => {
    if (!opts || !opts.body) {
      return url === '/sample-kit.json' ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(sampleText)) })
        : Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('not json')) });
    }
    const body = JSON.parse(opts.body);
    posts.push({ url, body });
    if (url === '/api/unlock') return Promise.resolve(plainReply(200, { token: 'session-' + posts.length }));
    if (body.part === 1 && body.live === true) {
      if (first && !liveAsked) { liveAsked++; return Promise.resolve(first); }
      if (later && liveAsked++) return Promise.resolve(later);
      stream = { queue: [], waiting: null, ended: false };
      return Promise.resolve({ ok: true, status: 200, headers: { get: () => 'text/event-stream; charset=utf-8' }, body: { getReader: () => ({ read, cancel() {}, releaseLock() {} }) }, json: () => Promise.reject(new Error('not json')) });
    }
    const answer = (body.part === 1 && retryFails) || failParts.includes(body.part) ? plainReply(502, { error: 'upstream', message: HICCUP.message })
      : plainReply(200, { part: body.part, stop: 'end_turn', missing: [], text: ANSWER[body.part] });
    if (body.part === 1 && holdRetry && !release) return new Promise((resolve) => { release = () => resolve(answer); });
    if (body.part > 1 && holdRest) return new Promise((resolve) => { rest.push(() => resolve(answer)); });
    return Promise.resolve(answer);
  };
  const keeps = (bag) => ({ getItem: (k) => (k in bag ? bag[k] : null), setItem: (k, v) => { bag[k] = String(v); }, removeItem: (k) => { delete bag[k]; } });
  const win = { matchMedia: () => ({ matches: true }), location: { hash, search: '', hostname: 'dr-mumbo-jumbo.com' }, va() {}, sessionStorage: keeps({}), print() { printed++; }, innerHeight: 664,
    // the page moved by hand, as (x, y); `seen` is whether the reader would watch it glide (the site's pages scroll smoothly unless told otherwise)
    scrollBy(x, y) { moves.push({ x, y, seen: root.style.scrollBehavior !== 'auto' }); movedBy += y; } };
  const root = element(), docBody = element();
  const navigator = { clipboard: { writeText: (text) => { copied.push(text); return Promise.resolve(); } } };
  const soon = (fn, ms) => { if (ms <= 2000) Promise.resolve().then(fn); return 1; };
  class FileReader { readAsDataURL() { this.result = 'data:application/pdf;base64,JVBERi0x'; Promise.resolve().then(() => this.onload()); } }
  new Function('window', 'document', 'localStorage', 'navigator', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'AbortController', 'FileReader', 'TextDecoder', 'Response', js)(
    win, { getElementById: $, createElement: () => element(), body: docBody, documentElement: root, referrer: '' }, keeps(saved), navigator, fetch, soon, () => {}, () => 0, () => {},
    class { constructor() { this.signal = {}; } abort() {} }, FileReader, canStream ? TextDecoder : undefined, canStream ? Response : undefined);
  const page = {
    $, saved,
    posts: () => posts.length,
    sent: () => posts.filter((c) => c.url === '/api/fightpack').map((c) => c.body),      // what each part's request carried
    firsts: () => posts.filter((c) => c.url === '/api/fightpack' && c.body.part === 1).map((c) => c.body.live),
    copied: () => copied,
    printed: () => printed,
    drawn: () => $('docs').children.map((card) => card.innerHTML).join('\n'),
    docsTop: () => $('docs').getBoundingClientRect().top,      // where the documents start on screen
    moves: () => moves,                                        // every time the page was moved to hold the reader's place
    smoothly: () => root.style.scrollBehavior !== 'auto',      // whether the page's own scrolling is still the smooth kind
    readerScrolls: (dy) => { movedBy += dy; },                 // the reader's own scrolling, down the page (+) or back up it (-)
    toasted: () => docBody.children.filter((el) => el.classList.contains('toast')).map((el) => el.querySelector('span').textContent).join(' | '),   // the short message at the foot of the screen
    error: () => ($('error').classList.contains('on') ? $('error').textContent : ''),
    bytes: async (piece) => { feed(piece); await settle(); },
    say: async (message) => { feed(frame(message)); await settle(); },
    done: async (text, more) => { feed(frame(whole(text, more))); end(); await settle(); },
    fail: async (error) => { feed(frame({ error })); end(); await settle(); },
    drop: async () => { end(); await settle(); },
    release: async () => { assert(release, 'a plain re-ask for part 1 is waiting'); release(); await settle(); },
    releaseRest: async () => { assert(rest.length === 5, 'parts 2-6 are waiting (' + rest.length + ')'); rest.splice(0).forEach((go) => go()); await settle(); }
  };
  return page;
}
const settle = async () => { for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r)); };
// Open the site, type a letter, press Build.
async function started(how) {
  const page = open(how);
  page.$('denial').value = LETTER;
  page.$('buy').fire('click');
  await settle();
  return page;
}
const built = (page) => page.sent().filter((b) => b.part > 1).length === 5 && /"parts"/.test(page.saved.dmj_fp_kit || '') && page.error() === '';
const shown = (page) => page.$('strength').style.display === 'inline-flex';

(async () => {
  // ---------- 1. the first section arrives line by line ----------
  {
    const page = await started({ holdRest: true });
    same(page.sent()[0].live, true, 'the first request for part 1 asks for the live reply');
    ok(!page.$('kitout').classList.contains('on'), 'nothing of the kit is shown before a line has come');
    await page.say({ from: 0, lines: L.slice(0, 3) });
    ok(page.$('kitout').classList.contains('on') && page.$('kitout').classList.contains('live'), 'the kit area opens, marked live');
    ok(page.$('progress').classList.contains('slim'), 'the progress panel shrinks');
    ok(/Read from your letter/.test(page.drawn()), 'the first lines are on the page');
    ok(/pulse-dot/.test(page.drawn()), 'with a mark that the section is still being written');
    same(page.$('progress').scrolls, 2, 'the page is brought to the panel and the first document');
    const top = page.docsTop();
    await page.say({ from: 3, lines: L.slice(3, iType + 1) });
    ok(/Type of denial/.test(page.drawn()), 'later lines are added');
    ok(!shown(page), 'no strength tag before its line');
    await page.say({ from: iType + 1, lines: L.slice(iType + 1, iGrade + 1) });
    ok(shown(page) && /Good/.test(page.$('strength').textContent), 'the strength tag appears with its line');
    same(page.docsTop(), top, 'the tag takes a row above the documents, and they stay where they are on screen');
    await page.say({ from: iGrade, lines: ['**Case strength:** Needs evidence. One record is missing.'] });
    ok(/Needs evidence/.test(page.drawn()) && /Needs evidence/.test(page.$('strength').textContent), 'a corrected line replaces the old one, and the tag follows it');
    await page.say({ from: iGrade, lines: [] });
    ok(!/Case strength/.test(page.drawn()) && !shown(page), 'a line taken back leaves the page, and its tag with it');
    same(page.docsTop(), top, 'and the documents still have not moved');
    same(page.$('progress').scrolls, 2, 'the page is not scrolled again while lines arrive');

    // not a kit yet
    ok(!('dmj_fp_kit' in page.saved), 'nothing is saved while the section is live');
    const fixWas = page.$('fixform').hidden;
    for (const id of ['copyall', 'printbtn', 'fixbtn', 'regen']) page.$(id).fire('click');
    await settle();
    same(page.copied(), [], 'Copy everything does nothing while the section is live');
    same(page.printed(), 0, 'nor does Print');
    same(page.$('fixform').hidden, fixWas, 'nor does Fix a detail');
    ok(page.$('buy').disabled === true, 'nor does Rebuild: the Build button stays switched off while the section is written');
    page.$('buy').fire('click');
    page.$('mailform').fire('submit');
    await settle();
    same(page.posts(), 2, 'and nothing is sent: no email, no second build, none of the other five parts');

    // the finished section takes its place; the rest of the kit is still being written
    await page.done(ANSWER[1]);
    ok(/Do this first/.test(page.drawn()) && !/pulse-dot/.test(page.drawn()), 'the finished section is drawn, closing lines and all, with no still-writing mark');
    ok(shown(page) && /Good/.test(page.$('strength').textContent), 'the strength tag is the finished section\'s');
    const rest = page.sent().filter((b) => b.part > 1);
    ok(rest.length === 5 && rest.every((b) => b.decode === ANSWER[1].slice(0, 8000) && !('live' in b)), 'the other five parts are asked for with the finished section, and no live flag');
    ok(page.$('kitout').classList.contains('live') && page.$('progress').classList.contains('slim'), 'while they are written the kit\'s controls stay away and the panel stays small: nothing above the reader changes');
    same(page.docsTop(), top, 'the finished section replaces the live one without moving it, though the tag is back above it');
    ok(!('dmj_fp_kit' in page.saved), 'and nothing is saved until the kit is whole');

    // the kit is done: its controls come back and the panel goes, above the reader, who is not moved
    const before = page.docsTop();
    await page.releaseRest();
    ok(!page.$('kitout').classList.contains('live'), 'when the kit is done its controls are back');
    ok(!page.$('progress').classList.contains('slim') && !page.$('progress').classList.contains('on'), 'the panel is put away, full size for the next build');
    same(page.docsTop(), before, 'and the documents stay where they are on screen through both changes');
    ok(page.moves().length > 0 && page.moves().every((m) => m.x === 0 && !m.seen), 'the place is held at once, not by a scroll the reader watches');
    ok(page.smoothly(), 'and the page\'s own smooth scrolling is left as it was');
    ok(page.$('kitout').scrolls === 0 && page.$('progress').scrolls === 2, 'the page is not sent to the top of the kit');
    ok(/ready/i.test(page.toasted()), 'so the reader is told the kit is ready where they are (' + page.toasted() + ')');
    ok(/"parts"/.test(page.saved.dmj_fp_kit || ''), 'the finished kit is saved, as today');
    same(page.error(), '', 'and the build raises no error');
    page.$('copyall').fire('click');
    await settle();
    ok(page.copied().length === 1 && /Read from your letter/.test(page.copied()[0]), 'and Copy everything works again');
  }

  // ---------- 1b. a reader who has gone back up to their letter is left where they are ----------
  {
    const page = await started({ holdRest: true });
    await page.say({ from: 0, lines: L.slice(0, 3) });
    page.readerScrolls(-2000);
    ok(page.docsTop() > 664, '(the reader has scrolled back up: the documents are off the bottom of the screen)');
    await page.say({ from: 3, lines: L.slice(3, iGrade + 1) });
    ok(shown(page), '(the strength tag has appeared, down in the kit)');
    await page.done(ANSWER[1]);
    await page.releaseRest();
    ok(built(page), '(the kit is built)');
    same(page.moves(), [], 'the page is never moved: nothing this reader is looking at has changed');
    ok(/ready/i.test(page.toasted()), 'and they are told the kit is ready, where they are');
  }
  {
    // What decides it is whether the reader can see what stands above the kit. Scrolled up far enough to read
    // their letter over it (the kit starts below the top quarter of the screen), they are left alone, even with
    // the first document still showing at the foot of the screen; a nudge up the page is not that.
    const up = await started({ holdRest: true });
    await up.say({ from: 0, lines: L.slice(0, 3) });
    up.readerScrolls(-300);
    ok(up.docsTop() < 664, '(scrolled up 300: the first document is still on screen, lower down)');
    await up.say({ from: 3, lines: L.slice(3, iGrade + 1) });
    await up.done(ANSWER[1]);
    await up.releaseRest();
    same(up.moves(), [], 'a reader looking at what is above the kit is not moved, though documents show below');
    const nudged = await started({ holdRest: true });
    await nudged.say({ from: 0, lines: L.slice(0, 3) });
    nudged.readerScrolls(-100);
    const top = nudged.docsTop();
    await nudged.say({ from: 3, lines: L.slice(3, iGrade + 1) });
    await nudged.done(ANSWER[1]);
    await nudged.releaseRest();
    same(nudged.docsTop(), top, 'a reader who only nudged the page up is still reading the kit, and is held');
    const deep = await started({ holdRest: true });
    await deep.say({ from: 0, lines: L.slice(0, 3) });
    deep.readerScrolls(900);
    const from = deep.docsTop();
    await deep.say({ from: 3, lines: L.slice(3, iGrade + 1) });
    await deep.done(ANSWER[1]);
    await deep.releaseRest();
    same(deep.docsTop(), from, 'and so is one far down in the kit, the documents\' top long gone above the screen');
  }

  // ---------- 2. the reply arrives all at once (a network that held it back) ----------
  {
    const page = await started();
    await page.bytes(join([frame({ from: 0, lines: L.slice(0, 10) }), frame({ from: 10, lines: L.slice(10, 40) }), frame(whole(ANSWER[1]))]));
    ok(built(page), 'everything in one read: the kit is built');
    ok(!page.$('kitout').classList.contains('live') && !page.$('progress').classList.contains('slim'), 'with nothing left marked live or shrunk');
    ok(/Do this first/.test(page.drawn()) && !/pulse-dot/.test(page.drawn()), 'and the finished section on the page');
  }

  // ---------- 3. a message, or a character, split across two reads ----------
  {
    const message = frame({ from: 0, lines: L.slice(0, 3) });
    const unsplit = await started();
    await unsplit.bytes(message);
    const dash = message.indexOf(0xE2);   // the first byte of the heading's dash, three bytes long
    ok(dash > 0, 'the heading holds a dash that takes more than one byte');
    for (const [where, at] of [['inside its JSON', 20], ['inside a character', dash + 1]]) {
      const page = await started();
      await page.bytes(message.slice(0, at));
      same(page.drawn(), '', 'a message cut ' + where + ': nothing is drawn from the first piece');
      await page.bytes(message.slice(at));
      same(page.drawn(), unsplit.drawn(), 'a message cut ' + where + ': the second piece completes it, the same as unsplit');
      ok(/decoded — and how strong/.test(page.drawn()), 'a message cut ' + where + ': the heading keeps its dash');
    }
  }

  {
    // something on the way adds a line of its own (a keep-alive comment): it is passed over
    const page = await started();
    await page.bytes(join([bytes(': keep-alive\n\n'), frame({ from: 0, lines: L.slice(0, 3) })]));
    ok(page.$('kitout').classList.contains('live') && /Read from your letter/.test(page.drawn()), 'a line in the stream that is not a message is passed over, and the lines after it are shown');
    same(page.firsts(), [true], 'without the page giving up on the stream and asking again');
    await page.done(ANSWER[1]);
    ok(built(page), 'and the kit builds');
  }

  // ---------- 4. the stream fails part-way, three ways: the live view is cleared, and part 1 is asked for again the plain way ----------
  for (const [name, breakIt] of [
    ['the server reports a failure', (page) => page.fail(HICCUP)],
    ['the stream just stops', (page) => page.drop()],
    ['the section comes back cut short', (page) => page.done(ANSWER[1], { stop: 'max_tokens' })]
  ]) {
    const page = await started({ holdRetry: true });
    await page.say({ from: 0, lines: L.slice(0, iGrade + 1) });
    ok(shown(page) && page.$('kitout').classList.contains('live'), name + ': (the section was live, tag and all)');
    await breakIt(page);
    same(page.drawn(), '', name + ': the live text is gone');
    ok(!page.$('kitout').classList.contains('live') && !page.$('kitout').classList.contains('on'), name + ': the kit area is closed again');
    ok(!page.$('progress').classList.contains('slim') && page.$('progress').classList.contains('on'), name + ': the progress panel is back, full size');
    ok(!shown(page), name + ': the strength tag is gone');
    same(page.$('progress').scrolls, 3, name + ': the page is brought back to the panel');
    page.$('copyall').fire('click');
    await settle();
    ok(!page.copied().some((text) => /Read from your letter/.test(text)), name + ': nothing live is left to copy');
    same(page.firsts(), [true, undefined], name + ': part 1 is asked for once more, without the live flag');
    same(page.posts(), 3, name + ': and nothing else is asked for until it comes');
    await page.release();
    ok(built(page) && page.sent().length === 7, name + ': the kit then builds');
    same(page.$('kitout').scrolls, 1, name + ': and the page goes to the kit when it is done, as it always did');
  }

  // ---------- 4b. the stream fails part-way and the plain re-ask fails too: an error, and no half-kit ----------
  {
    const page = await started({ holdRetry: true, retryFails: true });
    await page.say({ from: 0, lines: L.slice(0, iGrade + 1) });
    await page.fail(HICCUP);
    await page.release();
    ok(/hiccuped/.test(page.error()), 'when asking again fails as well, the reader is told (' + page.error().slice(0, 60) + ')');
    ok(!page.$('kitout').classList.contains('on') && page.drawn() === '', 'and no part-written document is left on the page');
    ok(!('dmj_fp_kit' in page.saved), 'nothing is saved');
    same(page.sent().length, 2, 'and the other five parts are never asked for');
    ok(!page.$('progress').classList.contains('on') && !page.$('progress').classList.contains('slim') && page.$('buy').disabled === false, 'the panel is put away and Build can be pressed again');
  }

  // ---------- 4c. watched live, and two of the other parts fail: the reader is brought to the message ----------
  {
    const page = await started({ failParts: [3, 5] });
    await page.say({ from: 0, lines: L.slice(0, 3) });
    await page.done(ANSWER[1]);
    ok(/did not finish/.test(page.error()), 'when sections did not finish, the reader is told (' + page.error().slice(0, 70) + ')');
    same(page.$('error').scrolls, 1, 'and is brought to the message instead of being left reading below it');
    same(page.$('kitout').scrolls, 0, '(the message is above the kit: the page does not go to the kit\'s top)');
    ok(!/ready/i.test(page.toasted()), 'nothing says the kit is ready');
    ok(!page.$('kitout').classList.contains('live') && !page.$('progress').classList.contains('on') && !page.$('progress').classList.contains('slim'), 'the kit\'s controls are back and the panel is put away');
  }
  {
    // the same failure with no live view (the server answered the plain way) ends as it always did
    const page = await started({ failParts: [3, 5], first: plainReply(200, { part: 1, stop: 'end_turn', missing: [], text: ANSWER[1] }) });
    ok(/did not finish/.test(page.error()), '(a plain build with two parts failing: the reader is told)');
    ok(page.$('kitout').scrolls === 1 && page.$('error').scrolls === 0, 'and the page goes to the kit, as it always did');
  }

  // ---------- 5. no line ever comes ----------
  {
    // the server fails before the first line: a plain error, and the one retry there has always been
    const page = await started({ first: plainReply(502, { error: 'upstream', message: HICCUP.message }) });
    same(page.firsts(), [true, undefined], 'an error before any line: part 1 is asked for again, the plain way');
    ok(built(page) && !page.$('kitout').seen.has('live') && !page.$('progress').seen.has('slim'), 'and the kit builds with nothing ever marked live');
  }
  {
    // a session that has done its share of kits: the page gets a new one, and has not tried the live reply yet
    const page = await started({ first: plainReply(401, { error: 'locked', message: 'Your free session has ended.' }) });
    same(page.firsts(), [true, true], 'after a new session, part 1 is asked for live again');
    await page.say({ from: 0, lines: L.slice(0, 3) });
    ok(page.$('kitout').classList.contains('live'), 'and its lines are shown');
    await page.done(ANSWER[1]);
    ok(built(page), 'and the kit builds');
  }
  {
    // the off switch: the server answers the live request the old way
    const page = await started({ first: plainReply(200, { part: 1, stop: 'end_turn', missing: [], text: ANSWER[1] }) });
    ok(built(page) && page.sent().length === 6, 'a plain reply to a live request: the kit builds from it');
    ok(!page.$('kitout').seen.has('live') && !page.$('progress').seen.has('slim'), 'with nothing ever marked live or shrunk');
    ok(page.$('kitout').scrolls === 1 && page.$('progress').scrolls === 1, 'and the page moves as it always did: to the panel, then to the kit');
    same(page.moves(), [], 'with no holding in place: there was no reader mid-document to hold');
    same(page.toasted(), '', 'and nothing is announced: the page going to the kit says it');
  }
  {
    // a browser that cannot read a reply piece by piece does not ask for one
    const page = await started({ canStream: false });
    ok(!('live' in page.sent()[0]), 'a browser that cannot read a stream sends no live flag');
    ok(built(page) && page.sent().length === 6, 'and its kit builds as before');
  }

  {
    // a second build on the same page, this time answered the plain way: nothing is carried over from the live one
    const page = await started({ later: plainReply(200, { part: 1, stop: 'end_turn', missing: [], text: ANSWER[1] }) });
    await page.say({ from: 0, lines: L.slice(0, 3) });
    await page.done(ANSWER[1]);
    ok(built(page) && page.$('kitout').scrolls === 0, '(a first build, watched live: the page is not sent to the kit)');
    page.$('regen').fire('click');
    await settle();
    same(page.sent().length, 12, 'a second build runs');
    same(page.$('kitout').scrolls, 1, 'answered the plain way, it ends at the top of the kit, as a plain build always did');
    ok(!page.$('kitout').classList.contains('live') && !page.$('progress').classList.contains('slim'), 'with nothing marked live');
  }

  // ---------- 6. the example kit still asks the server for nothing ----------
  {
    const page = open({ hash: '#sample' });
    await settle();
    ok(page.$('kitout').classList.contains('sample'), 'the link to the example opens the example');
    same(page.posts(), 0, 'and sends nothing to the server');
  }

  // ---------- 7. the page's styles for the live view (index.html) ----------
  // The script only marks the kit "live"; what a reader then sees is decided by the styles. Two things
  // depend on them. The kit's controls must really be away until there is a kit. And nothing INSIDE the
  // documents may change size when they come back: holdPlace makes up for what changes above the documents,
  // not for a row appearing inside one. In a real browser each document's own Copy button, taken out
  // while the kit was built, came back as a row of its own on a phone and pushed the text being read down
  // 42 px (13 px on a laptop), and the documents further down by more. So that button is hidden where it
  // stands, keeping its place.
  {
    const css = (fs.readFileSync(path.join(root, 'index.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/) || [])[1] || '';
    const rules = {};
    css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/([^{}]+)\{([^{}]*)\}/g, (all, selectors, body) => {
      selectors.split(',').forEach((sel) => { const k = sel.trim().replace(/\s+/g, ' '); rules[k] = (rules[k] || '') + ';' + body.replace(/\s+/g, ''); });
      return '';
    });
    const says = (sel, decl) => (rules[sel] || '').split(';').includes(decl);
    ['.kit-actions', '.checkline', '.mailkit', '.fixform', '#deadlines', '.whisper'].forEach((part) => {
      ok(says('.kitout.live ' + part, 'display:none'), 'while a kit is built in view of the reader, ' + part + ' is away');
    });
    ok(says('.kitout.live .copy-btn', 'visibility:hidden'), 'a document\'s own Copy button is hidden while the kit is built');
    ok(!says('.kitout.live .copy-btn', 'display:none'), 'but keeps its place, so the text under it does not move when it comes back');
    ok(says('.progress.slim .plist', 'display:none'), 'and the progress panel, made small, loses its list');
  }

  complete = true;
  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 16).join('\n  - ') + (fails.length > 16 ? '\n  … and ' + (fails.length - 16) + ' more' : ''));
  console.log('live-page tests passed (' + n + ' checks)');
})().catch((e) => { complete = true; console.error(e.stack || e); process.exit(1); });
