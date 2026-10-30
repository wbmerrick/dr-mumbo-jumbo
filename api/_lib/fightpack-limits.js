// Fight Pack limits (v9.8.2–v9.8.3): two code-enforced rules the model kept breaking through prompt fixes.
// postProcess in fightpack-guards.js runs them; they live here to keep each module small enough to read.
const { sentencesOf, LETTER_SECTIONS } = require('./fightpack-guards.js');

// A lower level of care, a cheaper alternative, a vehicle or a wait is answered with what the patient needs
// that it does not provide — never with a test's vocabulary, and never with a figure from memory. Held-out
// J's kits said "a skilled nursing facility offers 1–2 hours of therapy per day and is not validated for …"
// in every run from 16 to 20, through two prompt fixes (run-16 audit J-5, Major); I's said "a private vehicle
// is not validated for an unstable patient" (I-6); F's "a scooter is not validated in …", B's "observation
// status is not validated for …". "Validated" claims a validation study that does not exist. Where the
// subject of "not validated for/in" is one of these, code rewrites it: a vehicle "is contraindicated for"
// (the ambulance rule's own test: other means of transportation are contraindicated), anything else "is
// not appropriate for" (the denial's own word for a level of care). The subject is the clause before the
// verb — or, when that clause is only "it" or "this level", the setting the paragraph last named. Tests,
// drugs and devices keep "not validated", which the preamble allows for them. And in the decode and in the
// documents sent to the insurer, code brackets the hours, minutes, visits or days a week that a setting is
// said to give, when the patient's own material never gives them; a figure after "not", "lacks", "needs"
// or "intensive" is the level the patient needs, not the setting's, and stays.
const VEHICLE_SRC = "(?:private|personal|family|own) (?:vehicle|car|automobile)|\\bcars?\\b|automobile|wheelchair van|\\btaxi|ride-?share|\\b(?:have |be )?driv(?:e|en|ing) (?:him|her|them|the patient)\\b|\\bdrove (?:him|her|them|the patient)\\b";
const VEHICLE = new RegExp(VEHICLE_SRC, 'i');
const LEVEL_SRC = "skilled nursing|\\bSNFs?\\b|sub-?acute|nursing (?:home|facilit)|home health|outpatient (?:care|therapy|rehab|setting|level|management|treatment|observation|basis)|\\bobservation\\b|lower level of (?:care|service)|lower-level (?:care|service)|custodial care|basic life support|\\bBLS\\b|power[- ]operated vehicle|\\bPOVs?\\b|scooter|manual wheelchair|\\bcanes?\\b|\\bwalkers?\\b|\\bwaiting\\b|\\bdelay(?:ing|ed)?\\b|conservative (?:management|care|treatment|therapy)";
const LEVEL = new RegExp(LEVEL_SRC, 'i');
const WAIT = /\b(?:wait(?:ing)?|delay(?:ing|ed|s)?)\b/i; // a delay is never a contraindication, even for a ride
// v9.13: also "not validated to" a verb ("It is not validated to deliver the intensity of therapy…", run 26, J §5):
// a setting "is not designed to" do it; a vehicle with "to" is left as written
const NOT_VALIDATED = /(\b(?:[Ii]s|[Aa]re|[Ww]as|[Ww]ere)\s+(?:(?:also|therefore|simply|clearly|likewise|thus)\s+)?)?\b([Nn])ot\s+validated\s+(for|in|to)\b/g;
const CLAUSE_BREAK = /[;:—→]|\s[–-]\s|[?!]["”*_]*\s/;
const ANAPHOR = /^(?:(?:and|but|so|yet|because)\s+)?(?:it|this|that|which|they|these|those|(?:this|that|the|such an?|these|those) (?:lower )?(?:level|setting|facility|facilities|placement|option|alternative|vehicle|mode|transport|transportation|device|equipment|approach|care)(?: of (?:care|transport|transportation|service|services))?)$/i;
const FIG_SETTING = /skilled nursing(?: facilit(?:y|ies)| level| care)?|\bSNFs?\b|sub-?acute(?: rehab\w*| care| setting| level| facilit(?:y|ies))?|nursing (?:home|facilit(?:y|ies))|home health(?: care)?|outpatient (?:therapy|rehab\w*)/gi;
const FIG_QUAL = '(?:approximately|about|roughly|typically|generally|usually|only|up to|at most|at least|around|just|often|sometimes|perhaps|less than|fewer than|no more than|as little as|as few as)';
const FIG_NUM = '(?:\\d+(?:\\.\\d+)?|one|two|three|four|five|six|seven|a few|several|half an?|an?)';
const FIG_RANGE = `${FIG_NUM}(?:\\s*(?:[–-]|to|or)\\s*${FIG_NUM})?`;
const FIG_RATE = '(?:(?:per|a|each|every)\\s+(?:day|week|session)|daily|weekly|\\/\\s*(?:day|week))';
const FIG_1 = `(?:${FIG_QUAL}\\s+)*${FIG_RANGE}[\\s-]+(?:hours?|hrs?|minutes?|mins?|visits?|sessions?)(?:\\s+of\\s+(?:[a-z]+\\s+){0,2}?(?:therapy|rehab\\w*|treatment|care|services?))?\\s+${FIG_RATE}`;
const FIG_2 = `(?:${FIG_QUAL}\\s+)*${FIG_RANGE}\\s+days?\\s+(?:per|a|each)\\s+week(?:\\s+or\\s+(?:less|fewer))?`;
const SETTING_FIGURE = new RegExp(`\\b(?:${FIG_1}(?:,?\\s+${FIG_2})?|${FIG_2})`, 'gi');
const FIG_BLOCK = /\b(?:not|cannot|no|lacks?|lacking|without|rather than|instead of|versus|vs|compared|whereas|while|but|IRFs?|inpatient rehab\w*|acute rehab\w*|acute inpatient|rehabilitation hospital|intensive|needs?|requires?|required|recommended|criteria|criterion|standard|tolerat\w*|participat\w*|she|he|her|his|patient)\b|n't\b/i;
const FIG_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7 };
function figureCore(x) {
  return String(x).toLowerCase().replace(/[–—]/g, '-')
    .replace(new RegExp(`^(?:${FIG_QUAL}\\s+)+`), '')
    .replace(/\b(one|two|three|four|five|six|seven)\b/g, (w) => FIG_WORDS[w])
    .replace(/(\d)\s*(?:-|to|or)\s*(\d)/g, '$1-$2').replace(/\s+/g, ' ').trim();
}
function insideBrackets(s) {
  const d = new Array(s.length);
  let k = 0;
  for (let i = 0; i < s.length; i++) { if (s[i] === '[') k++; d[i] = k > 0; if (s[i] === ']' && k > 0) k--; }
  return d;
}
function settingLimits(text, source, letters) {
  let count = 0;
  const src = figureCore(String(source || '').replace(/\s+/g, ' '));
  let inLetter = !letters;
  const out = String(text).split('\n').map((line) => {
    if (letters && /^## \d{1,2}\. /.test(line)) { inLetter = LETTER_SECTIONS.test(line); return line; }
    let ctx = null;
    return sentencesOf(line).map((s) => {
      const inB = insideBrackets(s);
      let t = s.replace(NOT_VALIDATED, (m, be, n, prep, at) => {
        if (inB[at]) return m;
        const before = s.slice(0, at);
        let kind = null;
        if (be) {
          const chunk = before.split(CLAUSE_BREAK).pop();
          kind = WAIT.test(chunk) ? 'level' : VEHICLE.test(chunk) ? 'vehicle' : LEVEL.test(chunk) ? 'level'
            : ANAPHOR.test(chunk.replace(/[*_"“”'`>#()\-\s]+/g, ' ').trim()) ? ctx : null;
        } else {
          kind = WAIT.test(before) ? 'level' : VEHICLE.test(before) ? 'vehicle' : LEVEL.test(before) ? 'level' : null;
        }
        if (!kind) return m;
        if (prep === 'to') {
          if (kind !== 'level') return m;
          count++;
          return (be || '') + n + 'ot designed to';
        }
        count++;
        if (be) return be + (kind === 'vehicle' ? 'contraindicated for' : 'not appropriate for');
        if (kind === 'vehicle') return (n === 'N' ? 'C' : 'c') + 'ontraindicated for';
        return n + 'ot appropriate for';
      });
      if (VEHICLE.test(s) && !WAIT.test(s)) ctx = 'vehicle'; else if (LEVEL.test(s) || VEHICLE.test(s)) ctx = 'level';
      if (inLetter && FIG_SETTING.test(t)) {
        FIG_SETTING.lastIndex = 0;
        const ends = [];
        let sm;
        while ((sm = FIG_SETTING.exec(t))) ends.push(sm.index + sm[0].length);
        const tb = insideBrackets(t);
        t = t.replace(SETTING_FIGURE, (fig, at) => {
          if (tb[at]) return fig;
          const end = ends.filter((e) => e <= at).pop();
          if (end === undefined || FIG_BLOCK.test(t.slice(end, at))) return fig;
          if (src.includes(figureCore(fig))) return fig;
          count++;
          return `[if the plan's policy or your records say so: ${fig}]`;
        });
      }
      return t;
    }).join('');
  }).join('\n');
  return { text: out, count };
}

// Emergency care, and ancillary care at an in-network facility, are protected whoever chose the clinician and
// whatever the patient was told or signed. "I did not choose the ER doctor" or "I never received any notice
// that the anesthesiologist was out of network" makes the protection sound conditional and has the patient
// assert a fact they may not know (surgery centres hand out stacks of forms). The preamble forbids it; D still
// argued choice in all 13 runs that had it and H notice in 9 of 13 (runs 5–20). Code removes the clause that argues it
// and any clause beside it that only talks about choice or assignment, and keeps the rest of the sentence; a
// sentence left with nothing, or opening on a pronoun that has lost its noun, goes. Only when the source is
// emergency or ancillary care, and never for a surgeon, whose notice and consent do count.
const CHOICE_CLIN = "(?:physician|doctor|anesthesiolog|anesthetist|clinician|provider|radiolog|patholog|group|partners|\\bER\\b|\\byou\\b|\\bthem\\b|\\bme\\b|\\bhim\\b)";
const CHOICE_ARG = new RegExp(
  `\\b(?:did not|didn't|could not|couldn't|was not able to|wasn't able to|never got to|had no (?:way|chance|opportunity|ability) to|never had (?:a|any) (?:chance|opportunity|ability) to|had any (?:ability|opportunity|chance) to)\\s+(?:choose|select|pick)\\b(?:[^.;—–]*?${CHOICE_CLIN}|(?=\\s*(?:[,.;—–)]|$|\\s+(?:or|and)\\b)))` +
  '|\\bno (?:control|choice|say) (?:over|in) (?:which|who|the|(?:the )?(?:provider|physician|doctor|clinician|anesthesi)\\w*)\\b' +
  "|\\b(?:never|did not|didn't|was not|wasn't|were not|weren't)\\s+(?:met|receive[ds]?|get|got|sign(?:ed)?|give[ns]?|given|told|informed|notified|shown|asked|offered)\\b[^.;—–]{0,80}?(?:consent|waive|out[- ]of[- ]network|network status)" +
  '|\\b(?:received|receiving|had|having|got|getting|was given|were given) no (?:advance |written |prior |such )*(?:notice|paperwork|forms?|documents?|disclosures?)\\b(?:[^.;—–]{0,60}?(?:out[- ]of[- ]network|network|consent)|(?=\\s*(?:[,.;—–)]|$)))' +
  '|\\b(?:signed|gave|received|receiving|got) no (?:[\\w-]+ ){0,3}[\\w-]*(?:consent|waiver)\\b' +
  "|\\b(?:did not|didn't|never)\\s+(?:consent|agree)d?\\b[^.;—–]{0,40}?(?:out[- ]of[- ]network|charges?|bill)" +
  '|\\bno (?:[\\w-]+ ){0,3}[\\w-]*(?:consent|waiver)(?: forms?)? (?:was|were|has been|had been) (?:signed|given|received|provided|obtained)' +
  "|\\b(?:did not|didn't|never)\\s+(?:\\w+\\s+){1,3}or\\s+(?:choose|select|pick)\\b" +
  `|\\bnever\\s+(?:chose|selected|picked)\\b(?:[^.;—–]*?${CHOICE_CLIN}|(?=\\s*(?:[,.;—–)]|$|\\s+(?:or|and)\\b)))` +
  '|\\bwith no (?:advance |prior |written )*(?:notice|consent)\\b|\\bwithout (?:any )?(?:advance |prior |written )*notice\\b', 'i');
const CHOICE_ASIDE = /\b(?:choice|choose|chose|chosen)\b[^.;—–]{0,40}\b(?:clinicians?|physicians?|doctors?|providers?|anesthesiolog\w*)|\b(?:choice|choosing)\b[^.;—–]{0,30}\b(?:irrelevant|not relevant|does not matter|doesn't matter)|\bassigned\b[^.;—–]{0,30}\b(?:them|him|her|physicians?|doctors?|clinicians?|providers?|anesthesi\w*)|\b(?:physicians?|doctors?|clinicians?|providers?|anesthesiolog\w*)\s+(?:is|are|was|were)\s+assigned\b|\beven if (?:I|you|he|she|they|we) (?:had|did)\s*,|\b(?:no|any) (?:opportunity|chance|ability|way) to do so\b|\b(?:arranged|assigned|selected|chosen|picked) by the (?:facility|hospital|surgery center|center|surgeon|surgical center)\b/i;
const CHOICE_NEG = "(?:did not|didn't|never|was not|wasn't|were not|weren't|received no|had no|could not|couldn't|was never)";
const CHOICE_WHO = "(?:I|you|we|he|she|they|the patient|my \\w+|[A-Z][a-z]+)";
const CHOICE_SPLIT = new RegExp(`(,\\s+(?:and|but|so)\\s+|,\\s+(?=(?:that\\s+)?(?:${CHOICE_WHO}\\s+)?${CHOICE_NEG}\\b)|\\s+and\\s+(?=that\\s)|\\s+(?:and|but)\\s+(?=(?:I|you|we|he|she|they|the patient|my \\w+|${CHOICE_NEG})\\b)|\\s+[—–]\\s+|;\\s+)`);
// "… must be covered at in-network cost-sharing when the patient did not choose the clinician" keeps the rule;
// "an ancillary clinician you did not choose" keeps the clinician.
const CHOICE_COND = /,?\s+(?:when|if|because|since|as long as|provided that|where|whenever)\s+(?:the patient|you|I|a patient|patients|he|she|they|the member|we)\s+(?:had no (?:ability|opportunity|chance|way|control|choice|say)\b|did not|didn't|could not|couldn't|cannot|can't|was not able to|wasn't able to|never)\b[^,.;—–]*?(?=\s*(?:[,.;—–)]|$))/gi;
const CHOICE_WITH = /,?\s+(?:with\s+no|without(?:\s+any)?)\s+(?:advance\s+|prior\s+|written\s+)*(?:notice|consent)(?:[- ]and[- ]consent)?(?:\s+forms?)?(?:\s+(?:or|and)\s+(?:consent|notice)(?:\s+forms?)?)?\b(?:\s+(?:of|that|about|from|or)\b[^,.;—–]*?)?(?:,(?=\s)|(?=\s*(?:[.;—–)]|$)))/gi;
const CHOICE_REL = /(?<=\b(?:clinician|physician|doctor|anesthesiologist|anesthetist|provider|group|Partners|Physicians|surgeon)s?)(?:,?\s+(?:who|whom|that)\s+|\s+)(?:you|I|the patient|he|she|they|we|[A-Z][a-z]+)\s+(?:did not|didn't|could not|couldn't|never)\s+(?:choose|chose|select|pick)\b[^,.;—–]*?(?=\s*(?:[,.;—–)]|$))/gi;
const CHOICE_PRONOUN = /^(?:\[(?:he|she|they)\b[^\]]*\]|(?:they|them|their|he|she|his|it|who|which|these|those)\b)/i;
const CHOICE_FINITE = /\b(?:is|was|were|are|had|has|have|did|didn't|went|received|met|signed|got|presented|arrived|verified|confirmed|took|never)\b/;
const CHOICE_FRAGMENT = /^(?:once|when|after|because|since|if|although|though|while|as|before|until|unless)\b/i;
const CHOICE_LABEL = /^\*\*\s*No (?:notice|consent|choice|control|patient choice)\b(?![^*]*waive)/i;
const CHOICE_SUBORD = /^(?:that|which|who|whom|whose|whether|because|since|as)\b/i;
const CHOICE_VERB = /^(?:did|didn't|never|had|has|have|was|were|received|signed|could|couldn't|would|met|got|gave)\b/i;
const CHOICE_SUBJ = /^[\s*_"“]*(I|You|We|He|She|They|The patient|My \w+|[A-Z][a-z]+)\s+(?:did|didn't|could|couldn't|had|has|never|was|were|received|signed)\b/;
const SURGEON = /\bsurgeons?\b/i;
function dropChoiceArgument(text) {
  let count = 0;
  // a short third-person quotation is the notice's or the plan's own words and stays; a first-person or long
  // one is the kit's own script ("Say: …")
  const bare = (x) => x.replace(/\[[^\[\]]*\]/g, ' ').replace(/"[^"\n]*"|“[^”\n]*”/g, (q) => (q.split(/\s+/).length <= 15 && !/\b(?:I|I'm|I've|my|me|we|our)\b/.test(q) ? ' ' : q));
  const argues = (x) => CHOICE_ARG.test(bare(x)) && !(SURGEON.test(x) && !/assistant surgeon/i.test(x));
  const out = [];
  for (const line of String(text).split('\n')) {
    if (!argues(line)) { out.push(line); continue; }
    const pre = line.match(/^\s*(?:>\s*)?(?:(?:[-*+]|\d+\.)\s+)?/)[0];
    let lineBody = line.slice(pre.length);
    const label = (lineBody.match(/^\*\*[^*\n]+\*\*:?\s*/) || [''])[0];
    lineBody = lineBody.slice(label.length);
    let first = true;
    // a quote that closes inside a sentence chunk ("… doctor." Then pause.) ends the sentence here
    const sents = sentencesOf(lineBody).flatMap((s) => s.split(/(?<=[.!?]["”])(?=\s+[A-Z*_])/)).map((s) => {
      const isFirst = first; first = false;
      if (!argues(s)) return s;
      const lead = s.match(/^\s*/)[0];
      let body = s.slice(lead.length);
      // a sentence that opens or closes a quoted script keeps its quote mark when it goes
      const odd = (body.match(/["“”]/g) || []).length % 2 === 1;
      const open = (body.match(/^[*_]*["“]/) || [''])[0];
      let end = (body.match(/[.!?]["”)*_]*\s*$/) || [''])[0];
      const gone = () => (odd && open ? (isFirst ? '' : lead) + open : odd && /["”]/.test(end) ? end.replace(/^[.!?]/, '') : '');
      body = body.slice(open.length, body.length - end.length);
      // brackets never split, and travel with their clause
      const held = [];
      body = body.replace(/\[[^\[\]]*\]/g, (b) => { held.push(b); return `@@B${held.length - 1}@@`; });
      const put = (x) => x.replace(/@@B(\d+)@@/g, (m, i) => held[+i]);
      const trimmed = body.replace(CHOICE_COND, (m) => (argues(m) || CHOICE_ASIDE.test(m) ? '' : m)).replace(CHOICE_REL, (m) => (argues(m) ? '' : m)).replace(CHOICE_WITH, (m, at, all) => (/,$/.test(m) && /^\s+(?:which|who|whom|where|and|but|so|or)\b/.test(all.slice(at + m.length)) ? ',' : ''));
      if (trimmed !== body && !argues(put(trimmed)) && !CHOICE_ASIDE.test(bare(put(trimmed)))) { count++; return lead + open + put(trimmed) + end; }
      body = trimmed;
      const parts = body.split(CHOICE_SPLIT);
      const clauses = [];
      for (let i = 0; i < parts.length; i += 2) clauses.push({ sep: i ? parts[i - 1] : '', text: parts[i] });
      for (const c of clauses) { c.text = put(c.text); c.sep = put(c.sep); }
      const drop = clauses.map((c) => argues(c.text) || CHOICE_ASIDE.test(bare(c.text)));
      if (!drop.some(Boolean)) return trimmed === body ? s : lead + open + put(body) + end;
      count++;
      const rest = clauses.filter((c, i) => !drop[i]);
      if (!rest.length) return gone();
      const opened = !drop[0];
      let head = rest[0].text;
      if (!opened) {
        head = head.replace(/^(?:and|but|so)\s+/i, '');
        if (CHOICE_PRONOUN.test(head) || CHOICE_SUBORD.test(head)) return gone();
        if (CHOICE_VERB.test(head)) {
          // the subject went with the dropped clause: "I did not choose X, did not meet Y" → "I did not meet Y"
          const who = clauses[0].text.match(CHOICE_SUBJ);
          if (!who || /\b(?:them|him|they)\b/.test(head)) return gone();
          head = `${who[1]} ${head}`;
        }
        head = head.charAt(0).toUpperCase() + head.slice(1);
      }
      let joined = head + rest.slice(1).map((c) => c.sep + c.text).join('');
      if (rest.length === 1 && opened && CHOICE_FRAGMENT.test(head.replace(/^[\s*_"“]+/, ''))) return gone();
      // "A, B, and [dropped C]" keeps its list: "A, and B" (only when B is a clause of its own)
      const last = clauses.length - 1;
      if (drop[last] && /^,\s+and\s+$/.test(clauses[last].sep)) {
        joined = joined.replace(/,\s+((?:the|my|your|his|her|their|our|I|you|he|she|it|we|they|did|didn't|never|had|was|were|received|signed|met)\s+[^,]*)$/, (m, seg) => (CHOICE_FINITE.test(seg) ? `, and ${seg}` : m));
      }
      if (/[.!?]["”'*_)]*$/.test(joined)) end = end.replace(/^[.!?]/, '');
      return (isFirst ? '' : lead) + open + joined + end;
    });
    let body = sents.join('').replace(/^\s+/, '').replace(/(^|\s)(["“])\s+(?=\S)/g, '$1$2');
    if (label && (CHOICE_ASIDE.test(label) || argues(label) || CHOICE_LABEL.test(label))) { count++; continue; }
    const keepLabel = label;
    if (!body.trim()) continue;
    out.push(pre + keepLabel + body);
  }
  return { text: out.join('\n'), count };
}

module.exports = { settingLimits, dropChoiceArgument, figureCore };
