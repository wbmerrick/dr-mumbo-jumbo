# Live First Read Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the kit's first section line by line as the AI writes it, each line only after the existing safety guards have passed it.

**Architecture:** For part 1 the server asks the AI for a streamed answer and runs the text so far through the same guard function the finished section uses. Once there is a settled line to show, the reply becomes a stream of server-sent events: the settled lines as they come, then today's reply object. The page draws those lines in the first document and swaps in the finished section on the last message. A request without `live: true`, and a live request that ends before any line is shown, are answered exactly as today.

**Tech Stack:** Plain Node 22, no dependencies, no build step. Vercel Node functions (`module.exports = async (req, res)`). Browser code is one ES5-style IIFE (`fightpack.js`). Tests are standalone Node scripts in `qa/tests/`.

**Spec:** `docs/superpowers/specs/2026-11-11-live-first-read-design.md`

**Checked before writing this plan** (scratch scripts, not in the repo). All 169 stored first sections were replayed through the release rule of Task 2 with today's guards: no shown line was ever corrected, every shown line was a line of the finished section, and how the text was cut up made no difference. The guards cost about 4 ms per section. Each of the eleven raw lines in Task 3 was confirmed to be changed by today's guards and kept off the page. The AI's streaming format was checked against its documentation. The 16 existing suites pass on this branch.

**As built.** The tasks below are the plan as it was approved. Where the code differs, the spec's last section, "Changed while building", says how and why: the kit's controls return when the kit is done rather than when the first section is finished; the page holds the reader's place instead of merely not scrolling; the off switch needs a redeploy; and `postLive` is its own function, without the `r.ok` and `getReader` checks Task 4 lists. Six more changes followed the independent review of the finished branch (the spec's items 5 to 10).

## Global Constraints

- The AI's instructions do not change: no edit to `api/_lib/fightpack-prompts.js`, `fightpack-sections.js`, `fightpack-preamble.js`, `fightpack-rules.js`, nor to `PARTS`, `max_tokens`, `stop_sequences` or the model name.
- A request without `live: true` behaves exactly as before. `live` is honored only when it is the boolean `true`, the part is 1, and `FIGHTPACK_LIVE` is not `off`.
- A live request that ends or fails before any line has been sent is answered with plain JSON, exactly as a request without `live` would be.
- The two held lines are the labelled lines "What you may actually owe" (also written "What you may owe") and "Do this first".
- Wire messages, each sent as `data: <json>\n\n`, are exactly: `{"from": N, "lines": [...]}`, `{"done": {...}}`, `{"error": {"status", "error", "message"}}`.
- A count line holds `evt, kid, part, safety, urgent, missing, src`, plus `redo` on a live part 1 only.
- No new dependency, no new stored data, no change to `privacy.html`. `.vercelignore` needs no change: files under `api/` deploy, files under `qa/` do not.
- Page code stays ES5 style inside the existing IIFE: `var`, `function`, promises; no arrow functions, no `async`/`await`.
- Tests are written first and watched to fail. Style: one script per suite with an async main, `ok(cond, message)` / `same(got, want, message)` checks, exit code 1 on any failure, last line `<name> tests passed (N checks)`. Model the harnesses on `qa/tests/test-count.js` (server) and `qa/tests/test-source.js` (page).
- Run one suite with `node qa/tests/<file>.js`; all with `for t in qa/tests/*.js; do node "$t" || exit 1; done`.
- Every commit message ends with the two attribution lines this repo's history uses (`Co-Authored-By:` and `Claude-Session:`).

## Review Focus

1. **The reply arrives all at once** (a network holds the stream back): every message in one read. Expected: the finished kit, with no leftover `live` or `slim` state. Test in Task 4.
2. **The answer stalls mid-way.** Today the 110-second timer is cleared as soon as the AI starts answering; on the live path that would leave no limit at all. Expected: the limit is still running while the answer is read, and firing it gives today's timeout message. Test in Task 3.
3. **A message or a character split across two reads in the browser.** Expected: the same lines as when unsplit. Test in Task 4.
4. **The first section comes back short** (cut off, or its heading missing) after a live view was shown, so today's ask-once-more rule fires. Expected: live view cleared, progress panel full size, one plain re-ask. Test in Task 4.
5. **The answer starts with blank lines or a sentence before the heading, or never has a heading.** Expected: nothing is shown before the heading; with no heading at all, the reply is today's plain reply. Tests in Tasks 2 and 3.

---

### Task 1: One guard path and one finishing path

**Files:**
- Modify: `api/fightpack.js:568-590` (from `const data = await upstream.json()` to the `res.status(200).json(...)`) and the `_test` export on the last line
- Test: create `qa/tests/test-live-read.js`

**Interfaces:**
- Produces: `guardPart(raw, c) -> { text, norm, post }`. `raw` is the AI's text, trimmed. `c = { part, safety, denial, extra, decode, files, records, funding }`; `files` is true when any file was attached, `records` when records were. Its body is today's lines 578–582, unchanged.
- Produces: `decodeText(raw, c) -> string`: `guardPart(String(raw).trim(), { part: 1, safety: null, decode: '', funding: null, denial, extra, files, records }).text`.
- Produces: `finish(raw, model, c) -> Promise<{ status, body }>`. `model = { stop_reason, usage }`, `usage` in the AI's field names or absent. `c` is `guardPart`'s `c` plus `{ kid, src, sid, urgent, deadline, clock, redo }` (`sid` is the reply's `'preview' | 'free' | 'paid'`; `deadline` is the handler's computed deadline or null). Empty `raw` gives `{ status: 502, body: { error: 'upstream', message: 'That part came back empty. Try again in a moment.' } }`. Otherwise `{ status: 200, body }`, where `body` is today's reply object, field for field. `finish` makes the one `count('kit_part', ...)` call and adds `redo` to it only when `c.redo` is a number.
- Produces: `module.exports._test.decodeText`.

- [ ] **Step 1: Write the failing test.** Harness as in `test-count.js` (env, `mockRes`, the `[dmj]` line capture, a `global.fetch` that answers the count call with 204 and the AI call with `reply`, `stop_reason: 'end_turn'` and `usage: { input_tokens: 11, output_tokens: 7 }`). `FIRST` is section 1 of every `qa/evidence/runs*/*.kit.md`: `{ file, text }`, from `## 1. ` to the line before `## 2. `. `DENIAL = 'NOTICE OF ADVERSE DETERMINATION. Prior authorization denied.'`. `plain(text, { denial = DENIAL } = {})` calls the handler for part 1 with no `live` field.

```js
ok(FIRST.length >= 169, 'the stored kits give their first sections (' + FIRST.length + ')');
for (const s of FIRST) {
  const res = await plain(s.text);
  ok(res.code === 200 && res.body.text === T.decodeText(s.text, { denial: DENIAL, extra: '', files: false, records: false }),
    s.file + ': the reply is what decodeText gives');
}
```

- [ ] **Step 2: Run it.** `node qa/tests/test-live-read.js` → FAIL: `T.decodeText is not a function`.
- [ ] **Step 3: Implement `guardPart`, `decodeText`, `finish`** by moving the existing lines. The handler's plain path becomes `const r = await finish(raw, data, c); res.status(r.status).json(r.body);`. No behavior change.
- [ ] **Step 4: Run it, then every suite.** The new test passes; the 16 existing suites pass with no edits.
- [ ] **Step 5: Commit** (`Kit builder: one guard path and one finishing path`).

### Task 2: The live helpers

**Files:**
- Create: `api/_lib/fightpack-live.js`
- Test: `qa/tests/test-live-read.js` (second block)

**Interfaces:**
- Produces: `modelEvents(body) -> AsyncGenerator<object>`. `body` is an async iterable of `Uint8Array`. Yields the parsed JSON of each `data:` line of a server-sent-event stream; lines end with `\n` or `\r\n`; blank lines, `event:` lines, comment lines and any `data:` that is not JSON are skipped. Decodes with one `TextDecoder` in streaming mode.
- Produces: `HELD: RegExp[]`: two patterns matching a line whose label is "What you may actually owe" / "What you may owe", or "Do this first", with or without a leading bullet and bold marks.
- Produces: `showable(text) -> string[]`. Split into lines; drop leading and trailing blank lines. If the first line does not start with `## 1.`, return `[]`. Otherwise drop the last line, cut before the first line matching `HELD`, and drop trailing blank lines again.
- Produces: `liveReader(guard) -> { push(delta), raw(), redo() }`. `guard: (prefix: string) => string`. `push(delta)` appends `delta`. If the text's last line break has not moved since the last push, it returns `null` without calling `guard`. Otherwise it computes `showable(guard(text up to and including its last line break))` and compares it with the list it last returned: equal → `null`; otherwise `{ from, lines }`, where `from` is the first index at which the two lists differ (their common length when one is the start of the other) and `lines` is the new list from there. `redo()` counts returns whose `from` was lower than the length of the list last returned. `raw()` is all the text pushed.

- [ ] **Step 1: Write the failing tests.** Test utilities, in the test file:
  - `sse(text, { step = 20, crlf = false } = {}) -> Buffer`: the AI's event stream for `text`. `message_start` (`message.usage` `{ input_tokens: 11, output_tokens: 1 }`), `content_block_start` (a text block), `ping`, one `content_block_delta` (`text_delta`) per `step` characters, `content_block_stop`, `message_delta` (`delta.stop_reason: 'end_turn'`, `usage` `{ output_tokens: 7 }`), `message_stop`. Each is an `event:` line, a `data:` line and a blank line.
  - `chunks(buffer, size) -> AsyncIterable<Uint8Array>`: the buffer in pieces of `size` bytes.

```js
const L = require('../../api/_lib/fightpack-live.js');
const all = async (it) => { const out = []; for await (const ev of it) out.push(ev); return out; };
const T2 = '## 1. Title\n**Type of denial:** medical necessity — “not medically necessary”\n';
const whole = await all(L.modelEvents(chunks(sse(T2), 1e6)));
ok(whole.filter((e) => e.type === 'content_block_delta').map((e) => e.delta.text).join('') === T2, 'the text comes back whole');
for (const size of [1, 2, 3, 7, 64]) same(await all(L.modelEvents(chunks(sse(T2), size))), whole, 'the same events when the stream arrives ' + size + ' bytes at a time');
same(await all(L.modelEvents(chunks(sse(T2, { crlf: true }), 5))), whole, 'and when its lines end with CRLF');

same(L.showable(''), [], 'nothing to show before any text');
same(L.showable('Here is the section you asked for.\nMore.\n'), [], 'a sentence before the heading is never shown');
same(L.showable('\n\n## 1. T\na\nb'), ['## 1. T', 'a'], 'leading blank lines are not shown, and the newest line is held back');
same(L.showable('## 1. T\na\nb\n\n'), ['## 1. T', 'a'], 'a line break after the newest line does not release it');
same(L.showable('## 1. T\na\n\n\nb'), ['## 1. T', 'a'], 'no blank lines trail what is shown');
same(L.showable('## 1. T\na\n**What you may actually owe:** x\n\n**Do this first:** y\nz'), ['## 1. T', 'a'], 'the held lines and everything after them wait');
same(L.showable('## 1. T\na\n- **Do this first:** y\nz'), ['## 1. T', 'a'], 'held with or without a bullet');

const r = L.liveReader((p) => p.replace(/RAW/g, 'SAFE'));
same(r.push('## 1. T\nfirst RAW li'), null, 'the heading waits for the line after it');
same(r.push('ne\nsecond\n'), { from: 0, lines: ['## 1. T', 'first SAFE line'] }, 'lines are sent complete, guarded, and one line behind');
same(r.push('third'), null, 'an unfinished line changes nothing');
same(r.push('\n'), { from: 2, lines: ['second'] }, 'later lines are appended');
same(r.redo(), 0, 'nothing was corrected');
same(r.raw(), '## 1. T\nfirst RAW line\nsecond\nthird\n', 'the reader keeps the text as the AI wrote it');

const flip = L.liveReader((p) => (/later/.test(p) ? p.replace('early', 'EARLY') : p));
flip.push('## 1. T\nearly\nmiddle\n');
same(flip.push('later\nend\n'), { from: 1, lines: ['EARLY', 'middle', 'later'] }, 'a changed line is sent again from where it changed');
same(flip.redo(), 1, 'and counted');
const cut = L.liveReader((p) => (/stop/.test(p) ? '## 1. T\na\nz' : p));
cut.push('## 1. T\na\nb\nc\n');
same(cut.push('stop\n'), { from: 2, lines: [] }, 'lines the guards removed are taken back');
same(cut.redo(), 1, 'and counted');
```

- [ ] **Step 2: Run it.** FAIL: `Cannot find module '../../api/_lib/fightpack-live.js'`.
- [ ] **Step 3: Implement the four exports.**
- [ ] **Step 4: Run it.** PASS.
- [ ] **Step 5: Commit** (`Live read: read the AI's stream, decide which guarded lines can be shown`).

### Task 3: The live reply

**Files:**
- Modify: `api/fightpack.js:536-594` (the request and its `try` block)
- Modify: `qa/tests/test-count.js` (the `HOLDS` list gains `'redo'`)
- Modify: `README.md` (under "Configuration", a short "Live first read" section: what it is, and `FIGHTPACK_LIVE=off`)
- Test: `qa/tests/test-live-read.js` (third block)

**Interfaces:**
- Consumes: `decodeText`, `finish` (Task 1); `modelEvents`, `liveReader` (Task 2).
- Produces: the wire messages in Global Constraints, for Tasks 4 and 5.

**Decisions:**
- `live = body.live === true && part === 1 && !/^off$/i.test(process.env.FIGHTPACK_LIVE || '')`. When it is false, nothing below runs.
- A live request to the AI is today's request plus `stream: true`. A not-OK answer is handled by today's code, unchanged.
- The 110-second limit covers the whole read: on the live path the timer is cleared when the answer is complete or has failed, not when the AI starts answering.
- Reading with `modelEvents(upstream.body)`: `usage` is `message_start`'s `message.usage` overlaid with each `message_delta`'s `usage`; `stop_reason` is `message_delta`'s `delta.stop_reason`. The text is the `text_delta` text of text blocks, each later text block starting on a new line, as `join('\n')` does today. Each delta goes to `reader.push`, where `reader = liveReader((p) => decodeText(p, c))`. Other events are ignored.
- The stream starts with the first non-null `push`: status 200, `Content-Type: text/event-stream; charset=utf-8`, `Cache-Control: no-store, no-transform`, `X-Accel-Buffering: no`, then that message. On the live path the response is used through `status`, `setHeader`, `write`, `end`, `json`, `on('close')` and `writableEnded` only.
- Answer complete: `r = await finish(reader.raw().trim(), { stop_reason, usage }, c)` with `c.redo = reader.redo()`. Stream started → `{done: r.body}` when `r.status` is 200, otherwise `{error: {status: r.status, ...r.body}}`; then `end()`. Not started → `res.status(r.status).json(r.body)`.
- Failures. An `error` event from the AI is reported as `upstreamTrouble(500, event)`. Anything thrown while reading is reported as today's `catch` reports it: status 504 for the time limit (`AbortError`), otherwise 500, with today's `error: 'server'` and message. Stream started → `{error: {status, error, message}}`, then `end()`. Not started → the same as plain JSON. No count line either way.
- The reader leaves: `res.on('close', ...)` finding `res.writableEnded` false aborts the AI request. After that nothing is written and nothing is counted.

- [ ] **Step 1: Write the failing tests.** Additions to the harness:
  - The stand-in AI answers a request whose body has `stream: true` with `{ ok: true, status: 200, body: chunks(sse(reply, sseOptions), size, chunkOptions) }`, and any other request as in Task 1, so the two replies can be compared. It keeps the last request's body and signal.
  - `sse` gains `errorAfter: n`: an `error` event (`{ type: 'error', error: { type: 'overloaded_error', message: 'Overloaded' } }`) follows the n-th delta and the stream ends there. `chunks` gains `throwAfter: k, error` (throws `error` after k pieces) and `hold: k, signal` (waits before piece k until the request's signal aborts, then throws an `AbortError`, as a real fetch does).
  - `mockRes()` gains `write` (appends to `res.written`), `end`, `on`, `fire('close')`, `writableEnded` (set by `end` and by `json`), and keeps the headers set.
  - `live(text, options)` calls the handler with `live: true` and returns `{ res, stream, messages, shown, done, error, redo }`: `stream` is whether anything was written; `messages` are the parsed `data:` objects; `shown` is the lines after applying every `from/lines` message; `redo` is how many of those had `from` below the lines then held. Options: `size` (default 37), `denial`, the `sse` and `chunks` options, and extra request fields.
  - `S` is the first section of `qa/evidence/runs27/C-prior-auth-biologic.kit.md`. `withLine(text, line)` inserts `line` before the "Case strength" line. `isHeld = (l) => /\*\*(?:What you may (?:actually )?owe|Do this first)/.test(l)`. `inOrder(part, whole)` is true when `part` is a subsequence of `whole`.
  - `ER = 'EXPLANATION OF BENEFITS. Emergency department physician services, out-of-network. Patient responsibility $1,850.00.'` (two guards run only for emergency or ancillary care).

```js
for (const s of FIRST) {
  const a = await plain(s.text), b = await live(s.text);
  same(b.done, a.body, s.file + ': the finished section is the plain reply');
  ok(inOrder(b.shown, b.done.text.split('\n')), s.file + ': every line shown is a line of the finished section, in order');
  ok(!b.shown.some(isHeld), s.file + ': the two held lines are not shown before the end');
  same(b.redo, 0, s.file + ': nothing shown had to be corrected');
}
const one = await live(S, { size: 1e6 });
ok(one.stream && one.res.headers['Content-Type'] === 'text/event-stream; charset=utf-8', 'a live reply is an event stream');
ok(one.shown.length > 20, 'most of the section is shown before it is finished (' + one.shown.length + ' lines)');
for (const size of [1, 5, 33, 400]) same((await live(S, { size })).shown, one.shown, 'the same lines when the answer arrives ' + size + ' bytes at a time');

const RAW = [
  ['safety label', '- **Safety first:** EMERGENCY — numbness between the legs', DENIAL],
  ['emergency wording', '- **Who fixes this:** Go to an emergency department today, or call 911.', DENIAL],
  ['absolute claim', '- **Your strongest argument:** The cheaper test cannot detect small lesions.', DENIAL],
  ['choice condition', '- **Your strongest argument:** Ancillary services like anesthesia cannot be balance billed when the patient did not choose the provider.', DENIAL],
  ['consent exception', '- **Your strongest argument:** The claim must be reprocessed, unless a valid notice-and-consent form was signed in advance.', ER],
  ['choice argument', '- **Your strongest argument:** The hospital is in-network, and you did not choose the emergency physician.', ER],
  ['in-network rate', '- **Your strongest argument:** It should be paid at in-network rates.', DENIAL],
  ['later date', '- **Who fixes this:** Ask the representative to confirm the deadline; if it differs from your letter, use the later date.', DENIAL],
  ['billing-code claim', '- **What they have to show:** Please review the claim. 76942 is separately reportable.', DENIAL],
  ['setting limit', '- **Your strongest argument:** A skilled nursing facility is not validated for patients requiring daily physician oversight for active medical management.', DENIAL],
  ['phone number', '- **Who fixes this:** Call the state at 1-888-466-2219.', DENIAL]
];
for (const [name, line, denial] of RAW) {
  const text = withLine(S, line);
  ok(!(await plain(text, { denial })).body.text.split('\n').includes(line), name + ": today's guards change this line");
  for (const size of [1, 9, 400]) {
    const b = await live(text, { denial, size });
    ok(!b.messages.some((m) => m.lines && m.lines.includes(line)), name + ': the line as the AI wrote it never reaches the page (' + size + ' bytes at a time)');
    same(b.redo, 0, name + ': and nothing shown had to be corrected');
  }
}
const em = await live(withLine(S, RAW[0][1]), { size: 9 });
ok(em.shown.some((l) => l.includes('Go to an emergency department now, or call 911.')), 'the safety line the code writes is shown');
ok(/\*\*Do this first:\*\* Go to the emergency department now\./.test(em.done.text) && !em.shown.some(isHeld), 'the first step the code rewrites arrives only with the finished section');
```

Then, each as its own check:
  1. **Count.** The count line of a live part 1 has exactly the keys `evt, kid, missing, part, redo, safety, src, urgent`, with `redo: 0`. A plain part 1's line has no `redo`.
  2. **AI refuses the request** (status 529): code 502, body `{ error: 'upstream', message: 'The kit engine hiccuped. Try again in a moment.' }`, not a stream.
  3. **`error` event before any line** (`errorAfter: 0`): the same plain reply as check 2, not a stream, no count line.
  4. **`error` event mid-way** (`errorAfter: 30`): lines, then a last message `{ error: { status: 502, error: 'upstream', message: 'The kit engine hiccuped. Try again in a moment.' } }`; no `done`; no count line.
  5. **The connection to the AI breaks mid-way** (`throwAfter` late enough that lines were sent; a plain `Error`): last message `{ error: { status: 500, error: 'server', message: 'That took too long. Try again — the kit builds in short passes.' } }`; no count line.
  6. **The time limit** (Review Focus 2). `setTimeout` and `clearTimeout` are wrapped for this call so the 110000 ms timer is captured, never left to run. The stand-in holds mid-answer (`hold`, after lines were sent). The test checks the timer has not been cleared, then fires it. Last message: `{ error: { status: 504, error: 'server', message: 'That took too long. Try again — the kit builds in short passes.' } }`.
  7. **Empty answer:** code 502, body `{ error: 'upstream', message: 'That part came back empty. Try again in a moment.' }`, not a stream.
  8. **No heading** (Review Focus 5; the answer is `I cannot help with that.`): not a stream; code and body equal the plain reply's for the same answer.
  9. **Not live:** with `FIGHTPACK_LIVE=off`, with `part: 2`, and with `live: 'true'`, the reply is plain JSON and the request to the AI has no `stream` field.
  10. **The reader leaves:** with the stand-in held mid-answer, `res.fire('close')`. The AI request's signal is aborted, nothing more is written, and there is no count line.

- [ ] **Step 2: Run it.** FAIL on the first check: a live request gets today's plain reply, so `b.done` is undefined.
- [ ] **Step 3: Implement the live branch.**
- [ ] **Step 4: Add `'redo'` to `HOLDS` in `test-count.js`; write the README section.**
- [ ] **Step 5: Run every suite.** All pass.
- [ ] **Step 6: Commit** (`Kit builder: live reply for the first section, guarded line by line`).

### Task 4: The page shows the live first read

**Files:**
- Modify: `fightpack.js` (`renderKit`, `applyMeta`, the `copyall` / `printbtn` / `fixbtn` / `regen` handlers, a new `postLive` beside `postJSON`, and `build` with its `fetchPart`)
- Modify: `index.html` (style block only)
- Modify: `qa/tests/test-source.js:180` (the expected request fields gain `'live'`)
- Modify: `docs/fightpack-qa.md` (section 1: one paragraph on the live first read; section 8: the two new suites)
- Test: create `qa/tests/test-live-page.js`

**Interfaces:**
- Consumes: the wire messages.
- Produces: `postLive(url, body, onLines, ms) -> Promise<{ ok, status, data }>` beside `postJSON`: the same request, timeout and result shape. It reads a stream only when the reply is OK, has `headers` whose `content-type` starts with `text/event-stream`, and `r.body.getReader` exists; any other reply is handled exactly as `postJSON` handles it. In a stream, each `{from, lines}` calls `onLines(from, lines)`; `done` resolves `{ ok: true, status: 200, data: done }`; `error` resolves `{ ok: false, status: error.status, data: error }`; a stream that ends with neither resolves `{ ok: false, status: 0, data: { message: 'Connection dropped — try again.' } }`; a failed or timed-out read resolves what `postJSON` gives for a failed or timed-out request. Messages are split on blank lines after decoding with one streaming `TextDecoder`.
- Produces: `showStrength()`: the chip code now at the end of `applyMeta()`, which calls it. It shows the chip when a strength is found and hides it when none is.

**Decisions:**
- `canLive`, read once: `typeof TextDecoder !== 'undefined' && typeof Response !== 'undefined' && 'body' in Response.prototype`. A browser that cannot read a stream never asks for one.
- State beside `parts`: `liveLines` (an array, or `null` when no section is live) and `liveShown` (this build's live view has been brought into view).
- Part 1's text, for drawing and for `showStrength()`, is `parts[1] || (liveLines ? liveLines.join('\n') : '')`.
- `renderKit()` draws a live first document like any other, with two differences: it is not added to `sectionOrder` (the list "Copy everything" and the email are written from), and its HTML ends with `<span class="pulse-dot" aria-hidden="true"></span>`.
- In `fetchPart(1)` the first ask is `postLive` with `live: true` in the body when `canLive`. The re-ask after a renewed token is live again. The re-asks after a server error and after a short section are `postJSON` without `live`.
- First `onLines` of a build: `progress` gets `slim`, `kitout` gets `live`, `progress.scrollIntoView({ behavior: 'smooth', block: 'start' })` runs, and `liveShown = true`. A build already scrolled there when it started, so this moves only a reader who has scrolled away. Every `onLines`: `liveLines = (liveLines || []).slice(0, from).concat(lines)`, then `renderKit()` and `showStrength()`.
- The live ask settles with a complete section (OK, and `shortOf` empty): `liveLines = null`, `kitout` loses `live`, and the build goes on as today.
- It settles any other way after lines were shown: the live view is cleared. `liveLines = null`, `liveShown = false`, `kitout` loses `live` and `on`, the documents are emptied, `progress` loses `slim`, the strength chip is hidden, and `progress.scrollIntoView(...)` runs. The page is then as it is today while part 1 is being written.
- End of a build, either way: `progress` loses `slim`. On success the page scrolls to the kit only when `liveShown` is false. `liveShown` is reset when a build starts.
- While `liveLines` is not `null`, the handlers of `copyall`, `printbtn`, `regen` and `fixbtn` return at once. (`mailform` already refuses while a kit is being written.)
- Hidden while live, beyond the controls the spec names: the deadline tracker (it still holds the last kit's dates) and the "saved in this browser" line (nothing is saved yet).
- Known and accepted: when the kit finishes, the slim panel is removed as today, so a reader still at the top sees the kit move up by the panel's height. The page does not scroll.
- CSS, added to the style block in `index.html`:

```css
.progress.slim .plist,.progress.slim .small{display:none}
.kitout.live .kit-actions,.kitout.live .copy-btn,.kitout.live .checkline,.kitout.live .mailkit,.kitout.live .fixform,.kitout.live #deadlines,.kitout.live .whisper{display:none}
.kitout.live .pulse-dot{display:block;margin-top:10px}
```

- [ ] **Step 1: Write the failing tests.** The harness is `test-source.js`'s, with these additions:
  - Elements count `scrollIntoView` calls in `el.scrolls`. `navigator.clipboard.writeText` records into `page.copied()`. `window.print` counts into `page.printed()`.
  - `TextDecoder` and `Response` are passed to the page script as parameters (Node's own, or `undefined` for the browser that cannot read a stream).
  - A part-1 request with `live: true` is answered `{ ok: true, status: 200, headers: { get: () => 'text/event-stream; charset=utf-8' }, body: { getReader } }`, and its reads are fed by the test: `await page.say(message)`, `await page.bytes(uint8array)`, `await page.done(text, more)` (sends `{done: {part: 1, text, stop: 'end_turn', missing: [], ...more}}` and ends the stream), `await page.fail(error)` (sends `{error}` and ends it), `await page.drop()` (ends it). Each settles the page before returning.
  - `started(options)` opens the page, types a letter, presses Build and settles. Options: `first` (a plain reply to give the live request instead of a stream), `holdRetry` (the plain re-ask for part 1 stays pending until `await page.release()`).
  - `page.drawn()` is the HTML of the cards in `#docs`.

```js
const L = ANSWER[1].split('\n');
const iType = L.findIndex((l) => /\*\*Type of denial/.test(l)), iGrade = L.findIndex((l) => /\*\*Case strength/.test(l));
const page = await started();
same(page.sent()[0].live, true, 'the first request for part 1 asks for the live reply');
await page.say({ from: 0, lines: L.slice(0, 3) });
ok(page.$('kitout').classList.contains('on') && page.$('kitout').classList.contains('live'), 'the kit area opens, marked live');
ok(page.$('progress').classList.contains('slim'), 'the progress panel shrinks');
ok(/Read from your letter/.test(page.drawn()), 'the first lines are on the page');
same(page.$('progress').scrolls, 2, 'the page is brought to the panel and the first document');
await page.say({ from: 3, lines: L.slice(3, iType + 1) });
ok(/Type of denial/.test(page.drawn()), 'later lines are added');
ok(page.$('strength').style.display !== 'inline-flex', 'no strength tag before its line');
await page.say({ from: iType + 1, lines: L.slice(iType + 1, iGrade + 1) });
ok(page.$('strength').style.display === 'inline-flex' && /Good/.test(page.$('strength').textContent), 'the strength tag appears with its line');
await page.say({ from: iGrade, lines: ['**Case strength:** Needs evidence. One record is missing.'] });
ok(/Needs evidence/.test(page.drawn()) && /Needs evidence/.test(page.$('strength').textContent), 'a corrected line replaces the old one, and the tag follows it');
await page.say({ from: iGrade, lines: [] });
ok(!/Case strength/.test(page.drawn()) && page.$('strength').style.display !== 'inline-flex', 'a line taken back leaves the page, and its tag with it');
same(page.$('progress').scrolls, 2, 'the page is not moved again while lines arrive');

ok(!('dmj_fp_kit' in page.saved), 'nothing is saved while the section is live');
const fixWas = page.$('fixform').hidden;
for (const [id, ev] of [['copyall', 'click'], ['printbtn', 'click'], ['fixbtn', 'click'], ['regen', 'click'], ['buy', 'click'], ['mailform', 'submit']]) page.$(id).fire(ev);
await settle();
same(page.copied(), [], 'Copy everything does nothing while the section is live');
same(page.printed(), 0, 'nor does Print');
same(page.$('fixform').hidden, fixWas, 'nor does Fix a detail');
same(page.posts(), 2, 'and nothing is sent: no email, no second build');

await page.done(ANSWER[1]);
ok(!page.$('kitout').classList.contains('live'), 'the live mark is gone when the section is finished');
const rest = page.sent().filter((b) => b.part > 1);
ok(rest.length === 5 && rest.every((b) => b.decode === ANSWER[1].slice(0, 8000) && !('live' in b)), 'the other five parts are asked for with the finished section, and no live flag');
ok(page.$('kitout').scrolls === 0 && page.$('progress').scrolls === 2, 'the page does not scroll when the kit finishes');
ok(!page.$('progress').classList.contains('slim'), 'the panel is full size again for the next build');
ok(/"parts"/.test(page.saved.dmj_fp_kit || ''), 'the finished kit is saved, as today');
page.$('copyall').fire('click');
await settle();
ok(page.copied().length === 1 && /Read from your letter/.test(page.copied()[0]), 'and Copy everything works again');
```

Then one scenario each, with these outcomes:
  - **All at once** (Review Focus 1): every lines message and `done` in a single read. Six parts built, `kitout` not `live`, `progress` not `slim`, the kit saved.
  - **Split reads** (Review Focus 3): one message delivered in two reads cut inside its JSON, and again cut inside the bytes of the `—` in the heading. The heading is drawn with its dash intact, and the lines are those of the unsplit message.
  - **Failure mid-way** (`holdRetry`): lines, then `page.fail({ status: 502, error: 'upstream', message: 'The kit engine hiccuped. Try again in a moment.' })`. `page.drawn()` is empty; `kitout` is neither `live` nor `on`; `progress` is not `slim`; the strength chip is hidden; Copy everything, pressed now, copies nothing that holds "Read from your letter"; the part-1 requests so far carry `live` as `[true, undefined]`. After `page.release()`: seven requests in all, the kit saved, `kitout.scrolls` is 1.
  - **Dropped stream** (`holdRetry`): lines, then `page.drop()`. The same.
  - **Short section** (Review Focus 4, `holdRetry`): lines, then `page.done(ANSWER[1], { stop: 'max_tokens' })`. The same cleared state and one plain re-ask; after `page.release()` the kit is complete.
  - **Error before any line** (`first: { ok: false, status: 502, ... }`): `kitout` never `live`; one plain re-ask; the kit builds.
  - **A used-up session** (`first: { ok: false, status: 401, ... }`): after the new token, part 1 is asked for live again.
  - **Plain reply to a live request** (the off switch): `kitout` never `live`, `progress` never `slim`, six parts, `kitout.scrolls` is 1 and `progress.scrolls` is 1.
  - **A browser that cannot read a stream:** part 1's request has no `live` field, and the kit builds.
  - **The example kit:** opened with `#sample`, `page.posts()` is 0.

- [ ] **Step 2: Run it.** FAIL on the first check: `page.sent()[0].live` is undefined.
- [ ] **Step 3: Implement `postLive`, `showStrength`, the live state and the CSS.**
- [ ] **Step 4: Update `test-source.js`** (expected fields: `decode, denial, extra, file, kid, live, part, records, src, token`) and `docs/fightpack-qa.md`.
- [ ] **Step 5: Run every suite.** All pass.
- [ ] **Step 6: Commit** (`Fight Pack page: show the first section as it is written`).

### Task 5: The runner can time a live build

**Files:**
- Create: `qa/live-client.js`
- Modify: `qa/fp-run.js` (`fetchPart`, and the usage comment at the top)
- Modify: `docs/fightpack-qa.md` (section 8: `FP_LIVE=1`)
- Test: `qa/tests/test-live-read.js` (fourth block)

**Interfaces:**
- Consumes: the wire messages; Task 3's `live()` helper for a real handler reply.
- Produces: `readLive(response, t0) -> Promise<{ ok, status, data, live }>`. `response` is a fetch `Response`. For an event stream, `data` is the `done` object, or the `error` object with `ok: false` and its `status`, and `live = { first_ms, type_ms, grade_ms, done_ms, redo, messages }`: milliseconds from `t0` to the first lines message, to the first line containing `**Type of denial`, to the first containing `**Case strength`, and to `done`; a time that never happened is `null`. `messages` is how many messages were read; `redo` is counted as Task 3's helper counts it. For any other reply: `{ ok, status, data }` from its JSON, and `live: null`.
- `FP_LIVE=1` makes `fetchPart(1, ...)`'s first ask send `live: true` and read with `readLive`. The attempt record gains `live`, and the runner prints `[case] live · first 2.1s · type 5.8s · grade 15.2s · done 24.9s · redo 0`.

- [ ] **Step 1: Write the failing test.**

```js
const { readLive } = require('../live-client.js');
const b = await live(S, { size: 50 });
const got = await readLive(new Response(b.res.written, { headers: { 'content-type': b.res.headers['Content-Type'] } }), Date.now());
same(got.data, b.done, 'the runner reads the finished section out of the stream');
ok(got.ok && got.status === 200 && got.live.redo === b.redo && got.live.messages === b.messages.length, 'and counts messages and corrections as the server test does');
const t = got.live;
ok([t.first_ms, t.type_ms, t.grade_ms, t.done_ms].every((x) => typeof x === 'number'), 'every time is recorded');
ok(t.first_ms <= t.type_ms && t.type_ms <= t.grade_ms && t.grade_ms <= t.done_ms, 'first line, type of denial, grade, done: in that order');
const bad = await live(S, { sse: { errorAfter: 30 } });
const lost = await readLive(new Response(bad.res.written, { headers: { 'content-type': bad.res.headers['Content-Type'] } }), Date.now());
ok(!lost.ok && lost.status === 502 && lost.data.error === 'upstream' && lost.live.done_ms === null, 'a live reply that failed is reported as failed, so the runner asks again');
const flat = await readLive(new Response(JSON.stringify({ part: 1, text: 'x' }), { headers: { 'content-type': 'application/json' } }), Date.now());
ok(flat.ok && flat.data.text === 'x' && flat.live === null, 'a plain reply is read as before, with no live record');
```

- [ ] **Step 2: Run it.** FAIL: `Cannot find module '../live-client.js'`.
- [ ] **Step 3: Implement `readLive`; wire `FP_LIVE` into `qa/fp-run.js`; add the doc line.**
- [ ] **Step 4: Run every suite.** All pass.
- [ ] **Step 5: Commit** (`QA runner: time a live build (FP_LIVE=1)`).

### Task 6: Whole-branch proof and the pull request

- [ ] **Step 1: Run every suite.** 18 scripts; each ends with its `tests passed` line.
- [ ] **Step 2: Deliberate breaks, in a scratch copy outside the repo.** Each must make a suite fail:

| Break | Rule it violates |
| --- | --- |
| the live branch passes `(p) => p` to `liveReader` | every line shown is a guarded line; the raw safety label never shows |
| `HELD` is emptied | the two held lines wait |
| the live branch finishes with the text minus one guard step | `done` equals the plain reply |
| `liveReader` cuts at the last character instead of the last line break | chunking makes no difference; unfinished lines are not considered |
| `showable` keeps the newest line | the page is one line behind |
| the stream's headers are sent as soon as the AI answers | a failure before any line is today's plain error |
| the live path clears the timer when the AI starts answering | the time limit covers the whole read |
| the server honors `live` on part 2 | only part 1 is live |
| the server treats a missing `live` as `true` | a request without `live` behaves as before |
| the page writes live lines into `parts[1]` | live text is never saved or passed on |
| the live document is added to `sectionOrder` | live text is never copied or emailed |
| the `copyall` handler ignores `liveLines` | no copy control while live |
| the page keeps `live: true` on the re-ask after an error | that re-ask is plain |

- [ ] **Step 3: Real browser.** A scratch script outside the repo: headless Chrome over the live site with this branch's `index.html` and `fightpack.js`, and `window.fetch` wrapped so the part-1 request gets a real streaming `Response` that delivers `S` over 6 seconds; at 390×664 and at 1280×720. It must show: the first line of the first document inside the visible page within 1.5 seconds of the first message; `window.scrollY` unchanged from the moment the scroll at the start of the build settles until the build ends; `.kit-actions`, the mail form and the deadline tracker not displayed while live and displayed after; the first document's top within 1 pixel of where it was when `done` arrives; no console errors. It records how far the kit moves when the build ends (expected: the slim panel's height).
- [ ] **Step 4: Push and open the pull request** with `gh api repos/wbmerrick/dr-mumbo-jumbo/pulls -X POST -f title=... -f head=live-first-read -f base=main -F body=@file` (`gh pr create` does not work in this environment). The body says what changed, the evidence above, the off switch, and that the timing targets are unproven until the measurement after the merge.
- [ ] **Step 5: Stop.** Merging is the owner's decision.

## After the merge

Not part of the pull request; reported in conversation.

1. `NODE_USE_ENV_PROXY=1 FP_FREE=1 FP_LIVE=1 FP_RUN=<a scratch folder> node qa/fp-run.js A-sleep-paraphrase C-prior-auth-biologic D-oon-er-eob B-inpatient-loc-photo` (four kits, about $1).
2. Each case's part 1 shows one attempt, the live one. A second attempt means the live reply failed and the section was written twice: report it, and recommend `FIGHTPACK_LIVE=off` until it is fixed.
3. `node qa/fp-check.js` on that folder: no failures on the four kits.
4. The four kits' count lines: `redo` is 0.
5. Against the spec's targets: on the median of the three pasted-text cases, first line within 5 seconds and "Type of denial" within 10. If the lines all arrive together at the end, the stream is being held back: report the target as not met, with the timings seen.
