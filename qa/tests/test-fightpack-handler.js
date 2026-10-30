// Exercises /api/fightpack against a mocked Anthropic endpoint: request shape (cache
// breakpoints, source-first ordering, decode passed to parts 2–6, stop sequences), per-part
// budgets, the section normalizer, urgency/plan propagation, and the tracker-json override.
const assert = require('assert');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
process.env.FIGHTPACK_PREVIEW_CODE = 'PREVIEW-1';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
const u = require('../../lib/unlock.js');
const tok = u.sign({ sid: 'preview' });
function mockRes(){ const r = { code: 0, body: null, headers: {} }; r.setHeader = (k,v)=>{ r.headers[k]=v; }; r.status = (c)=>{ r.code=c; return r; }; r.json = (b)=>{ r.body=b; return r; }; return r; }
let lastReq = null;
let reply = '';
let stopReason = 'end_turn';
global.fetch = async (url, opts) => {
  lastReq = { url, body: JSON.parse(opts.body), headers: opts.headers };
  return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: reply }], stop_reason: stopReason, usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 7, cache_creation_input_tokens: 0 } }) };
};
const fp = require('../../api/fightpack.js');
const T = fp._test;
const ask = () => lastReq.body.messages[0].content.slice(-1)[0].text;
async function call(part, extra) { const res = mockRes(); await fp({ method: 'POST', body: Object.assign({ token: tok, part, denial: 'x' }, extra || {}) }, res); return res; }
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

(async () => {
  // ---------- request shape ----------
  reply = '## 1. Your denial, decoded — and how strong your case is\n- **Case strength:** Strong.';
  let res = mockRes();
  await fp({ method: 'POST', body: { token: tok, part: 1, denial: 'Claim 123 denied CO-50', extra: 'ctx', file: { kind: 'image', media_type: 'image/jpeg', data: 'QUJD' } } }, res);
  ok(res.code === 200, 'part 1 ok');
  assert.deepStrictEqual(res.body.missing, []); n++;
  assert.deepStrictEqual(res.body.trimmed, []); n++;
  ok(res.body.usage.cache_read === 7, 'usage passthrough');
  let b = lastReq.body;
  ok(b.max_tokens === 1600, 'part 1 budget');
  ok(Array.isArray(b.system) && b.system[0].cache_control.type === 'ephemeral', 'system cached');
  ok(b.system[0].text.includes('Clinician-voice documents') && b.system[0].text.includes('Plan type decides the route'), 'new standing rules present');
  const c = b.messages[0].content;
  ok(c[0].type === 'text' && c[0].text.includes('<denial_text>') && c[0].text.includes('<my_context>'), 'source first');
  ok(c[1].type === 'image' && c[1].source.data === 'QUJD', 'image block');
  ok(c[2].cache_control && c[2].cache_control.type === 'ephemeral', 'breakpoint after source');
  ok(c[3].text.includes('You are writing part 1 of 6: ONLY the section below') && !c[3].text.includes('<kit_decode>'), 'part 1 ask, no decode');
  ok(c[3].text.includes('written in six parts at the same time'), 'kit map in the ask');
  ok(c[3].text.includes('Who fixes this') && c[3].text.includes('**Urgent:**') && c[3].text.includes('**Plan:**') && c[3].text.includes('Expedited appeal line'), 'decode spec carries urgency, plan, expedited line');
  assert.deepStrictEqual(b.stop_sequences, ['\n## 2.', '\n# 2.']); n++;

  // ---------- stop sequences per part ----------
  reply = '## 2. Your appeal letter\nok'; await call(2, { decode: 'd' }); assert.deepStrictEqual(lastReq.body.stop_sequences, ['\n## 3.', '\n# 3.']); n++;
  reply = '## 3. Letter of medical necessity — for your doctor to sign\na\n## 4. Note for your doctor\'s office\n- b'; await call(3, { decode: 'd' }); assert.deepStrictEqual(lastReq.body.stop_sequences, ['\n## 5.', '\n# 5.']); n++;
  reply = '## 9. If they say no again — external review request\n..\n## 10. Your deadlines and next moves\n..'; await call(6, { decode: 'd' }); ok(lastReq.body.stop_sequences === undefined, 'part 6 has no stop sequence');

  // ---------- part 3: attestation variant + decode placement ----------
  reply = "## 3. Clinician's emergency attestation — for your doctor to sign\n...\n## 4. Note for your doctor's office\n- a";
  res = await call(3, { decode: 'DECODE TEXT HERE' });
  assert.deepStrictEqual(res.body.missing, [], 'attestation satisfies slot 3'); n++;
  ok(lastReq.body.max_tokens === 2600, 'part 3 budget');
  ok(ask().includes('<kit_decode>\nDECODE TEXT HERE\n</kit_decode>'), 'decode passed through');
  ok(ask().indexOf('<kit_decode>') < ask().indexOf('You are writing part 3'), 'decode precedes the ask');
  reply = '## 3. Letter of medical necessity — for your doctor to sign\nbody';
  res = await call(3, { decode: 'd' });
  assert.deepStrictEqual(res.body.missing, ["## 4. Note for your doctor's office"]); n++;

  // ---------- part 6 headings + json ----------
  reply = '## 9. If they say no again — external review request\n..\n## 10. Your deadlines and next moves\n..\n```json\n{"a":1}\n```';
  res = await call(6, { decode: 'd' });
  assert.deepStrictEqual(res.body.missing, []); n++;
  ok(lastReq.body.max_tokens === 2200, 'part 6 budget');
  ok(ask().includes('then the fenced json block'), 'json asked for');
  ok(res.body.text.includes('{"a":1}'), 'json untouched when the decode settles nothing');
  reply = '## 9. If they say no again — your next level of review\n..\n## 10. Your deadlines and next moves\n..';
  res = await call(6, { decode: 'd' });
  assert.deepStrictEqual(res.body.missing, [], 'Medicare/Medicaid §9 variant satisfies the slot'); n++;

  // ---------- part number fallback, decode truncation ----------
  reply = '## 1. Your denial, decoded — and how strong your case is\n..';
  res = await call(99, { decode: 'should be ignored' });
  ok(res.body.part === 1 && !ask().includes('should be ignored'), 'unknown part → 1, decode ignored');
  reply = '## 2. Your appeal letter\n..';
  res = await call(2, { decode: 'z'.repeat(10000) });
  ok(res.code === 200 && ask().match(/z{100,}/)[0].length === 6000, 'decode truncated to 6000');

  // ---------- deadline injection ----------
  const dec = '## 1. Your denial, decoded\n**Read from your letter — check these against the original:**\n- Member ID: SL-MA-88201947\n- Claim / reference #: ORG-2026-5561203\n- Notice date: October 14, 2026\n- Appeal deadline as printed: within 65 calendar days from the date of this notice\n- Expedited appeal line: 1-800-555-0166\n- **Type of denial:** medical necessity\n- **Plan:** Silverline Complete (HMO), a Medicare Advantage plan; you, for your father — a representative form comes first\n- **Urgent:** No — standard review: the chair is needed but waiting 30 days is not dangerous\n';
  reply = "## 7. Phone script — calling the hospital or doctor's billing office\n..\n## 8. Records and itemized-bill request letter\n..";
  res = await call(5, { decode: dec });
  ok(res.body.deadline === '2026-12-18', 'deadline returned');
  ok(ask().includes('APPEAL DEADLINE') && ask().includes('Friday, December 18, 2026') && ask().includes('65 days from the Wednesday, October 14, 2026 notice'), 'deadline injected with its derivation');
  ok(ask().includes('come ONLY from the decode'), 'identifier rule present');
  ok(ask().includes('not urgent — standard review') && res.body.urgent === false, 'not-urgent decision injected');
  reply = '## 2. Your appeal letter\n..';
  res = await call(2, { decode: '## 1. Decoded\n- Notice date: [not on the letter]' });
  ok(res.body.deadline === null && ask().includes('No appeal deadline date could be computed'), 'fallback instruction');
  ok(!ask().includes('URGENCY'), 'no urgency line when the decode does not decide');
  reply = '## 1. Your denial, decoded — and how strong your case is\n..';
  res = await call(1);
  ok(!ask().includes('APPEAL DEADLINE') && !ask().includes('No appeal deadline') && ask().includes('Read from your letter'), 'part 1 gets no deadline line');
  reply = "## 3. Corrected-claim request — for the billing office\n..\n## 4. Note for the billing office\n- a";
  res = await call(3, { decode: dec });
  assert.deepStrictEqual(res.body.missing, [], 'billing-office note satisfies §4'); n++;

  // ---------- urgent decode ----------
  const decU = dec.replace('- **Urgent:** No — standard review: the chair is needed but waiting 30 days is not dangerous', '- **Urgent:** Yes — ask for an expedited decision: steroid-dependent flare');
  reply = '## 2. Your appeal letter\n..';
  res = await call(2, { decode: decU });
  ok(res.body.urgent === true && ask().includes('URGENCY (decided in the decode): URGENT'), 'urgent decision injected');

  // ---------- tracker json override from the decode ----------
  reply = '## 9. If they say no again — your next level of review\n..\n## 10. Your deadlines and next moves\n..\n```json\n{"denial_date": "2026-10-15", "stated_appeal_deadline": "2026-12-18", "appeal_window_days": 60, "service_type": "pre-service", "urgent": true, "claim_number": "ORG-2026-556120", "denial_type": "medical-necessity", "case_strength": "good", "plan_type": "commercial"}\n```';
  res = await call(6, { decode: dec });
  const jm = JSON.parse(res.body.text.match(/```json\n([\s\S]*?)\n```/)[1]);
  assert.deepStrictEqual({ d: jm.denial_date, s: jm.stated_appeal_deadline, w: jm.appeal_window_days, u: jm.urgent, c: jm.claim_number, p: jm.plan_type, k: jm.case_strength }, { d: '2026-10-14', s: null, w: 65, u: false, c: 'ORG-2026-5561203', p: 'medicare', k: 'good' }, 'json carries the decode facts'); n++;

  // ---------- normalizer ----------
  reply = "## 2. Your appeal letter\nDear plan,\nappeal text.\n\n## 3. What to say when you call\nSay: hi\n## 4. Your physician's letter\nblah";
  stopReason = 'max_tokens';
  res = await call(2, { decode: 'd' });
  stopReason = 'end_turn';
  ok(res.body.text === '## 2. Your appeal letter\nDear plan,\nappeal text.', 'drifted sections dropped');
  assert.deepStrictEqual(res.body.trimmed, ['## 3. What to say when you call', "## 4. Your physician's letter"]); n++;
  ok(res.body.stop === 'max_tokens' && res.body.missing.length === 0, 'stop reason passed through');
  reply = '# 2. Your appeal letter\nbody';
  res = await call(2, { decode: 'd' });
  ok(res.body.text === '## 2. Your appeal letter\nbody' && res.body.missing.length === 0, 'H1 own heading canonicalized');
  reply = '# Fight Pack for Marcus T. Whitfield\n\n## 1. Your denial, decoded — and how strong your case is\n- x\n\n## 2. Internal appeal letter to the insurer\ny';
  res = await call(1);
  ok(res.body.text === '## 1. Your denial, decoded — and how strong your case is\n- x', 'title preface and drifted §2 dropped');
  assert.deepStrictEqual(res.body.trimmed, ['(preface: 1 line)', '## 2. Internal appeal letter to the insurer']); n++;
  reply = "## 3. Letter of medical necessity — for your doctor to sign\n## 1. Clinical summary\ntext\n## Criteria met\n- a\n## 4. Note for your doctor's office\n- b";
  res = await call(3, { decode: 'd' });
  ok(res.body.text.includes('### 1. Clinical summary') && res.body.text.includes('### Criteria met') && res.body.missing.length === 0 && res.body.trimmed.length === 0, 'sub-headings inside an own section are kept as ###');
  reply = 'Dear insurer, here is my appeal.';
  res = await call(2, { decode: 'd' });
  ok(res.body.text === 'Dear insurer, here is my appeal.', 'no own heading → text returned untouched');
  assert.deepStrictEqual(res.body.missing, ['## 2. Your appeal letter']); n++;
  reply = '## 2. Your appeal letter\nfirst\n## 2. Your appeal letter\nsecond';
  res = await call(2, { decode: 'd' });
  ok(res.body.text === '## 2. Your appeal letter\nfirst' && res.body.trimmed.length === 1, 'duplicate own heading after completion dropped');

  // ---------- pure helpers ----------
  const ch = T.canonicalHeading;
  ok(ch(3, 'Clinician’s emergency attestation — for your doctor to sign').startsWith("## 3. Clinician's emergency attestation"), 'curly apostrophe → attestation');
  ok(ch(3, 'Corrected claim request — for the billing office') === '## 3. Corrected-claim request — for the billing office', '§3 corrected');
  ok(ch(3, 'Letter of Medical Necessity') === '## 3. Letter of medical necessity — for your doctor to sign', '§3 LMN by keyword');
  ok(ch(4, 'Note for the billing office') === '## 4. Note for the billing office', '§4 billing');
  ok(ch(4, 'A note for your doctor') === "## 4. Note for your doctor's office", '§4 default');
  ok(ch(9, 'If they say no again — your next level of review') === '## 9. If they say no again — your next level of review', '§9 variant');
  ok(ch(9, 'If they say no again — external review request') === '## 9. If they say no again — external review request', '§9 default');
  const up = T.urgencyOf;
  ok(up('**Urgent?** No — standard review') === false && up('- Urgent: yes') === true && up('- **Urgent:** Possibly') === null && up('nothing here') === null, 'urgency parser');
  ok(up('* **Urgent**: "Yes — ask for an expedited decision"') === true, 'urgency parser: quoted, star bullet');
  ok(up('- Service denied: urgent care visit') === null, 'urgency parser ignores other lines');
  const pt = T.planTypeOf;
  ok(pt('- **Plan:** Employer self-funded (third-party administrator: Cobalt Administrators)') === 'commercial', 'plan: TPA');
  ok(pt('**Plan:** Medicare Advantage HMO') === 'medicare' && pt('- **Plan:** Original Medicare') === 'other', 'plan: Medicare');
  ok(pt('- **Plan:** unknown — the letter does not say') === 'unknown' && pt('- **Plan:** Medicaid managed care') === 'medicaid', 'plan: unknown, Medicaid');
  ok(pt('- Send appeals to: Harbor Plan Appeals, P.O. Box 1, fax: 1-800') === null, 'plan parser ignores other lines');

  global.__fpMainDone = true;

  console.log(`fightpack handler tests passed (${n} assertions)`);
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- care status → decision clock and urgency (added after the run-4 re-audit) ----------
(async () => {
  const T2 = require('../../api/fightpack.js')._test;
  const assert2 = require('assert');
  assert2.strictEqual(T2.careStatusOf('- Care status: already received (08/03–08/05/2026)'), 'post');
  assert2.strictEqual(T2.careStatusOf('- Care status: not yet received — prior authorization'), 'pre');
  assert2.strictEqual(T2.careStatusOf('- Care status: ongoing course of treatment'), 'ongoing');
  assert2.strictEqual(T2.careStatusOf('- Patient: X'), null);
  assert2.strictEqual(T2.effectiveUrgency('- Care status: already received\n- **Urgent:** Yes — ask for an expedited decision'), false, 'post-service is never urgent');
  assert2.strictEqual(T2.effectiveUrgency('- Care status: not yet received\n- **Urgent:** Yes — ask for an expedited decision'), true);
  assert2(/60 days/.test(T2.decisionClock('post', 'commercial')) && /30 days per level/.test(T2.decisionClock('post', 'commercial')), 'ERISA post-service clock');
  assert2(/30 days/.test(T2.decisionClock('pre', 'commercial')) && /15 days per level/.test(T2.decisionClock('pre', 'commercial')) && /72 hours/.test(T2.decisionClock('pre', 'commercial')), 'ERISA pre-service clock');
  assert2(/payment reconsideration[^.]*60 days/.test(T2.decisionClock('post', 'medicare')) && /30 days[^.]*72 hours/.test(T2.decisionClock('pre', 'medicare')), 'MA clocks');
  assert2.strictEqual(T2.decisionClock('pre', 'medicaid'), null, 'Medicaid: the notice states the clock');
  assert2(/employer and marketplace/.test(T2.decisionClock('post', 'unknown')), 'unknown plan: stated as the general rule');
  const f = T2.decodeFacts('- Care status: already received\n- **Urgent:** Yes\n- **Plan:** employer plan');
  assert2.deepStrictEqual({ u: f.urgent, s: f.service_type, p: f.plan_type }, { u: false, s: 'post-service', p: 'commercial' });
  console.log('care-status / decision-clock tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- technical absolutes are hedged in code (added after run 5) ----------
(async () => {
  const T3 = require('../../api/fightpack.js')._test;
  const assert3 = require('assert');
  const H = (s) => T3.hedgeAbsolutes(s).text;
  assert3.strictEqual(H('Home testing cannot distinguish obstructive from central apnea.'), 'Home testing may not reliably distinguish obstructive from central apnea.');
  assert3.strictEqual(H('Cannot detect central events'), 'May not reliably detect central events');
  assert3.strictEqual(H('HSAT is unable to differentiate them'), 'HSAT may not reliably differentiate them');
  assert3.strictEqual(H("a home test can't reliably rule out apnea"), 'a home test may not reliably rule out apnea');
  assert3.strictEqual(H('The physician cannot balance bill you, and you cannot be billed twice.'), 'The physician cannot balance bill you, and you cannot be billed twice.', 'other "cannot" statements are untouched');
  assert3.strictEqual(T3.hedgeAbsolutes('x cannot distinguish y; z cannot detect w').count, 2);
  // the decode carries an "approved instead" line without disturbing the parsed facts
  const d = '- Notice date: September 22, 2026\n- Approved or allowed instead: observation level of care, 08/03/2026 – 08/04/2026\n- Care status: already received\n- Appeal deadline as printed: within 180 days of the date of this notice';
  assert3.strictEqual(T3.computeDeadline(d).date.toISOString().slice(0, 10), '2027-03-21');
  assert3.strictEqual(T3.careStatusOf(d), 'post');
  console.log('hedge / approved-line tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- phone numbers only from the source or the verified list (added after the held-out run) ----------
(async () => {
  const T4 = require('../../api/fightpack.js')._test;
  const a4 = require('assert');
  const src = 'Call Member Services at 1-888-555-0142 (TTY 711) or fax 1-888-555-0143. NPI 1427690053. Claim 2026278004511.';
  const G = (s) => T4.guardPhones(s, src);
  a4.strictEqual(G('Call (888) 555-0142 or 888.555.0143.').text, 'Call (888) 555-0142 or 888.555.0143.', 'source numbers survive in any format');
  a4.strictEqual(G('No Surprises Help Desk 1-800-985-3059; EBSA 1-866-444-3272; 1-800-633-4227; call or text 988.').count, 0, 'verified list survives');
  const r = G('Call the state at 1-888-466-2219 today.');
  a4.strictEqual(r.count, 1);
  a4(/^Call the state at \[phone number — use the one printed on your letter/.test(r.text), 'unknown number becomes a placeholder');
  a4.strictEqual(G('NPI 1427690053, claim 2026278004511, member GPH4471820, date 2026-10-23').count, 0, 'IDs, NPIs and dates are not phone numbers');
  console.log('phone-guard tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- run-6 audit guards: ED now, unverified actions, safety propagation ----------
(async () => {
  const T5 = require('../../api/fightpack.js')._test;
  const a5 = require('assert');
  a5.strictEqual(T5.edNow('Go to an emergency department today, or call 911.').text, 'Go to an emergency department now, or call 911.');
  a5.strictEqual(T5.edNow('Go to the ER today for evaluation.').text, 'Go to the ER now for evaluation.');
  a5.strictEqual(T5.edNow('the emergency department if they get worse; contact your doctor today').count, 0, 'another clause keeps its own "today"');
  const B = (s) => T5.bracketUnverified(s).text;
  a5.strictEqual(B('The billing office has confirmed this was documented. Please reprocess.'), '[Only if this has happened: The billing office has confirmed this was documented. — otherwise delete this sentence.] Please reprocess.');
  a5.strictEqual(B('- I have also contacted Summit Anesthesia Partners.'), '- [Only if this has happened: I have also contacted Summit Anesthesia Partners. — otherwise delete this sentence.]');
  a5.strictEqual(B('I have asked Dr. Achebe to send the records.'), '[Only if this has happened: I have asked Dr. Achebe to send the records. — otherwise delete this sentence.]', 'abbreviations do not split a sentence');
  a5.strictEqual(B('[I have also asked my doctor\'s office to fax the notes — delete if not done]'), '[I have also asked my doctor\'s office to fax the notes — delete if not done]', 'an existing bracket is left alone');
  a5.strictEqual(B('I have enclosed the records. The plan has requested the visit notes.'), 'I have enclosed the records. The plan has requested the visit notes.', 'enclosures and the plan\'s own requests are facts');
  a5.strictEqual(T5.safetyOf('- **Safety first:** Go to an emergency department now.'), 'emergency');
  a5.strictEqual(T5.safetyOf('- **Safety first:** Contact your doctor today.'), 'today');
  a5.strictEqual(T5.safetyOf('- **Plan:** employer plan'), null);
  console.log('ED-now / unverified-action / safety tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- safety tiers from real decodes, cost-sharing wording, coding assertions (pre-v8 review) ----------
(async () => {
  const T6 = require('../../api/fightpack.js')._test;
  const a6 = require('assert');
  const S = (line) => T6.safetyOf('**Safety first:** ' + line);
  // every "Safety first" line the decode wrote in runs 4–6, with the tier a clinician would assign
  const real = [
    ['Contact your doctor today about the episode of falling asleep while driving — do not drive until evaluated.', 'today'],
    ['Contact Dr. Vasquez-Moreno today about the ongoing bloody diarrhea and weight loss — if symptoms worsen rapidly, use emergency services.', 'today'],
    ['Your father is having bathroom accidents because he cannot reach the toilet in time — contact Dr. Okoro today to address the incontinence and fall risk, and to review whether his oxygen use is adequate for activity.', 'today'],
    ['Contact your gastroenterologist today about the bloody bowel movements and 11-pound weight loss — these need clinical evaluation now.', 'today'],
    ['With chest pain and shortness of breath, if symptoms return or worsen, call 911 or go to the nearest emergency department immediately.', null],
    ['Contact Dr. Achebe today — you report progressive leg weakness, foot drop, difficulty starting urination, and numbness between your legs; these are potential signs of nerve compression requiring urgent evaluation.', 'today'],
    ['[no red flag mentioned]', null],
    ['Falling asleep while driving is dangerous. Do not drive until you have been evaluated by your doctor. If drowsiness worsens, go to the emergency department.', null],
    ['You are having 8-10 bloody bowel movements a day with significant weight loss — contact your doctor today if symptoms worsen (fever, severe abdominal pain, dizziness, heavy bleeding) and go to the emergency department if they become severe.', null],
    ['Repeated incontinence from not reaching the bathroom in time — call your doctor today to check for infection or other treatable causes.', 'today'],
    ['You report new or worsening weakness in your right leg, trouble starting to urinate, and numbness between your legs — these are emergency warning signs for possible nerve compression in the spine. Go to an emergency department now, or call 911 if symptoms worsen. Do not wait for the appeal to be decided.', 'emergency']
  ];
  for (const [line, want] of real) a6.strictEqual(S(line), want, line.slice(0, 60));
  a6.strictEqual(S('Go to the emergency department now — do not wait for the appeal.'), 'emergency');
  a6.strictEqual(S('Go to the emergency department now (call 911 if you cannot get there safely).'), 'emergency', 'a parenthetical about getting there is not a condition');
  a6.strictEqual(S('Go to the emergency department now if you have not already.'), 'emergency');
  a6.strictEqual(S('You should go to the emergency department now, even if the appeal is pending.'), 'emergency', '"should" and "even if" are not conditions');
  a6.strictEqual(S('Should these symptoms worsen, go to the ER.'), null);
  a6.strictEqual(S('Go to the emergency department if you are unable to walk or go to the bathroom.'), null, 'a real condition stays a condition');
  a6.strictEqual(S('If you develop chest pain, call 911.'), null);
  a6.strictEqual(S('Call your gastroenterologist today; go to the emergency department now if you faint or bleed heavily.'), 'today');

  const R = (s) => T6.costSharingNotRate(s);
  a6.strictEqual(R('The claim must be reprocessed at in-network rates and cost-sharing.').text, 'The claim must be reprocessed with in-network cost-sharing.');
  a6.strictEqual(R('emergency physicians at in-network hospitals must be covered at in-network rates even if they are out-of-network').text, 'emergency physicians at in-network hospitals must be covered with in-network cost-sharing even if they are out-of-network');
  a6.strictEqual(R('the plan must pay at the in-network rate').text, 'the plan must process it with in-network cost-sharing');
  a6.strictEqual(R('It should be paid at in-network rates.').text, 'It should be processed with in-network cost-sharing.');
  a6.strictEqual(R('Processed at the in-network level; you owe only in-network cost-sharing.').count, 0, 'benefit level and cost-sharing wording is already right');

  const C = (s) => T6.bracketCoding(s);
  a6.strictEqual(C('Ultrasound guidance (76942) is separately reportable when the physician uses real-time imaging. Please reprocess.').text,
    '[Only if the billing office confirms it: Ultrasound guidance (76942) is separately reportable when the physician uses real-time imaging. — otherwise delete this sentence.] Please reprocess.');
  a6.strictEqual(C('J3301 is a separately payable drug.').count, 1);
  a6.strictEqual(C('These codes can be billed together with modifier 59.').count, 1);
  a6.strictEqual(C('Please confirm whether 76942 is separately reportable for this injection.').count, 0, 'a question to the billing office is the right routing');
  a6.strictEqual(C('If the shoulder was a separate problem, the visit is separately reportable with modifier 25.').count, 0, 'a conditional rule is left alone');
  a6.strictEqual(C('Is 76942 separately reportable here?').count, 0);
  a6.strictEqual(C('The EOB says "these services are separately billable only with documentation".').count, 0, 'a quotation is the notice\'s own words');
  a6.strictEqual(C('The plan says 76942 is not separately payable.').count, 0, 'the insurer\'s position is not an assertion');
  a6.strictEqual(C('- [Billing office: confirm the code] 76942 is separately reportable.').count, 0, 'an existing bracket is left alone');
  console.log('safety-tier / cost-sharing / coding tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- bracket placement found by replaying the guards on run 6 ----------
(async () => {
  const T7 = require('../../api/fightpack.js')._test;
  const a7 = require('assert');
  a7.strictEqual(T7.bracketCoding('**Why it matters:** Modifier 25 lets the visit be separately billed.').text,
    '**Why it matters:** [Only if the billing office confirms it: Modifier 25 lets the visit be separately billed. — otherwise delete this sentence.]', 'a bold label stays outside the bracket');
  a7.strictEqual(T7.bracketCoding('"What documentation is needed for the visit to be separately payable?"').count, 0, 'a quoted question is routing, not an assertion');
  a7.strictEqual(T7.bracketUnverified('**Update:** I have contacted the billing office.').text,
    '**Update:** [Only if this has happened: I have contacted the billing office. — otherwise delete this sentence.]');
  a7.strictEqual(T7.bracketCoding('Please review the claim. 76942 is separately reportable.').count, 1, '"review" in another sentence does not exempt an assertion');
  console.log('bracket-placement tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- the bracket guards never touch the fenced tracker json ----------
(async () => {
  const T8 = require('../../api/fightpack.js')._test;
  const a8 = require('assert');
  const kit = 'I have contacted the office.\n\n```json\n{\n  "next": "I have contacted the office.",\n  "denial_reason": "services were separately billed"\n}\n```\nDone.';
  const r = T8.outsideFences(kit, T8.bracketUnverified);
  a8.strictEqual(r.count, 1, 'prose is bracketed once');
  a8(r.text.startsWith('[Only if this has happened: I have contacted the office.'), 'prose bracketed');
  a8(r.text.includes('```json\n{\n  "next": "I have contacted the office.",'), 'json untouched');
  const json = r.text.match(/```json\n([\s\S]*?)\n```/)[1];
  a8.doesNotThrow(() => JSON.parse(json), 'tracker json still parses');
  a8.strictEqual(T8.outsideFences(kit, T8.bracketCoding).count, 0);
  console.log('fence-safety tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- end to end: the safety tier and the new guards reach the request and the response ----------
(async () => {
  while (!global.__fpMainDone) await new Promise((r) => setTimeout(r, 10)); // the shared mock is free once the main block is done
  const a9 = require('assert');
  const base = '## 1. Your denial, decoded — and how strong your case is\n- Notice date: October 23, 2026\n- Appeal deadline as printed: 60 calendar days from the date of this notice\n- Care status: not yet received\n';
  reply = '## 2. Your appeal letter\nThe claim must be reprocessed at in-network rates. I have contacted the billing office. 76942 is separately reportable.';
  let res = await call(2, { decode: base + '\n**Safety first:** Go to an emergency department now, or call 911 if symptoms worsen.' });
  a9.strictEqual(res.code, 200);
  a9(ask().includes('SAFETY (decided in the decode): the patient has been told to go to an emergency department now'), 'emergency tier injected');
  a9.strictEqual(res.body.cost_sharing, 1); a9.strictEqual(res.body.coding, 1); a9.strictEqual(res.body.unverified, 1);
  a9(res.body.text.includes('reprocessed with in-network cost-sharing.'), 'cost-sharing wording in the response');
  res = await call(2, { decode: base + '\n**Safety first:** Contact your doctor today if symptoms worsen, and go to the emergency department if they become severe.' });
  a9(!ask().includes('SAFETY (decided'), 'a conditional warning injects nothing');
  res = await call(2, { decode: base + '\n**Safety first:** Call your gastroenterologist today; go to the emergency department now if you faint.' });
  a9(ask().includes('SAFETY (decided in the decode): the patient has been told to contact the doctor today'), 'today tier injected');
  console.log('end-to-end safety / guard tests passed');
  global.__fpE2EDone = true;
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- a phone date never extends the printed deadline ----------
(async () => {
  const T10 = require('../../api/fightpack.js')._test;
  const a10 = require('assert');
  a10.strictEqual(T10.earlierDate('Ask the representative to confirm the deadline; if it differs from your letter, use the later date.').text,
    'Ask the representative to confirm the deadline; if it differs from your letter, use the earlier date.');
  a10.strictEqual(T10.earlierDate('Go by the later of the two dates.').text, 'Go by the earlier of the two dates.');
  a10.strictEqual(T10.earlierDate('Send it later this week; the later appeal level is external review.').count, 0, 'other uses of "later" are untouched');
  console.log('earlier-date tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- safety tiers: lines the v8 decode wrote in run 7 ----------
(async () => {
  const T11 = require('../../api/fightpack.js')._test;
  const a11 = require('assert');
  const S = (line) => T11.safetyOf('**Safety first:** ' + line);
  a11.strictEqual(S('The drowsiness and falling asleep at a red light means contacting your doctor today — do not drive until evaluated — and going to the emergency department now if you have any emergency signs (chest pain or pressure, trouble breathing, fainting, confusion, new weakness).'), 'today', 'an inflected contact verb counts');
  a11.strictEqual(S('You report 8–10 bloody bowel movements a day and have lost 11 pounds in two months — contact your doctor today and go to an emergency department immediately if you have heavy bleeding, fainting, severe abdominal pain, confusion, or any trouble breathing.'), 'today', 'the condition binds to the emergency instruction only');
  a11.strictEqual(S("Contact your father's doctor today if his shortness of breath is worsening or if he develops chest pain, trouble breathing, confusion, or new weakness — and go to the emergency department now (or call 911) if any of those emergency signs appear."), null, 'a conditional call is a warning, not an instruction');
  a11.strictEqual(S('If you develop numbness and weakness, go to the ER now.'), null, '"and" inside a condition does not split it');
  a11.strictEqual(S('You need to be seen by your doctor today.'), 'today');
  console.log('run-7 safety-tier tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9: the safety instruction is written by code from the decode's label ----------
(async () => {
  // pure functions only — no shared mock
  const T12 = require('../../api/fightpack.js')._test;
  const a12 = require('assert');
  // G as the decode would label it: the office-first routing of run 7 cannot survive
  const g = '**Safety first:** EMERGENCY — new and worsening right leg weakness, tripping, trouble starting to urinate, and numbness between your legs\n\n**Do this first:** Call Dr. Achebe\'s office today — before filing the appeal — and go to the emergency department if you cannot reach them.';
  const rg = T12.renderSafety(g);
  a12.strictEqual(rg.level, 'emergency');
  a12(rg.text.startsWith('**Safety first:** Go to an emergency department now, or call 911. What you describe — new and worsening right leg weakness, tripping, trouble starting to urinate, and numbness between your legs — can be a sign of a medical emergency.'), rg.text.slice(0, 200));
  a12(!/cannot reach|Achebe's office today/.test(rg.text), 'the office-first "Do this first" is replaced');
  a12(rg.text.includes('**Do this first:** Go to the emergency department now.'));
  a12.strictEqual(T12.safetyOf(rg.text), 'emergency', 'parts 2–6 read the rendered line as an emergency');
  // a label followed by the writer's own routing keeps only the symptoms
  const r2 = T12.renderSafety('- **Safety first:** EMERGENCY — You report trouble starting to urinate. Call Dr. Achebe\'s office now or go to the ER if you cannot reach them.');
  a12(r2.text.includes('What you describe — trouble starting to urinate — can be'), r2.text);
  a12(!r2.text.includes('cannot reach'));
  // TODAY keeps the no-driving advice and a fixed emergency safety net
  const ra = T12.renderSafety('**Safety first:** TODAY — falling asleep at a red light');
  a12.strictEqual(ra.level, 'today');
  a12.strictEqual(ra.text, '**Safety first:** Contact the doctor today about what you describe — falling asleep at a red light. Do not drive until you have been evaluated. Go to an emergency department now, or call 911, if any emergency sign appears: chest pain or pressure, trouble breathing, fainting, new weakness or numbness, confusion, or heavy bleeding.');
  a12.strictEqual(T12.safetyOf(ra.text), 'today', 'the rendered TODAY line is not misread as an emergency');
  const rc = T12.renderSafety('**Safety first:** TODAY — 8–10 bloody bowel movements a day and 11 pounds lost since August');
  a12(rc.text.includes('Contact the doctor today about what you describe — 8–10 bloody bowel movements a day and 11 pounds lost since August.') && !rc.text.includes('Do not drive'));
  // an unlabeled line is left exactly as written (the classifier still reads it)
  const free = '**Safety first:** Go to an emergency department now — do not wait for the appeal.';
  a12.deepStrictEqual(T12.renderSafety(free), { text: free, level: null });
  // banners open every action section of an emergency kit
  const kit = '## 6. Phone script — calling the insurer\nSay: hello\n\n## 7. Phone script — calling the hospital or doctor\'s billing office\nSay: hi\n\n## 10. Your deadlines and next moves\n- one';
  const b = T12.emergencyBanners(kit);
  a12.strictEqual(b.count, 3);
  a12(b.text.includes('## 6. Phone script — calling the insurer\n\n> **Emergency first:** go to the emergency department now, or call 911. Make this call only after you have been seen'));
  a12(b.text.includes('## 10. Your deadlines and next moves\n\n> **Emergency first:** go to the emergency department now, or call 911. Every step below can wait until after you have been seen.'));
  // the surprise-billing protection is never conditioned on the patient's choice
  const N = (s) => T12.noChoiceCondition(s).text;
  a12.strictEqual(N('Anesthesia at an in-network facility must be covered at in-network cost-sharing when the patient did not choose the out-of-network provider, and the provider cannot balance bill the patient.'), 'Anesthesia at an in-network facility must be covered at in-network cost-sharing, and the provider cannot balance bill the patient.');
  a12.strictEqual(N('Ancillary services like anesthesia cannot be balance billed when the patient did not choose the provider.'), 'Ancillary services like anesthesia cannot be balance billed.');
  a12.strictEqual(T12.noChoiceCondition('I did not choose the anesthesiologist; the facility assigned them.').count, 0, 'a stated fact is not a condition');
  // "Urgent: Standard review…" is a no
  a12.strictEqual(T12.urgencyOf('- **Urgent:** Standard review (unless your doctor says waiting could seriously harm your health) — the wheelchair has not yet been received'), false);
  a12.strictEqual(T12.bracketCoding('Ultrasound guidance (76942) is often separately reportable when documented.').count, 1, 'an adverb does not hide the assertion');
  console.log('v9 safety-renderer / banner / choice tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9 end to end: label in, fixed instruction out; plan rules reach the right parts ----------
(async () => {
  while (!global.__fpE2EDone) await new Promise((r) => setTimeout(r, 10)); // the shared mock is free once the first end-to-end block is done
  const a13 = require('assert');
  reply = '## 1. Your denial, decoded — and how strong your case is\n- Notice date: October 23, 2026\n\n**Safety first:** EMERGENCY — numbness between the legs\n\n**Do this first:** Call the office.';
  let res = await call(1);
  a13(ask().includes('SAFETY LINE: write the "Safety first" line whenever the source mentions a red flag'), 'part 1 is asked for the label');
  a13(ask().includes('any episode of falling asleep or drowsiness while driving'), 'a past drowsy-driving episode still earns a safety line (run 8 dropped it)');
  a13.strictEqual(res.body.safety, 'emergency');
  a13(res.body.text.includes('**Safety first:** Go to an emergency department now, or call 911. What you describe — numbness between the legs —'));
  const decode = res.body.text + '\n- **Plan:** Medi-Cal managed care plan\n- Care status: not yet received';
  reply = '## 6. Phone script — calling the insurer\nSay hello.';
  res = await call(4, { decode });
  a13(ask().includes('SAFETY (decided in the decode): the patient has been told to go to an emergency department now'));
  a13(ask().includes('MEDICAID: if the plan does not decide the appeal within its deadline'));
  a13(!ask().includes('MEDICARE ADVANTAGE:'));
  a13(res.body.text.includes('> **Emergency first:** go to the emergency department now'), 'banner under the insurer script');
  a13.strictEqual(res.body.banners, 1);
  reply = '## 2. Your appeal letter\nText.';
  res = await call(2, { decode: '## 1. x\n- **Plan:** Medicare Advantage (HMO)\n- Care status: not yet received' });
  a13(ask().includes('MEDICARE ADVANTAGE: for care not yet received, the treating physician can request the reconsideration directly'));
  a13(!ask().includes('SAFETY (decided'));
  console.log('v9 end-to-end tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9: the label must stand alone ----------
(async () => {
  const T14 = require('../../api/fightpack.js')._test;
  const a14 = require('assert');
  const free = '**Safety first:** Emergency signs such as chest pain mean going to the emergency department if they appear.';
  a14.strictEqual(T14.renderSafety(free).level, null, 'a free-text line that starts with "Emergency signs" is not a label');
  a14.strictEqual(T14.renderSafety('**Safety first:** **EMERGENCY**: new numbness between the legs').level, 'emergency');
  a14.strictEqual(T14.renderSafety('**Safety first:** Emergency. New leg weakness.').level, 'emergency');
  const bare = T14.renderSafety('**Safety first:** EMERGENCY');
  a14.strictEqual(bare.level, 'emergency');
  a14(bare.text.includes('These symptoms can be a sign of a medical emergency.') && !bare.text.includes('undefined'));
  a14.strictEqual(T14.renderSafety('**Safety first:** Today, if your symptoms worsen, call 911.').level, 'today', 'a "Today," opener reads as the today tier, never as an emergency');
  console.log('v9 label-boundary tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.2: guards from the run-9 audit, tested on the lines it quoted ----------
(async () => {
  const T15 = require('../../api/fightpack.js')._test;
  const a15 = require('assert');
  // a notice-and-consent exception never survives for anesthesia or emergency care
  const W = (s) => T15.noConsentWaiver(s).text;
  a15.strictEqual(W('Ancillary services (including anesthesia) provided at an in-network facility are covered at the in-network cost-sharing level, and the provider cannot balance bill you for the difference — unless you signed a valid notice-and-consent form in advance agreeing to go out of network and acknowledging the potential cost.'),
    'Ancillary services (including anesthesia) provided at an in-network facility are covered at the in-network cost-sharing level, and the provider cannot balance bill you for the difference.');
  a15.strictEqual(W('The claim must be reprocessed, unless a valid notice-and-consent form was signed in advance.'), 'The claim must be reprocessed.');
  a15.strictEqual(W('The protection applies unless the patient gave informed consent in advance.'), 'The protection applies.');
  a15.strictEqual(W('The provider cannot bill you, unless you signed a consent form, and the plan must reprocess the claim.'), 'The provider cannot bill you, and the plan must reprocess the claim.', 'the rest of the sentence survives');
  a15.strictEqual(T15.noConsentWaiver('A notice-and-consent form cannot waive this protection. If you have a signed consent form, send me a copy.').count, 0, 'a correct statement and a request are left alone');
  // the consent guard runs only when the source is about emergency or ancillary care
  const P = (s, known) => T15.postProcess(s, { part: 2, known }).text;
  a15.strictEqual(P('Protected — unless you signed a valid notice-and-consent form.', 'Summit Anesthesia Partners (NON-PARTICIPATING)'), 'Protected.');
  a15.strictEqual(P('Protected — unless you signed a valid notice-and-consent form.', 'Out-of-network plastic surgeon, scheduled breast reconstruction'), 'Protected — unless you signed a valid notice-and-consent form.', 'for other scheduled care the exception is real');
  // first-person past and contractions count as "already done"
  const U = (s) => T15.bracketUnverified(s).count;
  a15.strictEqual(U("I've also contacted the No Surprises Help Desk."), 1);
  a15.strictEqual(U('I called the No Surprises Help Desk on Monday.'), 1);
  a15.strictEqual(U("I've appealed to the plan and reported the bill."), 1);
  a15.strictEqual(U('I went to the ER at 2 a.m. with chest pain.'), 0, 'the facts of the visit are not a pending step');
  // a record nobody has seen is named, never characterized
  const R = (s) => T15.bracketRecordClaims(s);
  a15.strictEqual(R('The visit note documents that separate evaluation.').text, '[Only if the record shows this: The visit note documents that separate evaluation. — otherwise delete this sentence.]');
  a15.strictEqual(R("He would use the supplier's home assessment, which documents the home layout and safe operation.").count, 1);
  a15.strictEqual(R("He demonstrated safe joystick operation during the supplier's home assessment on 9/30/2026.").count, 1);
  a15.strictEqual(R('Please send the visit note that documents the shoulder evaluation.').count, 0, 'a request is routing');
  a15.strictEqual(R('The notice says the medical records do not document hemodynamic instability.').count, 0, "the insurer's finding is not a claim about the record");
  a15.strictEqual(R('The denial letter states that the home assessment was not received.').count, 0);
  a15.strictEqual(R('Review the letter and keep only what the medical record documents.').count, 0, 'an instruction to the doctor is not a claim');
  a15.strictEqual(R('Enclose the denial, your letter, and any medical records that document the red flags.').count, 0, 'a generic enclosure list is not a claim');
  a15.strictEqual(R('The visit note documents it. The visit note documents it.').count, 2);
  a15.strictEqual(R('You stated that "the face-to-face visit note dated 09/26/2026 documents chronic obstructive pulmonary disease".').count, 0, "the insurer's words are quoted, not claimed");
  a15.strictEqual(R('Note what the denial letter stated: the 9/26 visit note documented COPD and bilateral knee osteoarthritis.').count, 0);
  a15.strictEqual(R('- All nursing notes, vital signs, and intake/output records').count, 0, 'a records-request list item');
  a15.strictEqual(R('- Office visit notes or records documenting the current frequency of bloody stools').count, 0);
  a15.strictEqual(R('Send the claim and the supporting documents to the plan.').count, 0, '"documents" as a noun is not a claim');
  a15.strictEqual(R('[I have enclosed the notes — delete if not done]  The home assessment documents the home environment.').text,
    '[I have enclosed the notes — delete if not done]  [Only if the record shows this: The home assessment documents the home environment. — otherwise delete this sentence.]', 'a sentence after a leading bracket is still read');
  a15.strictEqual(R('The [date] visit note documents X.').count, 0, 'an inline placeholder keeps its sentence whole');
  const once = T15.emergencyBanners('## 6. Phone script — calling the insurer\nSay hi.').text;
  a15.strictEqual(T15.emergencyBanners(once).count, 0, 'banners are added once, never twice');
  a15.strictEqual(T15.postProcess('The visit note documents it.', { part: 3, records: true }).text, 'The visit note documents it.', 'skipped when the patient attached records');
  // phone roles come from the words printed before each number
  const roles = T15.phoneRoles('P.O. Box 9100, Portland, OR 97207  |  Prescriber line 1-855-555-0188\nrequest an EXPEDITED appeal by calling 1-855-555-0190; or fax 1-855-555-0191. EBSA 1-866-444-3272');
  a15.deepStrictEqual(roles, ['1-855-555-0188 — printed after "Prescriber line"', '1-855-555-0190 — printed after "request an EXPEDITED appeal by calling"', '1-855-555-0191 — printed after "or fax"'], JSON.stringify(roles));
  a15.deepStrictEqual(T15.phoneRoles('Appeals: Evergreen Mutual Appeals, P.O. Box 3310, Seattle, WA 98111; fax 1-866-555-0128; or through the member portal. Member Services: 1-866-555-0120.'),
    ['1-866-555-0128 — printed after "Appeals: Evergreen Mutual Appeals, P.O. Box 3310, Seattle, WA 98111; fax"', '1-866-555-0120 — printed after "Member Services"']);
  console.log('v9.2 consent / done / record / phone-role tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.3: a placeholder is never a date (run 11 turned "[… about two weeks before October 30, 2026]" into the notice date) ----------
(async () => {
  const T16 = require('../../api/fightpack.js')._test;
  const a16 = require('assert');
  const d = '- Notice date: [not provided — check your letter — approximately two weeks before October 30, 2026]\n- Appeal deadline as printed: [not provided — check your letter]\n- Care status: not yet received';
  a16.strictEqual(T16.computeDeadline(d), null);
  a16.strictEqual(T16.decodeFacts(d).denial_date, undefined, 'no denial date from a placeholder');
  a16.strictEqual(T16.computeDeadline('- Notice date: about October 1, 2026\n- Appeal deadline as printed: within 180 days of the notice'), null, 'an estimate never anchors a deadline');
  a16.strictEqual(T16.computeDeadline('- Notice date: October 23, 2026\n- Appeal deadline as printed: 60 calendar days from the date of this notice').date.toISOString().slice(0, 10), '2026-12-22', 'a printed date still works');
  console.log('v9.3 placeholder-date tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });
