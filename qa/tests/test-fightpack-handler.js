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
  ok(b.max_tokens === 2000, 'part 1 budget (v9.8.1: room for the printed-numbers lines)');
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
  ok(lastReq.body.max_tokens === 2800, 'part 6 budget (room for the tracker json after an urgent section 9)');
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
  ok(res.code === 200 && ask().match(/z{100,}/)[0].length === 8000, 'decode truncated to 8000 (v9.8; the client sends at most 8000)');

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
  a13(!ask().includes('URGENT, EMPLOYER OR MARKETPLACE PLAN'), 'a non-urgent Medicare Advantage case gets no concurrent-review rule');
  // v9.7: urgent care not yet received on an employer plan — the decode gains the two-requests line, every writer the rule
  reply = '## 1. Your denial, decoded — and how strong your case is\n- Care status: not yet received\n- **Plan:** Employer plan — "insured by Keystone Health Insurance Company"\n- **Urgent:** Yes — ask for an expedited decision. She is in the hospital.\n- **Case strength:** Good.';
  res = await call(1);
  a13(/\*\*Urgent:\*\* Yes[^\n]*\n- \*\*Two requests at once:\*\* because this is urgent/.test(res.body.text), 'the line follows the Urgent line, same bullet style');
  reply = '## 9. If they say no again — external review request\nText.\n## 10. Your deadlines and next moves\n- x';
  res = await call(6, { decode: res.body.text });
  a13(ask().includes('URGENT, EMPLOYER OR MARKETPLACE PLAN (decided in code)'), 'part 6 is told section 9 can go now');
  reply = '## 1. Your denial, decoded — and how strong your case is\n- Care status: already received\n- **Plan:** Employer plan\n- **Urgent:** Yes — ask for an expedited decision.';
  res = await call(1);
  a13(!/Two requests at once/.test(res.body.text), 'care already received is never urgent, so no line');
  // v9.7.1: Original Medicare gets its own levels and the contractor's clock
  reply = '## 2. Your appeal letter\nText.';
  res = await call(2, { decode: '## 1. x\n- Care status: already received\n**Plan:** Original Medicare Part B — the notice is a Medicare Summary Notice, not a Medicare Advantage plan.' });
  a13(ask().includes('ORIGINAL MEDICARE (decided in code)'), 'Original Medicare rule');
  a13(ask().includes('DECISION CLOCK (from the claims rules for this plan and care status — use exactly, never another number): the Medicare contractor generally decides a redetermination within 60 days'), 'contractor clock');
  a13(!ask().includes('MEDICARE ADVANTAGE:'));
  res = await call(2, { decode: '## 1. x\n- Care status: not yet received\n**Plan:** Medicare Advantage (HMO) — not Original Medicare' });
  a13(!ask().includes('ORIGINAL MEDICARE (decided in code)'), 'Medicare Advantage is not Original Medicare');
  // v9.8: funding, the printed peer-to-peer line, and a file's printed numbers reach every writer
  const jd = '## 1. x\n- Notice date: October 28, 2026\n- Care status: not yet received\n- Peer-to-peer line: 1-888-555-0186, within 7 days of the date of this notice\n- Phone and fax numbers: Member Services 1-888-555-0100; expedited appeals (24 hours) 1-888-555-0172; appeals fax 1-888-555-0179; peer-to-peer 1-888-555-0186\n**Plan:** Employer plan — the notice says "this plan is insured by Keystone Health Insurance Company," so it is a fully insured employer plan.';
  res = await call(3, { decode: jd, denial: 'Keystone Select PPO. This plan is insured by Keystone Health Insurance Company and regulated by your state insurance department.' });
  a13(ask().includes('FULLY INSURED EMPLOYER PLAN (the documents say so; decided in code)'), 'insured: one route');
  reply = '## 9. If they say no again — external review request\n- Complaints go to your state insurance department (naic.org); if your plan turns out to be self-funded, complaints go to the U.S. Department of Labor\'s EBSA at 1-866-444-3272.\n## 10. Your deadlines and next moves\n- x';
  res = await call(6, { decode: jd, denial: 'This plan is insured by Keystone Health Insurance Company.' });
  a13(res.body.text.includes('- Complaints go to your state insurance department (naic.org).') && !/EBSA/.test(res.body.text), 'the other route is trimmed in code (run 19, J)');
  await call(3, { decode: jd, denial: 'Keystone Select PPO — denial of inpatient rehabilitation.' });
  a13(!ask().includes('FULLY INSURED EMPLOYER PLAN'), 'a pasted letter that never says insured: the decode alone does not decide it');
  reply = '## 3. Letter of medical necessity — for your doctor to sign\nText.\n## 4. Note for your doctor\'s office\n- Text.';
  res = await call(3, { decode: jd, denial: '', file: { kind: 'pdf', media_type: 'application/pdf', data: 'QUJD' } });
  a13(ask().includes('FULLY INSURED EMPLOYER PLAN'), 'a letter sent as a file: the decode is the only text');
  a13(!ask().includes('SELF-FUNDED EMPLOYER PLAN'));
  a13(ask().includes('PEER-TO-PEER LINE (printed on the notice; decided in code): the doctor places the call: 1-888-555-0186, within 7 days of the date of this notice — by Wednesday, November 4, 2026.'), 'the window becomes a date, counted from the notice');
  reply = '## 6. Phone script — calling the insurer\nThe doctor can call 1-888-555-0186. Expedited: 1-888-555-0172.';
  res = await call(4, { decode: jd, denial: '', file: { kind: 'pdf', media_type: 'application/pdf', data: 'QUJD' } });
  a13(/1-888-555-0186 — printed after "peer-to-peer"/.test(ask()), "a letter sent as a file: the decode's printed numbers carry their roles");
  a13(res.body.text.includes('call 1-888-555-0186') && res.body.text.includes('1-888-555-0172'), 'and are never replaced by a placeholder');
  reply = '## 2. Your appeal letter\nText.';
  res = await call(2, { decode: '## 1. x\n**Plan:** Employer plan, self-funded — the notice says "Administered by Allied Benefit Administrators."', denial: 'This is a self-funded group health plan. Administered by Allied Benefit Administrators.' });
  a13(ask().includes('SELF-FUNDED EMPLOYER PLAN (the documents say so; decided in code)') && !ask().includes('FULLY INSURED EMPLOYER PLAN'));
  res = await call(2, { decode: '## 1. x\n**Plan:** Employer plan (Group 00912) — unknown whether self-funded or fully insured; ask HR.' });
  a13(!ask().includes('FULLY INSURED EMPLOYER PLAN') && !ask().includes('SELF-FUNDED EMPLOYER PLAN'), 'unknown stays conditional');
  res = await call(2, { decode: '## 1. x\n- Notice date: October 9, 2026\n- Peer-to-peer line: 1-800-555-0100, within 14 days of this notice\n**Plan:** Original Medicare Part B (Medicare Summary Notice).' });
  a13(!ask().includes('PEER-TO-PEER LINE'), 'Original Medicare: no peer-to-peer rule');
  a13(ask().includes('There is no peer-to-peer or medical-director review at this level'), 'and its own rule says so');
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

// ---------- v9.4: exam-derived labels in the doctor-signed sections (run-9 audit, Major) ----------
(async () => {
  const T17 = require('../../api/fightpack.js')._test;
  const a17 = require('assert');
  const G = 'For the last 3 days my right leg has been getting weaker and I keep tripping on my right foot. Since yesterday I have trouble starting to pee and my skin feels numb between my legs.';
  const L = (body, src = G, h = '## 3. Letter of medical necessity — for your doctor to sign') => T17.bracketLabels(`${h}\n${body}`, src).text.split('\n')[1];
  a17.strictEqual(L('Since yesterday she has experienced urinary retention (difficulty initiating urination).'), 'Since yesterday she has experienced [if documented: urinary retention] (difficulty initiating urination).');
  a17.strictEqual(L('She reports progressive right foot drop and saddle anesthesia.'), 'She reports [if documented: progressive right foot drop] and [if documented: saddle anesthesia].');
  a17.strictEqual(L('Worsening right leg weakness over 3 days causing falls.'), 'Worsening right leg weakness over 3 days causing [if documented: falls].', 'v9.8: the lead word stays outside the bracket');
  a17.strictEqual(L('Shortness of breath and dyspnea on exertion.', 'too short of breath'), 'Shortness of breath and dyspnea on exertion.', 'a plain synonym stays');
  a17.strictEqual(L('He is at continued risk for falls and has a high fall risk.', "can't get to the bathroom in time"), 'He is at continued risk for falls and has a high fall risk.', 'a risk is not a reported fall');
  a17.strictEqual(L('He has had incontinence episodes.', "He can't get to the bathroom in time and has had accidents."), 'He has had [if documented: incontinence episodes].');
  a17.strictEqual(L('He has had incontinence episodes.', 'History of urge incontinence.'), 'He has had incontinence episodes.', 'a label the source uses stays');
  a17.strictEqual(L('[Confirm: urinary retention on bladder scan] noted.'), '[Confirm: urinary retention on bladder scan] noted.', 'an existing bracket is left alone');
  a17.strictEqual(L('She has urinary retention.', G, '## 4. Note for your doctor\'s office'), 'She has urinary retention.', 'a note to the doctor\'s office is not a letter to the insurer');
  a17.strictEqual(L('a near-miss motor vehicle accident at a red light', 'fell asleep at a red light once'), 'a [if documented: near-miss motor vehicle accident] at a red light');
  // through postProcess: parts 3 and 4 only, source taken from before the decode, skipped with records
  const known = G + '\n\n## 1. Your denial, decoded — and how strong your case is\n- the decode may say urinary retention';
  a17.strictEqual(T17.postProcess('## 3. Letter of medical necessity — for your doctor to sign\nShe has urinary retention.', { part: 3, known }).text, '## 3. Letter of medical necessity — for your doctor to sign\nShe has [if documented: urinary retention].', "the decode's wording is not a source");
  a17.strictEqual(T17.postProcess('## 3. Letter of medical necessity — for your doctor to sign\nShe has urinary retention.', { part: 3, known, records: true }).text, '## 3. Letter of medical necessity — for your doctor to sign\nShe has urinary retention.');
  a17.strictEqual(T17.postProcess('## 5. Peer-to-peer talking points — for your doctor\n- foot drop on the right', { part: 4, known }).counts.labels, 1);
  console.log('v9.4 clinician-label tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.5: the plan type is read from the Plan line's head; a negated mention never decides it ----------
// Run 13's decode of an employer HMO said "no language indicating Medicare…" and the old parser returned "medicare",
// which would have told the patient an Independent Review Entity reviews the case automatically.
(async () => {
  const T18 = require('../../api/fightpack.js')._test;
  const a18 = require('assert');
  const pt = T18.planTypeOf;
  a18.strictEqual(pt('- **Plan:** Employer or marketplace plan (the plan name is "Evergreen Choice HMO" and the insurer is Evergreen Mutual Health — no language indicating Medicare, Medicaid, or self-funded status). You are filing for yourself.'), 'commercial', 'run 13, D');
  a18.strictEqual(pt('- **Plan:** Not Medicare — an employer plan'), 'commercial', 'a negated head');
  a18.strictEqual(pt('- **Plan:** No Medicare or Medicaid language; employer plan'), 'commercial', 'a negated list');
  a18.strictEqual(pt('- **Plan:** This is not a Medicare plan; it is an employer plan'), 'commercial');
  a18.strictEqual(pt('- **Plan:** Medicare Advantage — the notice names "Silverline Complete (HMO), a Medicare Advantage plan"'), 'medicare');
  a18.strictEqual(pt('- **Plan:** Medicare Advantage plan — the notice is not from Original Medicare'), 'medicare', 'the head decides');
  a18.strictEqual(pt('- **Plan:** Medi-Cal managed care plan (California Medicaid), and you are filing for yourself.'), 'medicaid');
  a18.strictEqual(pt('- **Plan:** Medicaid — no Medicare involvement'), 'medicaid');
  a18.strictEqual(pt('- **Plan:** Harborline Select PPO (employer group 44817)'), 'commercial', 'a plan name, then the words that show it');
  a18.strictEqual(pt('- **Plan:** Unknown whether self-funded or fully insured — the notice shows "Evergreen Choice HMO"'), 'commercial');
  a18.strictEqual(pt('- **Plan:** Not stated — the EOB does not say'), 'unknown');
  console.log('v9.5 plan-type tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.6: no sentence split inside a bracket; labels bracketed in every letter to the insurer ----------
(async () => {
  const T19 = require('../../api/fightpack.js')._test;
  const a19 = require('assert');
  // run 14, E, section 9: the full stop inside the coding bracket hid the next sentence from the done-guard
  const e14 = "Body. [Only if the billing office confirms it: The medication and ultrasound guidance codes are separately billable when medically necessary and documented, which they were for this injection. — otherwise delete this sentence.] The billing office has verified the codes match the documentation and has requested the plan's specific claim-edit rules that were applied.";
  a19.deepStrictEqual(T19.sentencesOf(e14).map((x) => x.trim().slice(0, 24)), ['Body.', '[Only if the billing off', 'The billing office has v']);
  a19.ok(/\[Only if this has happened: The billing office has verified the codes match/.test(T19.bracketUnverified(e14).text), 'the done-guard now sees it');
  a19.deepStrictEqual(T19.sentencesOf('One [stray. Two.').map((x) => x.trim()), ['One [stray.', 'Two.'], 'an unbalanced bracket splits as before');
  // labels in the patient's own letters (sections 2 and 9), not in notes, scripts or deadlines
  const src = 'For the last 3 days my right leg has been getting weaker and I keep tripping on my right foot.';
  const B = (h, body) => T19.bracketLabels(`${h}\n${body}`, src).text.split('\n')[1];
  a19.strictEqual(B('## 2. Your appeal letter', 'I now have progressive right leg weakness with foot drop.'), 'I now have progressive right leg weakness with [if documented: foot drop].');
  a19.strictEqual(B('## 9. If they say no again — your next level of review', 'I developed leg weakness, foot drop, and numbness.'), 'I developed leg weakness, [if documented: foot drop], and numbness.');
  for (const h of ['## 1. Your denial, decoded — and how strong your case is', "## 4. Note for your doctor's office", '## 6. Phone script — calling the insurer', '## 10. Your deadlines and next moves']) a19.strictEqual(B(h, 'Ask about foot drop.'), 'Ask about foot drop.', h);
  const known = src + '\n\n## 1. Your denial, decoded — and how strong your case is\n- foot drop';
  a19.strictEqual(T19.postProcess('## 2. Your appeal letter\nI have foot drop.', { part: 2, known }).counts.labels, 1, 'part 2 runs the guard');
  a19.strictEqual(T19.postProcess('## 9. If they say no again — external review request\nI have foot drop.\n## 10. Your deadlines and next moves\n- foot drop', { part: 6, known }).counts.labels, 1, 'part 6: section 9 only');
  a19.strictEqual(T19.postProcess('## 2. Your appeal letter\nI have foot drop.', { part: 2, known, records: true }).text, '## 2. Your appeal letter\nI have foot drop.', 'records attached: left to them');
  // a label named as a risk is not a finding (run 14, G); a finding after a risk cue still is
  const H3 = '## 3. Letter of medical necessity — for your doctor to sign';
  a19.strictEqual(B(H3, 'Cauda equina syndrome is a surgical emergency where delay can cause permanent paralysis and incontinence.'), 'Cauda equina syndrome is a surgical emergency where delay can cause permanent paralysis and incontinence.');
  a19.strictEqual(B(H3, 'Continued denial places her at risk for malnutrition, anemia and perforation.'), 'Continued denial places her at risk for malnutrition, anemia and perforation.');
  a19.strictEqual(B(H3, 'Given the risk of permanent injury, she now has foot drop.'), 'Given the risk of permanent injury, she now has [if documented: foot drop].');
  a19.strictEqual(B(H3, 'She has foot drop, which can cause incontinence.'), 'She has [if documented: foot drop], which can cause incontinence.');
  a19.strictEqual(B(H3, 'He cannot reach the bathroom in time, resulting in incontinence accidents.', "has had accidents"), 'He cannot reach the bathroom in time, resulting in [if documented: incontinence] accidents.', 'an actual result is a finding');
  a19.strictEqual(B(H3, 'His breathlessness prevents him from reaching the bathroom in time, resulting in incontinence.', 'has had accidents'), 'His breathlessness prevents him from reaching the bathroom in time, resulting in [if documented: incontinence].', 'a limitation is not a risk');
  a19.strictEqual(B(H3, 'The chair would prevent falls and incontinence.', 'has had accidents'), 'The chair would prevent falls and incontinence.');
  // text inside an outer bracket is left alone, nested brackets included
  a19.strictEqual(B(H3, '[Describe the new note: walks only [number] steps, resulting in incontinence.] Then sign.', "has had accidents"), '[Describe the new note: walks only [number] steps, resulting in incontinence.] Then sign.');
  console.log('v9.6 bracket-sentence / letter-label tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.7: two requests at once, only where the rule applies ----------
(async () => {
  const T20 = require('../../api/fightpack.js')._test;
  const a20 = require('assert');
  const d = (plan, care, urg) => `## 1. x\n- Care status: ${care}\n**Plan:** ${plan}\n**Urgent:** ${urg}\n**Case strength:** Good.`;
  const two = (x) => /Two requests at once/.test(T20.twoRequests(x));
  a20(two(d('Employer plan', 'not yet received', 'Yes — ask for an expedited decision.')), 'employer, pre-service, urgent');
  a20(!two(d('Employer plan', 'not yet received', 'No — standard review.')), 'not urgent');
  a20(!two(d('Medicare Advantage (HMO)', 'not yet received', 'Yes — ask for an expedited decision.')), 'Medicare Advantage: the IRE route instead');
  a20(!two(d('Medi-Cal managed care', 'not yet received', 'Yes — ask for an expedited decision.')), 'Medicaid: the State Hearing route instead');
  a20(!two(d('Unknown — the letter does not say', 'not yet received', 'Yes — ask for an expedited decision.')), 'unknown plan: not asserted');
  const once = T20.twoRequests(d('Employer plan', 'not yet received', 'Yes — ask for an expedited decision.'));
  a20.strictEqual(T20.twoRequests(once), once, 'idempotent');
  a20.strictEqual(T20.urgencyOf(once), true, 'the Urgent line still reads as yes');
  a20.strictEqual(T20.canonicalHeading(9, 'If they say no again — reconsideration request'), '## 9. If they say no again — your next level of review', 'Original Medicare: a reconsideration is the next level, not an external review');
  a20.strictEqual(T20.canonicalHeading(9, 'If they say no again — external review request'), '## 9. If they say no again — external review request');
  console.log('v9.7 two-requests tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.7.1: the tracker json survives a part 6 that ran out of room ----------
(async () => {
  const T21 = require('../../api/fightpack.js')._test;
  const a21 = require('assert');
  const facts = { urgent: true, plan_type: 'commercial', denial_date: '2026-10-20' };
  const cut = '## 10. Your deadlines and next moves\n- File by April 18, 2027.\n\n```json\n{"denial_date": "2026-10-20", "urg';
  const fixed = T21.fixMeta(cut, facts);
  const m = fixed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  a21(m, 'a complete block is there');
  a21.deepStrictEqual(JSON.parse(m[1]), facts, 'built from the decode facts');
  a21(!fixed.includes('"urg\n'), 'the half-written block is gone');
  a21.strictEqual(fixed.split('```').length - 1, 2, 'one fenced block');
  const none = T21.fixMeta('## 10. x\n- y', facts);
  a21(/```json\n\{/.test(none), 'appended when there was none');
  const whole = T21.fixMeta('x\n```json\n{"urgent": false, "service": "MRI"}\n```', facts);
  a21.deepStrictEqual(JSON.parse(whole.match(/```json\n([\s\S]*?)\n```/)[1]), { urgent: true, service: 'MRI', plan_type: 'commercial', denial_date: '2026-10-20' }, 'an existing block is overwritten field by field, as before');
  a21.strictEqual(T21.originalMedicare('**Plan:** Original Medicare Part B (Medicare Summary Notice)'), true);
  a21.strictEqual(T21.originalMedicare('**Plan:** Medicare Advantage (HMO)'), false);
  a21.strictEqual(T21.originalMedicare('**Plan:** TRICARE Select'), false);
  a21.strictEqual(T21.originalMedicare('**Plan:** Employer plan — not Medicare or Original Medicare'), false);
  console.log('v9.7.1 tracker-json / Original Medicare tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.8: who did it, who may act, how bad it is (round-2 audit, run 16) — real lines ----------
(async () => {
  const T22 = require('../../api/_lib/fightpack-guards.js');
  const a22 = require('assert');
  const H3 = '## 3. Letter of medical necessity — for your doctor to sign';
  const H5 = '## 5. Peer-to-peer talking points — for your doctor';
  // the request that was denied was submitted — by someone; the passive is always true (G, runs 11 and 15)
  const g = 'Since I submitted that request, the patient has developed progressive right lower-extremity weakness over three days.';
  a22.strictEqual(T22.passiveRequest(g).text, 'Since that request was submitted, the patient has developed progressive right lower-extremity weakness over three days.');
  a22.strictEqual(T22.postProcess(`${H5}\n${g}`, { part: 4, known: '', source: 'leg weakness' }).text, `${H5}\nSince that request was submitted, the patient has developed progressive right lower-extremity weakness over three days.`, 'no longer one bracketed option to delete');
  a22.strictEqual(T22.passiveRequest('After we filed our prior authorization request on [date], …').text, 'After the prior authorization request was filed on [date], …');
  a22.strictEqual(T22.passiveRequest('I submitted the request on October 1.').count, 0, 'a main-clause claim is left to the done-guard');
  // legal authority (I §7, J §8)
  a22.strictEqual(T22.bracketAuthority("Say: \"I'm his daughter, Renee Pruitt-Cole, and I have power of attorney.\"").text, "Say: \"I'm his daughter, Renee Pruitt-Cole, and [only if you hold this in writing: I have power of attorney].\"");
  a22.strictEqual(T22.bracketAuthority('I am the husband of Denise R. Albright and am authorized to act on her behalf. I am requesting a complete copy of her records.').text, 'I am the husband of Denise R. Albright and [only if you hold this in writing: am authorized to act on her behalf]. I am requesting a complete copy of her records.');
  for (const keep of ['I am writing on behalf of my father, Harold W. Pruitt, Medicare number 4TN7-WQ2-HJ85. I am his authorized representative under the enclosed Appointment of Representative form.', 'Once I have power of attorney, I will send it.', 'Do you need a copy of my power of attorney?', "I'm her husband, Gary.", '[I am his authorized representative — form enclosed]'])
    a22.strictEqual(T22.bracketAuthority(keep).text, keep, keep);
  a22.strictEqual(T22.postProcess('## 7. Phone script — calling the insurer\nI have power of attorney.', { part: 5, known: '', source: "I'm his daughter and I have his power of attorney." }).text, '## 7. Phone script — calling the insurer\nI have power of attorney.', 'the family said so: left alone');
  // authorship in the clinician's own voice (J §3, Critical)
  a22.strictEqual(T22.attributeActs(`${H3}\nI documented on 10/26/2026 that she is "expected to participate in 3 hours of therapy per day within 2–3 days."`).text, `${H3}\n[I / Dr. ___] documented on 10/26/2026 that she is "expected to participate in 3 hours of therapy per day within 2–3 days."`);
  a22.strictEqual(T22.attributeActs(`${H5}\n- "I'm calling about [patient name], for whom I ordered attended polysomnography." Completed 09/26/2026, documented in my note.`).text, `${H5}\n- "I'm calling about [patient name], for whom [I / Dr. ___] ordered attended polysomnography." Completed 09/26/2026, documented in [my / Dr. ___'s] note.`);
  for (const keep of [`${H3}\nI am the treating [specialty] and I have reviewed the records. I request that you overturn this denial.`, "## 3. Corrected-claim request — for the billing office\nOn 08/21/2026, I saw the doctor for a knee injection.", "## 4. Note for your doctor's office\n- I documented nothing.", `${H3}\n[I examined her on [date].]`])
    a22.strictEqual(T22.attributeActs(keep).text, keep, keep);
  // severity words the family never used (I §3, §5, §9)
  const S = (sec, line) => T22.bracketSeverity(`${sec}\n${line}`, 'The ER told us his heart rate was very slow.').text.split('\n')[1];
  a22.strictEqual(S(H3, 'He was found to have a critically slow heart rate requiring hospital admission.'), 'He was found to have a [if documented: critically] slow heart rate requiring hospital admission.');
  a22.strictEqual(S(H3, 'Private vehicle transportation is not suitable for an unstable patient with syncope, chest pain, and significant bradycardia.'), 'Private vehicle transportation is not suitable for an [if documented: unstable] patient with syncope, chest pain, and [if documented: significant] bradycardia.');
  a22.strictEqual(S(H3, 'confirming hemodynamically significant bradycardia.'), 'confirming [if documented: hemodynamically significant] bradycardia.');
  a22.strictEqual(S('## 9. If they say no again — your next level of review', 'was found to have a dangerously slow heart rate.'), 'was found to have a [if documented: dangerously] slow heart rate.');
  for (const keep of ['ruling out pulmonary embolism, aortic dissection, or unstable angina.', '- *"The documentation doesn\'t show he was unstable."* — Loss of consciousness with chest pain.', 'Delay could cause him to become dangerously unstable.', 'He was not unstable on arrival.', 'equipped to respond to life-threatening arrhythmias.', 'Because of this severely limited walking distance, he cannot reach the bathroom.'])
    a22.strictEqual(S(H3, keep), keep, keep);
  a22.strictEqual(T22.bracketSeverity(`${H3}\nShe has severe colonic inflammation.`, 'severe colonic inflammation on my colonoscopy').text, `${H3}\nShe has severe colonic inflammation.`, 'the source says it: left alone');
  a22.strictEqual(T22.bracketSeverity("## 6. Phone script — calling the insurer\nAn unstable patient.", '').text, "## 6. Phone script — calling the insurer\nAn unstable patient.", 'only documents sent to the insurer');
  a22.strictEqual(T22.postProcess(`${H3}\nAn unstable patient.`, { part: 3, known: '', source: '', records: true }).text, `${H3}\nAn unstable patient.`, 'records attached: left to them');
  // "falls": the function word stays outside the bracket, a count word is part of the label
  const L = T22.bracketLabels(`${H3}\nWeakness with falls and recurrent falls; the deadline falls on Monday.`, 'tripping').text.split('\n')[1];
  a22.strictEqual(L, 'Weakness with [if documented: falls] and [if documented: recurrent falls]; the deadline falls on Monday.');
  console.log('v9.8 passive-request / authority / authorship / severity tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.8: funding and the peer-to-peer date are read from the decode in code (real Plan lines, runs 15–18) ----------
(async () => {
  const T23 = require('../../api/fightpack.js')._test;
  const a23 = require('assert');
  const plan = (v) => T23.fundingOf(`## 1. x\n**Plan:** ${v}`);
  a23.strictEqual(plan('Employer plan — the notice shows "Group BRT-5520 (Brightwater Logistics Inc.)" and states "This plan is insured by Keystone Health Insurance Company," so it is a fully insured employer plan. Gary is filing for his wife Denise.'), 'insured', 'J, run 18');
  a23.strictEqual(plan('Employer plan, self-funded (the notice states "This plan is self-funded and is governed by ERISA"). You are filing for yourself.'), 'self-funded', 'E, run 15');
  a23.strictEqual(plan('Employer plan, self-funded — the notice states "this is a self-funded group health plan" and lists "Administered by Allied Benefit Administrators."'), 'self-funded', 'H, run 15');
  a23.strictEqual(plan('Employer plan (Group: 00912 Front Range Logistics LLC) — unknown whether self-funded or fully insured; ask your HR department.'), null, 'B, run 15');
  a23.strictEqual(plan('Employer or marketplace plan (Evergreen Choice HMO). Unknown whether self-funded or fully insured — ask HR or check the plan document.'), null, 'D, run 15');
  a23.strictEqual(plan('Employer plan (Harborline Select PPO, employer group 44817). You are filing for yourself.'), null, 'C, run 18: not stated');
  a23.strictEqual(plan('Employer plan, self-insured; administered by a third-party administrator.'), 'self-funded', 'self-insured is not insured');
  a23.strictEqual(plan('Medicare Advantage (HMO) — insured by Humana'), null, 'only employer and marketplace plans');
  const p = T23.p2pOf('- Notice date: October 28, 2026\n- Peer-to-peer line: 1-888-555-0186, within 7 days of the date of this notice');
  a23.strictEqual(p.phone, '1-888-555-0186');
  a23.strictEqual(p.window, 'within 7 days of the date of this notice');
  a23.strictEqual(p.date.toISOString().slice(0, 10), '2026-11-04', 'J: Wednesday, November 4, 2026, as the audit counted');
  a23.strictEqual(T23.p2pOf('- Notice date: October 28, 2026\n- Peer-to-peer line: [not on the letter]'), null);
  a23.strictEqual(T23.p2pOf('- Notice date: October 28, 2026\n- Peer-to-peer line: (800) 555-0100, within 5 business days of the notice').date, null, 'business days: left to the letter');
  a23.strictEqual(T23.p2pOf('- Notice date: October 28, 2026\n- Peer-to-peer line: 800-555-0100, within 14 days of receipt').date, null, 'from receipt: no date');
  a23.strictEqual(T23.p2pOf('- Peer-to-peer line: the doctor may request one'), null, 'no number, no rule');
  a23.strictEqual(T23.decodeFacts('## 1. x\n- Care status: already received\n**Plan:** Original Medicare Part B (Medicare Summary Notice).').plan_type, 'original-medicare', "the tracker gets Original Medicare's own row");
  a23.strictEqual(T23.decodeFacts('## 1. x\n**Plan:** TRICARE Select').plan_type, 'other');
  console.log('v9.8 funding / peer-to-peer / plan-type tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.8: a block code writes itself has every key (replay of run 17, case C) ----------
(async () => {
  const T24 = require('../../api/fightpack.js')._test;
  const a24 = require('assert');
  const d = '## 1. x\n- Claim / reference #: PA-2026-1183907\n- Notice date: October 20, 2026\n- Service denied: HUMIRA (adalimumab) 40 mg/0.4 mL pen\n- Care status: not yet received\n- Appeal deadline as printed: within 180 days of this notice\n- **Type of denial:** prior authorization / step therapy — "Step therapy requirements have not been met"\n**Plan:** Employer plan (Harborline Select PPO)\n- **Urgent:** Yes — ask for an expedited decision.\n- **Case strength:** Good — one thing missing: the colonoscopy report.';
  const cut = '## 10. Your deadlines and next moves\n- File by April 18, 2027.\n\n```json\n{"denial_date": "2026-10-20", "urg';
  const j = JSON.parse(T24.fixMeta(cut, T24.decodeFacts(d), T24.fallbackFacts(d)).match(/```json\n([\s\S]*?)\n```/)[1]);
  for (const k of ['denial_date', 'stated_appeal_deadline', 'appeal_window_days', 'service_type', 'urgent', 'claim_number', 'service', 'denial_reason', 'denial_type', 'case_strength', 'plan_type']) a24(k in j, k);
  a24.deepStrictEqual(j, { denial_date: '2026-10-20', stated_appeal_deadline: null, appeal_window_days: 180, service_type: 'pre-service', urgent: true, claim_number: 'PA-2026-1183907', service: 'HUMIRA (adalimumab) 40 mg/0.4 mL pen', denial_reason: 'Step therapy requirements have not been met', denial_type: 'prior-authorization', case_strength: 'good', plan_type: 'commercial' });
  const kept = JSON.parse(T24.fixMeta('x\n```json\n{"urgent": false, "service": "MRI", "denial_type": "coding"}\n```', T24.decodeFacts(d), T24.fallbackFacts(d)).match(/```json\n([\s\S]*?)\n```/)[1]);
  a24.strictEqual(kept.service, 'MRI', "a writer's own block keeps its prose fields");
  a24.strictEqual(kept.denial_type, 'coding', 'only the code facts are overwritten');
  a24.strictEqual(kept.urgent, true);
  console.log('v9.8 complete fallback-json tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.8.1: the expedited request comes first; one complaint route (run 19, real lines) ----------
(async () => {
  const T25 = require('../../api/fightpack.js')._test;
  const a25 = require('assert');
  const j = '## 1. Your denial, decoded — and how strong your case is\n- Expedited appeal line: 1-888-555-0172 (24 hours a day, 7 days a week)\n- Care status: not yet received\n**Plan:** Employer plan — "this plan is insured by Keystone Health Insurance Company."\n- **Urgent:** Yes — ask for an expedited decision. She may be discharged in a day or two.\n**Do this first:** Call Riverside General\'s utilization-review or patient-financial-services office — confirm the hospital is appealing, ask them to hold the account.';
  const first = T25.expeditedFirst(j, null).split('\n').pop();
  a25.strictEqual(first, "**Do this first:** Ask for an expedited appeal now: call 1-888-555-0172 (the doctor can request it directly, and when the doctor says waiting could seriously harm the patient's health, the plan must treat it as urgent). Then: Call Riverside General's utilization-review or patient-financial-services office — confirm the hospital is appealing, ask them to hold the account.");
  a25.strictEqual(T25.expeditedFirst(T25.expeditedFirst(j, null), null), T25.expeditedFirst(j, null), 'idempotent');
  const already = j.replace("Call Riverside General's", 'Call 1-888-555-0172 now and request an expedited appeal; then call Riverside General\'s');
  a25.strictEqual(T25.expeditedFirst(already, null), already, 'already first: left alone');
  a25.strictEqual(T25.expeditedFirst(j, 'emergency'), j, 'an emergency instruction stays first');
  const c = j.replace(/\*\*Do this first:\*\* [^\n]*/, "**Do this first:** Call your doctor's office today about the 8-10 bloody bowel movements daily and the weight loss");
  a25.strictEqual(T25.expeditedFirst(c, 'today').split('\n').pop(), "**Do this first:** Call your doctor's office today about the 8-10 bloody bowel movements daily and the weight loss. Then ask for an expedited appeal: call 1-888-555-0172 (the doctor can request it directly, and when the doctor says waiting could seriously harm the patient's health, the plan must treat it as urgent).", 'a "contact the doctor today" safety step stays first (C, run 19)');
  a25.strictEqual(T25.expeditedFirst(j.replace('not yet received', 'already received'), null), j.replace('not yet received', 'already received'), 'care already received is never urgent');
  a25.strictEqual(T25.expeditedFirst(j.replace('Yes — ask', 'No — standard review; ask'), null), j.replace('Yes — ask', 'No — standard review; ask'));
  a25(/call the expedited-appeal number on your letter/.test(T25.expeditedFirst(j.replace(/- Expedited appeal line: [^\n]*/, '- Expedited appeal line: [not on the letter]'), null)), 'no printed line: no number invented');
  // one complaint route when the documents settle the funding (lines from runs 9, 15 and 19)
  a25.strictEqual(T25.oneRoute("- If your plan is self-funded (this one is), complaints about the plan go to the U.S. Department of Labor's EBSA at 1-866-444-3272; if fully insured, to your state insurance department — since this plan states it is self-funded and governed by ERISA, EBSA is the agency.", 'self-funded'), "- If your plan is self-funded (this one is), complaints about the plan go to the U.S. Department of Labor's EBSA at 1-866-444-3272.");
  a25.strictEqual(T25.oneRoute('- If your plan is self-funded (the documents say "self-funded," "ERISA," or "administered by"), complaints go to the U.S. Department of Labor\'s EBSA at 1-866-444-3272. If your plan is fully insured, complaints go to your state insurance department — the number is on your denial letter or at naic.org. If you\'re not sure, contact both.', 'insured'), '- If your plan is fully insured, complaints go to your state insurance department — the number is on your denial letter or at naic.org.');
  const unknown = '- Complaints go to EBSA for a self-funded plan; if fully insured, to your state insurance department.';
  a25.strictEqual(T25.oneRoute(unknown, null), unknown, 'funding unknown: both routes stay');
  console.log('v9.8.1 expedited-first / one-route tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.8.2: a setting, a vehicle or a wait never "not validated"; no setting figure from memory (runs 9–20, real lines) ----------
(async () => {
  const T26 = Object.assign({}, require('../../api/_lib/fightpack-guards.js'), require('../../api/_lib/fightpack-limits.js'));
  const a26 = require('assert');
  const sl = (x, letters = false, src = '') => T26.settingLimits(x, src, letters).text;
  // vehicles: the ambulance rule's own test (I, runs 16 and 19)
  a26.strictEqual(sl('He could not sit upright in a car, and your mother does not drive. A private vehicle is not validated for an unstable patient with chest pain and a syncopal episode.'), 'He could not sit upright in a car, and your mother does not drive. A private vehicle is contraindicated for an unstable patient with chest pain and a syncopal episode.');
  a26.strictEqual(sl('Wheelchair van transport is not validated for patients with acute cardiac symptoms requiring continuous monitoring.'), 'Wheelchair van transport is contraindicated for patients with acute cardiac symptoms requiring continuous monitoring.');
  a26.strictEqual(sl('- *"Could the family have driven him?"* — Not validated for a patient who has just lost consciousness and has active chest pain.'), '- *"Could the family have driven him?"* — Contraindicated for a patient who has just lost consciousness and has active chest pain.');
  a26.strictEqual(sl('- **Other transportation would endanger health:** a private vehicle is not validated for transport of an unstable patient.'), '- **Other transportation would endanger health:** a private vehicle is contraindicated for transport of an unstable patient.');
  // levels of care and cheaper alternatives: the denial's own word (J runs 16–20, B run 9, F runs 10–19, G runs 10 and 14)
  a26.strictEqual(sl('A skilled nursing facility is not validated for patients requiring daily physician oversight for active medical management.'), 'A skilled nursing facility is not appropriate for patients requiring daily physician oversight for active medical management.');
  a26.strictEqual(sl('A skilled nursing facility does not provide daily rehabilitation physician oversight. This level is not validated for patients requiring intensive coordinated therapy.'), 'A skilled nursing facility does not provide daily rehabilitation physician oversight. This level is not appropriate for patients requiring intensive coordinated therapy.', 'the subject is "this level": the setting the paragraph named');
  a26.strictEqual(sl('Subacute rehab lacks a rehabilitation physician for daily medical oversight. It is not validated for the intensive coordinated therapy this patient needs.'), 'Subacute rehab lacks a rehabilitation physician for daily medical oversight. It is not appropriate for the intensive coordinated therapy this patient needs.');
  a26.strictEqual(sl('Observation status is not validated for patients requiring [continuous cardiac monitoring].'), 'Observation status is not appropriate for patients requiring [continuous cardiac monitoring].');
  a26.strictEqual(sl('- "Try a manual wheelchair first" → Not validated in a patient with shoulder pathology limiting upper-extremity function.'), '- "Try a manual wheelchair first" → Not appropriate for a patient with shoulder pathology limiting upper-extremity function.');
  a26.strictEqual(sl('A 6-week delay is not appropriate when compromise is present; conservative management is not validated for cauda equina syndrome.'), 'A 6-week delay is not appropriate when compromise is present; conservative management is not appropriate for cauda equina syndrome.');
  a26.strictEqual(sl('Waiting for a family car is not validated for a patient with chest pain.'), 'Waiting for a family car is not appropriate for a patient with chest pain.', 'a wait is never a contraindication');
  // tests and drugs keep the vocabulary the preamble allows them (A, C, G)
  for (const keep of ['An HSAT is not validated in patients with significant cardiopulmonary disease.',
    'The evidence for azathioprine shows onset at 8-12 weeks; it is not validated for rapid control of severe active inflammation.',
    '- "Observation or a lower-level study?" → Plain films and CT are not validated for soft-tissue nerve root compression; MRI is the standard.',
    'Immunomodulators require 12 weeks to reach therapeutic effect and are not validated for rapid control of severe active flares; requiring that delay is unsafe.',
    'Observation status is not validated for patients [only if documented: a private vehicle is not validated for this].'.replace('Observation status is not validated', 'The test is not validated')]) a26.strictEqual(sl(keep), keep, keep);
  // setting figures from memory: bracketed in the decode and the letters (J runs 16–20)
  const B = (x) => `[if the plan's policy or your records say so: ${x}]`;
  a26.strictEqual(sl('A skilled nursing facility offers 1–2 hours of therapy per day and is not validated for patients requiring rehabilitation-physician involvement.'), `A skilled nursing facility offers ${B('1–2 hours of therapy per day')} and is not appropriate for patients requiring rehabilitation-physician involvement.`);
  a26.strictEqual(sl('A skilled nursing facility provides much less therapy — typically one hour per day, a few days per week — and does not have a rehabilitation physician managing the program daily.'), `A skilled nursing facility provides much less therapy — ${B('typically one hour per day, a few days per week')} — and does not have a rehabilitation physician managing the program daily.`);
  a26.strictEqual(sl('A skilled nursing facility offers only 1–2 hours of therapy per day, typically five days per week or less, and lacks the rehabilitation-physician involvement.'), `A skilled nursing facility offers ${B('only 1–2 hours of therapy per day, typically five days per week or less')}, and lacks the rehabilitation-physician involvement.`);
  a26.strictEqual(sl('They are proposing a skilled nursing facility instead — a lower intensity of rehabilitation, typically one to two hours per day.'), `They are proposing a skilled nursing facility instead — a lower intensity of rehabilitation, ${B('typically one to two hours per day')}.`);
  // a figure after "not", "lacks", "intensive" or "needs" is the level the patient needs, and it stays (J run 20 §2)
  const need = 'A skilled nursing facility does not provide a rehabilitation physician managing the program daily, and it is not staffed to deliver the intensive coordinated therapy — PT, OT, and speech together, three hours per day, five days per week — that Denise needs.';
  a26.strictEqual(sl(need), need);
  a26.strictEqual(sl('A skilled nursing facility typically provides one to two hours of therapy per day, not the three hours per day recommended.'), `A skilled nursing facility typically provides ${B('one to two hours of therapy per day')}, not the three hours per day recommended.`);
  // a figure the patient's own material gives stays, in words or digits
  a26.strictEqual(sl('The SNF offers 2 hours of therapy per day.', false, 'Sunrise SNF told us it offers two hours of therapy per day.'), 'The SNF offers 2 hours of therapy per day.');
  // patient figures before the setting stay; parts 2–6 bracket only the letter sections
  const pat = 'Her tolerance rose from 90 to 165 minutes per day, more than a skilled nursing facility can give.';
  a26.strictEqual(sl(pat), pat);
  const four = "## 4. Note for your doctor's office\nA skilled nursing facility provides only 1–2 hours of therapy per day.\n## 5. Peer-to-peer talking points — for your doctor\nA skilled nursing facility provides only 1–2 hours of therapy per day.";
  a26.strictEqual(sl(four, true), `## 4. Note for your doctor's office\nA skilled nursing facility provides only 1–2 hours of therapy per day.\n## 5. Peer-to-peer talking points — for your doctor\nA skilled nursing facility provides ${B('only 1–2 hours of therapy per day')}.`);
  a26.strictEqual(sl(sl(four, true), true), sl(four, true), 'idempotent');
  // end to end through postProcess: the step runs in every part and never touches the fenced json
  const r = T26.postProcess('## 3. Letter of medical necessity — for your doctor to sign\nA private vehicle is not validated for an unstable patient.\n```json\n{"service": "SNF offers 2 hours per day"}\n```', { part: 3, known: '## 1. x' });
  a26.strictEqual(r.text, '## 3. Letter of medical necessity — for your doctor to sign\nA private vehicle is contraindicated for an [if documented: unstable] patient.\n```json\n{"service": "SNF offers 2 hours per day"}\n```');
  a26.strictEqual(r.counts.setting, 1);
  console.log('v9.8.2 setting-limits tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });

// ---------- v9.8.3: surprise-billing protection never argued from choice, notice or consent (D and H, runs 9–20, real lines) ----------
(async () => {
  const T27 = Object.assign({}, require('../../api/_lib/fightpack-guards.js'), require('../../api/_lib/fightpack-limits.js'));
  const a27 = require('assert');
  const dc = (x) => T27.dropChoiceArgument(x).text;
  const cases = [
    // the clause that argues goes; the rest of the sentence stays (D)
    ['The hospital is in-network, and you did not choose the emergency physician.', 'The hospital is in-network.'],
    ['I did not choose the emergency physician — Cascade Emergency Physicians was the emergency-department group on duty.', 'Cascade Emergency Physicians was the emergency-department group on duty.'],
    ['The patient did not choose the emergency physician; the federal No Surprises Act requires coverage at in-network cost-sharing regardless of the physician\'s network status.', 'The federal No Surprises Act requires coverage at in-network cost-sharing regardless of the physician\'s network status.'],
    ['The facility (Mercy Lakeside Hospital) is in-network, and you did not choose the emergency physician — Cascade Emergency Physicians staffs that emergency department — so the federal No Surprises Act requires the plan to cover this at in-network cost-sharing.', 'The facility (Mercy Lakeside Hospital) is in-network — Cascade Emergency Physicians staffs that emergency department — so the federal No Surprises Act requires the plan to cover this at in-network cost-sharing.'],
    ['My visit was an emergency judged by the symptoms I had when I sought care, the facility was in-network, and I did not choose the out-of-network physician.', 'My visit was an emergency judged by the symptoms I had when I sought care, and the facility was in-network.'],
    ['I went to Mercy Lakeside Hospital, which is in my network, and I had no control over which ER doctor treated me.', 'I went to Mercy Lakeside Hospital, which is in my network.'],
    ['The patient\'s choice of clinician is not relevant to this determination — emergency care is covered at in-network cost-sharing regardless of the provider\'s network status, and the patient did not choose their emergency physician.', 'Emergency care is covered at in-network cost-sharing regardless of the provider\'s network status.'],
    // a sentence with nothing left, or a pronoun that lost its noun, goes
    ['I did not choose Cascade Emergency Physicians; they staff the emergency department at the in-network hospital.', ''],
    ['I didn\'t choose the emergency physician — emergency patients don\'t choose their doctors.', ''],
    ['Once I arrived at the emergency department, I had no ability to choose which physician would treat me.', ''],
    // a condition or a relative clause goes, the rule and the clinician stay (H)
    ['Under the federal No Surprises Act, ancillary services including anesthesia at an in-network facility must be covered at in-network cost-sharing when the patient did not choose the ancillary clinician and received no notice-and-consent form waiving protections.', 'Under the federal No Surprises Act, ancillary services including anesthesia at an in-network facility must be covered at in-network cost-sharing.'],
    ['**Your strongest argument:** The anesthesia service was provided at Lakeview Surgery Center, a participating facility, by an ancillary clinician you did not choose and were never informed was out-of-network — you received no notice-and-consent form.', '**Your strongest argument:** The anesthesia service was provided at Lakeview Surgery Center, a participating facility, by an ancillary clinician.'],
    ['**Your strongest argument:** You received anesthesia at Lakeview Surgery Center, a participating facility, from Summit Anesthesia Partners, whom you did not select and never met before the surgery, and you received no notice-and-consent paperwork about out-of-network charges.', '**Your strongest argument:** You received anesthesia at Lakeview Surgery Center, a participating facility, from Summit Anesthesia Partners.'],
    ["I'm appealing this under the federal No Surprises Act because I had surgery at an in-network facility and never received any notice that you were out-of-network or had any ability to choose my anesthesiologist.", "I'm appealing this under the federal No Surprises Act because I had surgery at an in-network facility."],
    ['You received ancillary anesthesia services at an in-network facility, with no notice or consent, which is exactly the situation the No Surprises Act protects.', 'You received ancillary anesthesia services at an in-network facility, which is exactly the situation the No Surprises Act protects.'],
    // the subject comes back when it went with the dropped clause
    ['I did not choose Summit Anesthesia Partners, did not meet the anesthesiologist before the procedure, and received no advance written notice that anesthesia services would be out-of-network.', 'I did not meet the anesthesiologist before the procedure.'],
    // a request for proof of no notice goes whole
    ['- Statement that you did not receive or sign any notice-and-consent form about out-of-network anesthesia charges before the procedure', ''],
    ['- **Confirm no notice-and-consent form was signed:** Check your pre-operative records — if Mr. Okafor signed no notice-and-consent form about out-of-network anesthesia charges, document that in writing for him.', ''],
    // the correct rule stays
    ['- **No consent form waives this:** I received no advance notice that Summit Anesthesia Partners was out-of-network, but even if I had signed a form, it cannot waive the No Surprises Act protections for ancillary anesthesia at an in-network facility.', '- **No consent form waives this:** Even if I had signed a form, it cannot waive the No Surprises Act protections for ancillary anesthesia at an in-network facility.'],
  ];
  for (const [i, o] of cases) a27.strictEqual(dc(i), o, i);
  // never touched: other notices, a surgeon's notice (it does count), the rule itself, brackets and quotes
  for (const keep of ['I did not receive the denial notice until November 3, because I was in the hospital.',
    'I never received notice that the surgeon was out of network.',
    'A notice-and-consent form cannot waive surprise-billing protection for ancillary clinicians like anesthesiologists.',
    'Federal law protects you without any consent form for anesthesia.',
    '[If you did not choose the physician, delete this line.] The facility is in-network.',
    'The plan wrote: "the member did not choose an in-network provider."']) a27.strictEqual(dc(keep), keep, keep);
  a27.strictEqual(dc(dc(cases[3][0])), dc(cases[3][0]), 'idempotent');
  // only in surprise-billing cases, through postProcess
  const kit = '## 2. Your appeal letter\nThe hospital is in-network, and I did not choose the emergency physician.';
  a27.strictEqual(T27.postProcess(kit, { part: 2, known: 'EOB: emergency department visit\n## 1. x' }).text, '## 2. Your appeal letter\nThe hospital is in-network.');
  a27.strictEqual(T27.postProcess(kit, { part: 2, known: 'MRI denied\n## 1. x' }).text, kit, 'not a surprise-billing source: untouched');
  console.log('v9.8.3 choice / notice tests passed');
})().catch((e) => { console.error('TEST FAIL', e); process.exit(1); });
