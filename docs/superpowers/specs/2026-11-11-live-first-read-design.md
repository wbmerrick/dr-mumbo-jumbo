# Live first read: design

November 11, 2026. Design agreed in conversation; this document is the written version for review. No code is written until it is approved.

## Goal

Someone who pastes a denial letter sees something true about *their* letter within 10 seconds. Today they watch a progress panel until the first section of the kit arrives whole.

## Decisions already made

- **What lands first:** the kit's own first section, appearing line by line as it is written ("live first read"). Not a separate quick verdict, and not an earlier grade.
- **How:** the server reads the AI's answer as it is written and shows each line only after today's safety guards have passed it ("stream and guard").
- **The AI's instructions do not change.** Every stored test result stays valid, and a kit costs the same.

## What was measured

From 75 stored builds of the first section (12 runs):

| | Result |
| --- | --- |
| Time until the first section arrives | median 25 s; 9 in 10 under 39 s; longest 44 s |
| Pasted text / photo or PDF | median 24 s / 37 s |
| Where "Type of denial" begins | 20% of the way through (range 13–28%) |
| Where "What they're really saying" begins | 34% (24–50%) |
| Where "Case strength" begins | 63% (54–74%) |
| First sections changed by a safety guard | 15 of 75 |

Two things follow. Showing lines as they are written should put the type of denial on screen at about 6 seconds and the grade at about 16 seconds for pasted text. And raw text cannot be shown: one first section in five is changed by a guard.

These times are estimates from finished builds. How long the AI takes to write its first word has not been measured; the rollout measures it.

## What the reader sees

1. They press **Build my Fight Pack**. The progress panel appears, as today.
2. When the first lines arrive, the panel shrinks to its heading and status line, and the first document opens under it. It fills in line by line: "Read from your letter" first, then the type of denial, the plan, urgent or not, what the insurer is really saying, and on through the section.
3. The case-strength tag beside the kit's heading appears when its line has been written.
4. The section's last two lines, "What you may actually owe" and "Do this first", are not shown live. Code sometimes rewrites them, so they arrive with the finished section.
5. When the section is finished, the live text is replaced by the final text and the other five parts start, exactly as today.

Rules:

- **One scroll.** The page scrolls once, to bring the first document into view when its first lines arrive. It does not scroll again when the kit finishes.
- **Not a kit yet.** While the first section is live, the page offers no copy, print, email, rebuild or fix controls, and nothing live is saved in the browser.
- **Photos and PDFs** work the same way but start later, because the AI reads the image before it writes.
- **No streaming available** (an older browser, a network that holds the response back, or the off switch): the reader gets exactly today's behavior.

## How it works

### Server (`api/fightpack.js`)

- The page adds `live: true` to its request for part 1. The server honors it only for part 1, and only when the off switch is not set. Any other request is handled exactly as today.
- For a live request the server asks the AI for a streamed answer and reads it as it arrives.
- **One guard path.** The steps that turn the AI's raw first section into what the reader gets (`normalizeSections`, `postProcess`, `twoRequests`, `expeditedFirst`, `stateFacts`) move into one function, `decodeText()`. The finished section and the live lines both come from it.
- **One finishing path.** Everything the server does today after the AI answers (guards, the missing-section check, the count, the reply) moves into one function, `finish()`. The live path calls the same function when the answer is complete and sends its result as the last message.
- **Releasing lines.** Each time the answer gains a complete line:
  1. Take the text up to its last line break. An unfinished line is never considered.
  2. Run it through `decodeText()`.
  3. Drop the newest line of the result, so the page is always one line behind the writing.
  4. Stop at the first of the two held lines. It and everything after it wait for the finished section.
  5. Send the page whatever differs from what it already has, as "from line N, these lines".
- If N is lower than the number of lines already sent, a line on screen is being corrected. The server counts it in `redo`.

### What goes over the wire

The reply to a live request is a stream of small messages (server-sent events):

- `{"from": N, "lines": [...]}` — set the live text from line N onward to these lines.
- `{"done": {...}}` — the same object the endpoint returns today. Sent once, last.
- `{"error": {"status", "error", "message"}}` — the same fields as today's error replies.

If the AI refuses or fails before any line is sent, the server answers with today's plain error reply, not a stream.

### Page (`fightpack.js`)

- Part 1's first request carries `live: true`. The page accepts either reply: today's single answer, or the stream.
- Live lines are kept in their own variable, apart from the kit's parts. The first document is drawn from the finished part when there is one, otherwise from the live lines.
- First lines: the progress panel gets `slim`, the kit area gets `live`, the page scrolls once.
- `done`: the live lines are discarded, the finished part takes their place, and the build continues as today.
- The strength tag reads the finished part when there is one, otherwise the live lines.
- Parts 2–6 are sent the finished first section only, never live text.

## Safety

These must hold, and each has a test:

1. Every line that reaches the page is a line `decodeText()` produced. There is no second, lighter set of guards.
2. The two held lines never reach the page before `done`.
3. The safety label as the AI writes it never reaches the page; only the safety line the code renders from it does.
4. For the same AI answer, `done` is identical to today's reply.
5. How the answer is chopped up on arrival makes no difference to what is sent.
6. Live text is never saved, copied, printed, emailed, or passed to parts 2–6.
7. A request without `live` behaves exactly as before.

## Failure handling

| What happens | What the reader gets |
| --- | --- |
| The AI fails before the first line | Today's error and today's one retry |
| The AI or the connection fails mid-way | The live text is cleared, the progress panel returns to full size, and today's retry runs as a plain request |
| The stream ends without `done` | The same as a dropped connection |
| The answer takes longer than today's time limit | Today's timeout message; the limits do not change |
| The reader leaves the page | The server stops reading the AI's answer |
| The response is held back and arrives all at once | The finished section appears as it does today |

## Off switch

Setting `FIGHTPACK_LIVE=off` in Vercel and redeploying makes the server ignore `live`. The site then behaves as it does today, with no code change. (Corrected while building: a changed setting reaches the running site only after a redeploy.)

## Counting and privacy

- A kit is counted as it is today, once per part, when the part is finished.
- A live first section adds one number to its count line: `redo`, how many times a line already on screen was replaced. It is a count, never text. `qa/tests/test-count.js` lists the fields a count line may hold; `redo` is added to that list.
- Nothing new is stored, in the browser or on the server. The privacy page does not change.

## Testing

Written before the code, and watched to fail first.

**Server** (`qa/tests/test-live-read.js`, with a stand-in AI that streams):
- `done` equals the plain reply for the same answer, for every stored first section.
- The same answer fed in at random break points, including inside a character, sends the same lines.
- For each guard, the raw line that guard exists to fix (taken from the existing guard tests) never appears in any message.
- The two held lines and the raw safety label never appear before `done`.
- A correction to a shown line is sent as a replacement and counted in `redo`.
- Failure before the first line, failure mid-way, and an empty answer each produce the reply described above.
- `live` on parts 2–6, and `live` with the off switch set, get today's plain reply.

**Page** (`qa/tests/test-live-page.js`, the page script run whole against a scripted browser):
- Lines appear in the first document as messages arrive; the strength tag appears with its line.
- Nothing is saved, and copy, print and email are unavailable, until `done`.
- Parts 2–6 are requested only after `done`, with the finished section.
- A failure mid-way clears the live text and retries with a plain request.
- A plain reply to a live request behaves as today.
- The example kit still calls nothing.

**Every existing suite** passes unchanged, except two one-line additions: `redo` in `test-count.js`'s list of count fields, and `live` in `test-source.js`'s list of the fields a build request holds.

**Real browser:** headless Chrome over the live site with this branch's files and a stand-in server that streams slowly, at phone and laptop sizes. Checked: the first line is visible, the page scrolls once, and the finished section replaces the live one without a jump.

**Deliberate breaks:** each safety rule above is broken on purpose in a scratch copy to confirm a test catches it.

## Rollout and measurement

1. One pull request: this spec, the plan, the code, the tests and the docs.
2. After the merge, the test runner builds four real kits through the live path (three pasted-text cases and one photo; about $1 of AI use). `qa/fp-run.js` gains `FP_LIVE=1` for this and records, for each kit, the time to the first line, to "Type of denial", to "Case strength" and to the finished section, and `redo`.
3. The numbers are reported in conversation and written into `docs/fightpack-qa.md` with the next change.

## Success criteria

- Pasted text: first line within 5 seconds and "Type of denial" within 10 seconds, on the median of the three cases.
- `redo` is 0 on all four kits.
- The four finished kits pass the corpus checker with no failures, as they do today.
- Every suite passes.

If the timing targets are missed because the response is held back, the site still behaves as it does today. That is reported as not achieved, with what was observed, and is not called done.

## Risks and unknowns

- **Vercel may hold the stream back.** The reply uses the event-stream format and asks not to be transformed, which is the usual way to avoid that. It cannot be confirmed before release, because preview deployments sit behind Vercel's sign-in. If it happens, readers see today's behavior.
- **Time to the AI's first word is unmeasured.** The estimates assume about 2 seconds.
- **A photo or PDF** will probably not show its first line inside 10 seconds.
- **A later line changing an earlier one.** The code that does this today touches only the two held lines, the safety line and a line added under "Urgent", all of which depend on text that comes before them. If something else turns up, the page corrects the line and `redo` shows it happened.

## Changed while building

Ten things turned out differently from the text above. The first four were found while building, by a test or a real-browser run. The last six came from the independent review of the finished branch and the checks that followed it. The code follows this section where the two differ.

1. **The controls come back when the kit is done, not when the first section is finished.** They sit above the documents. Bringing them back the moment the first section finished pushed the text the reader was reading off the screen (about 540 pixels on a phone, seen in a real browser). Now, from the first lines until the whole kit is done, the page shows the documents under the small progress panel and nothing else.
2. **The page holds the reader's place.** When the strength tag appears, when the finished section replaces the live one, and when the kit is done (controls return, progress panel goes), the documents stay where they are on screen. This replaces "the page does not scroll again": the page is moved by exactly as much as the layout above the reader changed, at once, so the reader sees no movement.
3. **The off switch needs a redeploy.** Setting `FIGHTPACK_LIVE=off` takes effect on the next deployment; no code change is needed.
4. **"Type of denial" is released later than estimated.** A line is shown only when the line after it is complete. Replayed over the 169 stored first sections, the type of denial is released 29% of the way through the section and the case strength at 69%, not the 20% and 63% where they begin. For a 25-second section that is roughly 8 to 9 seconds and 17 to 19 seconds. The reader's own details ("Read from your letter") are released from 4%, about 3 seconds.

5. **A stream that stops early is a failure.** If the AI's stream ends without its closing message, the server reports a failure and the page asks again the plain way. Before, the text so far would have been taken as a finished section.
6. **`redo` is also checked when the section finishes.** The AI's last line has no line break, so whatever it changes lands only with the finished section. The lines on screen are compared with the finished section once more, and a difference counts. Two rewrites read lines further down (the line the code adds under "Urgent", and the Original Medicare route), so `redo` is a tripwire, not a proof that a shown line can never change.
7. **How a build ends after a live view.** The reader is left where they are, so the page says "Your Fight Pack is ready" in a short notice. If some sections did not finish, the page takes the reader to the message that names them instead of leaving them below it.
8. **Only a reader who is in the kit is held.** A reader who has gone back up the page to their letter (the progress panel starts below the top quarter of their screen) is not moved, because nothing they are looking at changes. In a real browser, before this, a reader part of the way back up was moved by about 400 pixels on a phone when the kit finished.
9. **The off switch takes `off`, `0`, `false` or `no`**, in any letter case, the same words `FIGHTPACK_FREE` takes.
10. **Stopping when the reader leaves is best effort.** The server stops the model call, and does not count the part, where it is told the reader has gone. A plain Node server is told. Vercel tells a function only when request cancellation is switched on for it (`supportsCancellation` in `vercel.json`), which this project has not done. On the deployed site the call therefore most likely runs to its end and the part is counted, as before this change.

Also: `test-source.js`'s list of request fields gains `live`.

## Not in this change

- Streaming the other five parts.
- Moving the case-strength grade earlier.
- Any change to the AI's instructions.
- The mobile app.
