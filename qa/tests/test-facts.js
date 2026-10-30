// v9.10 facts (api/_lib/fightpack-facts.js), on the real lines the model wrote, and through the handler.
const assert = require('assert');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
const F = require('../../api/_lib/fightpack-facts.js');
const u = require('../../lib/unlock.js');
const M = require('../manifest.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

// ---------- the ambulance owed line ----------
const I = M.find((c) => c.id.startsWith('I-'));
const iSource = [I.denial || '', I.extra || ''].join('\n');
ok(F.isAmbulance(iSource), 'case I is an ambulance claim');
ok(!F.isAmbulance('MRI lumbar spine (CPT 72148) denied'), 'an MRI is not');
// run 21, case I, the decode
const run21 = '**What you may actually owe:** The notice says "Maximum You May Be Billed $1,398.10" for the two ambulance line items. For Original Medicare with a participating ambulance provider, if the redetermination approves the service, you would owe your Part B coinsurance. If the ambulance provider is non-participating or does not accept assignment, the amount could be higher.';
const fixed = F.owedLine('- **Plan:** Original Medicare (Part B)\n' + run21 + '\n**Do this first:** x', iSource);
ok(/The notice shows \$1,398\.10 as the most you may be billed\./.test(fixed), "the notice's own total");
ok(/must accept Medicare's approved amount as payment in full/.test(fixed) && !/participat|could be higher/.test(fixed), 'the assignment rule replaces the participation conditions');
ok(/^- \*\*Plan:\*\* Original Medicare \(Part B\)$/m.test(fixed) && /\*\*Do this first:\*\* x$/m.test(fixed), 'the other lines stay');
ok(F.owedLine(fixed, iSource) === fixed, 'idempotent');
ok(!/\$/.test(F.owedLine('**What you may actually owe:** about $99.', 'a notice with no totals')), 'never a figure the notice does not show');
ok(F.owedLine('no such line', iSource) === 'no such line', 'no owed line: unchanged');

// ---------- policy numbers ----------
const cite = "[Cite: Medicare's National Coverage Determination (NCD) 20.4 or the Local Coverage Determination (LCD) for ambulance services, which this patient's presentation meets; request the policy text if criteria are unclear.]";
assert.strictEqual(F.policyNumbers(cite, iSource), "[Cite: Medicare's National Coverage Determination (NCD) or the Local Coverage Determination (LCD) for ambulance services, which this patient's presentation meets; request the policy text if criteria are unclear.]"); n++;
const Fcase = M.find((c) => c.id.startsWith('F-'));
const fLine = 'Under National Coverage Determination 280.3, a power wheelchair is covered when the patient cannot safely use a cane, walker or manual wheelchair at home.';
ok(F.policyNumbers(fLine, [Fcase.denial, Fcase.extra].join('\n')) === fLine, "a number the notice prints stays (F's NCD 280.3)");
ok(F.policyNumbers('Cite NCD 20.4.', 'charged $1,320.40') === 'Cite NCD.', 'a number is a whole token: 20.4 is not in $1,320.40');
ok(F.policyNumbers('per LCD L33797.', 'LCD L33797 applies') === 'per LCD L33797.', 'an LCD the documents name stays');

// ---------- the doctor can request the expedited appeal ----------
// the production kit for case J (30 October 2026)
const jFirst = "**Do this first:** File the expedited appeal today by phone (1-888-555-0172) and follow up in writing with the therapy notes through 10/27 (and 10/28 or later if available) and Dr. Vasquez's or Dr. Lindqvist's letter. Have one of those physicians call the peer-to-peer line (1-888-555-0186) within 7 days of 10/28/2026 to present the updated therapy data.";
const jDone = F.doctorMayRequest(jFirst);
ok(jDone === jFirst + ' ' + F.WHY_DOCTOR, 'added once, after the writer\'s step');
ok(F.doctorMayRequest(jDone) === jDone, 'idempotent');
const afterExpeditedFirst = "**Do this first:** Ask for an expedited appeal now: call 1-888-555-0172 (the doctor can request it directly, and when the doctor says waiting could seriously harm the patient's health, the plan must treat it as urgent). Then: fax the notes.";
ok(F.doctorMayRequest(afterExpeditedFirst) === afterExpeditedFirst, 'not repeated after expeditedFirst');
const notExpedited = '**Do this first:** Call the billing office and ask them to hold the account.';
ok(F.doctorMayRequest(notExpedited) === notExpedited, 'only when the first step is the expedited request');

// ---------- through the handler ----------
let reply = '', lastAsk = '';
global.fetch = async (url, opts) => {
  const b = JSON.parse(opts.body);
  lastAsk = b.messages[0].content.slice(-1)[0].text;
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: reply }], stop_reason: 'end_turn', usage: { input_tokens: 1, output_tokens: 1 } }) };
};
const fp = require('../../api/fightpack.js');
const tok = u.sign({ sid: 'preview' });
function mockRes() { const r = { code: 0, body: null, headers: {} }; r.setHeader = (k, v) => { r.headers[k] = v; }; r.status = (c) => { r.code = c; return r; }; r.json = (b) => { r.body = b; return r; }; return r; }
async function call(body) { const res = mockRes(); await fp({ method: 'POST', body: Object.assign({ token: tok }, body) }, res); return res; }
const decodeI = ['## 1. Your denial, decoded — and how strong your case is', '- **Plan:** Original Medicare (Part B) — a Medicare Summary Notice from the Part B contractor', '- Care status: already received', run21, '**Do this first:** Fill in the CMS-1696 form.'].join('\n');

(async () => {
  reply = decodeI;
  let r = await call({ part: 1, denial: iSource });
  ok(r.code === 200 && /must accept Medicare's approved amount as payment in full/.test(r.body.text) && !/could be higher/.test(r.body.text), 'part 1: code writes the owed line');
  reply = '## 2. Your appeal letter\nI am appealing.';
  r = await call({ part: 2, denial: iSource, decode: decodeI });
  ok(/AMBULANCE ON ORIGINAL MEDICARE/.test(lastAsk) && /ORIGINAL MEDICARE \(decided in code\)/.test(lastAsk), 'parts 2-6: the ambulance rule follows the Original Medicare rule');
  r = await call({ part: 2, denial: 'Medicare Summary Notice. MRI lumbar spine (CPT 72148) denied.', decode: decodeI.replace(run21, '**What you may actually owe:** $500.') });
  ok(!/AMBULANCE ON ORIGINAL MEDICARE/.test(lastAsk), 'not for other Original Medicare claims');
  reply = '## 3. Letter of medical necessity — for your doctor to sign\n' + cite + '\n## 4. Note for your doctor\'s office\n- Please sign.';
  r = await call({ part: 3, denial: iSource, decode: decodeI });
  ok(!/NCD\) 20\.4/.test(r.body.text) && /National Coverage Determination \(NCD\) or the Local/.test(r.body.text), 'an invented policy number is dropped in the doctor\'s letter');
  console.log(`v9.10 facts tests passed (${n} assertions)`);
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });
