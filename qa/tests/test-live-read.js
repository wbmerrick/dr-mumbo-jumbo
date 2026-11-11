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

// The count lines the handler writes ("[dmj] {json}", api/_lib/count.js).
const lines = [];
const realLog = console.log;
console.log = (s) => { if (typeof s === 'string' && s.startsWith('[dmj] ')) lines.push(JSON.parse(s.slice(6))); else realLog(s); };

// The stand-in AI. `reply` is what it writes; `asked` is the last request it was sent.
let reply = '';
let asked = null;
global.fetch = async (url, opts) => {
  if (String(url).includes('/rpc/dmj_count')) return { ok: true, status: 204, json: async () => null };
  asked = { body: JSON.parse(opts.body), signal: opts.signal };
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: reply }], stop_reason: 'end_turn', usage: { input_tokens: 11, output_tokens: 7 } }) };
};
const fp = require('../../api/fightpack.js');
const T = fp._test;

function mockRes() {
  const r = { code: 0, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  r.status = (c) => { r.code = c; return r; };
  r.json = (b) => { r.body = b; return r; };
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
// the way. Each event is an "event:" line, a "data:" line and a blank line.
function sse(text, { step = 20, crlf = false } = {}) {
  const events = [
    { type: 'message_start', message: { id: 'msg_test', type: 'message', role: 'assistant', content: [], model: 'claude-test', stop_reason: null, stop_sequence: null, usage: { input_tokens: 11, output_tokens: 1 } } },
    { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    { type: 'ping' }
  ];
  for (let i = 0; i < text.length; i += step) events.push({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(i, i + step) } });
  events.push({ type: 'content_block_stop', index: 0 });
  events.push({ type: 'message_delta', delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 7 } });
  events.push({ type: 'message_stop' });
  const nl = crlf ? '\r\n' : '\n';
  return Buffer.from(events.map((e) => 'event: ' + e.type + nl + 'data: ' + JSON.stringify(e) + nl + nl).join(''), 'utf8');
}
// The stream as a connection delivers it: pieces of `size` bytes, cut wherever that falls.
function chunks(buffer, size) {
  return (async function* () { for (let i = 0; i < buffer.length; i += size) yield new Uint8Array(buffer.subarray(i, i + size)); })();
}
const all = async (it) => { const out = []; for await (const ev of it) out.push(ev); return out; };

// A request for part 1 the way it has always been made: no live flag.
async function plain(text, { denial = DENIAL, body = {} } = {}) {
  reply = text;
  const res = mockRes();
  await fp({ method: 'POST', body: Object.assign({ token: tok, part: 1, kid: 'kitPLAIN', denial }, body) }, res);
  return res;
}

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

  console.log = realLog;
  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 16).join('\n  - ') + (fails.length > 16 ? '\n  … and ' + (fails.length - 16) + ' more' : ''));
  console.log('live-read tests passed (' + n + ' checks)');
})().catch((e) => { console.log = realLog; console.error(e.stack || e); process.exit(1); });
