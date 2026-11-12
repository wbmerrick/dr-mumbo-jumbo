// Guards the counting contract behind the [dmj] log lines (see api/_lib/count.js).
//
// The bug this exists to prevent: /api/fightpack is called six times per kit, part 6 is
// re-asked whenever sections come back missing, and parts 2-6 run in parallel so part 6
// can succeed while another part fails. Counting lines, or treating part 6 as "a kit",
// overstates kits built. Kits built = distinct kid covering all 6 parts.
const assert = require('assert');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
const u = require('../../lib/unlock.js');
const tok = u.sign({ sid: 'preview' });

const lines = [];
const realLog = console.log;
console.log = (s) => { if (typeof s === 'string' && s.startsWith('[dmj] ')) lines.push(JSON.parse(s.slice(6))); else realLog(s); };

let reply = '';
const rpc = [];              // durable writes the handler attempted
let rpcMode = 'ok';          // 'ok' | 'error' | 'throw' | 'hang'
global.fetch = async (url, opts) => {
  if (String(url).includes('/rpc/dmj_count')) {
    rpc.push({ url: String(url), headers: opts.headers, body: JSON.parse(opts.body) });
    if (rpcMode === 'throw') throw new Error('network down');
    if (rpcMode === 'error') return { ok: false, status: 404, json: async () => ({ message: 'function not found' }) };
    // models real fetch: never settles on its own, rejects when the signal aborts
    if (rpcMode === 'hang') return new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
    return { ok: true, status: 204, json: async () => null };
  }
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: reply }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }) };
};
const fp = require('../../api/fightpack.js');

const REPLIES = {
  1: '## 1. Your denial, decoded — and how strong your case is\n- **Case strength:** Strong.',
  6: '## 9. Ask for an outside review (external review / IRE)\nBody.\n\n## 10. Your deadlines and what to do next\nBody.'
};
function mockRes(){ const r = { code: 0, body: null }; r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; }
async function call(part, kid, more){
  reply = REPLIES[part] || REPLIES[6];
  const res = mockRes();
  await fp({ method: 'POST', body: Object.assign({ token: tok, part, kid, denial: 'Claim 123 denied CO-50' }, more || {}) }, res);
  return res;
}
const kitsBuilt = () => {
  const byKid = {};
  for (const l of lines) if (l.evt === 'kit_part') (byKid[l.kid] = byKid[l.kid] || new Set()).add(l.part);
  return Object.values(byKid).filter((parts) => parts.size === 6).length;
};
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

(async () => {
  // a whole kit: all six parts under one tag
  for (const p of [1, 2, 3, 4, 5, 6]) ok((await call(p, 'kitAAA1')).code === 200, 'part ' + p + ' ok');
  ok(kitsBuilt() === 1, 'six parts under one tag = one kit built');

  // part 6 re-asked for missing sections must not invent a second kit
  await call(6, 'kitAAA1');
  ok(lines.filter((l) => l.kid === 'kitAAA1' && l.part === 6).length === 2, 'the retry does log a line');
  ok(kitsBuilt() === 1, 'a retried part 6 is still one kit (counting lines would say two)');

  // part 6 landing while a sibling part failed is NOT a built kit
  await call(1, 'kitBBB2');
  await call(6, 'kitBBB2');
  ok(kitsBuilt() === 1, 'part 6 without its siblings is not a built kit');

  // the tag is sanitised, never trusted
  await call(1, '../../etc/passwd; DROP TABLE x');
  ok(lines.some((l) => l.kid === 'etcpasswdDROPTABLEx'), 'tag stripped to alphanumerics');
  await call(1, 'z'.repeat(50));
  ok(lines.some((l) => l.kid === 'z'.repeat(24)), 'tag capped at 24 chars');
  await call(1, undefined);
  ok(lines.some((l) => l.kid === 'untagged'), 'missing tag falls back to untagged');

  // ---------- where the kit's reader came from ----------
  // One word the page sends with each part (fightpack.js works it out from the link's tag or the
  // site that linked here; test-source.js). The request body is whatever a caller sends, so the
  // word is cut down again here and never trusted. Written out by hand: 'Reddit Thread?id=5&name=John Smith'
  // lowercased, with everything but a-z 0-9 and dashes removed, is redditthreadid5namejohnsmith; 24 characters of that.
  const srcOf = (kid) => (lines.find((l) => l.kid === kid) || {}).src;
  await call(1, 'kitSRC01', { src: 'reddit' });
  ok(srcOf('kitSRC01') === 'reddit', 'the source word is counted with the kit part (got ' + srcOf('kitSRC01') + ')');
  ok((rpc.find((r) => r.body.p_data.kid === 'kitSRC01') || { body: { p_data: {} } }).body.p_data.src === 'reddit', 'and written with the durable count');
  await call(1, 'kitSRC02', { src: 'Reddit Thread?id=5&name=John Smith' });
  ok(srcOf('kitSRC02') === 'redditthreadid5namejohns', 'the word is cut down to lowercase letters, digits and dashes, 24 at most (got ' + srcOf('kitSRC02') + ')');
  await call(1, 'kitSRC03', { src: 'x-replies' });
  ok(srcOf('kitSRC03') === 'x-replies', 'dashes are kept (got ' + srcOf('kitSRC03') + ')');
  await call(1, 'kitSRC04');
  ok(srcOf('kitSRC04') === 'unknown', 'a call that names no source is counted as unknown (got ' + srcOf('kitSRC04') + ')');
  await call(1, 'kitSRC05', { src: { toString: () => 'reddit' } });
  ok(srcOf('kitSRC05') === 'unknown', 'only a plain string is taken as a source (got ' + srcOf('kitSRC05') + ')');
  await call(1, 'kitSRC06', { src: '!!! ???' });
  ok(srcOf('kitSRC06') === 'unknown', 'a word with nothing usable in it is counted as unknown (got ' + srcOf('kitSRC06') + ')');
  // What a count line may hold is the whole promise on the privacy page: which action, which part of
  // which kit, a safety label, two flags, and the source word. A field added here is a field kept.
  // redo is a number, on a first section that was shown live only: how many lines already on screen
  // had to be corrected (api/fightpack.js; checked in test-live-read.js). Nothing about the reader.
  const HOLDS = ['evt', 'kid', 'part', 'safety', 'urgent', 'missing', 'src', 'redo'];
  const extra = [...new Set(lines.flatMap((l) => Object.keys(l)))].filter((k) => !HOLDS.includes(k));
  ok(extra.length === 0, 'a count line holds only ' + HOLDS.join(', ') + ' (also found: ' + extra.join(', ') + ')');

  // no line ever carries submitted content
  const blob = JSON.stringify(lines);
  ok(!/Claim 123|CO-50|passwd/.test(blob.replace(/etcpasswdDROPTABLEx/g, '')), 'no submitted text in any count line');

  // ---------- the durable half ----------
  ok(rpc.length === lines.length, 'every log line also attempted a durable write');
  const last = rpc[rpc.length - 1];
  ok(last.url.endsWith('/rest/v1/rpc/dmj_count'), 'writes go through the insert-only function');
  ok(last.body.p_evt === 'kit_part' && typeof last.body.p_data === 'object', 'function arg shape');
  ok(!!last.headers.apikey, 'anon key sent');
  const rblob = JSON.stringify(rpc.map((r) => r.body));
  ok(!/Claim 123|CO-50/.test(rblob), 'no submitted text in any durable write');

  // A counter must never be able to break the site. Each of these would, if awaited naively.
  rpcMode = 'error';
  ok((await call(1, 'kitERR01')).code === 200, 'request still succeeds when dmj_count() is missing');
  rpcMode = 'throw';
  ok((await call(1, 'kitERR02')).code === 200, 'request still succeeds when the database is unreachable');
  rpcMode = 'hang';
  const t0 = Date.now();
  ok((await call(1, 'kitERR03')).code === 200, 'request still succeeds when the write hangs');
  ok(Date.now() - t0 < 4000, 'a hanging write is cut off by the timeout, not left to stall the response');
  rpcMode = 'ok';

  console.log = realLog;
  console.log('count/kid tests passed (' + n + ' assertions)');
})().catch((e) => { console.log = realLog; console.error(e); process.exit(1); });
