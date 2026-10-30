// Usage: OLD=<path to an older lib/fightpack-guards.js> node guard-diff.js <runDir ...>
// Runs an older and the current guards over every stored part and prints each line that differs.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const OLD = require(process.env.OLD), NEW = require(path.join(__dirname, '..', 'lib', 'fightpack-guards.js'));
const M = require(path.join(__dirname, 'manifest.js'));
const seen = new Set(); let parts = 0, changedParts = 0; const byStep = {}; let safetyDiff = 0, decodes = 0;
const out = [];
for (const r of process.argv.slice(2)) for (const c of fs.readdirSync(r).filter((d) => /^[A-H]-/.test(d))) {
  const m = M.find((x) => x.id === c) || {};
  let decode; try { decode = JSON.parse(fs.readFileSync(path.join(r, c, 'part1.json'), 'utf8')).data.text; } catch { continue; }
  decodes++; if (OLD.safetyOf(decode) !== NEW.safetyOf(decode)) { safetyDiff++; out.push(`SAFETY ${r} ${c}: ${OLD.safetyOf(decode)} -> ${NEW.safetyOf(decode)}`); }
  for (let p = 1; p <= 6; p++) {
    let t; try { t = JSON.parse(fs.readFileSync(path.join(r, c, `part${p}.json`), 'utf8')).data.text; } catch { continue; }
    const h = crypto.createHash('sha1').update(c + p + t).digest('hex'); if (seen.has(h)) continue; seen.add(h); parts++;
    const opt = { part: p, safety: p > 1 ? NEW.safetyOf(decode) : null, known: [m.denial || '', m.extra || '', p > 1 ? decode : ''].join('\n'), attachments: !!m.file, records: false };
    const a = OLD.postProcess(t, opt), b = NEW.postProcess(t, opt);
    if (a.text === b.text) continue; changedParts++;
    for (const k of new Set([...Object.keys(a.counts), ...Object.keys(b.counts)])) { const d = (b.counts[k] || 0) - (a.counts[k] || 0); if (d) byStep[k] = (byStep[k] || 0) + d; }
    const al = a.text.split('\n'), bl = b.text.split('\n'); let sec = '';
    for (let i = 0; i < bl.length; i++) { const hm = bl[i].match(/^## (\d+)\./); if (hm) sec = hm[1]; if (al[i] !== bl[i]) { const br = (x) => x.match(/\[(?:[^\[\]]|\[[^\[\]]*\])*\]/g) || []; const old = br(al[i]); const added = br(bl[i]).filter((x) => { const j = old.indexOf(x); if (j >= 0) { old.splice(j, 1); return false; } return true; }); for (const x of added) { const at = bl[i].indexOf(x); out.push(`${r.replace(/rescore\//, '')} ${c[0]} p${p} §${sec}: …${bl[i].slice(Math.max(0, at - 70), at)}${x.length > 200 ? x.slice(0, 200) + '…]' : x}${bl[i].slice(at + x.length, at + x.length + 40)}…`); } } }
  }
}
console.log(out.join('\n'));
console.log(`\ndecodes ${decodes} · safety changed ${safetyDiff} · distinct parts ${parts} · parts changed ${changedParts} · count deltas ${JSON.stringify(byStep)}`);
