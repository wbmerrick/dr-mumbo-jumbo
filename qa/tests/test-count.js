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
global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: reply }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }) });
const fp = require('../../api/fightpack.js');

const REPLIES = {
  1: '## 1. Your denial, decoded — and how strong your case is\n- **Case strength:** Strong.',
  6: '## 9. Ask for an outside review (external review / IRE)\nBody.\n\n## 10. Your deadlines and what to do next\nBody.'
};
function mockRes(){ const r = { code: 0, body: null }; r.setHeader = () => {}; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; }
async function call(part, kid){
  reply = REPLIES[part] || REPLIES[6];
  const res = mockRes();
  await fp({ method: 'POST', body: { token: tok, part, kid, denial: 'Claim 123 denied CO-50' } }, res);
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

  // no line ever carries submitted content
  const blob = JSON.stringify(lines);
  ok(!/Claim 123|CO-50|passwd/.test(blob.replace(/etcpasswdDROPTABLEx/g, '')), 'no submitted text in any count line');

  console.log = realLog;
  console.log('count/kid tests passed (' + n + ' assertions)');
})().catch((e) => { console.log = realLog; console.error(e); process.exit(1); });
