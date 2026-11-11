// The live first read, on the server: the kit's first section sent to the page line by line while
// the AI is still writing it (api/fightpack.js, api/_lib/fightpack-live.js).
//
// Why this exists: until now nothing the AI wrote reached a reader before the code's guards had
// been over the whole section (api/_lib/fightpack-guards.js). Showing lines as they are written
// could undo that quietly: a raw "EMERGENCY" label, a phone number recalled from memory, a
// "cannot detect" where the guideline says "may not reliably detect", on screen for a few seconds
// and then swapped for the guarded line. One first section in five is changed by a guard, so this
// is not a corner case. The rule this suite holds the server to: a line reaches the page only
// after the same guards have passed it, the finished section is exactly what a plain request gets,
// and a request that does not ask for the live reply is answered as it always was.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
const root = path.join(__dirname, '../..');
const tok = require('../../lib/unlock.js').sign({ sid: 'preview' });

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };
// A request that never finishes would leave nothing for Node to wait on, and the script would end
// quietly with exit code 0, its failures unreported. Ending before the last line is a failure.
let complete = false;
process.on('exit', () => {
  if (complete) return;
  console.log = realLog;
  console.error('test-live-read stopped before its end: a request never finished. ' + fails.length + ' of ' + n + ' checks had failed so far' + (fails.length ? ':\n  - ' + fails.slice(0, 6).join('\n  - ') : '.'));
  process.exitCode = 1;
});

// The count lines the handler writes ("[dmj] {json}", api/_lib/count.js).
const lines = [];
const realLog = console.log;
console.log = (s) => { if (typeof s === 'string' && s.startsWith('[dmj] ')) lines.push(JSON.parse(s.slice(6))); else realLog(s); };

// The stand-in AI. `reply` is what it writes; `asked` is the last request it was sent; `ai` is how it
// answers the next one: { status } to refuse it, { size, sse, chunks } to shape a streamed answer.
// A request that asks for a stream gets one; any other gets the whole answer at once, as today.
let reply = '';
let asked = null;
let ai = {};
global.fetch = async (url, opts) => {
  if (String(url).includes('/rpc/dmj_count')) return { ok: true, status: 204, json: async () => null };
  asked = { body: JSON.parse(opts.body), signal: opts.signal };
  if (ai.status) return { ok: false, status: ai.status, json: async () => ({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }) };
  if (asked.body.stream === true) return { ok: true, status: 200, body: chunks(sse(reply, ai.sse), ai.size || 37, Object.assign({ signal: opts.signal }, ai.chunks)) };
  return { ok: true, status: 200, json: async () => ({ content: [].concat(reply).map((text) => ({ type: 'text', text })), stop_reason: 'end_turn', usage: { input_tokens: 11, output_tokens: 7 } }) };
};
const fp = require('../../api/fightpack.js');
const T = fp._test;

// The response: json() for a plain reply; write() and end() for a stream; on('close') for the
// reader going away, which the test fires.
function mockRes() {
  const on = {};
  const r = { code: 0, body: null, headers: {}, written: '', writableEnded: false };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; r.writableEnded = true; return r; };
  r.write = (text) => { r.written += text; return true; };
  r.end = () => { r.writableEnded = true; };
  r.on = (ev, fn) => { (on[ev] = on[ev] || []).push(fn); return r; };
  r.fire = (ev) => (on[ev] || []).forEach((fn) => fn());
  return r;
}

// The first section of every stored kit: what the AI's answer to part 1 looks like, 169 times over.
const FIRST = [];
for (const run of fs.readdirSync(path.join(root, 'qa/evidence')).filter((d) => /^runs/.test(d)).sort()) {
  const dir = path.join(root, 'qa/evidence', run);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.kit.md')).sort()) {
    const md = fs.readFileSync(path.join(dir, f), 'utf8');
    const a = md.search(/^## 1\. /m), b = md.search(/^## 2\. /m);
    if (a >= 0 && b > a) FIRST.push({ file: run + '/' + f, text: md.slice(a, b).trim() });
  }
}
const DENIAL = 'NOTICE OF ADVERSE DETERMINATION. Prior authorization denied.';

// The model API's event stream for a text, in its documented format: message_start, the text in
// deltas of `step` characters inside one content block, message_delta, message_stop, with a ping on
// the way. Each event is an "event:" line, a "data:" line and a blank line. A list of texts is an
// answer in that many content blocks.
// errorAfter: n - the API's own "error" event follows the n-th delta, and the stream ends there.
function sse(text, { step = 20, crlf = false, errorAfter } = {}) {
  const events = [{ type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', content: [], model: 'claude-test', stop_reason: null, stop_sequence: null, usage: { input_tokens: 11, output_tokens: 1 } } }];
  let deltas = 0;
  let failed = errorAfter === 0;
  [].concat(text).forEach((block, index) => {
    if (failed) return;
    events.push({ type: 'content_block_start', index, content_block: { type: 'text', text: '' } });
    if (!index) events.push({ type: 'ping' });
    for (let i = 0; i < block.length && !failed; i += step) {
      events.push({ type: 'content_block_delta', index, delta: { type: 'text_delta', text: block.slice(i, i + step) } });
      if (++deltas === errorAfter) failed = true;
    }
    if (!failed) events.push({ type: 'content_block_stop', index });
  });
  if (failed) events.push({ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } });
  else {
    events.push({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 7 } });
    events.push({ type: 'message_stop' });
  }
  const nl = crlf ? '\r\n' : '\n';
  return Buffer.from(events.map((e) => 'event: ' + e.type + nl + 'data: ' + JSON.stringify(e) + nl + nl).join(''), 'utf8');
}
// The stream as a connection delivers it: pieces of `size` bytes, cut wherever that falls.
// throwAfter: k, error - the connection breaks after k pieces. hold: k, signal - it stalls before piece
// k (onHold is told) and, like a real fetch, fails with an AbortError when the request is aborted
// (ignoreAbort: it carries on instead, as a connection does when the rest had already arrived).
function chunks(buffer, size, { throwAfter, error, hold, signal, onHold, ignoreAbort } = {}) {
  return (async function* () {
    let k = 0;
    for (let i = 0; i < buffer.length; i += size, k++) {
      if (k === throwAfter) throw error;
      if (k === hold) {
        await new Promise((resolve, reject) => {
          const fail = () => (ignoreAbort ? resolve() : reject(Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })));
          if (signal.aborted) fail(); else signal.addEventListener('abort', fail);
          if (onHold) onHold();
        });
      }
      yield new Uint8Array(buffer.subarray(i, i + size));
    }
  })();
}
const all = async (it) => { const out = []; for await (const ev of it) out.push(ev); return out; };

// A request for part 1 the way it has always been made: no live flag.
async function plain(text, { denial = DENIAL, body = {} } = {}) {
  reply = text;
  const res = mockRes();
  await fp({ method: 'POST', body: Object.assign({ token: tok, part: 1, kid: 'kitPLAIN', denial }, body) }, res);
  return res;
}

// A request for part 1 that asks for the live reply. begin() starts it and hands back the response,
// a promise for the handler finishing, and one for the stand-in stalling (chunks: { hold }).
// Options: size (bytes per piece of the AI's stream), denial, sse and chunks (see above), status (the
// AI refuses the request), body (extra request fields).
function begin(text, { size = 37, denial = DENIAL, sse: sseOptions, chunks: chunkOptions, status, body = {} } = {}) {
  reply = text;
  let held;
  const holding = new Promise((resolve) => { held = resolve; });
  ai = { size, sse: sseOptions, chunks: Object.assign({ onHold: held }, chunkOptions), status };
  const res = mockRes();
  const finished = fp({ method: 'POST', body: Object.assign({ token: tok, part: 1, kid: 'kitLIVE', denial, live: true }, body) }, res);
  return { res, finished, holding };
}
// What the page would make of a reply: the messages, the lines it would be showing after the last of
// them, how many times a line it already showed was changed (redo), and the closing done or error.
function read(res) {
  const messages = res.written.split('\n\n').filter(Boolean).map((m) => {
    assert(m.startsWith('data: '), 'every message is one data line: ' + JSON.stringify(m.slice(0, 60)));
    return JSON.parse(m.slice(6));
  });
  let shown = [];
  let redo = 0;
  for (const m of messages) {
    if (!m.lines) continue;
    if (m.from < shown.length) redo++;
    shown = shown.slice(0, m.from).concat(m.lines);
  }
  const last = messages[messages.length - 1] || {};
  return { res, stream: res.written.length > 0, messages, shown, redo, done: last.done, error: last.error };
}
async function live(text, options) {
  const run = begin(text, options);
  await run.finished;
  ai = {};
  return read(run.res);
}
const S = FIRST.find((s) => s.file === 'runs27/C-prior-auth-biologic.kit.md').text;
const withLine = (text, line) => { const at = text.search(/^.*\*\*Case strength/m); assert(at >= 0, 'the section has a Case strength line'); return text.slice(0, at) + line + '\n' + text.slice(at); };
const isHeld = (l) => /\*\*(?:What you may (?:actually )?owe|Do this first)/.test(l);
const inOrder = (part, whole) => { let j = 0; for (const l of part) { while (j < whole.length && whole[j] !== l) j++; if (j === whole.length) return false; j++; } return true; };
// two of the guards run only when the letter is about emergency or ancillary care
const ER = 'EXPLANATION OF BENEFITS. Emergency department physician services, out-of-network. Patient responsibility $1,850.00.';
const HICCUP = { error: 'upstream', message: 'The kit engine hiccuped. Try again in a moment.' };
const TOO_LONG = 'That took too long. Try again — the kit builds in short passes.';

(async () => {
  // ---------- 1. one guard path: the finished section is what decodeText gives ----------
  // The live lines will come from decodeText. If the reply to a plain request came from anywhere
  // else, a guard added to one and not the other would let the two disagree.
  ok(FIRST.length >= 169, 'the stored kits give their first sections (' + FIRST.length + ')');
  for (const s of FIRST) {
    const res = await plain(s.text);
    ok(res.code === 200 && res.body.text === T.decodeText(s.text, { denial: DENIAL, extra: '', files: false, records: false }),
      s.file + ': the reply is what decodeText gives');
  }

  // ---------- 2. reading the AI's stream, and deciding which lines can be shown ----------
  const L = require('../../api/_lib/fightpack-live.js');
  // The stream arrives in pieces cut anywhere: inside an event, inside a character.
  const T2 = '## 1. Title\n**Type of denial:** medical necessity — “not medically necessary”\n';
  const whole = await all(L.modelEvents(chunks(sse(T2), 1e6)));
  ok(whole.filter((e) => e.type === 'content_block_delta').map((e) => e.delta.text).join('') === T2, 'the text comes back whole');
  for (const size of [1, 2, 3, 7, 64]) same(await all(L.modelEvents(chunks(sse(T2), size))), whole, 'the same events when the stream arrives ' + size + ' bytes at a time');
  same(await all(L.modelEvents(chunks(sse(T2, { crlf: true }), 5))), whole, 'and when its lines end with CRLF');
  same(await all(L.modelEvents(chunks(Buffer.concat([Buffer.from(': keep-alive\n\ndata: [DONE]\n\n'), sse(T2)]), 11))), whole, 'a comment line and a data line that is not JSON are passed over');

  // What may be shown of a guarded text: nothing before the heading, never the newest line (the
  // next line can still change it), never the two lines code rewrites at the end, nor anything after them.
  same(L.showable(''), [], 'nothing to show before any text');
  same(L.showable('Here is the section you asked for.\nMore.\n'), [], 'a sentence before the heading is never shown');
  same(L.showable('\n\n## 1. T\na\nb'), ['## 1. T', 'a'], 'leading blank lines are not shown, and the newest line is held back');
  same(L.showable('## 1. T\na\nb\n\n'), ['## 1. T', 'a'], 'a line break after the newest line does not release it');
  same(L.showable('## 1. T\na\n\n\nb'), ['## 1. T', 'a'], 'no blank lines trail what is shown');
  same(L.showable('## 1. T\na\n**What you may actually owe:** x\n\n**Do this first:** y\nz'), ['## 1. T', 'a'], 'the held lines and everything after them wait');
  same(L.showable('## 1. T\na\n- **Do this first:** y\nz'), ['## 1. T', 'a'], 'held with or without a bullet');

  // The reader: text in as the AI writes it, "from line N, these lines" out.
  const r = L.liveReader((p) => p.replace(/RAW/g, 'SAFE'));
  same(r.push('## 1. T\nfirst RAW li'), null, 'the heading waits for the line after it');
  same(r.push('ne\nsecond\n'), { from: 0, lines: ['## 1. T', 'first SAFE line'] }, 'lines are sent complete, guarded, and one line behind');
  same(r.push('third'), null, 'an unfinished line changes nothing');
  same(r.push('\n'), { from: 2, lines: ['second'] }, 'later lines are appended');
  same(r.redo(), 0, 'nothing was corrected');
  same(r.raw(), '## 1. T\nfirst RAW line\nsecond\nthird\n', 'the reader keeps the text as the AI wrote it');

  // A line already sent that the guards later change or remove is sent again, and counted.
  const flip = L.liveReader((p) => (/later/.test(p) ? p.replace('early', 'EARLY') : p));
  flip.push('## 1. T\nearly\nmiddle\n');
  same(flip.push('later\nend\n'), { from: 1, lines: ['EARLY', 'middle', 'later'] }, 'a changed line is sent again from where it changed');
  same(flip.redo(), 1, 'and counted');
  const cut = L.liveReader((p) => (/stop/.test(p) ? '## 1. T\na\nz' : p));
  cut.push('## 1. T\na\nb\nc\n');
  same(cut.push('stop\n'), { from: 2, lines: [] }, 'lines the guards removed are taken back');
  same(cut.redo(), 1, 'and counted');

  // ---------- 3. the live reply ----------
  // The handler's 110-second limit is caught here rather than left to run: a test fires it by hand,
  // and the suite's last check is that every request cleared its own.
  const realSet = global.setTimeout, realClear = global.clearTimeout;
  const limits = [];
  global.setTimeout = (fn, ms, ...rest) => { if (ms === 110000) { const t = { fn, cleared: false }; limits.push(t); return t; } return realSet(fn, ms, ...rest); };
  global.clearTimeout = (t) => { if (limits.includes(t)) { t.cleared = true; return undefined; } return realClear(t); };

  // Every stored first section, asked for both ways.
  for (const s of FIRST) {
    const a = await plain(s.text), b = await live(s.text);
    same(b.done, a.body, s.file + ': the finished section is the plain reply');
    ok(inOrder(b.shown, ((b.done || {}).text || '').split('\n')), s.file + ': every line shown is a line of the finished section, in order');
    ok(!b.shown.some(isHeld), s.file + ': the two held lines are not shown before the end');
    same(b.redo, 0, s.file + ': nothing shown had to be corrected');
  }
  const one = await live(S, { size: 1e6 });
  ok(one.stream && one.res.code === 200 && one.res.headers['Content-Type'] === 'text/event-stream; charset=utf-8', 'a live reply is an event stream');
  ok(/no-transform/.test(one.res.headers['Cache-Control'] || ''), 'that asks not to be transformed on the way');
  ok(one.shown.length > 20, 'most of the section is shown before it is finished (' + one.shown.length + ' lines)');
  ok(one.messages.slice(0, -1).every((m) => Object.keys(m).sort().join() === 'from,lines'), 'every message before the last is "from line N, these lines"');
  ok(one.messages.filter((m) => m.done).length === 1 && !!one.done, 'the finished section is sent once, last');
  ok(one.res.writableEnded, 'and the reply is ended');
  for (const size of [1, 5, 33, 400]) same((await live(S, { size })).shown, one.shown, 'the same lines when the answer arrives ' + size + ' bytes at a time');

  // One line per guard, written the way the guard exists to stop (the sentences are the guard
  // tests' own, qa/tests/test-fightpack-handler.js). None may reach the page as written.
  const RAW = [
    ['safety label', '- **Safety first:** EMERGENCY — numbness between the legs', DENIAL],
    ['emergency wording', '- **Who fixes this:** Go to an emergency department today, or call 911.', DENIAL],
    ['absolute claim', '- **Your strongest argument:** The cheaper test cannot detect small lesions.', DENIAL],
    ['choice condition', '- **Your strongest argument:** Ancillary services like anesthesia cannot be balance billed when the patient did not choose the provider.', DENIAL],
    ['consent exception', '- **Your strongest argument:** The claim must be reprocessed, unless a valid notice-and-consent form was signed in advance.', ER],
    ['choice argument', '- **Your strongest argument:** The hospital is in-network, and you did not choose the emergency physician.', ER],
    ['in-network rate', '- **Your strongest argument:** It should be paid at in-network rates.', DENIAL],
    ['later date', '- **Who fixes this:** Ask the representative to confirm the deadline; if it differs from your letter, use the later date.', DENIAL],
    ['billing-code claim', '- **What they have to show:** Please review the claim. 76942 is separately reportable.', DENIAL],
    ['setting limit', '- **Your strongest argument:** A skilled nursing facility is not validated for patients requiring daily physician oversight for active medical management.', DENIAL],
    ['phone number', '- **Who fixes this:** Call the state at 1-888-466-2219.', DENIAL]
  ];
  for (const [name, line, denial] of RAW) {
    const text = withLine(S, line);
    ok(!(await plain(text, { denial })).body.text.split('\n').includes(line), name + ": today's guards change this line");
    for (const size of [1, 9, 400]) {
      const b = await live(text, { denial, size });
      ok(b.stream && !b.messages.some((m) => m.lines && m.lines.includes(line)), name + ': the line as the AI wrote it never reaches the page (' + size + ' bytes at a time)');
      same(b.redo, 0, name + ': and nothing shown had to be corrected');
    }
  }
  const em = await live(withLine(S, RAW[0][1]), { size: 9 });
  ok(em.shown.some((l) => l.includes('Go to an emergency department now, or call 911.')), 'the safety line the code writes is shown');
  ok(/\*\*Do this first:\*\* Go to the emergency department now\./.test((em.done || {}).text || '') && !em.shown.some(isHeld), 'the first step the code rewrites arrives only with the finished section');

  // 3.1 the count: a live first section adds one number, how many shown lines were corrected
  {
    const lineOf = (kid) => lines.find((l) => l.kid === kid) || {};
    await live(S, { body: { kid: 'kitCOUNT1' } });
    same(Object.keys(lineOf('kitCOUNT1')).sort(), ['evt', 'kid', 'missing', 'part', 'redo', 'safety', 'src', 'urgent'], 'a live first section is counted with what a part always was, plus redo');
    same(lineOf('kitCOUNT1').redo, 0, 'redo is the number of corrections: none');
    await plain(S, { body: { kid: 'kitCOUNT2' } });
    ok(lineOf('kitCOUNT2').part === 1 && !('redo' in lineOf('kitCOUNT2')), 'a plain first section is counted exactly as before');
  }
  // 3.2 the AI refuses the request outright: today's error, not a stream
  {
    const b = await live(S, { status: 529 });
    ok(!b.stream && b.res.code === 502, 'a request the AI refuses is answered plainly (' + b.res.code + ')');
    same(b.res.body, HICCUP, 'with the message it always had');
  }
  // 3.3 the AI fails before a line could be shown: the same plain error, and nothing counted
  {
    const before = lines.length;
    const b = await live(S, { sse: { errorAfter: 0 } });
    ok(!b.stream && b.res.code === 502, 'a failure before the first line is a plain error, not a stream (' + b.res.code + ')');
    same(b.res.body, HICCUP, 'the same one a refused request gets');
    same(lines.length, before, 'and no part is counted');
  }
  // 3.4 the AI fails part-way: the stream ends with the error
  {
    const before = lines.length;
    const b = await live(S, { sse: { errorAfter: 30 } });
    ok(b.stream && b.shown.length > 0, 'lines were on the page when the AI failed');
    same(b.messages[b.messages.length - 1], { error: Object.assign({ status: 502 }, HICCUP) }, 'the stream ends with the error');
    ok(!b.messages.some((m) => m.done) && b.res.writableEnded, 'with no finished section, and the reply ended');
    same(lines.length, before, 'and no part is counted');
  }
  // 3.5 the connection to the AI breaks part-way
  {
    const before = lines.length;
    const b = await live(S, { chunks: { throwAfter: 120, error: new Error('socket hang up') } });
    ok(b.stream && b.shown.length > 0, 'lines were on the page when the connection broke');
    same(b.messages[b.messages.length - 1], { error: { status: 500, error: 'server', message: TOO_LONG } }, 'the stream ends with the error a broken request has always given');
    same(lines.length, before, 'and no part is counted');
  }
  // 3.6 the answer stalls: the time limit is still running while the answer is read, and firing it
  //     gives the timeout it always gave
  {
    const run = begin(S, { chunks: { hold: 120 } });
    await run.holding;
    const limit = limits[limits.length - 1];
    ok(read(run.res).shown.length > 0, 'lines were on the page when the answer stalled');
    ok(limit && !limit.cleared, 'the time limit is still running while the answer is being read');
    limit.fn();
    await run.finished;
    ai = {};
    const b = read(run.res);
    same(b.messages[b.messages.length - 1], { error: { status: 504, error: 'server', message: TOO_LONG } }, 'when it fires, the stream ends with the timeout message');
    ok(b.res.writableEnded, 'and the reply is ended');
  }
  // 3.7 nothing came back
  {
    const b = await live('');
    ok(!b.stream && b.res.code === 502, 'an empty answer is a plain error (' + b.res.code + ')');
    same(b.res.body, { error: 'upstream', message: 'That part came back empty. Try again in a moment.' }, 'the one it always was');
  }
  // 3.8 an answer with no heading shows nothing, and is answered as a plain request is
  {
    const a = await plain('I cannot help with that.');
    const b = await live('I cannot help with that.');
    ok(!b.stream && b.res.code === a.code, 'an answer with no section heading is not streamed');
    same(b.res.body, a.body, 'and gets the plain reply');
  }
  // 3.8b an answer that comes as two blocks of text is put together the way a plain answer is
  {
    const blocks = ['## 1. Your denial, decoded — and how strong your case is\n\n**Type of denial:** Medical necessity.', '**Case strength:** Strong. The records answer each point.\n\n**Who fixes this:** You file the appeal.'];
    const a = await plain(blocks), b = await live(blocks);
    ok(b.stream && /Medical necessity\.\n\*\*Case strength/.test(a.body.text), 'the plain answer joins the blocks with a line break');
    same(b.done, a.body, 'and the live answer is the same');
  }
  // 3.9 not live: the off switch, any part but the first, anything but the boolean
  {
    for (const off of ['off', 'OFF']) {
      process.env.FIGHTPACK_LIVE = off;
      const b = await live(S);
      ok(!b.stream && b.res.code === 200 && typeof b.res.body.text === 'string' && !('stream' in asked.body), 'FIGHTPACK_LIVE=' + off + ': the request is answered as today, and the AI is asked as today');
    }
    delete process.env.FIGHTPACK_LIVE;
    const two = await live('## 2. Your appeal letter\nBody.', { body: { part: 2, decode: S } });
    ok(!two.stream && two.res.body.part === 2 && !('stream' in asked.body), 'part 2 is never live');
    const word = await live(S, { body: { live: 'true' } });
    ok(!word.stream && typeof word.res.body.text === 'string' && !('stream' in asked.body), 'live must be the boolean true');
    const none = await plain(S);
    ok(!('stream' in asked.body) && none.written === '', 'a request without live is asked and answered as today');
  }
  // 3.10 the reader leaves: the AI is told to stop, nothing more is written, nothing is counted
  {
    const before = lines.length;
    const run = begin(S, { chunks: { hold: 120 } });
    await run.holding;
    const written = run.res.written;
    run.res.fire('close');
    await run.finished;
    ai = {};
    ok(asked.signal.aborted, 'the request to the AI is aborted');
    same(run.res.written, written, 'nothing more is written');
    ok(run.res.body === null && !run.res.writableEnded, 'and nothing is sent after the reader has gone');
    same(lines.length, before, 'no part is counted');
    // and if the rest of the answer arrives all the same, it is still not written, and not counted
    const late = begin(S, { chunks: { hold: 120, ignoreAbort: true } });
    await late.holding;
    const sent = late.res.written;
    late.res.fire('close');
    await late.finished;
    ai = {};
    same(late.res.written, sent, 'an answer that finishes after the reader has gone is not written');
    same(lines.length, before, 'nor counted');
  }
  same(limits.filter((t) => !t.cleared).length, 0, 'every request cleared its time limit when it ended (' + limits.length + ' requests)');
  global.setTimeout = realSet;
  global.clearTimeout = realClear;

  console.log = realLog;
  complete = true;
  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 16).join('\n  - ') + (fails.length > 16 ? '\n  … and ' + (fails.length - 16) + ' more' : ''));
  console.log('live-read tests passed (' + n + ' checks)');
})().catch((e) => { console.log = realLog; console.error(e.stack || e); process.exit(1); });
