// The Fight Pack's deterministic text guards. Each one exists because the writer kept making the same
// mistake across runs even after the prompt told it not to (docs/fightpack-qa.md has the evidence);
// rules that a regular expression can enforce are enforced here instead of being asked for again.
// Pure functions of text: no network, no state — unit-tested in qa/tests/test-fightpack-handler.js.

function fieldOf(text, label) {
  const m = text.match(new RegExp(label + '[^:\\n]*:\\**\\s*([^\\n]+)', 'i'));
  return m ? m[1].trim() : '';
}

// A test's limits are stated the way guidelines state them — it "may not reliably" do something,
// never "cannot". Done in code because the writer kept reaching for the absolute in every run.
const ABSOLUTE = /\b(cannot|can't|can not|is unable to|are unable to)\s+(?:reliably\s+)?(distinguish|differentiate|detect|tell apart|rule out)\b/gi;
function hedgeAbsolutes(text) {
  let count = 0;
  const out = String(text).replace(ABSOLUTE, (m, neg, verb) => {
    count++;
    return (/^[A-Z]/.test(neg) ? 'May' : 'may') + ' not reliably ' + verb;
  });
  return { text: out, count };
}
// Phone and fax numbers come only from the source or the verified list — a number recalled from
// memory can be wrong, so anything else becomes a placeholder. (A number read from an attached
// photo is checked against the decode's own list from part 2 on.)
const VERIFIED_PHONES = ['8009853059', '8664443272', '8006334227']; // No Surprises Help Desk, EBSA, 1-800-MEDICARE
const PHONE = /(?:\+?1[-.\s]?)?\(?\b(\d{3})\)?[-.\s]?(\d{3})[-.\s](\d{4})\b/g;
function guardPhones(text, known) {
  const kd = String(known || '').replace(/\D/g, '');
  let count = 0;
  const out = String(text).replace(PHONE, (m, a, b, c) => {
    const d = a + b + c;
    if (VERIFIED_PHONES.includes(d) || kd.includes(d)) return m;
    count++;
    return "[phone number — use the one printed on your letter or the agency's official website]";
  });
  return { text: out, count };
}

// An emergency visit is "now", never "today".
const ED_TODAY = /\b(emergency (?:department|room)|ER)\b([^.;,\n]{0,25}?)\btoday\b/gi;
function edNow(text) {
  let count = 0;
  const out = String(text).replace(ED_TODAY, (m, place, gap) => { count++; return place + gap + 'now'; });
  return { text: out, count };
}
// A letter states only what has already happened: a sentence saying the patient, the doctor or an
// office has already called, confirmed or sent something becomes a bracketed option to keep or delete.
const DONE_VERB = /\b(?:I|we|my doctor|Dr\.? [A-Z][\w'-]+|(?:the |your |my )?(?:doctor's |billing |provider's )?office|[A-Z][\w&'.-]+(?: [A-Z][\w&'.-]+){0,4}(?:'s)? (?:billing )?office)\s+(?:has|have)\s+(?:also\s+|already\s+)?(?:contacted|called|spoken (?:with|to)|confirmed|verified|agreed|submitted|corrected|asked|requested|filed|reported)\b|\b(?:I|we)(?:'ve|’ve|\s+had)?\s+(?:also\s+|already\s+)?(?:contacted|called|spoke (?:with|to)|spoken (?:with|to)|reported|filed|submitted|appealed|requested|faxed|mailed|emailed)\b/i;
const ABBR = /(?:\b(?:Dr|Mr|Mrs|Ms|St|Jr|Sr|vs|No|Inc|Co|Ltd|Dept|approx)|\b[A-Z]|\be\.g|\bi\.e|U\.S)\.$/;
// A bracket that opens a sentence ("[I have … — delete if not done] The note …") ends it too.
// A full stop inside a bracket never ends a sentence (when the line's brackets balance): run 14's
// "[Only if …: … for this injection. — otherwise delete this sentence.] The billing office has
// verified …" was split inside the bracket, so the sentence after it was never checked.
function sentencesOf(line) {
  const out = [];
  let start = 0;
  let depth = 0;
  const balanced = (line.match(/\[/g) || []).length === (line.match(/\]/g) || []).length;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '[') depth++;
    if (ch === ']' && depth > 0 && --depth === 0 && /^\s*\[/.test(line.slice(start, i)) && i + 1 < line.length && /\s/.test(line[i + 1])) {
      out.push(line.slice(start, i + 1));
      start = i + 1;
      continue;
    }
    if (balanced && depth > 0) continue;
    if ((ch === '.' || ch === '!' || ch === '?') && (i + 1 === line.length || /\s/.test(line[i + 1]))) {
      const chunk = line.slice(start, i + 1);
      if (ch === '.' && ABBR.test(chunk)) continue;
      out.push(chunk);
      start = i + 1;
    }
  }
  if (start < line.length) out.push(line.slice(start));
  return out;
}
// Wraps one sentence as a bracketed option, keeping a list marker or bold label outside the bracket.
const LEAD = /^\s*(?:[-*]\s+|\d{1,2}[.)]\s+)?(?:\*\*[^*\n]{1,60}\*\*:?\s*)?/;
function onlyIf(s, condition) {
  const lead = s.match(LEAD)[0];
  return lead + '[Only if ' + condition + ': ' + s.slice(lead.length).trim() + ' — otherwise delete this sentence.]';
}
function bracketUnverified(text) {
  let count = 0;
  const out = String(text).split('\n').map((line) => sentencesOf(line).map((s) => {
    if (/[\[\]]/.test(s) || !DONE_VERB.test(s)) return s;
    count++;
    return onlyIf(s, 'this has happened');
  }).join('')).join('\n');
  return { text: out, count };
}
// The No Surprises Act protects the patient's cost-sharing; what the plan pays the clinician is settled
// separately. "At in-network rates" describes the second, so it is rewritten as the first.
const INN_RATE = /\b(?:(paid|pay|pays|paying|reimbursed)\s+)?at\s+(?:the\s+)?in-network\s+rates?(?:\s+and\s+(?:in-network\s+)?cost[- ]sharing)?/gi;
const PAY_VERB = { paid: 'processed', pay: 'process it', pays: 'processes it', paying: 'processing it', reimbursed: 'processed' };
function costSharingNotRate(text) {
  let count = 0;
  const out = String(text).replace(INN_RATE, (m, verb) => {
    count++;
    return (verb ? PAY_VERB[verb.toLowerCase()] + ' ' : '') + 'with in-network cost-sharing';
  });
  return { text: out, count };
}
// A date given by phone never extends the printed deadline: when two dates differ, the earlier governs.
const LATER = /\b(use|go by|rely on|follow|trust|count from)\s+the\s+later(\s+(?:date|deadline|one|of the two(?:\s+dates)?))?\b/gi;
function earlierDate(text) {
  let count = 0;
  const out = String(text).replace(LATER, (m, verb, what) => { count++; return verb + ' the earlier' + (what || ''); });
  return { text: out, count };
}
// Whether two codes can be billed together is the billing office's call: a sentence asserting that a
// service is separately reportable (billable, payable) becomes a bracket to confirm or delete.
// A question or condition ("ask whether…", "if it is…") already routes it and is left alone.
const CODE_PAIR = /\b(?:is|are|be|was|were)\s+(?:(?:also|often|usually|generally|typically|normally|sometimes|still)\s+)*(?:an?\s+)?separately\s+(?:reportable|billable|payable|reimbursable|reported|billed|paid|coded)\b|\b(?:can|may|should|must)\s+(?:also\s+)?be\s+(?:billed|reported|coded|paid)\s+(?:separately|together)\b/i;
const CODE_ASK = /\b(?:if|whether|when|ask|asking|confirm|verify)\b/i;
function bracketCoding(text) {
  let count = 0;
  const out = String(text).split('\n').map((line) => sentencesOf(line).map((s) => {
    const at = s.search(CODE_PAIR);
    if (at < 0 || /[\[\]]/.test(s) || /\?["”'’)*]*\s*$/.test(s)) return s;
    const before = s.slice(0, at);
    if (CODE_ASK.test(before) || (before.match(/["“”]/g) || []).length % 2 === 1) return s;
    count++;
    return onlyIf(s, 'the billing office confirms it');
  }).join('')).join('\n');
  return { text: out, count };
}
// The bracket guards rewrite prose only — never the fenced tracker json the page reads.
function outsideFences(text, fn) {
  let count = 0;
  const out = String(text).split(/(```[\s\S]*?```)/).map((seg, i) => {
    if (i % 2) return seg;
    const r = fn(seg);
    count += r.count;
    return r.text;
  }).join('');
  return { text: out, count };
}
// The decode's safety instruction travels with every part, so no script or plan puts a call before an
// emergency visit. Only an unconditional instruction counts — "go to the emergency department if it
// gets worse" is a warning to keep, not an instruction to go now.
const SAFE_ED = /emergency (?:department|room)|\bER\b|\b911\b/i;
const SAFE_NOW = /\b(?:today|tonight|now|right away|immediately)\b/i;
const SAFE_CONTACT = /\b(?:contact|call|see|seen|reach|talk|speak|message|phone|visit|book|schedule)(?:s|ed|ing)?\b/i;
const SAFE_IF = /\b(?<!\beven )(?:if|when)\b|\b(?:whenever|unless|in case)\b|^\s*should\b/i;
const SAFE_NOT_IF = /\bif you (?:have not|haven't|did not|didn't) already\b|\bif (?:you )?(?:can(?:not|'t)?|are (?:not |un)?able to)\s+(?:safely\s+)?(?:get there|get to (?:the |an )?(?:emergency|ER|hospital)|drive(?: yourself)?(?: there)?(?: safely)?|make it there)\b[^,;.]*/gi;
// A condition that leads ("If X, go…") governs the rest of its sentence; one that trails ("go … if X")
// governs only the instruction it is attached to. Alternatives joined by "or" share their condition.
const SAFE_SPLIT = /;\s+|\s+[—–]\s+|\s+-\s+|,\s+(?=(?:or|and|but|then)\b)|\s+(?:and|then)\s+(?=(?:go|call|seek|get|head|contact|see)\b)/;
function safetyOf(decode) {
  const v = decode ? fieldOf(decode, 'safety first').replace(/\*/g, '').trim() : '';
  if (!v || /^\[[^\]]*\]\.?$/.test(v) || /^(?:none|no (?:red flags?|safety)|n\/a)\b/i.test(v)) return null;
  if (v.startsWith(EMERGENCY_OPEN)) return 'emergency';
  if (v.startsWith(TODAY_OPEN)) return 'today';
  let emergency = false;
  let today = false;
  for (const sentence of sentencesOf(v.replace(/\([^)]*\)/g, ''))) {
    let inherited = false;
    for (const part of sentence.split(SAFE_SPLIT)) {
      const seg = part.replace(SAFE_NOT_IF, '');
      const ifAt = seg.search(SAFE_IF);
      const acts = [seg.search(SAFE_ED), seg.search(SAFE_CONTACT)].filter((i) => i >= 0);
      if (ifAt >= 0 && (!acts.length || ifAt < Math.min(...acts))) inherited = true;
      if (inherited || ifAt >= 0) continue;
      if (SAFE_ED.test(seg)) emergency = true;
      else if (SAFE_NOW.test(seg) && SAFE_CONTACT.test(seg)) today = true;
    }
  }
  return emergency ? 'emergency' : today ? 'today' : null;
}

// ---------- the safety line is written by code from the decode's label ----------
// The decode labels a present red flag EMERGENCY or TODAY and lists the symptoms; the instruction
// itself is fixed text, because across runs the writer kept routing emergency signs through a call
// to the doctor's office first ("call the office now, or go to the emergency department if you
// cannot reach them"), which delays emergency care.
const EMERGENCY_OPEN = 'Go to an emergency department now, or call 911.';
const TODAY_OPEN = 'Contact the doctor today';
const ED_SIGNS = 'chest pain or pressure, trouble breathing, fainting, new weakness or numbness, confusion, or heavy bleeding';
// The label must stand alone (followed by a dash, colon, period, or the end of the line), so a free-text
// line such as "Emergency signs: go … if …" is never mistaken for one.
const SAFETY_LABEL = /^([ \t]*(?:[-*•][ \t]+)?\*\*Safety first:?\*\*:?[ \t]*)(?:\*\*)?(EMERGENCY|TODAY)(?:\*\*)?(?:[ \t]*[—–:.,-]+[ \t]*(.*?)|[ \t]*)$/im;
const DO_FIRST = /^([ \t]*(?:[-*•][ \t]+)?\*\*Do this first:?\*\*:?[ \t]*)(.+)$/im;
const WHO_REPORTS = /^(?:you|he|she|they|your [\w-]+|the patient|the family)\s+(?:report(?:s|ed)?|ha(?:ve|s)|describe[sd]?|mention(?:s|ed)?|(?:are|is) having|noticed?)\s+/i;
function symptomsOf(raw) {
  const kept = [];
  for (const seg of String(raw).replace(/\*/g, '').split(/(?<=[.!?;])\s+|\s+[—–]\s+/)) {
    if (SAFE_CONTACT.test(seg) || SAFE_ED.test(seg) || /\b(?:go|do not|don't|avoid|seek)\b/i.test(seg)) break;
    kept.push(seg);
  }
  const s = kept.join(' ').replace(WHO_REPORTS, '').replace(/[\s.;,:]+$/, '').trim();
  return s.length > 3 ? s : '';
}
function renderSafety(text) {
  const m = String(text).match(SAFETY_LABEL);
  if (!m) return { text: String(text), level: null };
  const level = m[2].toUpperCase() === 'EMERGENCY' ? 'emergency' : 'today';
  const raw = m[3] || '';
  const s = symptomsOf(raw);
  let line;
  if (level === 'emergency') {
    line = `${EMERGENCY_OPEN} ${s ? `What you describe — ${s} — can be a sign of a medical emergency. ` : 'These symptoms can be a sign of a medical emergency. '}Do this before anything else in this kit: emergency care never needs your plan's approval first, and every call and letter here can wait until after you are seen, or someone you trust can make them.`;
  } else {
    const drive = /asleep|drows|doz(?:e|ing)/i.test(raw) ? ' Do not drive until you have been evaluated.' : '';
    line = `${TODAY_OPEN}${s ? ` about what you describe — ${s}` : ''}.${drive} Go to an emergency department now, or call 911, if any emergency sign appears: ${ED_SIGNS}.`;
  }
  let out = String(text).replace(m[0], m[1] + line);
  if (level === 'emergency') {
    out = out.replace(DO_FIRST, (all, lead) => lead + 'Go to the emergency department now. Once you have been seen, come back to this kit — the notes from that visit may be the strongest new evidence for your appeal.');
  }
  return { text: out, level };
}
// When the patient has been sent to the emergency department, every action section opens by saying so.
const BANNER_SECTIONS = ['## 6. ', '## 7. ', '## 10. '];
function emergencyBanners(text) {
  let count = 0;
  const lines = String(text).split('\n');
  const out = lines.map((line, i) => {
    if (!BANNER_SECTIONS.some((h) => line.startsWith(h))) return line;
    const next = lines.slice(i + 1).find((l) => l.trim());
    if (next && next.startsWith('> **Emergency first:**')) return line; // already there
    count++;
    const after = line.startsWith('## 10. ') ? 'Every step below can wait until after you have been seen.' : 'Make this call only after you have been seen, or have someone you trust make it.';
    return `${line}\n\n> **Emergency first:** go to the emergency department now, or call 911. ${after}`;
  }).join('\n');
  return { text: out, count };
}
// Surprise-billing protection for emergency care, and for ancillary clinicians at an in-network
// facility, does not depend on whether the patient chose the clinician: a clause that makes it
// conditional on that ("… when the patient did not choose the provider") is removed.
const CHOICE_CONDITION = /,?\s+(?:when|if|because|as long as|provided that)\s+(?:the patient|you|I|a patient|patients)\s+(?:did not|didn't|do not|don't|does not|doesn't|could not|couldn't|cannot|can't)\s+(?:choose|select|pick)(?:\s+(?:the|an|their|your|my|this|that))?(?:\s+out-of-network)?\s+(?:provider|clinician|doctor|physician|anesthesiologist|group|emergency physician|ER doctor)s?\b/gi;
function noChoiceCondition(text) {
  let count = 0;
  const out = String(text).replace(CHOICE_CONDITION, () => { count++; return ''; });
  return { text: out, count };
}

// For emergency care and for ancillary clinicians at an in-network facility (anesthesia, radiology,
// pathology, hospitalists…) a notice-and-consent form cannot waive the surprise-billing protection, so a
// clause offering that exception ("… unless you signed a valid notice-and-consent form") is removed —
// only when the source is about one of those, since for other non-emergency care the exception exists.
const NSA_CONTEXT = /\banesthesi|\bradiolog|\bpatholog|\bneonatolog|\bhospitalist|\bintensivist|\bassistant surgeon|\bemergency (?:department|room|services?|physicians?|care|medicine)\b|\bER (?:physician|doctor|visit)/i;
const CONSENT_WAIVER = /\s*(?:[—–]\s*|,\s*|;\s*)?\b(?:unless|except (?:if|when))\s+(?:(?:you|the patient|I|he|she|they|a patient)\s+(?:signed|gave|provided|agreed to|received(?: and signed)?|waived)\b[^.;]*?\b(?:consent|waiver)|(?:a|an|the)\s+(?:valid\s+)?(?:written\s+)?(?:advance\s+)?(?:notice[- ]and[- ]consent|consent)(?:\s+form)?\s+(?:was|is|has been|had been)\s+(?:signed|given|obtained)|(?:they|the plan|the provider|the group|[A-Z][\w&'.-]+(?: [A-Z][\w&'.-]+){0,3})\s+can\s+(?:show|prove|document)\b[^.;]*?\b(?:consent|waiver))[^.;,]*/g;
function noConsentWaiver(text) {
  let count = 0;
  const out = String(text).replace(CONSENT_WAIVER, () => { count++; return ''; });
  return { text: out, count };
}
// A record that is not in the source may be named but never characterized: a sentence saying what a
// visit note, assessment or report shows becomes "[Only if the record shows this: …]". Skipped when the
// patient attached records, and for questions and requests ("please send the note that documents …").
const RECORD_NOUN = /\b(?:(?:visit|office|progress|clinic|clinical|face-to-face|procedure|operative|consult(?:ation)?|discharge|therapy|nursing)\s+notes?|(?:home|mobility|functional|seating|physical[- ]therapy|occupational[- ]therapy)\s+(?:assessment|evaluation)s?|(?:supplier|vendor)(?:'s|’s)?\s+(?:home\s+)?(?:assessment|evaluation)|medical records?|(?:imaging|MRI|CT|x-ray|sleep[- ]study|echocardiogram|lab(?:oratory)?|pathology)\s+(?:report|results?|findings))\b/i;
const RECORD_VERB = /(?<!\b(?:the|these|those|other|supporting|your|all|any|such|my|his|her|their|of|with)\s)\b(?:document|show|confirm|demonstrate|reflect|describe|indicate|establish|detail|outline)(?:s|ed|n)?\b/i;
// the insurer's own words about the record are quoted, not claimed
const RECORD_ATTRIB = /\b(?:you stated|stated that|states that|says that|according to|(?:the|your) (?:notice|denial(?: letter)?|letter|plan|EOB|insurer|reviewer) (?:says|said|states|stated|notes|noted|found|finds))\b/i;
const RECORD_NEG = /\b(?:not|never|no|without|lacks?|lacking|fails? to|failed to)\b|n't\b/i;
const RECORD_ASK = /\b(?:if|whether|when|please|request(?:ing)?|ask(?:ing)?|send(?:ing)?|provide|include|attach|obtain|fax|copy|copies|only what|keep(?:ing)? only)\b|\bany (?:medical |other |relevant )?(?:records?|notes?|reports?)\b/i;
const OBSERVED = /\b(?:demonstrated|showed|was observed|were observed|was documented|documented)\b[^.;]{0,80}\b(?:during|at|in|on)\s+(?:the\s+|his\s+|her\s+|their\s+|a\s+)?(?:supplier(?:'s|’s)?\s+)?(?:home\s+)?(?:assessment|evaluation|visit)\b/i;
function bracketRecordClaims(text) {
  let count = 0;
  const out = String(text).split('\n').map((line) => sentencesOf(line).map((s) => {
    if (/[\[\]]/.test(s) || /\?["”'’)*]*\s*$/.test(s) || RECORD_ASK.test(s) || RECORD_ATTRIB.test(s)) return s;
    const n = s.match(RECORD_NOUN);
    if (n && ((s.slice(0, n.index).match(/["“”]/g) || []).length % 2 === 1)) return s; // inside a quotation
    if (n && /^\s*(?:[-*•]|\d{1,2}[.)])\s+(?:\*\*)?(?:the\s+|an?\s+|your\s+|my\s+)?$/i.test(s.slice(0, n.index))) return s; // an enclosure or request list item
    let claim = OBSERVED.test(s);
    if (!claim && n) {
      const after = s.slice(n.index + n[0].length, n.index + n[0].length + 90);
      const v = after.match(RECORD_VERB);
      claim = !!v && !RECORD_NEG.test(after.slice(0, v.index));
    }
    if (!claim) return s;
    count++;
    return onlyIf(s, 'the record shows this');
  }).join('')).join('\n');
  return { text: out, count };
}
// Each phone or fax number in the source, with the words printed just before it, so every writer
// keeps the role the notice gives it (a prescriber line is not the doctor's office).
function phoneRoles(source) {
  const out = [];
  const seen = new Set();
  const re = new RegExp(PHONE.source, 'g');
  let m;
  const src = String(source || '');
  while ((m = re.exec(src))) {
    const d = m[1] + m[2] + m[3];
    if (seen.has(d) || VERIFIED_PHONES.includes(d)) continue;
    seen.add(d);
    const from = Math.max(0, m.index - 120);
    let before = src.slice(from, m.index).split(new RegExp(PHONE.source)).pop();
    if (from > 0 && before.length === m.index - from) before = before.replace(/^\S*\s/, ''); // drop a cut-off first word
    const label = before.split(/\n|\||\s{2,}|(?<=[a-z0-9)])\.\s/).pop().replace(/\s+/g, ' ').trim().replace(/^[.;,:]+\s*/, '').replace(/[:,(]+$/, '').trim();
    out.push(`${m[0].trim()} — printed after "${label}"`);
  }
  return out;
}

// In every document that states the patient's facts to the insurer or a reviewer — the appeal letter
// (section 2), the letter a doctor signs (3), the peer-to-peer brief (5) and the next-level request (9) —
// an exam-derived or upgraded label the source never uses becomes "[if documented: …]": "trouble
// starting to pee" is not "urinary retention", "tripping" is not "foot drop" or "falls", "accidents" is
// not "incontinence". Plain synonyms of what the patient said (shortness of breath → dyspnea) are left
// alone. v9.4 covered sections 3 and 5; runs 5–14 showed the decode's label carried into the patient's
// own letters (F's "incontinence" in section 2 in all ten runs), so v9.6 covers 2 and 9 as well.
const LABELS = [
  { re: /\b(?:painless |acute |chronic |new )?(?:urinary retention|retention of urine)\b/gi, src: /retention/i },
  { re: /\b(?:(?:right|left|bilateral|progressive|new|worsening)[- ]){0,2}(?:foot drop|drop foot)\b/gi, src: /foot drop|drop foot/i },
  { re: /\bsaddle (?:anesthesia|anaesthesia)\b/gi, src: /saddle (?:anesthesia|anaesthesia)/i },
  { re: /\b(?:(?:urinary|urge|fecal|faecal|bowel|bladder|functional|overflow|stress|double) )?incontinence(?: episodes?)?\b/gi, src: /incontinen/i },
  // the word before "falls" shows it is the noun, not the verb ("the deadline falls on"); a function word
  // stays outside the bracket ("with [if documented: falls]"), a count word is part of the label
  { re: /(?<=\b(?:causing|with|and|history of|had|has had|reports?|reported)\s)falls\b|\b(?:recurrent|frequent|multiple|repeated|several)\s+falls\b|\bhas fallen\b/gi, src: /\bfall(?:s|en|ing)?\b|\bfell (?:down|over)\b/i },
  { re: /\bnear[- ]miss(?: (?:motor vehicle|car|traffic) (?:accident|crash|collision))?|\bmotor vehicle (?:accident|crash|collision)\b/gi, src: /near[- ]miss|accident|crash|collision/i },
  { re: /\b(?:protein[- ]calorie )?malnutrition\b|\bcachexia\b/gi, src: /malnutrition|cachexia/i },
  { re: /\bhypox(?:emia|aemia|ia)\b/gi, src: /hypox/i },
  { re: /\bvolume overload\b/gi, src: /volume overload/i },
];
const LETTER_SECTIONS = /^## (?:2|3|5|9)\. /;
// A label named as a risk is not a finding: "delay can cause permanent paralysis and incontinence",
// "at risk for malnutrition". The cue must come earlier in the same clause, with no "has", "reports",
// "developed" … between it and the label (run 14 bracketed exactly that risk sentence). "Prevents him
// from reaching the bathroom, resulting in incontinence" states a limitation, so only a modal
// "would prevent" is a cue.
const RISK_CUE = /\b(?:risks?|risked|risking|danger|complications?|(?:can|could|may|might|would|will)\s+(?:also\s+)?(?:cause|lead to|result in|progress to|develop|prevent|avoid))\b/gi;
const ASSERTED = /\b(?:has|have|had|reports?|reported|developed|presents?|presented|experienc\w*|shows?|showed|now)\b/i;
function riskOnly(before) {
  const clause = before.replace(/\[(?:[^\[\]]|\[[^\[\]]*\])*\]/g, ' x ').split(/[.;:!?](?:\s|$)/).pop().slice(-160);
  let end = -1;
  let m;
  RISK_CUE.lastIndex = 0;
  while ((m = RISK_CUE.exec(clause))) end = m.index + m[0].length;
  return end >= 0 && !ASSERTED.test(clause.slice(end));
}
// A line as alternating segments: text outside brackets (even) and whole outermost brackets (odd).
// Unbalanced brackets fall back to the innermost ones.
function bracketSegments(line) {
  if ((line.match(/\[/g) || []).length !== (line.match(/\]/g) || []).length) return line.split(/(\[[^\[\]]*\])/);
  const segs = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '[') { if (depth === 0) { segs.push(line.slice(start, i)); start = i; } depth++; }
    else if (line[i] === ']' && depth > 0 && --depth === 0) { segs.push(line.slice(start, i + 1)); start = i + 1; }
  }
  segs.push(line.slice(start));
  return segs;
}
function bracketLabels(text, source) {
  let count = 0;
  const src = String(source || '');
  let inLetter = false;
  const out = String(text).split('\n').map((line) => {
    if (/^## \d{1,2}\. /.test(line)) { inLetter = LETTER_SECTIONS.test(line); return line; }
    if (!inLetter) return line;
    // only text outside existing [brackets] is rewritten
    let before = '';
    return bracketSegments(line).map((seg, i) => {
      const prior = before;
      before += seg;
      if (i % 2) return seg;
      let t = seg;
      for (const L of LABELS) {
        if (L.src.test(src)) continue;
        t = t.replace(L.re, (m, ...args) => {
          const at = args.find((a) => typeof a === 'number');
          if (riskOnly(prior + t.slice(0, at))) return m;
          count++;
          return `[if documented: ${m}]`;
        });
      }
      return t;
    }).join('');
  }).join('\n');
  return { text: out, count };
}

// ---------- v9.8: who did it, who may act, how bad it is ----------
// The request whose denial is the subject of the kit was submitted by someone — but not necessarily by
// the clinician who signs: "Since I submitted that request, the patient has developed …" (G §3, runs 11
// and 15) became one bracketed option to delete, red flags and all. The clause is rewritten in the
// passive, which is always true, so the red flags stay in the letter.
const REQUEST_CLAUSE = /\b(Since|After|When|Once|Because|As)\s+(?:I|we)\s+(?:originally\s+|first\s+|initially\s+|last\s+)?(submitted|filed|sent|faxed)\s+(the|that|this|my|our)\s+((?:original\s+|initial\s+|first\s+)?(?:prior[- ]authori[sz]ation\s+|pre-?authori[sz]ation\s+|pre-?certification\s+|authori[sz]ation\s+|coverage\s+)?(?:request|claim))\b/gi;
function passiveRequest(text) {
  let count = 0;
  const out = String(text).replace(REQUEST_CLAUSE, (m, conj, verb, det, obj) => {
    count++;
    return `${conj} ${/^(?:my|our)$/i.test(det) ? 'the' : det} ${obj} was ${verb.toLowerCase()}`;
  });
  return { text: out, count };
}
// Legal authority is the family's to claim, never the kit's. "I have power of attorney" (run 16, I §7)
// and "am authorized to act on her behalf" (run 16, J §8) were written when the context said only "I
// handle his mail" and "I'm her husband". A first-person claim of legal authority becomes "[only if you
// hold this in writing: …]" unless the patient's own words claim it. Conditional mentions ("once I have
// power of attorney") and anything already in a bracket are left alone.
const AUTH_DOC = '(?:power of attorney|POA|guardian(?:ship)?|conservator(?:ship)?|health[- ]?care (?:proxy|agent|surrogate)|healthcare (?:proxy|agent|surrogate)|attorney-in-fact)';
const WHOSE = "(?:his|her|their|the patient(?:'s|’s)|my\\s+\\w+(?:'s|’s))";
const AUTHORITY = new RegExp([
  `\\b(?:I|we)(?:'ve|’ve|\\s+have|\\s+hold|\\s+now\\s+have)\\s+(?:a\\s+|an\\s+|the\\s+|${WHOSE}\\s+)?(?:signed\\s+|valid\\s+)?(?:durable\\s+|medical\\s+|health[- ]?care\\s+|healthcare\\s+|financial\\s+|general\\s+)?(?:power of attorney|POA)\\b(?:\\s+(?:for|over)\\s+(?:him|her|them|my\\s+\\w+))?`,
  `\\b(?:I am|I'm|I’m|we are|we're|we’re)\\s+(?:also\\s+)?${WHOSE}\\s+(?:(?:legal(?:ly appointed)?|court[- ]appointed|designated|appointed|authori[sz]ed|personal)\\s+)*(?:representative|${AUTH_DOC}|proxy|agent)\\b`,
  `\\b(?:am|we\\s+are|we're|we’re)\\s+(?:legally\\s+)?(?:authori[sz]ed|appointed|designated|empowered)\\s+to\\s+(?:act|speak|sign|make\\s+(?:medical\\s+|health[- ]?care\\s+)?decisions|handle|request|file|appeal|receive|obtain|access)\\b(?:\\s+(?:on\\s+${WHOSE}\\s+behalf|for\\s+(?:him|her|them)))?`
].join('|'), 'gi');
const SELF_AUTHORITY = /\b(?:I|I'm|I’m|I am|I've|I’ve|I have|my)\b[^.\n]{0,60}\b(?:power of attorney|POA|guardian|conservator|proxy|health[- ]?care agent|healthcare agent|authori[sz]ed representative|legal representative|personal representative|CMS-1696|appointment of representative|representative form|attorney-in-fact)\b/i;
const CONDITIONAL_LEAD = /\b(?:if|once|when|unless|until|whether|after|before)\b[^.;:!?]*$/i;
// "… under the enclosed Appointment of Representative form" grounds the claim in the same sentence
const AUTH_ENCLOSED = /\b(?:enclosed|attached|included)\b[^.;]{0,60}\b(?:form|authori[sz]ation|appointment|CMS-1696|power of attorney|POA)\b|CMS-1696|Appointment of Representative/i;
function bracketAuthority(text) {
  let count = 0;
  const out = String(text).split('\n').map((line) => sentencesOf(line).map((s) => {
    if (/\?["”'’)*]*\s*$/.test(s) || AUTH_ENCLOSED.test(s)) return s;
    return bracketSegments(s).map((seg, i) => i % 2 ? seg : seg.replace(AUTHORITY, (m, at, whole) => {
      const offset = typeof at === 'number' ? at : whole.indexOf(m);
      if (CONDITIONAL_LEAD.test(seg.slice(Math.max(0, offset - 60), offset))) return m;
      count++;
      return `[only if you hold this in writing: ${m}]`;
    })).join('');
  }).join('')).join('\n');
  return { text: out, count };
}
// The doctor's letter and the peer-to-peer brief are signed or spoken by whichever clinician the family
// asks, so a first-person clinical act is the signer's to confirm: "I documented on 10/26/2026 that she
// is expected to participate …" made the attending the author of the physiatrist's consult (run 16,
// J §3, a Critical audit finding). The subject becomes a choice — "[I / Dr. ___] documented …" — so the
// fact stays and the signer names who did it.
const AUTHOR_ACT = /\bI(\s+(?:personally\s+|also\s+|then\s+|first\s+)?(?:have\s+|had\s+)?(?:documented|examined|evaluated|assessed|observed|recorded|charted|wrote|saw|admitted|ordered|prescribed|performed|measured|referred))\b/g;
// v9.13: also after "of", "since", "after", "before" or "following", and with a date between ("within 2–3 days of my
// October 26 consultation", run 26, J §5, the run-26 audit's J-2: false when the other doctor makes the call)
const AUTHOR_MY = /\b(in|on|per|from|during|at|of|since|after|before|following)\s+my\s+((?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+\d{1,2}(?:,\s*\d{4})?\s+|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\s+)?(?:initial\s+|recent\s+|most recent\s+|last\s+|follow-up\s+)?(?:consult(?:ation)?(?:\s+note)?|note|progress note|clinic note|visit|exam(?:ination)?|evaluation|assessment))\b/gi;
// section 3 only when a clinician signs it (not the patient's corrected-claim or coverage letter)
const AUTHOR_SECTIONS = /^## 3\. (?:Letter of medical necessity|Clinician's emergency attestation)|^## 5\. /;
function attributeActs(text) {
  let count = 0;
  let inLetter = false;
  const out = String(text).split('\n').map((line) => {
    if (/^## \d{1,2}\. /.test(line)) { inLetter = AUTHOR_SECTIONS.test(line); return line; }
    if (!inLetter) return line;
    return bracketSegments(line).map((seg, i) => {
      if (i % 2) return seg;
      return seg
        .replace(AUTHOR_ACT, (m, rest) => { count++; return '[I / Dr. ___]' + rest; })
        .replace(AUTHOR_MY, (m, prep, what) => { count++; return `${prep} [my / Dr. ___'s] ${what}`; });
    }).join('');
  }).join('\n');
  return { text: out, count };
}
// A severity word the patient's own material never uses is the chart's to supply. "Critically slow heart
// rate", "an unstable patient" and "significant bradycardia" (run 16, I §3 and §9) were written when the
// family was told only "very slow". In the documents sent to the insurer the word becomes "[if documented:
// critically] slow"; a risk ("could become unstable") or a negation ("not unstable") is left alone.
const SEVERITY_ADV = /\b(critically|dangerously|profoundly|severely|markedly|significantly|extremely)\s+(?=(?:low|slow|high|elevated|decreased|bradycardic|tachycardic|hypotensive|hypoxic)\b)/gi;
const SEVERITY_ADJ = /\b((?:(?:hemodynamically|clinically)\s+)?(?:critical|dangerous|profound|severe|marked|significant|extreme))\s+(?=(?:bradycardi|tachycardi|hypotensi|hypertensi|hypox|arrhythmi|anemi|dehydrat|weakness|bleeding|blood loss|respiratory distress|distress|instability|heart block|slow heart|slowing|low blood pressure|low heart rate|high blood pressure)\w*)/gi;
// "unstable angina" and an "unstable fracture" are diagnoses, not severity words
const SEVERITY_UNSTABLE = /\b(?:(?:hemodynamically|critically|dangerously|severely|profoundly|markedly|clinically|medically)\s+)?unstable\b(?!\s+(?:angina|fracture|spine|plaque|pelvis|joint|ankle|knee|shoulder))/gi;
// (v9.13 tried bracketing "life-threatening" too, for the run-26 audit's I-3. The diff gate over every stored kit
// stopped it: 70 changed lines, most of them case D's prudent-layperson argument ("would recognize these symptoms
// as potentially life-threatening") and differentials ("to rule out life-threatening conditions"). It did not ship.)
const SEVERITY_SRC = { critical: /\bcritical/i, dangerous: /\bdangerous/i, profound: /\bprofound/i, severe: /\bsevere/i, marked: /\bmarked(?:ly)?\b/i, significant: /\bsignificant/i, extreme: /\bextreme/i, unstable: /\bunstable\b|\binstabilit/i };
const SEVERITY_NOT = /\b(?:not|no|never|nor|without|isn't|wasn't|weren't|aren't|become|becomes|becoming|turn|get)\s+(?:\w+\s+)?$/i;
function bracketSeverity(text, source) {
  let count = 0;
  const src = String(source || '');
  const stem = (w) => w.toLowerCase().replace(/^(?:hemodynamically|clinically)\s+/, '').replace(/ly$/, '');
  let inLetter = false;
  const out = String(text).split('\n').map((line) => {
    if (/^## \d{1,2}\. /.test(line)) { inLetter = LETTER_SECTIONS.test(line); return line; }
    if (!inLetter) return line;
    let before = '';
    return bracketSegments(line).map((seg, i) => {
      const prior = before;
      before += seg;
      if (i % 2) return seg;
      const swap = (m, word, at, whole) => {
        const key = stem(word || m);
        if (SEVERITY_SRC[key] && SEVERITY_SRC[key].test(src)) return m;
        const lead = prior + whole.slice(0, at);
        if (riskOnly(lead) || SEVERITY_NOT.test(lead)) return m;
        if ((lead.match(/["“”]/g) || []).length % 2 === 1) return m; // inside a quotation (a reviewer's objection)
        count++;
        return `[if documented: ${m.trim()}]${/\s$/.test(m) ? ' ' : ''}`;
      };
      return seg
        .replace(SEVERITY_ADV, (m, w, at, whole) => swap(m, w, at, whole))
        .replace(SEVERITY_ADJ, (m, w, at, whole) => swap(m, w, at, whole))
        .replace(SEVERITY_UNSTABLE, (m, at, whole) => swap(m, 'unstable', at, whole));
    }).join('');
  }).join('\n');
  return { text: out, count };
}

// ---------- the whole post-processing pass, in order ----------
// part: 1–6 · safety: the tier read from the decode (parts 2–6) · known: source text plus decode ·
// attachments: a file was attached · records: medical records were attached.
// source: the patient's own material (denial and context). When it is not passed, it is the part of
// `known` before the decode, which always opens with the "## 1. " heading.
function postProcess(text, { part, safety = null, known = '', source, attachments = false, records = false } = {}) {
  const L = require('./fightpack-limits.js'); // v9.8.2–v9.8.3 limits; loaded here, after this module is complete
  const own = source !== undefined ? source : String(known).split(/\n## 1\. /)[0];
  const counts = {};
  const step = (name, r) => { counts[name] = r.count; return r.text; };
  let t = String(text);
  let level = safety;
  if (part === 1) { const r = renderSafety(t); t = r.text; level = r.level; }
  else if (safety === 'emergency') t = step('banners', emergencyBanners(t));
  t = step('hedged', hedgeAbsolutes(t));
  t = step('ed_now', edNow(t));
  t = step('choice', noChoiceCondition(t));
  if (NSA_CONTEXT.test(known)) t = step('consent', noConsentWaiver(t));
  if (NSA_CONTEXT.test(known)) t = step('choice_argument', outsideFences(t, L.dropChoiceArgument));
  t = step('cost_sharing', costSharingNotRate(t));
  t = step('earlier_date', earlierDate(t));
  t = step('coding', outsideFences(t, bracketCoding));
  if (part > 1) t = step('request_passive', outsideFences(t, passiveRequest));
  if (part > 1) t = step('unverified', outsideFences(t, bracketUnverified));
  if (part > 1 && !SELF_AUTHORITY.test(own)) t = step('authority', outsideFences(t, bracketAuthority));
  if (part === 3 || part === 4) t = step('authorship', outsideFences(t, attributeActs));
  if (part > 1 && !records) t = step('records', outsideFences(t, bracketRecordClaims));
  if (part > 1 && part !== 5 && !records) t = step('labels', bracketLabels(t, own));
  if (part > 1 && part !== 5 && !records) t = step('severity', bracketSeverity(t, own));
  t = step('setting', outsideFences(t, (x) => L.settingLimits(x, own, part > 1)));
  if (part > 1 || !attachments) t = step('phones', guardPhones(t, known));
  return { text: t, level, counts };
}

module.exports = {
  fieldOf, sentencesOf, hedgeAbsolutes, guardPhones, edNow, bracketUnverified, costSharingNotRate, earlierDate,
  bracketCoding, outsideFences, safetyOf, renderSafety, emergencyBanners, noChoiceCondition, noConsentWaiver,
  bracketRecordClaims, bracketLabels, phoneRoles, postProcess, EMERGENCY_OPEN, TODAY_OPEN,
  passiveRequest, bracketAuthority, attributeActs, bracketSeverity, LETTER_SECTIONS
};
