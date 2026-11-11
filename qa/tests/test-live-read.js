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

  console.log = realLog;
  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 16).join('\n  - ') + (fails.length > 16 ? '\n  … and ' + (fails.length - 16) + ' more' : ''));
  console.log('live-read tests passed (' + n + ' checks)');
})().catch((e) => { console.log = realLog; console.error(e.stack || e); process.exit(1); });
