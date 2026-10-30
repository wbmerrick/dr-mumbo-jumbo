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

// ---------- v9.12: on Original Medicare the provider's records come to the family ----------
// the real lines the writers produced for case I (runs 19-24)
const route = [
  ["Also, is there anyone in your billing office who handles Medicare appeals? Would your office be willing to file an appeal or submit additional documentation on the patient's behalf?",
   "Also, is there anyone in your billing office who handles Medicare appeals? Would your office be willing to file an appeal on the patient's behalf?"],
  ["Will your company submit additional documentation or appeal on Harold's behalf? He had syncope, chest pain, and severe bradycardia.",
   "Will your company appeal on Harold's behalf? He had syncope, chest pain, and severe bradycardia."],
  ['Will your company submit a corrected claim with that documentation, or file an appeal on Harold\'s behalf?', "Will your company file an appeal on Harold's behalf?"],
  ["Fourth, would your company be willing to submit a corrected claim with the trip sheet attached, or file the appeal on the patient's behalf? Which is faster?",
   "Fourth, would your company be willing to file the appeal on the patient's behalf?"],
  ['**Who fixes this:** You file the appeal with the ambulance records and ER records enclosed, or ask the ambulance company and the hospital to submit them to Medicare on your father\'s behalf with a corrected claim — confirm with them first which route they recommend.',
   '**Who fixes this:** You file the appeal with the ambulance records and ER records enclosed.'],
  ['Second, did you submit that trip sheet with the original claim to Medicare? If not, can you submit it now as additional documentation to support the claim while I file the appeal?',
   'Second, did you submit that trip sheet with the original claim to Medicare? If not, can you send it to me now to support the claim while I file the appeal?'],
  ['2. "Will your company submit documentation to Medicare to support the medical necessity of the ambulance transport — specifically the trip report?"',
   '2. "Will your company send me documentation to support the medical necessity of the ambulance transport — specifically the trip report?"'],
  ['Ask whether they submitted it with the claim. If not, ask them to submit it to Medicare now as additional documentation. Also request the ER records.',
   'Ask whether they submitted it with the claim. If not, ask them to send it to you. Also request the ER records.'],
  ['[I have also asked Tri-County Emergency Medical Services to submit the ambulance trip sheet directly to Medicare as additional documentation — delete if not done.]', ''],
  ['return it to us — we will send it with the appeal to the address on the letter. If you prefer to send it directly to Medicare\'s appeals office, please give us a copy for our records.',
   'return it to us — we will send it with the appeal to the address on the letter.'],
];
for (const [a, b] of route) { assert.strictEqual(F.medicareRoute(a), b); n++; ok(F.medicareRoute(b) === b, 'idempotent: ' + b.slice(0, 40)); }
for (const keep of [
  'Mail your appeal directly to the Medicare contractor at the address on the notice.',
  'Would your company be willing to file its own redetermination request with the trip report attached?',
  'Ask them to send you the trip report so you can include it with your redetermination request.',
  'If they say the claim can be corrected and reprocessed as a processing error: ask how to request that, and still file the written appeal by the deadline.',
  'I am submitting the following additional evidence in support of the reconsideration request: [list any new records].',
]) ok(F.medicareRoute(keep) === keep, 'a correct route stays: ' + keep.slice(0, 50));
// the billing-office spec, by plan
const sec5 = require('../../api/_lib/fightpack-sections.js').SEC[5];
ok(sec5.includes(F.PROVIDER_ASK), 'the spec still carries the line that is swapped (an edit to the spec must update facts.js)');
ok(!F.specFor(sec5, { original: true }).includes(F.PROVIDER_ASK) && F.specFor(sec5, { original: true }).includes(F.PROVIDER_ASK_ORIGINAL), 'Original Medicare: the records-to-family line');
ok(F.specFor(sec5, { original: false }) === sec5, 'other plans: the spec as written');
const sec3 = require('../../api/_lib/fightpack-sections.js').SEC[3];
ok(sec3.includes(F.P2P_OFFER), "the doctor's-letter spec still carries the peer-to-peer line that is swapped");
ok(!/peer-to-peer/i.test(F.specFor(sec3, { original: true }).split('Signature block')[0].split('- Request:')[1] || 'x') && F.specFor(sec3, { original: true }).includes(F.P2P_OFFER_ORIGINAL), "Original Medicare: the doctor's letter offers no peer-to-peer");
ok(F.specFor(sec3, { original: false }) === sec3, "other plans: the doctor's letter as written");
// the run-21 forms (the re-audit's own I-4 examples), each in its section's voice
const run21forms = [
  '## 1. Your denial, decoded — and how strong your case is',
  '**Who fixes this:** You file the redetermination by the deadline, and you ask Tri-County Emergency Medical Services and Westbrook Regional Medical Center to send their records to the Medicare claims office — the ambulance report and the hospital records — along with a physician letter if possible.',
  '## 2. Your appeal letter',
  'The transport was medically necessary. [I have asked Tri-County Emergency Medical Services and Westbrook Regional Medical Center to send the ambulance trip report and emergency-department records directly to your office to document his condition — delete if not done.]',
  "## 4. Note for your doctor's office",
  '- **Please add:** Ask Tri-County Emergency Medical Services (the ambulance company) to send the trip report/run sheet to the Medicare address on the letter, and ask Westbrook Regional Medical Center to send the ER record.',
  "## 7. Phone script — calling the hospital or doctor's billing office",
  '4. *[For the hospital]* "Can you send the emergency department records and admission records from August 26–27 to Medicare and to me? They show the bradycardia."',
  '## 10. Your deadlines and next moves',
  '- Mail the request and every record to the Medicare address on the notice, and keep copies.',
].join('\n');
const fixed21 = F.medicareRoute(run21forms).split('\n');
ok(/to send their records to you — the ambulance report/.test(fixed21[1]), 'decode: the records come to the family ("you")');
ok(fixed21[3] === 'The transport was medically necessary.', 'letter: the sentence about records sent on their own is dropped');
ok(/to send the trip report\/run sheet to us, and ask Westbrook/.test(fixed21[5]), 'note to the office: "us"');
ok(/from August 26–27 to me\?/.test(fixed21[7]) && !/Medicare and/.test(fixed21[7]), 'billing script: "to me"');
ok(fixed21[9] === '- Mail the request and every record to the Medicare address on the notice, and keep copies.', "the family's own mailing to Medicare stays");
ok(F.medicareRoute(fixed21.join('\n')) === fixed21.join('\n'), 'idempotent on the run-21 forms');
ok(!/additional documentation|corrected claim/i.test(F.ORIGINAL_RECORDS), 'the rule names no phrase to avoid');

// ---------- v9.13: the run-26 audit's code-decidable findings ----------
const T = require('../../api/fightpack.js')._test;
const Gd = require('../../api/_lib/fightpack-guards.js');
// I-4 residue (§4): the office's offer to fax the records to Medicare itself
const r26note = '- **Next steps:** Please print on letterhead, sign with your credentials and NPI, and return the signed letter to the family. They will mail it with the ambulance trip report and hospital records to the address above by February 11, 2027. If you prefer, your office can fax the letter and records directly to the Medicare contractor and send the family a copy for their records.';
ok(F.medicareRoute(r26note) === r26note.replace(' If you prefer, your office can fax the letter and records directly to the Medicare contractor and send the family a copy for their records.', ''), "§4: the office's offer to fax the records to the contractor itself comes out");
// I-R3-2: the deadline is the day the request must arrive, 120 days from receipt of the notice
ok(/counts as filed on the day the contractor receives it/.test(F.ORIGINAL_RECORDS) && /presumes is 5 days after the date on it/.test(F.ORIGINAL_RECORDS), 'Original Medicare: the deadline is an arrival date, counted from presumed receipt');
// J-R3-2: where the concurrent expedited external review goes, and the day the plan upholds
const urgentDecode = (plan) => ['## 1. Your denial, decoded — and how strong your case is', `- **Plan:** ${plan}`, '- Care status: not yet received (inpatient rehabilitation requested)', '- **Urgent:** Yes — she is in the hospital now.', '**Do this first:** Ask for an expedited appeal now: call 1-888-555-0172.'].join('\n');
const ins = T.twoRequests(urgentDecode('Employer group plan, fully insured by Keystone Health Insurance Company'), 'insured');
ok(ins.includes(F.EXTERNAL_ROUTE.insured) && ins.includes(F.EXTERNAL_UPHELD), "insured: the request goes to the state's insurance department, and the same-day step");
ok(T.twoRequests(ins, 'insured') === ins, 'idempotent');
const unk = T.twoRequests(urgentDecode('Employer group plan'), null);
ok(!/insurance department|independent review organization/.test(unk) && unk.includes(F.EXTERNAL_UPHELD), 'funding unknown: no route is guessed, the same-day step stays');
ok(T.twoRequests(urgentDecode('Employer group plan, self-funded, administered by Acme TPA'), 'self-funded').includes(F.EXTERNAL_ROUTE['self-funded']), 'self-funded: the plan sends it to an independent review organization');
const before913 = urgentDecode('Employer group plan, fully insured').replace('- **Urgent:** Yes — she is in the hospital now.', "- **Urgent:** Yes — she is in the hospital now.\n**Two requests at once:** because this is urgent, you or the doctor can generally ask for an expedited external review at the same time as the expedited appeal, so you do not have to wait for the plan's answer. The notice or the plan's appeals line can tell you how.");
const upgraded = T.twoRequests(before913, 'insured');
ok(upgraded.split('Two requests at once').length === 2 && upgraded.includes(F.EXTERNAL_ROUTE.insured), 'a decode written before v9.13 gets the route once, not a second line');
ok(T.twoRequests(urgentDecode('Medicare Advantage HMO'), 'insured') === urgentDecode('Medicare Advantage HMO'), 'not for Medicare Advantage');
const rulesFor = (o) => F.extraRules(Object.assign({ part: 6, denial: 'x', decode: 'x', urgent: true, plan: 'commercial', funding: 'insured', care: 'pre' }, o));
ok(rulesFor({}).includes(F.INSURED_EXTERNAL), 'parts 2-6, urgent insured employer plan: the writers are told where it goes');
ok(!rulesFor({ funding: null }).includes(F.INSURED_EXTERNAL) && !rulesFor({ urgent: false }).includes(F.INSURED_EXTERNAL) && !rulesFor({ part: 1 }).includes(F.INSURED_EXTERNAL) && !rulesFor({ care: 'post' }).includes(F.INSURED_EXTERNAL), 'and only then');
// J-2: "my October 26 consultation" in the peer-to-peer script is the signer's to confirm
const p2p = "## 5. Peer-to-peer talking points — for your doctor\n- She is expected to participate in three hours of therapy per day within 2–3 days of my October 26 consultation.\n- Per my 10/26 assessment she is improving.\n- I examined her on 10/27.";
const g = Gd.postProcess(p2p, { part: 4, known: 'x' }).text;
ok(/within 2–3 days of \[my \/ Dr\. ___'s\] October 26 consultation\./.test(g) && /Per \[my \/ Dr\. ___'s\] 10\/26 assessment/.test(g) && /\[I \/ Dr\. ___\] examined her/.test(g), "§5: a dated consultation becomes the signer's choice");
// J-5 residue: "not validated to" for a setting; a vehicle with "to" is left as written
const lim = Gd.postProcess("## 5. Peer-to-peer talking points — for your doctor\n- A skilled nursing facility does not provide three hours of therapy per day. It is not validated to deliver the intensity of therapy she needs.\n- A car is not validated to carry him.", { part: 4, known: 'x' }).text;
ok(/It is not designed to deliver the intensity/.test(lim) && /A car is not validated to carry him\./.test(lim), '"not validated to": a setting is "not designed to"; a vehicle is left alone');

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
  // v9.11: where the records go, on Original Medicare — the decode reads the program from the notice itself
  reply = decodeI;
  r = await call({ part: 1, denial: iSource });
  ok(/WHERE THE RECORDS GO/.test(lastAsk) && /AMBULANCE ON ORIGINAL MEDICARE/.test(lastAsk), 'part 1 of an Original Medicare notice gets the records route and the ambulance rule');
  r = await call({ part: 1, denial: [Fcase.denial, Fcase.extra].join('\n') });
  ok(!/WHERE THE RECORDS GO/.test(lastAsk), 'not for a Medicare Advantage notice');
  ok(!F.originalNotice('Your Medicare Advantage plan denied this. If you had Original Medicare, rules differ.'), 'a Medicare Advantage notice that mentions Original Medicare is not one');
  ok(F.originalNotice('My father has Original Medicare and got this bill.'), "the patient's own words count");
  reply = '## 2. Your appeal letter\nI am appealing.';
  r = await call({ part: 2, denial: 'Medicare Summary Notice. MRI lumbar spine (CPT 72148) denied.', decode: decodeI.replace(run21, '**What you may actually owe:** $500.') });
  ok(/WHERE THE RECORDS GO/.test(lastAsk) && !/AMBULANCE ON ORIGINAL MEDICARE/.test(lastAsk), 'parts 2-6 of any Original Medicare claim get the records route');
  // records attached: every part is told that a dated record keeps its own words
  reply = decodeI;
  r = await call({ part: 1, denial: 'Denied: inpatient rehab.', records: { kind: 'pdf', media_type: 'application/pdf', data: 'JVBERi0x' } });
  ok(/DATED RECORDS/.test(lastAsk), 'records attached: the dated-records rule');
  r = await call({ part: 1, denial: 'Denied: inpatient rehab.' });
  ok(!/DATED RECORDS/.test(lastAsk), 'no records: no dated-records rule');
  // v9.12 through the handler: the billing-office spec and the reply, on Original Medicare and on a commercial plan
  const askLine = "Would your office be willing to file an appeal or submit additional documentation on the patient's behalf?";
  reply = '## 7. Phone script — calling the hospital or doctor\'s billing office\n' + askLine + '\n## 8. Records and itemized-bill request letter\nPlease send the records.';
  r = await call({ part: 5, denial: iSource, decode: decodeI });
  ok(lastAsk.includes(F.PROVIDER_ASK_ORIGINAL) && !lastAsk.includes(F.PROVIDER_ASK), 'part 5, Original Medicare: the writer is asked for the records-to-family line');
  ok(r.code === 200 && r.body.text.includes("Would your office be willing to file an appeal on the patient's behalf?") && !/additional documentation/.test(r.body.text), 'part 5, Original Medicare: the provider route comes out of the reply');
  const decodeCommercial = decodeI.replace('Original Medicare (Part B) — a Medicare Summary Notice from the Part B contractor', 'Employer plan (fully insured)');
  r = await call({ part: 5, denial: 'EOB: CPT 99214 denied as bundled with 20610 (CO-97).', decode: decodeCommercial });
  ok(lastAsk.includes(F.PROVIDER_ASK), 'part 5, commercial: the spec as written');
  ok(r.body.text.includes(askLine), 'part 5, commercial: a corrected claim or added documentation stays a choice');
  reply = '## 1. Your denial, decoded — and how strong your case is\n- **Plan:** Original Medicare (Part B)\n**Who fixes this:** You file the appeal with the ambulance records enclosed, or ask the ambulance company to submit them to Medicare with a corrected claim.';
  r = await call({ part: 1, denial: iSource });
  ok(/\*\*Who fixes this:\*\* You file the appeal with the ambulance records enclosed\.$/m.test(r.body.text), 'part 1 (the decode every writer follows): the route is fixed there too');
  console.log(`v9.10-v9.13 facts tests passed (${n} assertions)`);
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });
