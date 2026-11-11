// The email is the copy of the kit people keep, so it only goes out when the kit is whole.
//
// Why this exists: on 2026-11-10 the live page was driven in a real browser with its API
// answered by a stub, and it emailed whatever it had. One section of ten when "Email me my kit"
// was pressed while the kit was still being written (the form shows as soon as the decode
// lands). Eight of ten after a part failed: the page said so, the email did not. Nine of ten
// after a part came back without one of its sections, with no word anywhere. And an appeal
// letter that stopped mid-sentence when the writer ran out of room: the handler reports that
// (stop: "max_tokens"), but the page never read it. Each time the page answered "Sent."
//
// The other way round failed too: a whole kit that could not be emailed. After a reload the page
// showed the saved kit but had not looked for its saved session, sent no token, and the reader was
// told "Your free session has ended. Rebuild the kit, then email it." The same happened whenever
// the session the kit was built in had used up its calls.
//
// These tests run fightpack.js itself, whole, against a browser small enough to read: the
// elements it looks up, a fetch that answers from a script, and timers that do not wait.
// None of the page's own logic is replaced. The kit is a stored one from qa/evidence.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const js = fs.readFileSync(path.join(root, 'fightpack.js'), 'utf8');

// ---------- the kit: a stored one, cut back into the six answers the page asks for ----------
const stored = fs.readFileSync(path.join(root, 'qa/evidence/runs27/C-prior-auth-biologic.kit.md'), 'utf8');
const OWN = { 1: [1], 2: [2], 3: [3, 4], 4: [5, 6], 5: [7, 8], 6: [9, 10] };
const at = {};
for (const m of stored.matchAll(/^## (\d{1,2})\. .*$/gm)) at[m[1]] = m.index;
const section = (n) => stored.slice(at[n], n < 10 ? at[n + 1] : stored.length).trim();
const TITLE = {};
for (let k = 1; k <= 10; k++) TITLE[k] = section(k).split('\n')[0].replace(/^## /, '').trim();
const PART = {};
for (const p of Object.keys(OWN)) PART[p] = OWN[p].map(section).join('\n\n');          // part 6 ends with its json block, as the API sends it
assert(Object.keys(at).length === 10 && /```json/.test(PART[6]), 'the stored kit has ten sections and its json block');
const LABEL = { 2: 'Your appeal letter', 3: "Your doctor's letter and the note for the office", 4: 'Peer-to-peer brief and the insurer phone script' };

// What the page's API answers. Like the real one it takes only a session token it handed out itself
// (/api/unlock) that still has calls left, and a kit counts as sent only if it was accepted.
// Part by part, plan[part] is a list used in order, last one repeating:
// 'ok' a whole answer · 'hold' no answer until release() · 500 a server error ·
// 'cut' the writer ran out of room · 'missing' the part's second section is not there.
const NO_SESSIONS = "You've built several kits in the last hour. Please try again in a little while.";
const SESSION_OVER = 'Your free session has ended. Rebuild the kit, then email it.';
function server(plan = {}) {
  const held = [], live = new Set();
  const answer = (url, body, nth) => {
    if (url === '/api/unlock') {
      if (answer.noSessions) return { status: 429, data: { error: 'busy', message: NO_SESSIONS } };
      const t = 'session-' + (++answer.sessions);
      live.add(t);
      return { status: 200, data: { token: t } };
    }
    if (answer.takesNone || !live.has(body.token)) return { status: 401, data: { error: 'locked', message: SESSION_OVER } };
    if (url === '/api/email-kit') { answer.sent.push(body.kit); return { status: 200, data: { ok: true, message: 'Sent.' } }; }
    const p = body.part, list = plan[p] || ['ok'], a = list[Math.min(nth, list.length) - 1];
    const whole = { status: 200, data: { part: p, text: PART[p], stop: 'end_turn', missing: [] } };
    if (a === 'hold') return new Promise((r) => held.push(() => r(whole)));
    if (a === 500) return { status: 500, data: { error: 'server', message: 'That took too long. Try again.' } };
    if (a === 'cut') return { status: 200, data: { part: p, text: PART[p].slice(0, Math.floor(PART[p].length * 2 / 3)), stop: 'max_tokens', missing: [] } };
    if (a === 'missing') return { status: 200, data: { part: p, text: PART[p].slice(0, PART[p].indexOf('## ' + OWN[p][1] + '.')).trim(), stop: 'end_turn', missing: ['## ' + TITLE[OWN[p][1]]] } };
    return whole;
  };
  answer.release = () => held.splice(0).forEach((f) => f());
  answer.useUp = () => live.clear();          // every session so far has had its share of calls
  answer.sessions = 0; answer.sent = []; answer.noSessions = false; answer.takesNone = false;
  return answer;
}

// ---------- a browser small enough to read ----------
function element() {
  const on = {}, cls = new Set();
  const e = {
    value: '', textContent: '', innerHTML: '', hidden: false, disabled: false, style: {},
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    addEventListener: (t, f) => { (on[t] = on[t] || []).push(f); },
    removeEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}, click() {}, reset() {}, select() {},
    querySelector: () => element(), appendChild: (k) => k, removeChild() {},
    fire: (t) => (on[t] || []).forEach((f) => f({ preventDefault() {} }))
  };
  Object.defineProperty(e, 'className', { get: () => [...cls].join(' '), set: (v) => { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)); } });
  return e;
}
function open(answer, saved = {}) {
  const els = {};
  const $ = (id) => els[id] || (els[id] = element());
  const asked = [];
  const fetch = (url, opts) => {
    const body = JSON.parse(opts.body);
    asked.push({ url, body });
    const nth = asked.filter((c) => c.url === url && c.body.part === body.part).length;
    return Promise.resolve(answer(url, body, nth)).then((a) => ({ ok: a.status < 300, status: a.status, json: () => Promise.resolve(a.data) }));
  };
  const localStorage = { getItem: (k) => (k in saved ? saved[k] : null), setItem: (k, v) => { saved[k] = String(v); }, removeItem: (k) => { delete saved[k]; } };
  // The page's short pauses (the retry, the toast) run at once; its long abort timers never fire.
  const soon = (fn, ms) => { if (ms <= 2000) Promise.resolve().then(fn); return 1; };
  new Function('window', 'document', 'localStorage', 'navigator', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'AbortController', js)(
    { matchMedia: () => ({ matches: true }) }, { getElementById: $, createElement: () => element(), body: element() }, localStorage, {}, fetch, soon, () => {}, () => 0, () => {},
    class { constructor() { this.signal = {}; } abort() {} });
  return {
    $, saved,
    asksFor: (p) => asked.filter((c) => c.url === '/api/fightpack' && c.body.part === p).length,
    asksToEmail: () => asked.filter((c) => c.url === '/api/email-kit').length,
    mailed: () => answer.sent
  };
}
const settle = async () => { for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r)); };
const build = async (page) => { page.$('example').fire('click'); page.$('buy').fire('click'); await settle(); };
const email = async (page) => { page.$('mailemail').value = 'reader@example.com'; page.$('mailform').fire('submit'); await settle(); return page.$('mailmsg'); };
const errorBox = (page) => (page.$('error').classList.contains('on') ? page.$('error').textContent : '');

// ---------- what "whole" means, worked out from the stored kit and not from the page ----------
// Marks (hashes, asterisks, rule lines) and white space are layout; everything else is the kit.
const bare = (s) => s.split(/\r?\n/).filter((l) => !/^-{3,}$/.test(l.trim())).join('').replace(/[#*\s]/g, '');
const WHOLE = bare(stored.replace(/```json[\s\S]*?```/, ''));
const kitOf = (text) => text.slice(0, text.indexOf('\n\n\nYOUR DEADLINES'));
const inOrder = (text) => { let from = 0; for (let k = 1; k <= 10; k++) { const i = ('\n' + text + '\n').indexOf('\n' + TITLE[k] + '\n', from); if (i < 0) return k; from = i + 1; } return 0; };

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (got !== want) fails.push(what + ' (got ' + JSON.stringify(got).slice(0, 160) + ', want ' + JSON.stringify(want).slice(0, 160) + ')'); };
const sentWhole = (page, what) => {
  const kits = page.mailed();
  same(kits.length, 1, what + ': the kit is emailed, once');
  if (kits.length !== 1) return;
  same(inOrder(kits[0]), 0, what + ': all ten sections are in the email, in order (first one not found)');
  ok(bare(kitOf(kits[0])) === WHOLE, what + ': every character of the stored kit is in the email');
  ok(/\n\n\nYOUR DEADLINES\n- /.test(kits[0]), what + ': the deadlines follow the last section');
};
const notSent = (page, msg, what) => {
  same(page.mailed().length, 0, what + ': nothing is emailed');
  ok(msg.classList.contains('err') && msg.textContent.trim().length > 0 && !/\bsent\b\.?$/i.test(msg.textContent.trim()), what + ': the reader is told it was not sent ("' + msg.textContent + '")');
};

(async () => {
  let page, msg, kit;

  // ---------- 1. a whole kit goes out whole ----------
  page = open(server({}));
  await build(page);
  same(errorBox(page), '', 'whole kit: no error is shown');
  msg = await email(page);
  sentWhole(page, 'whole kit');
  ok(msg.classList.contains('ok'), 'whole kit: the reader is told it was sent');

  // ---------- 2. a kit still being written is not emailed; once it is whole, it is ----------
  const writing = server({ 2: ['hold'], 3: ['hold'], 4: ['hold'], 5: ['hold'], 6: ['hold'] });
  page = open(writing);
  await build(page);
  ok(page.$('progress').classList.contains('on') && page.$('kitout').classList.contains('on'), 'still writing: the decode is showing while the other parts are on the way');
  notSent(page, await email(page), 'still writing');
  writing.release();
  await settle();
  await email(page);
  sentWhole(page, 'after the last part lands');

  // ---------- 3. a part that failed ----------
  page = open(server({ 4: [500] }));
  await build(page);
  ok(errorBox(page).includes(LABEL[4]), 'failed part: the page names the part that did not finish');
  msg = await email(page);
  notSent(page, msg, 'failed part');
  ok(msg.textContent.includes(LABEL[4]), 'failed part: the message under the button names it too');

  // ---------- 4. a part the writer did not finish ----------
  page = open(server({ 2: ['cut'] }));
  await build(page);
  same(page.asksFor(2), 2, 'cut off: the part is asked for a second time');
  ok(errorBox(page).includes(LABEL[2]), 'cut off twice: the page names the part that stops short ("' + errorBox(page) + '")');
  msg = await email(page);
  notSent(page, msg, 'cut off twice');
  ok(msg.textContent.includes(LABEL[2]), 'cut off twice: the message under the button names it too');

  page = open(server({ 2: ['cut', 'ok'] }));
  await build(page);
  same(errorBox(page), '', 'cut off once, whole on the second ask: no error is shown');
  await email(page);
  sentWhole(page, 'cut off once, whole on the second ask');

  // ---------- 5. a part that comes back without one of its sections ----------
  page = open(server({ 3: ['missing'] }));
  await build(page);
  same(page.asksFor(3), 2, 'missing section: the part is asked for a second time');
  ok(errorBox(page).includes(TITLE[4]), 'missing section: the page names the section that is not there ("' + errorBox(page) + '")');
  msg = await email(page);
  notSent(page, msg, 'missing section');
  ok(msg.textContent.includes(TITLE[4]), 'missing section: the message under the button names it too');

  page = open(server({ 3: ['missing', 'ok'] }));
  await build(page);
  await email(page);
  sentWhole(page, 'missing section, there on the second ask');

  // ---------- 6. the kit comes back from this browser the way it was left ----------
  // A reload is the same browser and the same server: a new page over what the old one saved.
  let api = server({ 2: ['cut'] });
  page = open(api);
  await build(page);
  page = open(api, page.saved);
  ok(page.$('kitout').classList.contains('on'), 'reload: the saved kit is shown again');
  notSent(page, await email(page), 'reload of a kit that stops short');

  api = server({ 2: ['cut'] });
  page = open(api);
  await build(page);
  page.$('fixfrom').value = 'PRIYA S. RAMANATHAN'; page.$('fixto').value = 'PRIYA RAMANATHAN';
  page.$('fixform').fire('submit');
  page = open(api, page.saved);
  notSent(page, await email(page), 'reload after "Fix a detail everywhere" on a kit that stops short');

  kit = { parts: Object.assign({}, PART, { 6: PART[6].replace(/```json[\s\S]*?```/, '').trim() }), meta: null, ts: Date.now() };
  delete kit.parts[4];
  page = open(server(), { dmj_fp_kit: JSON.stringify(kit) });
  notSent(page, await email(page), 'a saved kit with a part that never arrived');

  // ---------- 7. a whole kit on the page can be emailed, whatever became of its session ----------
  api = server();
  page = open(api);
  await build(page);
  page = open(api, page.saved);
  await email(page);
  sentWhole(page, 'reload of a whole kit');
  same(api.sessions, 1, 'reload of a whole kit: the saved session is used, a new one is not asked for');

  // A kit saved by the page as it was before carries no note of what was short (all six parts there
  // = whole), and here no session either: the page asks for one.
  kit.parts[4] = PART[4];
  api = server();
  page = open(api, { dmj_fp_kit: JSON.stringify(kit) });
  await email(page);
  sentWhole(page, 'a saved kit with no saved session');
  same(api.sessions, 1, 'a saved kit with no saved session: one is asked for');

  api = server();
  page = open(api);
  await build(page);
  api.useUp();                                                           // four kits' worth of calls, say
  msg = await email(page);
  sentWhole(page, 'the session has used up its calls');
  ok(msg.classList.contains('ok'), 'the session has used up its calls: the reader is told it was sent');
  same(page.asksToEmail(), 2, 'the session has used up its calls: refused once, sent on the second ask with a new session');

  api = server();
  api.noSessions = true;                                                 // this visitor has had the hour's share
  page = open(api, { dmj_fp_kit: JSON.stringify(kit) });
  msg = await email(page);
  notSent(page, msg, 'no session to be had');
  ok(msg.textContent.includes(NO_SESSIONS), 'no session to be had: the reader is told why, in the server\'s words ("' + msg.textContent + '")');
  same(page.$('mailbtn').disabled, false, 'no session to be had: the button works again');

  api = server();
  page = open(api);
  await build(page);
  api.takesNone = true;                                                  // a new session is refused as well
  msg = await email(page);
  notSent(page, msg, 'no session is taken');
  same(page.asksToEmail(), 2, 'no session is taken: the page asks twice and stops');
  same(page.$('mailbtn').disabled, false, 'no session is taken: the button works again');

  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.join('\n  - '));
  console.log('kit-complete tests passed (' + n + ' checks)');
})().catch((e) => { console.error(e && e.message ? e.message : e); process.exit(1); });
