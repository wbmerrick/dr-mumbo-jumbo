// The kit as it is emailed and copied: the page's markdown with the marks taken off, and
// nothing taken off with them.
//
// Why this exists: the first whole kit emailed from production (the homepage's own example,
// 2026-11-10) arrived with five lines of "---" and three lines wrapped in single asterisks.
// The writers put a rule between two documents and italics on a quoted objection. The page
// already treats a rule as a paragraph break, but plain() - the one function between the kit
// and the email, "Copy everything" and each section's Copy button - only took off ** and
// heading hashes. Most recorded kits in qa/evidence carry the same marks.
//
// A fix that takes marks off can take content off with them. So besides the literal cases,
// every recorded kit is put through the page's own path and checked the other way round:
// every character that is not a mark is still there, in order, in every section.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const js = fs.readFileSync(path.join(root, 'fightpack.js'), 'utf8');

const fails = [];
let n = 0;
const same = (got, want, what) => { n++; if (got !== want) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };
const ok = (c, what) => { n++; if (!c) fails.push(what); };

// The helpers live inside the page's closure. Take their source out of the file and run that,
// so this tests the code the page ships and not a copy of it.
function source(name) {
  const start = js.indexOf('function ' + name + '(');
  assert(start >= 0, name + '() is defined in fightpack.js');
  let i = js.indexOf('{', start), depth = 0;
  for (; i < js.length; i++) { if (js[i] === '{') depth++; else if (js[i] === '}' && --depth === 0) break; }
  return js.slice(start, i + 1);
}
// kitText() reads the page's sectionOrder and deadlinesText(); they are handed in here.
const page = new Function('sectionOrder', 'deadlinesText',
  ['plain', 'splitSections', 'extractJson', 'kitText'].map(source).join('\n') +
  '\nreturn { plain: plain, splitSections: splitSections, extractJson: extractJson, kitText: kitText };');
const { plain, splitSections, extractJson } = page([], () => '');
const emailed = (sections, deadlines) => page(sections, () => deadlines).kitText();

// ---------- 1. the marks come off ----------
same(plain('Signature: _________________________ Date: _____________\n\n---\n\nIf your plan is self-funded: use the same letter.'),
  'Signature: _________________________ Date: _____________\n\nIf your plan is self-funded: use the same letter.',
  'a rule between two documents is a paragraph break, not a line of hyphens');
same(plain('NPI [NPI number]\n[Practice phone and fax]\n\n---'),
  'NPI [NPI number]\n[Practice phone and fax]',
  'a rule that closes a section leaves nothing behind');
same(plain('- *"The records don\'t show six weeks of therapy":* The discharge summary documents treatment from [dates].'),
  '- "The records don\'t show six weeks of therapy": The discharge summary documents treatment from [dates].',
  'italics on a quoted objection lose their asterisks');
same(plain('***Do this first:*** call the office today.'),
  'Do this first: call the office today.',
  'bold and italics together come off together');
same(plain('### Criteria met\n\n**Safety first:** call today.'),
  'Criteria met\n\nSafety first: call today.',
  'bold and sub-heading marks still come off');

// ---------- 2. what only looks like a mark stays ----------
for (const [text, what] of [
  ['Sincerely,\n\n____________________________\n[Your name]', 'a signature line of underscores'],
  ['- Date and time: ______________________\n- Call reference number: ______________________', 'fill-in blanks in a call log'],
  ['* Your insurance card\n* The denial notice', 'a list written with asterisks'],
  ['Take 2 * 500 mg twice a day; the amount billed* is on page 2 (*see the notice).', 'asterisks that are not emphasis'],
  ['EBSA, U.S. Department of Labor, 1-866-444-3272 - weekdays 8-5', 'hyphens inside a line'],
  ['[If no peer-to-peer line is printed: I am available [days/times] at [direct phone number].]', 'bracketed blanks']
]) same(plain(text), text, 'content, left alone: ' + what);

// ---------- 3. a kit, as the page emails it ----------
// Three parts as /api/fightpack returns them, with the marks where the writers put them.
const PARTS = [
  ['## 3. Letter of medical necessity — for your doctor to sign', '', '[Practice letterhead]', '', '### Criteria met', '',
    'Your Policy IMG-204 requires "at least six weeks of conservative therapy unless red-flag findings are present."', '',
    'Sincerely,', '', '[Clinician name, credentials]', 'NPI [NPI number]', '', '---', '',
    "## 4. Note for your doctor's office", '',
    '- **What this is:** A pre-drafted letter for the doctor to review, edit, sign, and send.',
    '- **Deadline:** The appeal must be received by March 31, 2027.'],
  ['## 5. Peer-to-peer talking points — for your doctor', '', '**If they push back:**',
    '- *"The records don\'t show six weeks of therapy":* The discharge summary documents treatment from [dates].',
    '- *"Weakness alone doesn\'t meet red-flag criteria":* What specific red-flag findings does the policy require?', '', '---', '',
    '## 6. Phone script — calling the insurer', '', '**Call log (fill in after the call):**',
    '- Date and time: ______________________', '- Representative name: ______________________'],
  ['## 9. If they say no again — external review request', '',
    'Signature: _________________________ Date: _____________', '', '---', '',
    '**If your plan is self-funded:** use the same letter.', '', '- Keep copies of everything you send.', '', '---', '',
    '## 10. Your deadlines and next moves', '',
    '- **Appeal deadline:** Your letter states "within 180 days of this notice."']
].map((lines) => lines.join('\n'));
const DEADLINES = 'YOUR DEADLINES\n- File your internal appeal by: Wed, Mar 31, 2027 (180 days from the notice date, as your letter says.)';
const WANT = [
  '3. Letter of medical necessity — for your doctor to sign', '', '[Practice letterhead]', '', 'Criteria met', '',
  'Your Policy IMG-204 requires "at least six weeks of conservative therapy unless red-flag findings are present."', '',
  'Sincerely,', '', '[Clinician name, credentials]', 'NPI [NPI number]', '', '',
  "4. Note for your doctor's office", '',
  '- What this is: A pre-drafted letter for the doctor to review, edit, sign, and send.',
  '- Deadline: The appeal must be received by March 31, 2027.', '', '',
  '5. Peer-to-peer talking points — for your doctor', '', 'If they push back:',
  '- "The records don\'t show six weeks of therapy": The discharge summary documents treatment from [dates].',
  '- "Weakness alone doesn\'t meet red-flag criteria": What specific red-flag findings does the policy require?', '', '',
  '6. Phone script — calling the insurer', '', 'Call log (fill in after the call):',
  '- Date and time: ______________________', '- Representative name: ______________________', '', '',
  '9. If they say no again — external review request', '',
  'Signature: _________________________ Date: _____________', '',
  'If your plan is self-funded: use the same letter.', '', '- Keep copies of everything you send.', '', '',
  '10. Your deadlines and next moves', '',
  '- Appeal deadline: Your letter states "within 180 days of this notice."', '', '',
  DEADLINES
].join('\n');
same(emailed(PARTS.flatMap((p) => splitSections(p)), DEADLINES), WANT, 'the emailed kit is every section in order, clean, then the deadlines');

// ---------- 4. every recorded kit: clean, and nothing but the marks gone ----------
// A mark is a heading hash, an asterisk, or a whole line of hyphens; white space is layout.
// Taken off both sides, what is left of the kit and of the email must be the same text.
const evidence = path.join(root, 'qa/evidence');
const kits = fs.readdirSync(evidence).flatMap((run) => {
  const dir = path.join(evidence, run);
  return fs.statSync(dir).isDirectory() ? fs.readdirSync(dir).filter((f) => f.endsWith('.kit.md')).map((f) => path.join(dir, f)) : [];
});
ok(kits.length >= 20, 'found the recorded kits in qa/evidence (' + kits.length + ')');
const bare = (s) => s.replace(/[#*\s]/g, '');
let rules = 0, starred = 0, sectionsSeen = 0;
for (const file of kits) {
  const name = path.relative(evidence, file);
  const kit = extractJson(fs.readFileSync(file, 'utf8')).text;          // as the page holds it: part 6 without its json block
  const lines = kit.split(/\r?\n/);
  const isRule = (l) => /^-{3,}$/.test(l.trim());
  const headings = lines.filter((l) => /^##\s+\d{1,2}\./.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  if (lines.some(isRule)) rules++;
  if (/(^|[^*\w])\*[^\s*][^*\n]*\*(?![*\w])/m.test(kit.replace(/\*\*/g, ''))) starred++;
  const text = emailed(splitSections(kit), '');
  const out = text.split('\n');
  ok(!out.some(isRule), name + ': no line of hyphens is left in the emailed text');
  ok(!/(^|[^*\w])\*[^\s*][^*\n]*\*(?![*\w])/m.test(text), name + ': nothing is left wrapped in asterisks');
  same(bare(text), bare(lines.filter((l) => !isRule(l)).join('\n')), name + ': every character that is not a mark is still there, in order');
  same(headings.filter((h) => out.includes(h)).length, headings.length, name + ': every section the kit has is in the email under its own title');
  sectionsSeen += headings.length;
}
ok(rules >= 20 && starred >= 20, 'the recorded kits do carry the marks this is about (' + rules + ' with rules, ' + starred + ' with italics)');

assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 12).join('\n  - ') + (fails.length > 12 ? '\n  … and ' + (fails.length - 12) + ' more' : ''));
console.log('kit-text tests passed (' + n + ' checks; ' + kits.length + ' recorded kits, ' + sectionsSeen + ' sections)');
