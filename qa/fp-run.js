// Runs the live Fight Pack generator on the corpus exactly the way the browser does:
// unlock with the preview code, part 1 (the decode) first, then parts 2–6 in parallel
// carrying the decode, with the client's retry rules.
// Usage: FP_CODE=<preview code> [FP_RUN=runs2] node fp-run.js [caseId ...]
//    or: FP_FREE=1 node fp-run.js <caseId> — the free path a visitor takes. A free token covers about four kits
//        and a visitor gets three an hour, so use the preview code (never throttled) for a full ten-case run.
//    add FP_LIVE=1 to ask for part 1 live, as the page does, and time its lines: how long until the first line,
//        the type of denial, the case strength and the finished section (qa/live-client.js).
const fs = require('fs');
const path = require('path');
const cases = require('./manifest.js');
const { readLive } = require('./live-client.js');
const BASE = process.env.FP_BASE || 'https://dr-mumbo-jumbo.com';
const RUN = process.env.FP_RUN || 'runs';
const only = process.argv.slice(2);
const CONCURRENCY = Number(process.env.FP_CONC || 2);
const LIVE = /^(1|true|yes)$/i.test(process.env.FP_LIVE || '');

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

// The same request with live: true, read as the page reads it. The result is postJSON's, plus `live`: the
// times its lines arrived (null when the server answered the plain way).
async function postLive(url, body, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms || 125000);
  const started = Date.now();
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({}, body, { live: true })), signal: ctrl.signal });
    const res = await readLive(r, started);
    clearTimeout(t);
    return Object.assign(res, { ms: Date.now() - started });
  } catch (e) {
    clearTimeout(t);
    return { ok: false, status: 0, data: { message: String(e && e.message) }, ms: Date.now() - started, live: null };
  }
}

async function unlock() {
  // FP_FREE=1 takes the free path the page uses when the site is free ({free:true}, no code).
  const free = /^(1|true|yes)$/i.test(process.env.FP_FREE || '');
  const code = process.env.FP_CODE;
  if (!free && !code) throw new Error('FP_CODE missing (or set FP_FREE=1)');
  const r = await postJSON(BASE + '/api/unlock', free ? { free: true } : { code }, 30000);
  if (!r.ok) throw new Error('unlock failed: ' + r.status + ' ' + JSON.stringify(r.data));
  return r.data.token;
}
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
// A corpus file sent the way the page sends it: a PDF as a document, a photo as an image.
const MEDIA = { '.pdf': ['pdf', 'application/pdf'], '.jpg': ['image', 'image/jpeg'], '.jpeg': ['image', 'image/jpeg'], '.png': ['image', 'image/png'] };
function attach(name) {
  if (!name) return null;
  const m = MEDIA[path.extname(name).toLowerCase()];
  if (!m) throw new Error('unsupported corpus file ' + name);
  return { kind: m[0], media_type: m[1], data: fs.readFileSync(path.join(__dirname, 'corpus', name)).toString('base64') };
}

async function fetchPart(p, token, inp, extraBody, dir, log) {
  // src: 'qa' marks these kits in the site's own count, so test runs can be left out of "kits built by place".
  const body = () => Object.assign({ token, part: p, src: 'qa' }, inp, extraBody || {});
  const ask = () => postJSON(BASE + '/api/fightpack', body());
  const attempts = [];
  const rec = (res, retry) => attempts.push({ status: res.status, ms: res.ms, stop: res.data.stop, missing: res.data.missing, usage: res.data.usage, retry, live: res.live || undefined });
  // FP_LIVE: part 1 is asked for live the first time, as the page asks; asking again is done the plain way.
  const liveAsk = LIVE && p === 1;
  let res = await (liveAsk ? postLive(BASE + '/api/fightpack', body()) : ask()); rec(res);
  if (liveAsk) {
    const id = path.basename(dir);
    const sec = (ms) => (ms === null ? 'never' : (ms / 1000).toFixed(1) + 's');
    if (res.live) console.log(`[${id}] live · first ${sec(res.live.first_ms)} · type ${sec(res.live.type_ms)} · grade ${sec(res.live.grade_ms)} · done ${sec(res.live.done_ms)} · redo ${res.live.redo} · ${res.live.messages} messages`);
    else console.log(`[${id}] live · the server answered the plain way (status ${res.status}, ${res.ms} ms): no lines to time`);
    if (!res.ok) console.log(`[${id}] live · FAILED with ${res.status} ${JSON.stringify(res.data).slice(0, 160)}; part 1 is asked for again the plain way, so it is written twice`);
  }
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
  const inp = { denial: c.denial || '', extra: c.extra || '', file: attach(c.file), records: attach(c.records) };
  const log = [];
  const parts = {};
  const t0 = Date.now();
  const r1 = await fetchPart(1, token, inp, null, dir, log);
  if (!r1.ok) { console.log(`[${c.id}] part 1 FAILED ${r1.status} ${JSON.stringify(r1.data).slice(0, 200)}`); return { log, wall_ms: Date.now() - t0 }; }
  parts[1] = r1.data.text || '';
  const t1 = Date.now();
  console.log(`[${c.id}] decode ok · ${r1.ms} ms · ${parts[1].length} chars`);
  const decode = parts[1].slice(0, 8000); // the client's cap (fightpack.js)
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
