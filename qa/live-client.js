// Reads the reply to a live request for part 1 the way the page does (fightpack.js, postLive), and
// times it: how long until the first line, until the type of denial, until the case-strength line,
// until the finished section. fp-run.js uses it with FP_LIVE=1 to measure the live first read on the
// deployed site, where the question is not whether the lines are right (qa/tests/test-live-read.js)
// but whether they arrive one by one or are held back and delivered all at the end.
const { modelEvents } = require('../api/_lib/fightpack-live.js');

// response: what fetch gave back. t0: when the request was sent (Date.now()).
// A plain reply (the off switch, an error before any line) comes back as { ok, status, data } with
// live: null. A stream comes back with the finished reply (or the error) as data, and
//   live: { first_ms, type_ms, grade_ms, done_ms, redo, messages }
// a time that never came is null; redo counts lines changed after they were shown; messages counts
// everything read. A stream that stops with neither is a dropped connection: ok false, status 0.
async function readLive(response, t0) {
  const type = String((response.headers && response.headers.get('content-type')) || '');
  if (!type.startsWith('text/event-stream')) {
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data, live: null };
  }
  const live = { first_ms: null, type_ms: null, grade_ms: null, done_ms: null, redo: 0, messages: 0 };
  let shown = [];
  for await (const m of modelEvents(response.body)) {
    const ms = Date.now() - t0;
    live.messages++;
    if (m.done) {
      live.done_ms = ms;
      return { ok: true, status: 200, data: m.done, live };
    }
    if (m.error) return { ok: false, status: m.error.status || 0, data: m.error, live };
    if (!m.lines) continue;
    if (live.first_ms === null) live.first_ms = ms;
    if (m.from < shown.length) live.redo++;
    shown = shown.slice(0, m.from).concat(m.lines);
    if (live.type_ms === null && m.lines.some((l) => l.includes('**Type of denial'))) live.type_ms = ms;
    if (live.grade_ms === null && m.lines.some((l) => l.includes('**Case strength'))) live.grade_ms = ms;
  }
  return { ok: false, status: 0, data: { message: 'the stream ended before the section was finished' }, live };
}

module.exports = { readLive };
