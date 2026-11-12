// Usage: node replay-diff.js <the qa folder of another checkout> [run ...]
// The gate for a change to the code steps that run after the model (the guards, api/fightpack.js's own steps and
// api/_lib/fightpack-facts.js): every stored part, replayed as the server runs it by the other checkout and by this
// one, and every line the two treat differently. guard-diff.js does this for the guards alone.
// First, in both checkouts, extract the raw runs and replay them:
//   cd qa && for t in evidence/raw-runs*.tar.gz; do tar xzf "$t"; done
//   for r in $(ls -d runs* | grep -v replay); do node replay-guards.js $r $r-replay; done
// With no runs named, every replay found in the other checkout is compared.
const fs = require('fs'), path = require('path');
const OTHER = path.resolve(process.argv[2] || ''), HERE = __dirname;
if (!process.argv[2] || !fs.existsSync(OTHER)) { console.error('usage: node replay-diff.js <the qa folder of another checkout> [run ...]'); process.exit(2); }
const num = (r) => parseInt(r.replace(/\D+/g, ''), 10) || 0;
const runs = (process.argv.length > 3 ? process.argv.slice(3) : fs.readdirSync(OTHER).filter((d) => /-replay$/.test(d)).map((d) => d.replace(/-replay$/, ''))).sort((a, b) => num(a) - num(b));
let kits = 0, parts = 0, differ = 0; const out = [], missing = [];
for (const run of runs) {
  const a = path.join(OTHER, run + '-replay'), b = path.join(HERE, run + '-replay');
  if (!fs.existsSync(a) || !fs.existsSync(b)) { missing.push(run); continue; }
  for (const c of fs.readdirSync(a).filter((d) => /^[A-J]-/.test(d))) {
    kits++;
    for (let p = 1; p <= 6; p++) {
      const fa = path.join(a, c, `part${p}.json`), fb = path.join(b, c, `part${p}.json`);
      if (!fs.existsSync(fa) || !fs.existsSync(fb)) continue;
      parts++;
      const ta = JSON.parse(fs.readFileSync(fa, 'utf8')).data.text, tb = JSON.parse(fs.readFileSync(fb, 'utf8')).data.text;
      if (ta === tb) continue;
      differ++;
      const la = ta.split('\n'), lb = tb.split('\n');
      if (la.length !== lb.length) out.push(`${run} ${c[0]} part ${p}: ${la.length} lines there, ${lb.length} here`);
      for (let i = 0; i < Math.max(la.length, lb.length); i++) if (la[i] !== lb[i]) out.push(`${run} ${c[0]} part ${p}\n   there: ${la[i] === undefined ? '(no line)' : la[i]}\n   here:  ${lb[i] === undefined ? '(no line)' : lb[i]}`);
    }
  }
}
if (out.length) console.log(out.join('\n') + '\n');
if (missing.length) console.log(`not replayed in both checkouts, so not compared: ${missing.join(', ')}`);
console.log(`runs ${runs.length - missing.length} · kits ${kits} · parts ${parts} · parts that differ ${differ}`);
