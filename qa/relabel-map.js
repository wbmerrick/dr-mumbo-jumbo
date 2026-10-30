// Usage: node relabel-map.js <runDir ...>
// Where do the guard's nine relabels appear unbracketed, by section, when the patient's own material never uses the term?
const fs = require('fs'), path = require('path');
const M = require(path.join(__dirname, 'manifest.js'));
const fam = [['retention', /\b(?:urinary retention|retention of urine)\b/i, /retention/i], ['foot drop', /\b(?:foot drop|drop foot)\b/i, /foot drop|drop foot/i], ['saddle anesthesia', /\bsaddle an(?:a)?esthesia\b/i, /saddle an/i], ['incontinence', /incontinence/i, /incontinen/i], ['falls', /\b(?:causing|with|recurrent|frequent|multiple|repeated|several|history of|has had|had) falls\b|\bhas fallen\b/i, /\bfall(?:s|en|ing)?\b|fell (?:down|over)/i], ['near-miss', /\bnear[- ]miss|\bmotor vehicle (?:accident|crash|collision)/i, /near[- ]miss|accident|crash|collision/i], ['malnutrition', /malnutrition|cachexia/i, /malnutrition|cachexia/i], ['hypoxemia', /\bhypox(?:emia|aemia|ia)\b/i, /hypox/i], ['volume overload', /volume overload/i, /volume overload/i]];
const tally = {};
for (const r of process.argv.slice(2)) for (const c of fs.readdirSync(r).filter((d) => /^[A-H]-/.test(d))) {
  const m = M.find((x) => x.id === c) || {}; const src = [m.denial || '', m.extra || ''].join('\n');
  const kit = fs.readFileSync(path.join(r, c, 'kit.md'), 'utf8'); let sec = '0';
  for (const line of kit.split('\n')) {
    const h = line.match(/^## (\d+)\./); if (h) { sec = h[1]; continue; }
    const t = line.replace(/\[(?:[^\[\]]|\[[^\[\]]*\])*\]/g, ' '); // brackets, one level of nesting included
    for (const [name, re, sre] of fam) if (!sre.test(src) && re.test(t)) { const k = `${c[0]} ${name} §${sec}`; tally[k] = tally[k] || new Set(); tally[k].add(r.replace(/rescore\//, '')); }
  }
}
const rows = Object.entries(tally).map(([k, v]) => [k, v.size, [...v].join(',')]).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
for (const [k, n, runs] of rows) console.log(`${k.padEnd(28)} runs: ${n}  (${runs})`);
