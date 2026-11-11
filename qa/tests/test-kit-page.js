// The kit on the page: the writers' marks become formatting, never stray characters.
//
// Why this exists: the page rendered **bold** but not *italics*, so a quoted objection the
// writers set in italics showed up with its asterisks, as in
//   *"The records don't show six weeks of therapy":* The discharge summary ...
// 68 of the stored kits in qa/evidence carry italics. (The emailed and copied text had the
// same marks; test-kit-text.js covers that side.)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const js = fs.readFileSync(path.join(root, 'fightpack.js'), 'utf8');

const fails = [];
let n = 0;
const same = (got, want, what) => { n++; if (got !== want) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };
const ok = (c, what) => { n++; if (!c) fails.push(what); };

// The renderer lives inside the page's closure. Take its source out of the file and run that.
function source(name) {
  const start = js.indexOf('function ' + name + '(');
  assert(start >= 0, name + '() is defined in fightpack.js');
  let i = js.indexOf('{', start), depth = 0;
  for (; i < js.length; i++) { if (js[i] === '{') depth++; else if (js[i] === '}' && --depth === 0) break; }
  return js.slice(start, i + 1);
}
const { renderBody, splitSections, extractJson } = new Function(
  ['escapeHtml', 'inline', 'renderBody', 'splitSections', 'extractJson'].map(source).join('\n') +
  '\nreturn { renderBody: renderBody, splitSections: splitSections, extractJson: extractJson };')();

// ---------- 1. italics are italics ----------
same(renderBody('- *"The records don\'t show six weeks of therapy":* The discharge summary documents treatment.'),
  '<ul><li><em>&quot;The records don\'t show six weeks of therapy&quot;:</em> The discharge summary documents treatment.</li></ul>',
  'a quoted objection in italics is shown in italics, without its asterisks');
same(renderBody('*Before the call:* have the chart open.'),
  '<p><em>Before the call:</em> have the chart open.</p>',
  'italics at the start of a paragraph');
same(renderBody('***Do this first:*** call the office today.'),
  '<p><em><strong>Do this first:</strong></em> call the office today.</p>',
  'bold and italics together are both, with no asterisk left over');
same(renderBody('*[If no peer-to-peer line is printed: accept one if offered.]*'),
  '<p><em><span class="ph">[If no peer-to-peer line is printed: accept one if offered.]</span></em></p>',
  'italics around a bracketed blank keep the blank marked as one');

// ---------- 2. what the page already did, it still does ----------
same(renderBody('**Deadline:** send it by [date].'),
  '<p><strong>Deadline:</strong> send it by <span class="ph">[date]</span>.</p>',
  'bold and bracketed blanks');
same(renderBody('* Your insurance card\n* The denial notice'),
  '<ul><li>Your insurance card</li><li>The denial notice</li></ul>',
  'a list written with asterisks is a list, not italics');
same(renderBody('Take 2 * 500 mg twice a day; the amount billed* is on page 2 (*see the notice).'),
  '<p>Take 2 * 500 mg twice a day; the amount billed* is on page 2 (*see the notice).</p>',
  'asterisks that are not emphasis are left alone');
same(renderBody('Signature: ____________ Date: ________\n\n---\n\nKeep a copy.'),
  '<p>Signature: ____________ Date: ________</p><p>Keep a copy.</p>',
  'a rule is a paragraph break and a signature line stays');

// ---------- 3. every stored kit: no text is left wrapped in asterisks on the page ----------
const evidence = path.join(root, 'qa/evidence');
const kits = fs.readdirSync(evidence).flatMap((run) => {
  const dir = path.join(evidence, run);
  return fs.statSync(dir).isDirectory() ? fs.readdirSync(dir).filter((f) => f.endsWith('.kit.md')).map((f) => path.join(dir, f)) : [];
});
ok(kits.length >= 20, 'found the recorded kits in qa/evidence (' + kits.length + ')');
const WRAPPED = /(^|[^*\w])\*[^\s*][^*\n]*\*(?![*\w])/m;            // *like this*, in the text a reader sees
const shown = (html) => html.replace(/<\/(p|li|h4|h5)>/g, '\n').replace(/<[^>]+>/g, '');
let italic = 0, sections = 0;
for (const file of kits) {
  const name = path.relative(evidence, file);
  const kit = extractJson(fs.readFileSync(file, 'utf8')).text;
  if (WRAPPED.test(kit.replace(/\*\*/g, ''))) italic++;
  const left = splitSections(kit).filter((s) => WRAPPED.test(shown(renderBody(s.body))));
  sections += splitSections(kit).length;
  ok(left.length === 0, name + ': no text is left wrapped in asterisks on the page' + (left.length ? ' (in "' + left[0].title + '")' : ''));
}
ok(italic >= 20, 'the recorded kits do carry italics (' + italic + ')');

assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 10).join('\n  - ') + (fails.length > 10 ? '\n  … and ' + (fails.length - 10) + ' more' : ''));
console.log('kit-page tests passed (' + n + ' checks; ' + kits.length + ' recorded kits, ' + sections + ' sections)');
