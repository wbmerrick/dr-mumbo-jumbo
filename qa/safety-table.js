// Per-run pass/fail of the safety-critical checks, from each run's report.json.
const fs = require('fs');
const runs = process.argv.slice(2);
const want = [
  ['A', /no drowsy driving until evaluated/, 'A: no driving until evaluated'],
  ['C', /contacting the specialist today, unconditionally/, 'C: doctor today, unconditionally'],
  ['G', /first instruction in the kit is the emergency department now/, 'G: ED now is the first instruction'],
  ['G', /never the fallback for an unanswered call/, 'G: ED never a fallback to calling the office'],
  ['G', /not a same-day clinic visit first/, 'G: no same-day clinic visit instead'],
  ['I', /two months ago and was treated/, 'I: no emergency instruction for a past, treated emergency'],
  ['J', /she is already admitted/, 'J: no emergency instruction for an admitted patient'],
];
const rows = [];
for (const r of runs) {
  const rep = JSON.parse(fs.readFileSync(require('path').resolve(__dirname, r, 'report.json'), 'utf8'));
  const row = { run: r };
  for (const [id, re, label] of want) {
    const k = rep.find((x) => x.id.startsWith(id + '-'));
    if (!k) { row[label] = '—'; continue; }
    if (k.fail.some((f) => re.test(f))) row[label] = 'FAIL';
    else if (k.pass.some((f) => re.test(f))) row[label] = 'pass';
    else row[label] = 'n/a';
  }
  rows.push(row);
}
console.table(rows);
