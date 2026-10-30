// Automated acceptance checks for generated Fight Packs.
// Usage: node fp-check.js [runDir=runs] [caseId ...]
// Every rule below is stated once. A FAIL is a defect a patient could be hurt by
// (wrong fact, wrong deadline, missing section); a WARN is a quality note.
const fs = require('fs');
const path = require('path');
const cases = require('./manifest.js');
const RUN = process.env.FP_RUN || process.argv[2] || 'runs';
const only = process.argv.slice(3);
const TODAY = process.env.FP_TODAY || new Date().toISOString().slice(0, 10);

// ---------- headings (slots with accepted variants) ----------
const H3 = {
  lmn: '## 3. Letter of medical necessity — for your doctor to sign',
  attestation: "## 3. Clinician's emergency attestation — for your doctor to sign",
  corrected: '## 3. Corrected-claim request — for the billing office',
  coverage: '## 3. Coverage facts letter — for your HR or benefits office'
};
const SLOTS = [
  ['## 1. Your denial, decoded — and how strong your case is'],
  ['## 2. Your appeal letter'],
  Object.values(H3),
  ["## 4. Note for your doctor's office", '## 4. Note for the billing office', '## 4. Note for your HR or benefits office'],
  ['## 5. Peer-to-peer talking points — for your doctor'],
  ['## 6. Phone script — calling the insurer'],
  ["## 7. Phone script — calling the hospital or doctor's billing office"],
  ['## 8. Records and itemized-bill request letter'],
  ['## 9. If they say no again — external review request', '## 9. If they say no again — your next level of review'],
  ['## 10. Your deadlines and next moves']
];
const ENUMS = {
  service_type: ['pre-service', 'post-service', 'unknown'],
  denial_type: ['medical-necessity', 'prior-authorization', 'out-of-network', 'not-covered', 'coding', 'eligibility', 'unknown'],
  case_strength: ['strong', 'good', 'needs-evidence'],
  plan_type: ['commercial', 'medicare', 'medicaid', 'original-medicare', 'other', 'unknown']
};
const VERIFIED_PHONES = ['8009853059', '8664443272', '8006334227']; // No Surprises Help Desk, EBSA, 1-800-MEDICARE
const LIMITS = { 1: 560, 2: 500, 3: 520, 5: 420, 6: 450, 7: 400, 8: 290, 9: 400, 10: 260 };

// ---------- helpers ----------
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
function iso(y, m, d) { const t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : null; }
function addDays(s, n) { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function addMonths(s, n) { const d = new Date(s + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + n); return d.toISOString().slice(0, 10); }
function dates(text, defaultYear) {
  const out = []; let m;
  const re1 = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
  while ((m = re1.exec(text))) out.push({ raw: m[0], iso: iso(+m[3], +m[1], +m[2]) });
  const re2 = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((m = re2.exec(text))) out.push({ raw: m[0], iso: iso(+m[1], +m[2], +m[3]) });
  // a month name, not any word that starts like one ("separately" + a list number on the next line is not Sep 1)
  const re3 = /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?[ \t]+(\d{1,2})(?:st|nd|rd|th)?(?:,?[ \t]+(\d{4}))?\b/gi;
  // a date written without its year ("by the March 29 deadline") may fall in the next year
  while ((m = re3.exec(text))) out.push({ raw: m[0], iso: iso(m[3] ? +m[3] : defaultYear, MONTHS[m[1].toLowerCase().slice(0, 3)], +m[2]), alt: m[3] ? null : iso(defaultYear + 1, MONTHS[m[1].toLowerCase().slice(0, 3)], +m[2]) });
  return out.filter((d) => d.iso);
}
// a bracket is a prompt for the user, not an assertion; the server's "[Only if …]" sentence brackets run longer
const strip = (t) => t.replace(/\[Only if [^\[\]]{0,900}\]/g, ' [] ').replace(/\[[^\[\]]{0,300}\]/g, ' [] ');
const words = (s) => (s.match(/\S+/g) || []).length;
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ');
const digits = (s) => s.replace(/\D/g, '');
function lev(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
function subsetSums(vals, maxK) {
  const sums = new Set(); const v = [...new Set(vals)].slice(0, 16);
  (function rec(start, k, acc) { if (k >= 2) sums.add(Math.round(acc * 100)); if (k === maxK) return; for (let i = start; i < v.length; i++) rec(i + 1, k + 1, acc + v[i]); })(0, 0, 0);
  return sums;
}
function locate(kit) {
  // index of the first heading variant found for each slot (−1 if none), and which variant
  return SLOTS.map((alts) => { for (const h of alts) { const i = kit.indexOf(h); if (i >= 0) return { i, h }; } return { i: -1, h: null }; });
}
function sections(kit, loc) {
  const out = {};
  loc.forEach((L, n) => { if (L.i < 0) return; const next = loc.slice(n + 1).map((x) => x.i).filter((x) => x > L.i).sort((a, b) => a - b)[0]; out[n + 1] = kit.slice(L.i + L.h.length, next === undefined ? kit.length : next).trim(); });
  return out;
}

function check(c) {
  const dir = path.join(__dirname, RUN, c.id);
  const R = { id: c.id, title: c.title, pass: [], fail: [], warn: [], stats: {} };
  const ok = (name, cond, detail) => (cond ? R.pass : R.fail).push(name + (detail ? ' — ' + detail : ''));
  const warn = (name, detail) => R.warn.push(name + (detail ? ' — ' + detail : ''));

  // ---------- transport ----------
  const parts = {};
  for (const p of [1, 2, 3, 4, 5, 6]) {
    const f = path.join(dir, `part${p}.json`);
    if (!fs.existsSync(f)) { R.fail.push(`part ${p} missing`); continue; }
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    parts[p] = j;
    ok(`part ${p} HTTP ok`, j.ok, String(j.status));
    ok(`part ${p} stopped naturally`, j.data && (j.data.stop === 'end_turn' || j.data.stop === 'stop_sequence'), j.data && j.data.stop);
    if (j.data && j.data.trimmed && j.data.trimmed.length) warn(`part ${p}: server trimmed drift`, j.data.trimmed.join(' | '));
    ok(`part ${p} no missing sections`, j.data && Array.isArray(j.data.missing) && !j.data.missing.length, JSON.stringify(j.data && j.data.missing));
    R.stats[`part${p}_ms`] = (j.attempts || []).reduce((a, b) => a + (b.ms || 0), 0);
  }
  try { R.stats.wall = JSON.parse(fs.readFileSync(path.join(dir, 'log.json'), 'utf8')).wall; } catch (e) {}
  const text = (p) => (parts[p] && parts[p].data && parts[p].data.text) || '';
  const kit = [1, 2, 3, 4, 5, 6].map(text).join('\n\n');
  R.stats.kit_words = words(kit);

  // ---------- structure ----------
  const loc = locate(kit);
  ok('all 10 sections present', loc.every((L) => L.i >= 0), loc.map((L, n) => (L.i < 0 ? `§${n + 1}` : '')).filter(Boolean).join(' '));
  ok('sections in order', loc.every((L, n) => n === 0 || L.i > loc[n - 1].i));
  ok('each section appears once', SLOTS.every((alts) => alts.reduce((s, h) => s + kit.split(h).length - 1, 0) === 1));
  const S = sections(kit, loc);
  const letter3 = Object.keys(H3).find((k) => loc[2].h === H3[k]);
  const want3 = [].concat(c.letter3);
  const L3 = want3.includes(letter3) ? letter3 : want3[0];
  ok(`§3 letter type matches the denial (${want3.join(' or ')})`, want3.includes(letter3), letter3);
  const s1 = S[1] || '';
  ok('§1 opens with the "Read from your letter" block', /read from your letter/i.test(s1));
  ok('§1 says who fixes this', /who fixes this/i.test(s1));
  ok('§1 says what the patient may actually owe', /what you may actually owe/i.test(s1));

  // ---------- json ----------
  const jm = text(6).match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
  let meta = null; try { meta = jm && JSON.parse(jm[1]); } catch (e) {}
  ok('json block parses', !!meta);
  const E = c.expect || {};
  if (meta) {
    const keys = ['denial_date', 'stated_appeal_deadline', 'appeal_window_days', 'service_type', 'urgent', 'claim_number', 'service', 'denial_reason', 'denial_type', 'case_strength', 'plan_type'];
    ok('json has every key', keys.every((k) => k in meta), keys.filter((k) => !(k in meta)).join(','));
    for (const k of Object.keys(ENUMS)) ok(`json ${k} valid`, ENUMS[k].includes(meta[k]), String(meta[k]));
    ok('json urgent is boolean', typeof meta.urgent === 'boolean');
    for (const k of Object.keys(E)) ok(`json ${k} = ${JSON.stringify(E[k])}`, Array.isArray(E[k]) ? E[k].includes(meta[k]) : meta[k] === E[k], JSON.stringify(meta[k]));
    const cs = s1.match(/case strength:?\*{0,2}\s*\*{0,2}\s*"?(strong|good|needs)/i);
    ok('§1 states case strength', !!cs);
    if (cs) ok('case strength in json matches §1', { strong: 'strong', good: 'good', needs: 'needs-evidence' }[cs[1].toLowerCase()] === meta.case_strength, `${cs[1]} vs ${meta.case_strength}`);
    R.stats.meta = meta;
  }

  // ---------- the source the model was shown ----------
  const known = [c.denial || '', c.extra || '', c.sourceText || '', c.recordsText || ''].join('\n');
  const knownN = norm(known);
  const knownDigits = digits(known);
  const body = strip(kit);

  // ---------- identifiers: extraction and consistency ----------
  for (const id of c.ids || []) {
    const near = [...new Set((kit.match(/\b[A-Z0-9][A-Z0-9-]{5,}\b/g) || []).filter((t) => t !== id && digits(t).length >= 6 && Math.abs(t.length - id.length) <= 2 && lev(t, id) <= 2 && lev(t, id) > 0))];
    ok(`identifier ${id} never appears altered`, near.length === 0, near.join(', '));
  }
  const field = (label) => { const m = s1.match(new RegExp(label + '[^:\\n]*:\\**\\s*([^\\n]+)', 'i')); return m ? m[1].replace(/\*/g, '').trim() : ''; };
  if (E.claim_number) ok('decode read the claim/reference # exactly', field('claim / reference #').includes(E.claim_number), field('claim / reference #'));
  if (E.denial_date) { const d = dates(field('notice date'), 2026)[0]; ok('decode read the notice date exactly', d && d.iso === E.denial_date, field('notice date')); }

  // ---------- the deadline: computed in code, checked against hand-derived truth ----------
  // a calendar date printed on the letter controls; otherwise the notice date plus the printed window
  const truth = E.stated_appeal_deadline || (E.denial_date && E.appeal_window_days ? addDays(E.denial_date, [].concat(E.appeal_window_days).find((x) => x) || 0) : null);
  const served = [...new Set([2, 3, 4, 5, 6].map((p) => parts[p] && parts[p].data && parts[p].data.deadline).filter((x) => x !== undefined))];
  R.stats.deadline = { truth, served };
  if (truth) ok('server-computed deadline equals the hand-derived deadline', served.length === 1 && served[0] === truth, `served ${JSON.stringify(served)} vs ${truth}`);
  else ok('no deadline invented when the letter gives no date', served.every((x) => x === null), JSON.stringify(served));

  // ---------- no invented facts (everything outside [placeholders]) ----------
  const srcMoney = (known.match(/\$\s?\d[\d,]*(?:\.\d{2})?/g) || []).map((m) => parseFloat(m.replace(/[^\d.]/g, '')));
  const srcSet = new Set(srcMoney.map((x) => Math.round(x * 100)));
  const sums = subsetSums(srcMoney, 4);
  const outMoney = (body.match(/\$\s?\d[\d,]*(?:\.\d{2})?/g) || []).map((m) => ({ raw: m, c: Math.round(parseFloat(m.replace(/[^\d.]/g, '')) * 100) }));
  const badMoney = outMoney.filter((m) => !srcSet.has(m.c) && !sums.has(m.c));
  const summed = outMoney.filter((m) => !srcSet.has(m.c) && sums.has(m.c));
  ok('every dollar amount is from the source or an exact sum of source amounts', !badMoney.length, [...new Set(badMoney.map((m) => m.raw))].join(', '));
  if (summed.length) R.stats.verified_sums = [...new Set(summed.map((m) => m.raw))];

  const srcDates = new Set(dates(known, 2026).map((d) => d.iso).concat([TODAY]));
  const derivable = new Set(srcDates);
  for (const d of srcDates) { for (const n of [1, 2, 3, 7, 14, 15, 30, 45, 60, 65, 90, 120, 180]) { derivable.add(addDays(d, n)); derivable.add(addDays(d, -n)); } derivable.add(addMonths(d, 4)); }
  const known_ = (x) => srcDates.has(x) || x === truth || derivable.has(x);
  const outDates = dates(body, 2026).map((d) => (d.alt && !known_(d.iso) && known_(d.alt) ? { ...d, iso: d.alt } : d));
  const badDates = outDates.filter((d) => !srcDates.has(d.iso) && d.iso !== truth && !derivable.has(d.iso));
  ok('every date is from the source or is the computed deadline', !badDates.length, [...new Set(badDates.map((d) => d.raw))].join(', '));
  const otherDerived = outDates.filter((d) => !srcDates.has(d.iso) && d.iso !== truth && derivable.has(d.iso));
  if (otherDerived.length) warn('model-computed dates (arithmetic correct, but should not be computed)', [...new Set(otherDerived.map((d) => d.raw))].join(', '));

  const bodyNoNoise = body.replace(/\b1?[-. ]?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g, ' ').replace(/\b\d{4}-\d{2}-\d{2}\b/g, ' ').replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, ' ');
  const badIds = [...new Set((bodyNoNoise.match(/\b[A-Z]{0,5}-?\d[\d-]{5,}\b/g) || []).filter((t) => !knownDigits.includes(digits(t))))];
  ok('every claim/member/reference number is from the source', !badIds.length, badIds.join(', '));
  const badPhones = [...new Set((body.match(/\b1?[-. ]?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g) || []).filter((p) => { const d = digits(p).replace(/^1(?=\d{10}$)/, ''); return !knownDigits.includes(d) && !VERIFIED_PHONES.includes(d); }))];
  ok('every phone number is from the source or the verified list', !badPhones.length, badPhones.join(', '));
  // (re-audit, run 21) a coverage-policy number is from the documents, brackets included: a doctor asked to
  // "cite NCD 20.4" would cite the implantable-defibrillator policy
  const badPolicy = [...new Set((kit.match(/\b(?:National Coverage Determination(?:\s*\(NCD\))?|Local Coverage Determination(?:\s*\(LCD\))?|NCD|LCD)\s+(?:No\.?\s*|number\s+|section\s+)?L?\d{1,5}(?:\.\d{1,3})*\b/g) || []).filter((t) => !new RegExp(`(?<![\\d.,])${t.match(/L?\d{1,5}(?:\.\d{1,3})*$/)[0].replace(/\./g, '\\.')}(?![\\d]|\\.\\d)`).test(known)))];
  ok('every coverage-policy number (NCD, LCD) is from the source', !badPolicy.length, badPolicy.join(', '));
  // a ZIP code ("CA 94244-2430") is an address, counted once by the identifier check above, not a CPT code
  const bodyNoZip = body.replace(/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b|\b\d{5}-\d{4}\b/g, ' ');
  const badCpt = [...new Set((bodyNoZip.match(/\b(?:\d{5}|[A-Z]\d{4})\b/g) || []).filter((t) => !knownN.includes(t.toLowerCase()) && !/^(19|20)\d{3}$/.test(t)))];
  ok('every CPT/HCPCS code is from the source', !badCpt.length, badCpt.join(', '));
  const badIcd = [...new Set((body.match(/\b[A-Z]\d{2}\.\d{1,4}\b/g) || []).filter((t) => !knownN.includes(t.toLowerCase())))];
  ok('every ICD-10 code is from the source', !badIcd.length, badIcd.join(', '));
  const cites = body.match(/\b(et al\.|doi:|PMID|\d{4};\d+\()/g) || [];
  ok('no fabricated literature citations', !cites.length, cites.join(', '));
  ok('no empty [] placeholders', !/\[\s*\](?!\s+[A-Z0-9])/.test(kit)); // "[ ] Yes [ ] No" in a call log is a checkbox
  R.stats.placeholders = (kit.match(/\[[^\[\]]{1,300}\]/g) || []).length;

  // ---------- regulatory correctness ----------
  const s10 = S[10] || '';
  ok('§10 says the deadline printed on the letter controls', /printed|on your (denial )?letter|letter (always )?(controls|wins|governs)/i.test(s10));
  // The plan-specific checks test the kit's text against the TRUE plan type, so a wrong tracker
  // plan_type is one defect (the json check above), not a cascade of checks for the wrong plan.
  const truthPlans = Array.isArray(E.plan_type) ? E.plan_type : E.plan_type ? [E.plan_type] : null;
  const plan0 = truthPlans ? (truthPlans.includes(meta && meta.plan_type) ? meta.plan_type : truthPlans[0]) : meta && meta.plan_type;
  const plan = plan0 === 'original-medicare' ? 'other' : plan0; // the plan-specific checks treat Original Medicare as 'other'
  if (plan === 'medicare') {
    ok('§10 uses the printed 65-day window', /65/.test(s10));
    ok('§10 notes automatic Independent Review Entity review', /independent review|\bIRE\b|automatically/i.test(s10));
    ok('§9 adapts to Medicare (IRE, not state external review)', /independent review entity|\bIRE\b|automatically/i.test(S[9] || ''));
  } else if (plan === 'medicaid') {
    ok('§10 gives the filing window', /\b\d+[- ](calendar )?days?\b|deadline/i.test(s10));
    ok('§10 names the State (Fair) Hearing', /(state|fair) hearing/i.test(s10));
    ok('§9 adapts to Medicaid (State Hearing, next-level heading)', loc[8].h === SLOTS[8][1] && /(state|fair) hearing/i.test(S[9] || ''), loc[8].h);
  } else if (plan === 'other') {
    // Original Medicare, TRICARE, VA, federal employees: each program has its own levels — the case's own checks carry them
    ok('§10 gives the filing window', /\b\d+[- ](calendar )?days?\b|deadline/i.test(s10));
  } else {
    ok('§10 gives the filing window', /180|deadline/i.test(s10));
    ok('§10 mentions external review', /external (independent )?review|independent review/i.test(s10));
  }
  // The decision clock (29 CFR 2560.503-1(i); 42 CFR 422.590): the FIRST "decide … N days" the
  // reader meets must be the right one — 60 for care already received, 30 for care not yet received.
  const dm = strip(s10).match(/(?:decide|decision|rule on|respond)[^.\n]{0,100}?\b(\d+)\s*(?:calendar\s+)?days\b/i);
  const decDays = dm ? Number(dm[1]) : null;
  if (meta && meta.service_type === 'post-service') ok('§10 decision clock for care already received is 60 days', decDays === 60, String(decDays));
  // (urgent: the internal clock is 72 hours, so the first "N days" may be the external-review clock —
  // only the post-service 60 is wrong there)
  if (meta && meta.service_type === 'pre-service') ok('§10 decision clock for care not yet received is 30 days (72 hours if urgent)', meta.urgent === true ? /72 hours/i.test(s10) && decDays !== 60 : decDays === 30, String(decDays));
  if (meta && meta.urgent) ok('urgent case asks for expedited review (72 hours)', /expedited/i.test(S[2] || '') && /72 hours/i.test(s10));
  // (run-16 audit, Critical) urgent care on an employer or marketplace plan: the expedited external review can go now
  if (E.urgent === true && plan === 'commercial') ok('urgent: expedited external review can be requested at the same time', /external review[^.\n]{0,160}(same time|simultaneous|at once|alongside|in parallel|concurrent)|(same time|simultaneous|at once|alongside|in parallel|concurrent)[^.\n]{0,160}external review/i.test(strip([1, 2, 6, 9, 10].map((n) => S[n] || '').join('\n'))));
  // The same clock is computed in code and served with every part.
  const clocks = [...new Set([2, 3, 4, 5, 6].map((p) => parts[p] && parts[p].data && parts[p].data.clock).filter((x) => x !== undefined))];
  R.stats.clock = clocks;
  if (meta && meta.service_type === 'post-service' && plan !== 'medicaid' && plan !== 'other') ok('server decision clock: 60 days for care already received', clocks.length === 1 && /\b60 days\b/.test(clocks[0] || '') && /never expedited/.test(clocks[0] || ''), JSON.stringify(clocks));
  if (meta && meta.service_type === 'pre-service' && plan !== 'medicaid' && plan !== 'other') ok('server decision clock: 30 days / 72 hours for care not yet received', clocks.length === 1 && /\b30 days\b/.test(clocks[0] || '') && /72 hours/.test(clocks[0] || ''), JSON.stringify(clocks));
  ok('no regulation or statute cited by number', !/\bC\.?F\.?R\b|\bU\.S\.C\b/.test(kit), (kit.match(/[^\n]{0,30}\b(?:C\.?F\.?R|U\.S\.C)\b[^\n]{0,20}/) || [''])[0]);
  if (!/prefer/i.test(known)) ok('no "plan-preferred equivalent" when the notice names no preferred product', !/plan-preferred/i.test(kit));
  // (audit, run 4) funding is unknown unless printed; no invented stability; nothing pending written as done
  const planLine = (s1.match(/^\s*[-*•]?\s*\**\s*plan(?:\s+type)?\s*\**\s*:([^\n]*)/im) || [])[1] || '';
  // a negated mention ("no language indicating Medicare, Medicaid, or self-funded status") asserts nothing
  const PT = 'original medicare|medicare advantage|medicare|medicaid|medi-cal|self-funded|self funded|fully insured|insured|erisa';
  const planAsserts = planLine.replace(new RegExp(`\\b(?:no|not|never|without|nor)\\b[^.;()\\n]{0,60}?\\b(?:${PT})\\b(?:\\s*(?:,\\s*(?:or|and)?|or|and|\\/)\\s*(?:${PT})\\b)*`, 'gi'), ' ');
  if (!/self-funded|self funded|fully insured|insured by|underwritten by|administered by|third-party administrator|\bTPA\b/i.test(known)) ok('§1 does not call the plan insured or self-funded unless the documents say so', !/fully insured|\binsured\b|self-funded|self funded/i.test(planAsserts) || /unknown|not (stated|shown|clear|printed)|(?:not|n't) (?:state|say|show)|ask (your )?HR|check|\bif\b|insured or self-funded|self-funded or (?:fully )?insured/i.test(planLine), planLine.trim().slice(0, 90));
  // a reviewer's question quoted for the doctor to answer ("Is the patient stable enough …?") asserts nothing
  const unquoted = strip(kit).replace(/["“][^"“”\n]{0,200}\?["”]/g, ' ');
  if (!/stable/i.test(known)) ok('never asserts a stability nobody reported', !/(?<!\b(?:once|until|when|after|if) (?:you|he|she|they|the patient) )\b(is|are|remains?|seems?) (clinically |medically )?stable\b|stable (enough|chronic)/i.test(unquoted), (unquoted.match(/[^\n]{0,40}\bstable\b[^\n]{0,30}/i) || [''])[0]);
  ok('never tells the doctor the case is not urgent', !/(is not|isn't|not) an urgent case|this (case )?is not urgent/i.test(S[4] || ''));
  const done = strip(kit).match(/\bI have (also )?(reported|filed a complaint|contacted|called|spoken)\b|office is (now |currently )?submitting|all required documentation is (now )?included/i);
  ok('no pending step written as already done', !done, done && done[0]);
  const s2 = strip(S[2] || '');
  // a number the notice itself prints may be repeated, with or without "calendar"
  const stated = (s2.match(/within (\d+)[- ](?:calendar )?days/gi) || []).filter((x) => !new RegExp('within ' + x.match(/\d+/)[0] + '[- ](?:calendar )?days', 'i').test(known));
  ok('appeal letter states no decision timeframe the denial letter did not print', !stated.length, stated.join(', '));

  // ---------- one decision, rendered everywhere ----------
  const um = s1.match(/^[ \t]*(?:[-*•][ \t]+)?\**[ \t]*urgent[ \t]*\??[ \t]*(?:\*\*)?[ \t]*:?[ \t]*(?:\*\*)?[ \t]*(.+)$/im);
  // the server reads "Standard review…" as a no (api/fightpack.js urgencyOf), so the checker does too
  const decU = um ? (/^\W*yes\b/i.test(um[1].replace(/[*"“”]/g, '')) ? true : /^\W*(?:no|standard)\b/i.test(um[1].replace(/[*"“”]/g, '')) ? false : null) : null;
  ok('§1 decides urgency (Urgent: Yes/No)', decU !== null, um ? um[1].slice(0, 60) : 'no Urgent line');
  if (meta && decU !== null) ok('json urgent matches the decode', meta.urgent === decU, `${meta.urgent} vs ${decU}`);
  if (E.urgent !== undefined && decU !== null) ok(`urgency decision is right for this case (${E.urgent})`, decU === E.urgent, String(decU));
  const askExp = /request(?:ing|s)? (?:an |a )?(?:expedited|fast|urgent)|expedited (?:review|appeal|decision|external review) (?:is )?requested|mark[^.\n]{0,30}expedited/i;
  if (decU === false) ok('not urgent → no expedited request in §2 or §9', !askExp.test(strip(S[2] || '')) && !askExp.test(strip(S[9] || '')));
  ok('§1 states the plan type', /^\s*[-*•]?\s*\**\s*plan(?:\s+type)?\s*\**\s*:/im.test(s1));
  if (plan === 'medicare') {
    ok('§9 uses the Medicare/Medicaid heading', loc[8].h === SLOTS[8][1], loc[8].h);
    ok('§9 writes no patient-filed external review request (MA)', !/I (?:hereby )?request (?:an |a )?(?:independent )?external review/i.test(S[9] || ''));
  }
  if (plan === 'commercial') ok('employer plan: no Medicare IRE routing in §9/§10', !/Independent Review Entity|\bIRE\b/.test((S[9] || '') + (S[10] || '')));
  const XREF = [[/appeal letter/i, 2], [/doctor's letter|clinician's letter|letter of medical necessity|emergency attestation|corrected-claim request|coverage facts letter/i, 3], [/note for (your|the)/i, 4], [/peer-to-peer|talking points/i, 5], [/insurer (phone )?script|calling the insurer/i, 6], [/billing[- ]office (phone )?script/i, 7], [/records (and itemized-bill )?request/i, 8], [/external review request|next level of review/i, 9], [/deadlines/i, 10]];
  const badRefs = [];
  const refRe = /([A-Za-z'’ -]{3,60}?)\s*\((?:see\s+)?section\s+(\d{1,2})\b[^)]*\)|section\s+(\d{1,2})\s*\((?:the\s+|your\s+)?([^)]{3,60})\)/gi;
  let rm;
  while ((rm = refRe.exec(kit))) {
    const label = (rm[1] || rm[4] || '').replace(/[’]/g, "'"); const num = Number(rm[2] || rm[3]);
    const hit = XREF.find(([re]) => re.test(label));
    // a letter the doctor writes and signs is section 3, whatever the kit calls it ("the expedited appeal letter")
    const signed = num === 3 && /\b(?:sign|signs|signed)\b/i.test(label) && /letter/i.test(label);
    if (hit && hit[1] !== num && !signed) badRefs.push(`${label.trim()} → section ${num}`);
  }
  ok('cross-references point at the right section', !badRefs.length, badRefs.join('; '));

  // ---------- section craft ----------
  const s3 = S[3] || '';
  if (L3 === 'lmn') {
    ok('§3 has the "### Criteria met" mapping', /###\s*criteria met/i.test(s3));
    ok('§3 is in the clinician\'s voice', /I am the (treating|attending)/i.test(s3));
    ok('§3 signature block has NPI', /NPI/.test(s3));
    ok('§3 carries the [cite: …] placeholder', /\[cite:/i.test(s3));
    ok('§3 does not hedge about necessity', !/\b(may|might) be (medically )?necessary/i.test(s3));
  }
  if (L3 === 'attestation') ok('§3 makes the prudent-layperson argument', /prudent|reasonable (lay)?person/i.test(s3));
  if (L3 === 'corrected') {
    // the same letter type carries two jobs: a coding fix, or a surprise bill from an out-of-network clinician at an in-network facility
    const nsa = /balance[- ]bill|surprise[- ]bill|No Surprises/i.test(s3);
    if (nsa) ok('§3 (surprise bill) states the protection and asks to withdraw the balance and hold the account', /in-network cost-?sharing/i.test(s3) && /hold/i.test(s3));
    else ok('§3 asks for a corrected claim and write-off vs patient-owed amounts', /corrected claim/i.test(s3) && /write-?off|contractual/i.test(s3));
  }
  const b4 = ((S[4] || '').match(/^\s*[-•]\s+/gm) || []).length;
  ok('§4 has 6–8 bullets', b4 >= 6 && b4 <= 8, String(b4));
  ok('§2 requests the criteria and the reviewer\'s credentials', /credential|reviewer/i.test(s2) && /criteria|guideline|policy/i.test(s2));
  ok('§2 preserves the next level of review', (plan === 'medicaid' ? /(state|fair) hearing|next level/i : plan === 'other' ? /next level|reconsideration|further appeal/i : /external (independent )?review|independent review/i).test(S[2] || ''));
  const p2p = /criteri/i.test(S[5] || '') && /push back|objection/i.test(S[5] || '');
  // Original Medicare has no peer-to-peer at redetermination: there §5 says so and maps the coverage standard instead
  const noP2P = plan === 'other' && /no peer-to-peer|not (?:usually )?(?:a )?peer-to-peer|do(?:es)? not (?:offer|include|have|use|allow|provide) (?:a )?peer-to-peer|without (?:a )?peer-to-peer|instead of a peer-to-peer/i.test(S[5] || '') && /criteri|standard|must show|requirement/i.test(S[5] || '');
  if (L3 === 'lmn') ok('§5 maps criteria and prepares for push-back', p2p || noP2P);
  if (L3 === 'attestation') ok('§5 maps the standard and push-back, or says a processing denial usually has no peer-to-peer', (/criteri|standard/i.test(S[5] || '') && /push back|objection/i.test(S[5] || '')) || /processing|no peer-to-peer|not (usually )?(a )?peer-to-peer/i.test(S[5] || ''));
  ok('§6 and §7 end with a call log', /call log|write down/i.test(S[6] || '') && /call log|write down/i.test(S[7] || ''));
  if (meta && meta.service_type === 'post-service') ok('§7 asks for an itemized statement and an account hold', /itemized/i.test(S[7] || '') && /hold/i.test(S[7] || ''));
  else ok('§7 (nothing billed yet) works the ordering office instead', /appeal|peer-to-peer|records|prior[- ]auth/i.test(S[7] || ''));
  if (meta && meta.service_type === 'pre-service') ok('§8 (nothing billed yet) requests the deciding records, not an itemized bill', /record|note|report|result/i.test(S[8] || '') && !/(request|send|provide|copy of)[^.\n]{0,30}itemized/i.test(strip(S[8] || '')));
  else ok('§8 requests the records and a coded itemized bill', /itemized/i.test(S[8] || '') && /record/i.test(S[8] || ''));
  ok('§9 is for after the final internal denial', (plan === 'other' ? /exhaust|final|appeal decision|redetermination|upholds?|decision letter/i : /exhaust|final|appeal decision/i).test(S[9] || '') || plan === 'medicare');
  ok('denial reason is quoted in §1/§2', new RegExp(c.reason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(s1 + (S[2] || '')), c.reason);

  // ---------- clinical depth (per case, from the manifest) ----------
  for (const m of c.mustHave || []) {
    const raw = (m.where || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).map((n) => S[n] || '').join('\n');
    const hay = m.raw ? raw : strip(raw);
    ok(`depth: ${m.why}`, new RegExp(m.re, 'i').test(hay), `/${m.re}/ in §${(m.where || []).join(',§')}`);
  }
  for (const m of c.mustNot || []) {
    // forbidden even inside [brackets] — unless stripped:true (a bracketed prompt such as
    // "[if documented: …]" is the clinician's to fill in, not an assertion)
    const where = m.where ? m.where.map((n) => S[n] || '').join('\n') : kit; // optional: only these sections
    const hit = (m.stripped ? strip(where) : where).match(new RegExp(m.re, 'i'));
    ok(`never: ${m.why}`, !hit, hit && hit[0]);
  }

  R.stats.words = {}; for (const k of Object.keys(S)) R.stats.words[k] = words(S[k]);
  for (const k of Object.keys(LIMITS)) if ((R.stats.words[k] || 0) > LIMITS[k]) warn(`§${k} long`, `${R.stats.words[k]} words (target ${LIMITS[k]})`);
  return R;
}

const results = cases.filter((c) => !only.length || only.includes(c.id)).map(check);
let md = `# Fight Pack automated checks — run "${RUN}" (today=${TODAY})\n\n`;
let P = 0, F = 0;
const split = { dev: [0, 0], heldout: [0, 0] };
for (const R of results) {
  P += R.pass.length; F += R.fail.length;
  const g = cases.find((c) => c.id === R.id).heldout ? 'heldout' : 'dev';
  split[g][0] += R.pass.length; split[g][1] += R.fail.length;
  const w = R.stats.wall || {};
  md += `## ${R.id} — ${R.title}\n**${R.pass.length} pass · ${R.fail.length} fail · ${R.warn.length} warn** · ${R.stats.kit_words} words · ${R.stats.placeholders} placeholders · wall ${Math.round((w.total_ms || 0) / 1000)}s · deadline ${JSON.stringify(R.stats.deadline)}${R.stats.verified_sums ? ' · verified sums ' + R.stats.verified_sums.join(', ') : ''}\n`;
  if (R.fail.length) md += '\nFAIL:\n' + R.fail.map((x) => `- ❌ ${x}`).join('\n') + '\n';
  if (R.warn.length) md += '\nWARN:\n' + R.warn.map((x) => `- ⚠️ ${x}`).join('\n') + '\n';
  md += '\n';
}
md += `**TOTAL: ${P} pass · ${F} fail across ${results.length} cases**${split.heldout[0] ? ` (development set ${split.dev[0]} pass · ${split.dev[1]} fail; held-out ${split.heldout[0]} pass · ${split.heldout[1]} fail)` : ''}\n`;
fs.writeFileSync(path.join(__dirname, RUN, 'report.md'), md);
fs.writeFileSync(path.join(__dirname, RUN, 'report.json'), JSON.stringify(results, null, 2));
console.log(md);
