// Runs the live Fight Pack generator on the corpus exactly the way the browser does:
// unlock with the preview code, part 1 (the decode) first, then parts 2–6 in parallel
// carrying the decode, with the client's retry rules.
// Usage: FP_CODE=<preview code> [FP_RUN=runs2] node fp-run.js [caseId ...]
const fs = require('fs');
const path = require('path');
const cases = require('./manifest.js');
const BASE = process.env.FP_BASE || 'https://dr-mumbo-jumbo.com';
const RUN = process.env.FP_RUN || 'runs';
const only = process.argv.slice(2);
const CONCURRENCY = Number(process.env.FP_CONC || 2);

async function postJSON(url, body, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 125000);
  const started = Date.now();
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
    const data = await r.json().catch(() => ({}));
    clearTimeout(t);
    return { ok: r.ok, status: r.status, data, ms: Date.now() - started };
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, data: { message: String(e && e.message) }, ms: Date.now() - started };
  }
}

async function unlock() {
  const code = process.env.FP_CODE;
  if (!code) throw new Error('FP_CODE missing');
  const r = await postJSON(BASE + '/api/unlock', { code }, 30000);
  if (!r.ok) throw new Error('unlock failed: ' + r.status + ' ' + JSON.stringify(r.data));
  return r.data.token;
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchPart(p, token, inp, extraBody, dir, log) {
  const ask = () => postJSON(BASE + '/api/fightpack', Object.assign({ token, part: p }, inp, extraBody || {}));
  const attempts = [];
  const rec = (res, retry) => attempts.push({ status: res.status, ms: res.ms, stop: res.data.stop, missing: res.data.missing, usage: res.data.usage, retry });
  let res = await ask(); rec(res);
  if (!res.ok && (res.status === 0 || res.status >= 500)) { await sleep(1500); res = await ask(); rec(res, '5xx'); }
  if (res.ok && res.data.missing && res.data.missing.length) {
    const res2 = await ask(); rec(res2, 'missing');
    if (res2.ok && (!res2.data.missing || res2.data.missing.length < res.data.missing.length)) res = res2;
  }
  fs.writeFileSync(path.join(dir, `part${p}.json`), JSON.stringify({ ok: res.ok, status: res.status, data: res.data, attempts }, null, 2));
  log.push({ part: p, attempts, final: { ok: res.ok, status: res.status, stop: res.data.stop, missing: res.data.missing, chars: (res.data.text || '').length, usage: res.data.usage } });
  return res;
}

async function runCase(c, token) {
  const dir = path.join(__dirname, RUN, c.id);
  fs.mkdirSync(dir, { recursive: true });
  const inp = { denial: c.denial || '', extra: c.extra || '', file: null, records: null };
  if (c.file) {
    const buf = fs.readFileSync(path.join(__dirname, 'corpus', c.file));
    inp.file = { kind: 'image', media_type: 'image/jpeg', data: buf.toString('base64') };
  }
  const log = [];
  const parts = {};
  const t0 = Date.now();
  const r1 = await fetchPart(1, token, inp, null, dir, log);
  if (!r1.ok) { console.log(`[${c.id}] part 1 FAILED ${r1.status} ${JSON.stringify(r1.data).slice(0, 200)}`); return { log, wall_ms: Date.now() - t0 }; }
  parts[1] = r1.data.text || '';
  const t1 = Date.now();
  console.log(`[${c.id}] decode ok · ${r1.ms} ms · ${parts[1].length} chars`);
  const decode = parts[1].slice(0, 6000);
  const rest = await Promise.all([2, 3, 4, 5, 6].map((p) => fetchPart(p, token, inp, { decode }, dir, log)));
  rest.forEach((res, i) => { const p = i + 2; if (res.ok) parts[p] = res.data.text || ''; console.log(`[${c.id}] part ${p} ${res.ok ? 'ok' : 'FAILED ' + res.status} · ${res.ms} ms · stop=${res.data.stop} · missing=${(res.data.missing || []).length} · cache_read=${res.data.usage ? res.data.usage.cache_read : '?'}`); });
  const wall = { total_ms: Date.now() - t0, decode_ms: t1 - t0, parallel_ms: Date.now() - t1 };
  console.log(`[${c.id}] wall ${Math.round(wall.total_ms / 1000)}s (decode ${Math.round(wall.decode_ms / 1000)}s + parallel ${Math.round(wall.parallel_ms / 1000)}s)`);
  fs.writeFileSync(path.join(dir, 'kit.md'), [1, 2, 3, 4, 5, 6].map((p) => parts[p]).filter(Boolean).join('\n\n'));
  fs.writeFileSync(path.join(dir, 'log.json'), JSON.stringify({ log, wall }, null, 2));
  return { log, wall };
}

(async () => {
  const token = await unlock();
  console.log('unlocked; token length', token.length);
  const todo = cases.filter((c) => !only.length || only.includes(c.id));
  const queue = todo.slice();
  const results = {};
  async function worker() {
    while (queue.length) {
      const c = queue.shift();
      try { results[c.id] = await runCase(c, token); } catch (e) { results[c.id] = { error: String(e) }; console.log(`[${c.id}] ERROR ${e}`); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
  fs.writeFileSync(path.join(__dirname, RUN, 'summary.json'), JSON.stringify(results, null, 2));
  console.log('done');
})();
