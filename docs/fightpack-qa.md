# Fight Pack — how we know it is right

The Fight Pack is the kit on dr-mumbo-jumbo.com that helps a patient overturn one health-insurance denial. It is free for now; payments can be switched back on (README). This document explains:

- how the kit is built;
- how its correctness is measured;
- what twenty-six measured runs of the engine showed (runs 3–21 and 23–29), and the first kits built through the free path in production;
- what was changed in response, and the evidence for each change;
- what is still unproven.

Everything here can be re-run from this repository (section 8).

## Bottom line

- **Deadlines, decision clocks, urgency, plan type, identifiers and the safety instruction are decided in code, not by the model.**
  - The computed appeal deadline matched the hand-derived deadline in every kit of every run: 184 of 184 kits in runs 3–29, and both kits built through the free path in production.
  - Every member and claim identifier was copied exactly: 679 of 679 in runs 3–29, and 8 of 8 in the production kits.
- **Defects fell at least six-fold.** All runs were re-scored with the same final checker, about 100 checks per kit.
  - On the development cases, run 3 averaged 12.8 defects per kit. The latest engines average 0.3 to 2.0 over the last seven full runs (19–21, 23–25 and 28).
  - Across all ten cases, the last three full runs produced 10 defects (v9.10, run 23), 12 (v9.11, run 24) and 14 (v9.12, run 25): 0.3, 1.2 and 1.7 per development kit, and 2.0, 1.3 and 1.0 per held-out kit.
  - The held-out pair I and J then had 2 defects on v9.12.1 (run 26), and C, I and J had 3 on v9.13 (run 27). Two of those five are one strict check firing on a correct sentence (section 4).
  - Run 28 (v9.14, which asks the writer for the type of denial first) produced 13 across all ten cases: 1.3 per development kit and 1.3 per held-out kit. It was built on the production site through the free path, with the decode asked for live, the way a visitor's kit is built.
  - Case I was built once more the same way after v9.14.1 (run 29): 2 defects, neither on the records route that v9.14.1 changed.
  - Run-to-run noise is several defects (section 4). Compare repeated runs, not one total.
- **Every Critical defect the audits found was fixed. The stubborn ones were fixed by code.**
  - The run-6 audit's Critical: a patient with possible cauda equina syndrome was told to call her doctor's office first. It survived three engine versions and two prompt revisions aimed at it. Since v9, code writes the emergency instruction. It has been the first instruction in every run of that case since (runs 8–15, 19–21, 23–25 and 28) and in the production kit.
  - The round-2 audit (run 16) found two Criticals in a new held-out case. The kit dropped the concurrent expedited external review that the denial letter offered. And the doctor's letter made its signer the author of another physician's consult note. Code now adds the concurrent request and turns a first-person clinical act into "[I / Dr. ___]". The run-21 re-audit found no Critical, and the Majors fell from 9 to 4. The third audit (run 26) again found no Critical. The Majors stayed at 4: I fell to 1, and J had two new ones (section 4).
- **Code alone removes about a third of the old defects.** Replaying today's deterministic layer on the stored outputs of runs 5–20 cuts 244 failures to 163 and adds none. Nothing the model wrote was regenerated.
- **Held-out cases found the failures that tuning hid.** Four cases were written after tuning. G and H were written after run 5. I and J were written after run 15, with their truth and checks fixed before they were first run. Each round exposed failures the development cases never showed, including both round-2 Criticals.
- **Code has bugs too, and the checker found them.** Three bugs in the code that reads the model's prose surfaced in runs 11–14 (section 6). Each was fixed and checked against every stored output. A fourth was found by reading run 28, which no check counted, and fixed the same way in v9.14.1 (section 6).
- **What remains is mostly prose fidelity.** Typical slips are a lay description relabeled in clinical words, a record described that nobody has seen, or a rule from one plan type applied to another. Code brackets the recurring ones for the clinician. The run-21 re-audit judged both doctor-signed letters signable after a few edits. A clinician must still read the letter before signing it.

## 1. How the kit is built

The kit has ten sections, written in six passes.

**Part 1 (the decode)** runs first and becomes the plan for the whole kit:

- the denial type and plan type;
- urgency;
- case strength;
- the strongest argument;
- the decisive documents;
- the safety line.

**Parts 2–6** run in parallel. Each receives the decode, so the letters, scripts and tracker agree. The handler (`api/fightpack.js`) also:

- caches the source material across the six calls;
- stops a writer that drifts into the next part;
- normalizes every part, so only that part's sections survive, under their exact headings.

**The decode is shown while it is written.** The page asks for part 1 live, and the handler sends its lines as the writer finishes them. A line is sent only after the text so far has been through the same code as the finished decode (`guardPart`, `decodeText`), so no line is shown that has not been through the guards. Two more cautions apply:

- the newest line is always held back, because the next line can still change it (the heading is the exception: the guards have already made it the exact heading, and it is shown the moment it is written);
- the decode's two closing lines, "What you may actually owe" and "Do this first", arrive only with the finished decode, because code can rewrite them.

On the page the live lines are kept apart from the kit: they are not saved, copied, printed or emailed, and parts 2–6 are written from the finished decode only. From the first lines until the kit is done the page shows the documents under a small progress panel and nothing else of the kit; its controls come back when it is done, and the page holds the reader's place whenever something above the documents changes (a reader who has gone back up the page to their letter is left where they are). When the kit is done the page says so in a bar that stays at the foot of the screen, whose button takes the reader to the email box (it has come back above them, with the kit's other controls); with sections missing it takes the reader to the message that names them. If the stream fails, stops before the writer's closing message, or the decode comes back short, the page clears the live text and asks again the plain way. `FIGHTPACK_LIVE=off` turns the live read off (README, "Live first read").

Replayed over the first section of all 180 stored kits, no line that would have been shown was changed afterwards (`redo` is 0), and how the stream was cut up made no difference (`qa/tests/test-live-read.js`). That is evidence, not a proof: two rewrites read lines further down (the line the code adds under "Urgent", and the Original Medicare route), so a decode written in an unusual order could show a line and then correct it. `redo` on the count line, checked as the lines are sent and once more against the finished decode, is how that would be seen. In a replay of the 169 sections stored before the order changed, and of run 28's ten, the first written since, the median point in the section's text at which each line is released:

| Line | As first written (169 kits, through November 11, 2026) | The same 169 with the type line moved up | Written with the type of denial first (run 28, ten kits) |
|---|---|---|---|
| The heading | 2% | 1% (shown the moment it is written) | 1% |
| Type of denial | 29% (9 in 10 by 35%) | 8% (9 in 10 by 13%) | 8% (6% to 15%) |
| The first of the reader's own details ("Read from your letter") | 4% | 9% | 9% |
| What they're really saying | 50% | 50% | 50% |
| Case strength | 69% | 69% | 68% |

The second column was the forecast: the stored sections replayed with their type line moved to the top, which is where the writer is now asked to put it. The third is what the writer then did. In all ten kits of run 28 the type of denial stands directly under the heading, once, with everything after it in the old order, and it is the first line on the page after the heading (`qa/tests/test-live-read.js`, section 3b).

**Measured on the live site, November 11, 2026, with the first order** (four kits through `FP_LIVE=1`, seconds from the request to each line):

| Case | First line | Type of denial | Case strength | Section finished |
|---|---|---|---|---|
| A, pasted paraphrase | 3.1 | 9.3 | 19.1 | 26.3 |
| D, pasted EOB | 2.8 | 12.0 | 22.4 | 30.3 |
| C, pasted prior-authorization letter | 3.3 | 18.4 | 31.2 | 39.6 |
| B, phone photo | 3.0 | 14.9 | 32.5 | 46.1 |

The stream is passed through line by line (28 to 30 messages a section), every first section was written once, and no shown line was corrected. The first line met its target (5 seconds). The type of denial did not (10 seconds: the median of the three pasted cases was 12.0), which is why the writer is now asked for it first: replayed on these four sections, it would have arrived at about 4 to 6 seconds.

**Measured again the same evening, with the type of denial first** (run 28: all ten cases on the production site through the free path, `FP_FREE=1 FP_LIVE=1 FP_CONC=1`, seconds from the request to each line):

| Case | First line | Type of denial | Case strength | Section finished |
|---|---|---|---|---|
| A, pasted paraphrase | 2.6 | 4.1 | 19.1 | 27.0 |
| B, phone photo | 2.4 | 4.3 | 25.8 | 36.0 |
| C, pasted prior-authorization letter | 2.3 | 6.2 | 28.9 | 36.8 |
| D, pasted EOB | 2.2 | 3.9 | 21.7 | 30.7 |
| E, pasted EOB | 2.0 | 4.5 | 24.5 | 32.8 |
| F, pasted Medicare Advantage notice | 2.2 | 6.2 | 35.1 | 45.9 |
| G, pasted Medicaid notice | 2.3 | 6.7 | 22.8 | 31.0 |
| H, pasted EOB | 2.2 | 4.3 | 21.6 | 29.0 |
| I, pasted Medicare summary notice | 1.9 | 2.8 | 14.6 | 21.7 |
| J, PDF with records attached | 2.4 | 5.2 | 26.9 | 38.5 |

The type of denial met its target in all ten kits: 2.8 to 6.7 seconds, and 4.4 on the median of the eight pasted cases. On the four cases measured both ways it went from 9.3, 12.0, 18.4 and 14.9 seconds to 4.1, 3.9, 6.2 and 4.3. The first line, now the heading, came at 1.9 to 2.6 seconds. Case strength and the end of the section came about when they did before (22.2 and 30.9 seconds on the pasted median; on A, 19.1 and 27.0 against 19.1 and 26.3): the decode is no longer than it was, and the case is still graded after the argument is written. Every first section was asked for once (27 to 30 messages), and no shown line was corrected. What the new order did to the kits is in section 4 (run 28).

Run 29, case I once more after v9.14.1, gave 2.1, 3.0, 17.9 and 24.1 seconds for the same four, with no shown line corrected.

These are times at a script on a server's connection. A phone adds its own network, and no reader's own build has been timed yet.

The writer's rules, the plan rules and the guards live in `api/_lib/`, which the site never serves.

### Decided in code

| What | How | Where |
|---|---|---|
| Appeal deadline | Computed from the notice date and the printed window. The writers are told the exact date and never compute one. A placeholder or estimate ("about two weeks ago") is never treated as a date. | `api/fightpack.js` |
| Urgency | Read from the decode. Care already received is never urgent under the claims rules. | `api/fightpack.js` |
| Plan type | Read from the head of the decode's Plan line. A negated mention ("no language indicating Medicare") never decides it. The plan type sets the decision clock, the plan-specific rules and the tracker's "if they say no again" step. Original Medicare has its own tracker row. | `api/fightpack.js` |
| Decision clock | Set from plan type × care status: ERISA/ACA 30 days pre-service, 60 days post-service, 72 hours expedited; Medicare Advantage 30 / 60 days / 72 hours; Original Medicare 60 days for a redetermination; Medicaid uses the notice's own clock. | `api/fightpack.js` |
| Urgent steps | For urgent care not yet received, the expedited request comes first in "Do this first", with the printed expedited number, and the line says the doctor can request it directly. On an employer or marketplace plan, code adds that the expedited external review can be requested at the same time. | `api/fightpack.js`, `api/_lib/fightpack-facts.js` |
| Peer-to-peer | The printed number and window are read from the decode. For a calendar-day window code computes the last day. Every writer is told it is the doctor's call to place. | `api/fightpack.js` |
| Complaint route | When the documents say whether an employer plan is fully insured or self-funded, only that route is given: the state insurance department or EBSA. | `api/fightpack.js` |
| Tracker JSON | Dates, urgency, plan type and claim number are overwritten with the decode's parsed facts. If part 6 runs out of room before the block, code writes the whole block from the decode. | `api/fightpack.js` |
| Safety instruction | The decode only labels a present red flag EMERGENCY or TODAY and lists the symptoms. Code writes the instruction. In an emergency, code also replaces "Do this first" and opens the insurer script, the billing-office script and the deadlines with an "Emergency first" banner. | `api/_lib/fightpack-guards.js` |
| Plan-specific rules | Stated only where they apply. Medicare Advantage: the treating physician can file a pre-service reconsideration. Medicaid: deemed exhaustion and an expedited State Hearing. Original Medicare: a redetermination by the contractor, then a reconsideration on the record; no peer-to-peer; the supporting records go in with the request. | `api/_lib/fightpack-rules.js` |
| Phone roles | Every number in the source is passed to every writer with the words printed beside it, so a prescriber line is never used to reach the patient's own doctor. For a letter sent as a photo or PDF, the decode's list of printed numbers stands in. | `api/_lib/fightpack-guards.js` |
| Clinical labels | Nine recurring lay-to-clinical relabels are bracketed for confirmation when the patient's own material never uses the term, for example "[if documented: saddle anesthesia]". This applies in every document that states the patient's facts to the insurer or a reviewer: the appeal letter, the doctor's letter, the peer-to-peer brief and the next-level request. A label named only as a risk ("delay can cause permanent paralysis and incontinence") is left alone. Skipped when records are attached. | `api/_lib/fightpack-guards.js` |
| Who did it, who may act, how bad it is | A claim of legal authority the patient never made ("I have power of attorney") becomes "[only if you hold this in writing: …]". A first-person clinical act in a clinician document becomes "[I / Dr. ___] documented …". A severity word the patient's material never uses becomes "[if documented: critically] slow". | `api/_lib/fightpack-guards.js` |
| Settings and vehicles | "Not validated for" a level of care becomes "not appropriate for", and for a vehicle "contraindicated for" (the ambulance rule's own test). The hours or visits a setting is said to give are bracketed when the source never gives them. | `api/_lib/fightpack-limits.js` |
| Surprise-billing argument | In emergency and ancillary cases, "you did not choose the doctor" and "you received no notice" are removed as arguments, because the protection does not depend on them. | `api/_lib/fightpack-limits.js` |
| Ambulance bill | On Original Medicare an ambulance claim is always paid on assignment. Code writes the decode's "What you may actually owe" line (with the total the notice prints), and tells every writer never to make the bill depend on whether the company participates. | `api/_lib/fightpack-facts.js` |
| Policy numbers | A coverage-policy number (NCD, LCD) that the patient's documents do not contain is dropped and the policy's name kept, as phone numbers already are. | `api/_lib/fightpack-facts.js` |
| Text guards | One per defect the writer kept repeating after the prompt told it not to (section 5). | `api/_lib/fightpack-guards.js` |

## 2. The test corpus

Ten synthetic cases (`qa/corpus/`, `qa/manifest.js`) cover different plan types, denial types and input qualities.

| Case | What it stresses |
|---|---|
| A | The rawest input: the patient's paraphrase of a sleep-study denial, with no identifiers. Heart failure; fell asleep at a red light. |
| B | A phone photo of a hospital level-of-care denial (inpatient → observation). |
| C | Pre-service step-therapy denial of a biologic during a steroid-dependent Crohn's flare. |
| D | EOB: out-of-network ER physician at an in-network hospital, processed as non-emergency. |
| E | Self-funded (ERISA) EOB with bundling and modifier denials. |
| F | Medicare Advantage denial of a power wheelchair, filed by the patient's son, with a 65-day printed window. |
| G (held out) | Medi-Cal managed-care denial of a lumbar MRI. The patient now reports progressive leg weakness, trouble starting to urinate and saddle numbness. |
| H (held out) | Self-funded plan EOB for an out-of-network anesthesiologist at an in-network surgery center, with a $1,860 balance bill. |
| I (held out, round 2) | Original Medicare summary notice: an emergency ambulance (ALS1) denied as not medically necessary. The daughter files for her father; the family was told only that his heart rate was "very slow". |
| J (held out, round 2) | Urgent pre-service denial of inpatient rehabilitation after a stroke, on a fully insured employer plan. The letter arrives as a PDF, with therapy notes and a consult attached; the husband files. |

G and H were written after run 5; they informed fixes only after runs 7 and 9. I and J were written after run 15, with their hand-derived truth and checks written before the first run. The checker reports the held-out cases separately. Runs 16–18 ran only I and J, plus C, while the round-2 fixes were made.

## 3. How correctness is measured

**Unit tests** (`qa/tests/`):

- the deadline calculator, 1,477 cases;
- the handler, against a mocked model API, in 27 test blocks. They cover:
  - request shape and caching;
  - part budgets and the normalizer;
  - every text guard and the safety renderer;
  - end-to-end injection of the safety tier and plan rules.

  Each guard is tested on the real lines the model wrote in earlier runs. Before a guard shipped it was also run against every stored output, to catch false positives;
- the unlock flow, free and paid: free tokens per visitor per hour and per day, a token's lifetime budget, and that preview and paid tokens are never throttled;
- that the kit is only emailed whole: the page script itself, run against a scripted API. A kit still being written, or with a part that failed, stops short or lacks a section, is not sent and the reader is told which part; a whole kit is sent with every character of all ten sections, and nothing else but the one line the page adds (below), including after a reload and when the session it was built in has used up its calls;
- what the reader is told when the model API refuses a request: a spend limit or credit balance, an unreadable or oversized file, a rate limit, and a passing fault, each in both modes; and the free translator's and letter writer's allowance per visitor;
- the v9.10–v9.14.1 facts, rules and guards, on the real lines the model wrote and through the handler (112 assertions);
- the kit as it is emailed and copied: the page's own text path, run over every stored kit. Rule lines and emphasis marks must be gone, and every other character of every section must still be there, in order;
- the kit on the page: the renderer itself, on literal cases and every stored kit. Italics are shown as italics and no text is left wrapped in asterisks;
- the homepage's first screen: the order the page is read in, and how much stands before the Build button. The tool follows the headline directly (54 words before the button; the suite fails above 75), progress and the kit open right under it, the pitch and the six cards come after and stay off a printed kit, and every element the page script looks up is on the page once. Pixels need a browser: measured in Chrome, the Build button ends 637 px down on a laptop (it was 1,381) and 655 px down on a 390 × 664 phone (it was 2,441);
- the analytics tags: every page loads Vercel's script once, from the path Vercel serves, and asks for nothing else under `/_vercel/`. The emailed kit carries no tag;
- the example kit: "Try an example" shows `sample-kit.json`, a kit the site wrote for the example letter, instead of making a visitor wait for one. The file must be exactly what the site returned (the raw answers are in `qa/evidence/sample/`), built from the letter the button uses today, whole, and on the deploy list. The page script, run whole, must show it with no server call, never save or email it, leave a reader's saved kit alone, show it again when Build is pressed on the unchanged example, build for real once a word or the note changes, and fall back to the old behaviour when the file is missing. The example's letter and story must also never ride along into a reader's kit: a letter pasted over the example's clears the example's note, and a file of the reader's own clears both boxes of example text (before this, the example's symptoms went into the reader's requests). The stored kit scored 90 pass, 0 fail on the corpus checker; two earlier builds each failed one check and were discarded, not edited. It was built again after the writer was asked for the type of denial first (`built` in the file: 2026-11-12, a UTC date), and that build scored 90 pass, 0 fail at the first try;
- where a kit's reader came from: the page script, run whole, sends one word with a kit's six build calls. It is the tag on the link they followed (`?utm_source=`), else a name for the site that linked here, `other` for any site not on the short list, `site` for another page of this site and `direct` for none. The word is cut down to letters, digits and dashes in the browser and again on the server; a look-alike host is not the real one; nothing else from the link or the referring address is sent; the first word lasts for the tab and no longer; and a browser that refuses storage still gets its kit. The counter keeps the word beside the kit count, and the suite fails if a count line gains any other field (57 checks on the page, 31 on the counter; 26 deliberate breaks of the new code were each caught). In Chrome, a reader who arrived on a tagged link, read "How it's tested" and came back was still counted by the tag;
- the check-ins (`test-checkin.js`, `test-email-kit.js`): the two emails a reader can ask for, and the answers that come back. A link is signed for one kit and one question: one made up, moved to another kit or to the other question, or signed with another secret is not taken; it closes after 180 days; a session token cannot stand in for it. What a link carries rides after the `#`, so the address a browser asks the server for is `/checkin` alone. The emails are written from the kit's tag and the time and nothing else, with one link per answer and no part of the kit. An answer is counted only on a POST (a mail scanner that opens every link answers nothing), as kit, question and answer; ten a day per kit and question; and the tap succeeds when the counter is down. On the email side: nobody who did not tick the box gets one; the kit goes first and is never failed or held up by them (refused, rate limited, a server error, a call that never answers); the week-4 email is scheduled before the day-3 email that promises it, and if it cannot be, the day-3 one is not sent; the same kit to the same address carries the same idempotency keys; and no count from that request holds an address or the kit's tag;
- the check-in box, the page a check-in opens, and the one line the page adds to a kit (`test-checkin-page.js`): the box is not ticked for anybody and the page sends "yes" only for a tick, with the kit's tag only then. The answer page, run whole, asks the email's question in the email's words, sends nothing when it opens, takes the link out of the address bar, sends one POST for a tap, and shows the server's own reason when an answer is refused. The line saying where the drafts came from goes into the note for the office (document 4) and no other document, once, above the note's closing thank-you, on every one of the 180 recorded kits, with nothing else in the note touched; it is in what is shown, copied and emailed, and not in the kit saved in the browser or in `sample-kit.json`. In Chrome, on the preview deployment: the answer page asked the email's question with the linked answer picked out, sent nothing on opening, and left `/checkin` alone in the address bar; a tap on a made-up link was refused by the server (403) and the page showed its reason; the box under "Email me my kit" was not ticked; and the example kit's note carried the line once, above its thank-you. What is unproven: that Resend takes the two scheduled emails from the site's own key, and that it sends them on the day. No check-in has been scheduled against the real service yet; one emailed kit with the box ticked shows the first, and that email arriving 3 days later shows the second;
- check-ins asked for from the app (`test-app-checkin.js`): `POST /api/app-checkin` needs a session token and allows each visitor ten requests a day. It hands back a ticket per question, signed exactly as a link is, and an answer posted with one is counted as any check-in answer. An address is optional, and one that is not an address is refused, not skipped. With an address the two emails are scheduled as the site's are (week 4 first; the same tag and address asked twice carry the same idempotency keys; a refusal is counted with its reason and the reader is promised nothing), in the app's words, with links marked `v=app` so the answer page does not tell an app reader about a kit in their inbox. The address goes to the email provider only: no waitlist row, no count, no answer to the app holds it. With email switched off, or the week-4 email refused, the tickets are still handed back. Eleven deliberate breaks of the new code were each caught. In Chrome: a link marked for the app and one not, each opened and answered, showed the app's and the site's words in turn and posted the same five fields. What is unproven: nothing calls this endpoint yet, so it has not run in production, and no app email has been scheduled against the real service.

**Automated checker** (`qa/fp-check.js` with `qa/manifest.js`, about 100 checks per kit). The checks cover:

- transport and structure;
- the tracker JSON;
- identifiers;
- the deadline against hand-derived truth;
- invented facts — every dollar amount, date and phone number must come from the source or the verified list;
- urgency and safety;
- **depth** checks: the case's deciding argument is present;
- **defect** checks: mostly patterns the audits found.

Text in [brackets] is a prompt for the user, not an assertion, so most defect checks ignore it.

**Independent audit.** An AI agent with a physician-reviewer rubric and a fixed severity key audited the kits:

- **Critical** — could cause a missed deadline, delayed urgent care, or a clinician signing a false statement.
- **Major** — likely to lose the appeal or mislead the patient.
- **Minor** — credibility or polish.

The agent audited runs 3, 4, 6, 9, 16, 21 and 26 (`docs/qa-evidence/`). Every rule was checked against primary sources, and in the run-21 and run-26 audits every quote was also machine-checked against the kit. It was told to ignore the checker's expectations so its read stayed independent.

**Replay** (`qa/replay-guards.js`). This re-runs the current deterministic layer (the text guards, and the tracker JSON rewritten from the decode) on a stored run's outputs. It separates what code fixes from what the prompt changes fix.

**Checker calibration.** A check must catch the defect it was written for, must not fire on correct text, and must count each defect once.

- **Sensitivity.** Every check added from an audit must flag that audit's defect when the audited run is re-scored.
- **Sensitivity gap.** In run 7 the "emergency department now" check passed because the words were present — as a fallback after calling the office. That check now tests that the emergency instruction comes first.
- **Sensitivity of the relabel check.** G's check for exam-derived labels in the clinician's voice fails in every stored run from 5 to 12. It passes in runs 13–15, where code bracketed the labels.
- **False positives.** When a check fired on correct text, the check was fixed and every run was re-scored. The fixes:
  - an insurer phrase quoted back;
  - "underdocumented" read as "documented";
  - "those documents" read as a verb;
  - a question to the billing office read as a coding assertion;
  - "separately" plus a list number read as the date "Sep 1";
  - "once you are stable" read as an assertion of stability;
  - "within 30 days" not matched to the notice's "within 30 calendar days";
  - "Urgent: Standard review" not read as a no;
  - a plan line that declines to call the plan self-funded ("no language indicating … self-funded status") read as calling it self-funded (runs 12 and 13);
  - a date written without its year ("by the March 29 deadline") read as this year rather than the deadline's (run 14).
- **Brackets are prompts, everywhere.** F's relabel check counted a label even inside a bracket. It now ignores brackets, like the other defect checks. No stored run's score changed: every run that failed it also had the label outside a bracket.
- **One defect, one count.** The plan-specific checks used to follow the kit's own plan type. When run 13's tracker wrongly said Medicare, three Medicare checks also failed on text that was correct for the employer plan. They now follow the true plan type, so a wrong plan type counts once, and the kit's text is still tested against the rules of the plan the patient actually has.
- **Each run scored on its own cases.** Runs 16–18, 26 and 27 ran only some cases, so every run is scored on the cases it actually ran (`qa/rescore-all.sh` keeps a case list per run).
- **Sensitivity gap, round 3.** The records check written from the run-21 re-audit (I-4) matched that run's forms ("ask … to send their records to the Medicare claims office") but not the provider's own offer, "submit additional documentation or appeal on Harold's behalf". Reading every stored case I kit found that form in runs 16, 18, 20 and 24. The check now catches it (14 of the 15 defective sentences, and none of the 13 correct ones that mention records), and each of those runs counts one more defect.

## 4. Results

All runs were scored with the same final checker. "Dev" is the six development cases A–F; "held-out" is G and H, and I and J from run 16 on.

| Run | Engine | Cases | Defects | Per kit (dev) | Per kit (held-out) | Deadline exact | Identifiers exact |
|---|---|---|---|---|---|---|---|
| 3 | v4 | A–F | 77 | 12.8 | — | 6/6 | 21/21 |
| 4 | v5 | A–F | 40 | 6.7 | — | 6/6 | 21/21 |
| 5 | v6 | A–H | 21 | 2.0 | 4.5 | 8/8 | 29/29 |
| 6 | v7 | A–H | 25 | 3.0 | 3.5 | 8/8 | 29/29 |
| 7 | v8 | A–H | 14 | 1.2 | 3.5 | 8/8 | 29/29 |
| 8 | v9 | A–H | 17 | 2.0 | 2.5 | 8/8 | 29/29 |
| 9 | v9.1 | A–H | 10 | 1.0 | 2.0 | 8/8 | 29/29 |
| 10 | v9.1 (repeat) | A–H | 9 | 1.0 | 1.5 | 8/8 | 29/29 |
| 11 | v9.2 | A–H | 16 | 2.2 | 1.5 | 8/8 | 29/29 |
| 12 | v9.3 | A–H | 16 | 2.0 | 2.0 | 8/8 | 29/29 |
| 13 | v9.4 | A–H | 14 | 2.0 | 1.0 | 8/8 | 29/29 |
| 14 | v9.5 | A–H | 18 | 2.2 | 2.5 | 8/8 | 29/29 |
| 15 | v9.6 | A–H | 12 | 1.7 | 1.0 | 8/8 | 29/29 |
| 16 | v9.6 | I, J (first run) | 18 | — | 9.0 | 2/2 | 8/8 |
| 17 | v9.7 | C, I, J | 13 | 4.0 | 4.5 | 3/3 | 13/13 |
| 18 | v9.7.1 | C, I, J | 6 | 0.0 | 3.0 | 3/3 | 13/13 |
| 19 | v9.8 | A–J | 22 | 2.0 | 2.5 | 10/10 | 37/37 |
| 20 | v9.8.1 | A–J | 13 | 1.5 | 1.0 | 10/10 | 37/37 |
| 21 | v9.8.3 | A–J | 13 | 1.2 | 1.5 | 10/10 | 37/37 |
| Production, free path | v9.8.3 | G, J | 1 | — | 0.5 | 2/2 | 8/8 |
| 23 | v9.10 | A–J | 10 | 0.3 | 2.0 | 10/10 | 37/37 |
| 24 | v9.11 | A–J | 12 | 1.2 | 1.3 | 10/10 | 37/37 |
| 25 | v9.12 | A–J | 14 | 1.7 | 1.0 | 10/10 | 37/37 |
| 26 | v9.12.1 | I, J | 2 | — | 1.0 | 2/2 | 8/8 |
| 27 | v9.13 | C, I, J | 3 | 0.0 | 1.5 | 3/3 | 13/13 |
| 28 | v9.14 | A–J | 13 | 1.3 | 1.3 | 10/10 | 37/37 |
| 29 | v9.14.1 | I | 2 | — | 2.0 | 1/1 | 4/4 |

The counts for runs 3–15 are up to one higher than in earlier versions of this document, because some checks added in round 2 also apply to the earlier cases. Three checks added after the run-21 re-audit raise run 17 by one, run 19 by one, run 21 by three and run 23 by one: what the family owes for an ambulance never depends on whether the company participates; a coverage-policy number must be in the documents; and the records go to the family and in with the appeal, never to Medicare on their own. Extending that last check on 30 October to the provider's own offer ("submit additional documentation or appeal"), which its first form missed, raises runs 16, 18, 20 and 24 by one each (section 3).

By case:

| Run | A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|---|
| 21 (v9.8.3) | 2 | 2 | 0 | 0 | 0 | 3 | 0 | 1 | 5 | 0 |
| 23 (v9.10) | 0 | 0 | 0 | 2 | 0 | 0 | 1 | 4 | 2 | 1 |
| 24 (v9.11) | 0 | 0 | 1 | 0 | 2 | 4 | 0 | 1 | 4 | 0 |
| 25 (v9.12) | 1 | 1 | 1 | 1 | 2 | 4 | 0 | 1 | 2 | 1 |
| 26 (v9.12.1) | — | — | — | — | — | — | — | — | 1 | 1 |
| 27 (v9.13) | — | — | 0 | — | — | — | — | — | 2 | 1 |
| 28 (v9.14) | 1 | 3 | 2 | 0 | 2 | 0 | 1 | 2 | 2 | 0 |
| 29 (v9.14.1) | — | — | — | — | — | — | — | — | 2 | — |

H went 1, 4, 1, 1 and F 3, 0, 4, 4 with no change to the code those cases exercise; that is the noise described below. I went 5, 2, 4 and 2 in runs 21 to 25, then 1 and 2, and 2 again in each of runs 28 and 29. The records route, one of run 24's four, passed in runs 25 to 27 and failed once more in run 28 (below). Of I's three failures in runs 26 and 27, two are its peer-to-peer check firing on the kit's correct sentence that there is no peer-to-peer at this level (below). The production kits were built on 30 October 2026 the way a visitor builds one (a free token from `/api/unlock`, then the six parts). G passed all 104 checks. J passed 104 and missed one depth check: in its decode the doctors "should call the expedited appeal line to support your request", but the kit never says the doctor can request the expedited appeal directly. They cost $0.18 and $0.24 in model usage; J carries a PDF and records. Runs 23, 24 and 25 cost $1.70, $1.64 and $1.67 for ten kits, about $0.17 per kit; runs 26 and 27 cost $0.39 for two kits and $0.59 for three (I and J carry the most text). Run 28 cost $1.66 for ten, and run 29 $0.18 for one.

**Run 28** is the first run written with the type of denial first (v9.14). It is also the first full run built the way a visitor's kit is built: through the free path, with the decode asked for live (the earlier full runs used the preview code and asked for every part the plain way). v9.14 moved one line of the decode's instructions and changed no guard, so the question for the run was whether the kits got worse. By every measure here they did not:

- 13 defects, against 10, 12 and 14 in runs 23 to 25, with every deadline and identifier exact;
- two of the 13 are checks that had never failed on that case in runs 9 to 27, the runs whose raw files are stored. B's decode says the criteria "require" findings where the notice says only that the documentation does not show them, and I's doctor's letter opens "I am the [specialty …] for Mr. Pruitt", where the check looks for "treating" or "attending". Each full run from 19 to 25, set against the other runs in the same way, has two to four;
- two of the 13 have their text in the decode, the section whose instruction moved: B's, above, and C's "The policy allows exception", which runs 10, 12 and 25 also had. Counted the same way, the six full runs before had 6, 0, 5, 2, 1 and 2. One run cannot say whether B's comes from the new order; it is the line to look for in the next run;
- every case got a case strength that runs 20 to 27 had given it, and a type of denial of the kind those runs gave; the wording of the type line varies from run to run, as it did before;
- the decode is no longer than it was: 7,805 words over the ten cases, against 7,787 to 8,081 in runs 19 to 25;
- every part was written at the first request (60 of 60). One free session carried all 60 calls: its 24-call budget is counted in each server instance's memory (section 7), and no one instance saw 24 of them.

Two things in I's kit needed code, and v9.14.1 is that code (section 5). Neither is in the decode, whose instruction is what moved: I's decode sends every record through the family.

- A defect that code had removed came back in a new form. The insurer script asks: "Can the ambulance company resubmit the claim with the trip report, or do we need to file a redetermination with those records?" On Original Medicare the records go in with the family's own request, and the route guard (v9.12 and v9.12.1) did not know this wording. With v9.14.1 the line reads "Do we need to file a redetermination with those records?"
- Reading the kit found a fourth bug in the code that reads the writers' prose, and no check counts it. The billing script says: "I need it by [a date …] so I have time to mail everything to me." The route guard took "I have time to mail everything to Medicare" for a request made of someone else and turned "to Medicare" into "to me"; put through the handler as it was, that sentence came out exactly so. No other stored kit has it. v9.14.1 leaves the family's own sending steps alone.

G's one failure is its label check firing on a consequence the doctor's letter names ("may lead to … chronic urinary retention or incontinence"), which the label guard leaves alone on purpose.

**Run 29** is one kit: case I, built on the live site the way run 28 was, after v9.14.1 was deployed. It is the run that follows the change (section 6). It had 2 defects, and neither is on the records route:

- the appeal letter asks for "a written decision within 60 days", a timeframe the notice does not print. That check had not failed on this case in runs 16 to 28;
- neither letter says the ambulance went to the closest hospital, which 4 of those 12 runs also left out.

The writers used neither of run 28's two wordings this time, so the guard had nothing to change, and the guard as it was before v9.14.1 would have changed nothing in this kit either. What the run shows is narrower than the fix: the Original Medicare path works with the new code, the insurer script offers no resubmission, and the family's own sending steps read as written ("confirm that we mail everything to Medicare Part B Claims Office …"). The evidence for the fix itself is the tests on run 28's own lines.

Replaying today's deterministic layer (v9.14.1) on stored outputs, with no prompt change, shows what code alone fixes. The defect counts went:

| Run | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | All |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| As run | 21 | 25 | 14 | 17 | 10 | 9 | 16 | 16 | 14 | 18 | 12 | 18 | 13 | 6 | 22 | 13 | 244 |
| Replayed | 15 | 14 | 9 | 12 | 6 | 5 | 12 | 11 | 11 | 14 | 9 | 9 | 9 | 2 | 16 | 9 | 163 |

No check that passed as run fails in the replay. Runs 21, 23, 24, 25 and 26 go from 13, 10, 12, 14 and 2 to 10, 9, 11, 14 and 1. Run 28 goes from 13 to 12: one line of one part changes, I's question about resubmitting the claim. The sentence the old guard garbled cannot be put back by a replay, and no check counts it.

### Must-pass safety checks

| Run | A: no driving until evaluated | C: doctor today, unconditionally | G: emergency department is the first instruction | G: emergency care never a fallback for calling the office | G: no same-day office visit instead | I: no emergency instruction for a past, treated emergency | J: no emergency instruction for a patient already admitted |
|---|---|---|---|---|---|---|---|
| 5 | pass | pass | **FAIL** | pass | **FAIL** | — | — |
| 6 | pass | **FAIL** | **FAIL** | pass | **FAIL** | — | — |
| 7 | pass | pass | **FAIL** | **FAIL** | **FAIL** | — | — |
| 8 | **FAIL** | pass | pass | pass | pass | — | — |
| 9–15 | pass | pass | pass | pass | pass | — | — |
| 16 | — | — | — | — | — | pass | pass |
| 17–18 | — | pass | — | — | — | pass | pass |
| 19–21, 23–25 | pass | pass | pass | pass | pass | pass | pass |
| 26 | — | — | — | — | — | pass | pass |
| 27 | — | pass | — | — | — | pass | pass |
| 28 | pass | pass | pass | pass | pass | pass | pass |
| 29 | — | — | — | — | — | pass | — |
| Production | — | — | pass | pass | pass | — | pass |

**G, runs 5–7.** Each engine before v9 routed the G patient through her doctor's office, in its own words:

- run 5: "Contact Dr. Achebe today";
- run 6: "Go to an emergency department today… Can Dr. Achebe see me today";
- run 7: "Call Dr. Achebe's office today — before filing the appeal… if you cannot reach the office or be seen today, go to the emergency department now".

**A, run 8.** The v9 label rule lost A's no-driving advice: the model read a past drowsy-driving episode as "not present now". An existing check caught it, and v9.1 fixed it.

**C, run 6.** The decode made the doctor call conditional ("if symptoms worsen"). v8 made it unconditional; v9 writes it in code.

**I and J** test the other direction: an emergency that is over (I's ambulance ride) and a patient already in hospital (J) must not get an emergency instruction. Neither ever did.

### Relabels in the documents sent to the insurer

The count is case × term × section cells with one of the guard's nine labels left unbracketed (`qa/relabel-map.js`). The documents sent to the insurer are the appeal letter, the doctor's letter, the peer-to-peer brief and the next-level request. "Elsewhere" covers the decode, the note to the doctor's office, the phone scripts, the records request and the deadlines.

| Runs | Engine | Sent to the insurer, per run | Elsewhere, per run |
|---|---|---|---|
| 5–12 | v6–v9.3 | 8 to 16 | 2 to 11 |
| 13 | v9.4 (doctor's letter and peer-to-peer only) | 5 | 5 |
| 14 | v9.5 | 4 | 5 |
| 15 | v9.6 (all four documents) | 0 | 5 |
| 16–18 | v9.6–v9.7.1 (I, J and C only) | 0 to 1 | 0 |
| 19 | v9.8 | 3 | 3 |
| 20 | v9.8.1 | 0 | 10 |
| 21 | v9.8.3 | 2 | 11 |
| Production | v9.8.3 (G, J) | 1 | 5 |
| 23 | v9.10 | 0 | 3 |
| 24 | v9.11 | 2 | 3 |
| 25 | v9.12 | 2 | 4 |
| 26–27 | v9.12.1–v9.13 (C, I, J only) | 0 | 0 |
| 28 | v9.14 | 4 | 3 |

Every unbracketed cell in the documents sent to the insurer in runs 19–28 and in production is a risk or a possible consequence, which the guard leaves alone on purpose: "placing me at risk for complications, malnutrition", "risks recurrent incontinence", "risks permanent paralysis and incontinence". Run 28's four are all in doctor's letters and of the same kind: "with risk of motor vehicle accidents" (A), "with risk of progressive bowel damage, malnutrition" (C), and "may lead to … chronic urinary retention or incontinence" (G, two cells). The cells elsewhere are mostly G's decode and phone scripts, which the guard does not cover (section 7).

### Reading the numbers

- **Run-to-run noise is large.** Per-case defect counts across runs 7–15 and 19–21 move between 0 and 5, often with no change to the code that case exercises. For example, run 14 had four misses in the billing-office script and the records request, against 0 to 2 in the earlier runs, and E went 3, 3, 0 in runs 19–21. Use repeated runs and the must-pass checks, not one run's total.
- **Checks written from an audit are biased against the audited run.** They were built to catch that run's defects. Run 6 looks worse than run 5 partly because eight of its defect checks came from its own audit, and run 16 (8.5 per held-out kit) was the run the round-2 checks were written from. Compare later runs.
- **Two strict checks count stated facts.** These are D's "you did not choose the ER doctor" and H's "I received no notice or consent form". The auditor objects only when choice or consent is made a condition of the protection, and accepts the plain facts. The prompt says not to argue them at all, and since v9.8.3 code removes them as arguments, so the checks now measure what code enforces. A third check is strict in the same way. H's "in-network rate" fired in run 14 on a sentence describing how the claim was processed, not stating the protection. It was left as it is rather than tuned on the run it was scoring. I's peer-to-peer check is strict the same way: it fires on any mention in the doctor's letter or the note to the office, and in runs 26 and 27 it fired on the kit's correct statement that there is no peer-to-peer at this level. It too is left as it is, so it counts in both runs.

### Audit verdicts

| Audit | Critical | Major | Notes |
|---|---|---|---|
| Run 3 (v4) | 3 | many | urgent-appeal routing, invented exam findings, no representative authority |
| Run 4 (v5) | 0 | 7 new | All 3 Criticals fixed; 13 of 25 Critical/Major items fixed, 11 partly fixed, 1 regressed |
| Run 6 (v7) | 1 | 9 | G emergency routing (Critical) |
| Run 9 (v9.1) | **0** | 6 | G routing fixed. Open: H consent exception in the decode; G "urinary retention" relabel; B "requires" plus an invented rule; C prescriber line; F unsourced diagnosis and an unseen-record description; E asserted visit-note contents |
| Run 16 (v9.6), held-out I and J | 2 | 9 | J: the concurrent expedited external review dropped, and the signer made the author of the physiatrist's consult (both Critical); a peer-to-peer the patient was told to wait for. I: "115%" money advice for an ambulance, an invented power of attorney, severity upgrades in the physician's voice, the doctor's letter routed away from the redeterminations address |
| Run 26 (v9.12.1), I and J, third audit | **0** | 4 | No Critical. I: the records route and the billing script are right (I-4 down to one optional line), and the assignment rule holds. Its one Major is a severity upgrade in the doctor's letter, "constituted a potentially life-threatening cardiac emergency" (I-3, regressed). J: the 10/25 misstatement is gone (J-6), and the doctor's letter is signer-neutral. Majors: the peer-to-peer script's "my October 26 consultation" (J-2), tolerance overstated ("can now tolerate", J-R3-1), and the external-review branch of the urgent path (J-R3-2, borderline Critical): the concurrent request faxed to the plan rather than filed with the state, and no same-day step if the plan upholds |
| Run 21 (v9.8.3), I and J again | **0** | 4 | No Critical: J-1 fixed, J-2 reduced to a Major. J's urgent path is right throughout. Open: I sends the ambulance and hospital records to the contractor apart from the appeal, and a non-assigned ambulance "could be higher" (ambulance claims are always assigned); J calls the 10/25 therapy day "fatigued" when that day's note says "participating fully", and the note for the office still offers the physiatrist's letter to the attending. New Minor: an invented citation, "NCD 20.4", which is implantable defibrillators |

v9.2 and v9.3 answered the run-9 audit with code:

- consent-exception removal for emergency and ancillary care;
- "already done" statements in contractions and the simple past;
- record descriptions bracketed;
- phone roles passed to every writer;
- corrected Medicare Advantage and Medicaid rule wording.

v9.3 also found and fixed a deterministic-layer bug of its own (section 5).

v9.4 answered the remaining G relabel with code, together with the same pattern in A, B, C and F. v9.5 fixed a second deterministic-layer bug, found by run 13. v9.6 fixed a third, found by runs 12 and 14, and extended the label guard to the patient's own letters.

v9.7 to v9.8.3 answered the run-16 audit, mostly with code (section 5), and v9.10 answered I-1 and the invented citation from the re-audit. Of its 2 Criticals and 9 Majors, the re-audit found one Critical fixed and the other reduced to a Major (J-2). Three Majors were fixed and three more reduced to Minor residue. Three remain: I-1 not fixed, I-4 partly fixed, and J-6, which regressed into a new misstatement of the same therapy notes.

v9.11 and v9.12 answered those three, and the third audit (run 26) confirmed it: I-1, J-6 and I-4 are fixed, I-4 apart from one optional line. v9.13 answered the third audit where code can decide: the urgent external-review route and its same-day step (J-R3-2), the dated consultation (J-2), I-4's last line, J-5's new wording ("not validated to") and I's deadline wording (I-R3-2). Run 27 shows them in the kits; a fourth audit has not read them. I-3 and J-R3-1 are prose that no code rule could decide; the one tried for I-3 was stopped at the gate (section 6).

## 5. What changed, and the evidence for each change

| Engine | Change | Evidence that drove it |
|---|---|---|
| v5 | Removed the priming examples from the prompt; added generic rules placed where they apply | "Urge incontinence" appeared 0 → 1 → 9 times in runs 3/4/5 after it was named in a "never write" example |
| v7 | Code: hedge technical absolutes ("cannot distinguish" → "may not reliably distinguish") | A false home-sleep-test claim in the signed letter, recurring in runs 3–5 |
| v7 | Code: a phone number not in the source or the verified list becomes a placeholder | Run 5 printed a state number from memory |
| v7 | Tiered safety rule; a scheduled service is never argued as an emergency | Held-out G and H failed in run 5 |
| v8 | Code: "emergency department today" → "now" | Run-6 audit, Critical |
| v8 | Code: a sentence saying something was already done becomes "[Only if this has happened: …]" | Audit E3, recurring in runs 3, 4 and 6 |
| v8 | Code: "at in-network rates" → "with in-network cost-sharing" | The No Surprises Act protects cost-sharing, not the provider's rate; recurred in runs 4–6 |
| v8 | Code: "use the later date" → "use the earlier date" | Run-6 audit, Major: a phone date never extends the printed deadline |
| v8 | Code: an assertion that two codes are separately reportable becomes "[Only if the billing office confirms it: …]" | Audit E1 (20610 + 76942 where CPT uses 20611), recurring in runs 4–7 |
| v8 | The safety classifier reads condition scope, and was tested on every real safety line before it shipped | Its first version would have told the sleep-study and Crohn's patients "go to an emergency department now" (3 of 4 conditional warnings misread) |
| v9 | Code writes the safety instruction from the decode's label; banners; "Do this first" replaced in an emergency | G's office-first routing survived three prompt versions (runs 5–7) |
| v9 | Code removes "… when the patient did not choose the provider" from statements of the protection | Run 7 made the anesthesia protection conditional on choice 9 times |
| v9.1 | The label rule counts a past drowsy-driving episode and worsening symptoms | Run 8 lost A's safety line |
| v9.2 | Code removes "unless you signed a notice-and-consent form", only when the source is about emergency or ancillary care, where consent cannot waive the protection | Run-9 audit, Major; recurred in runs 6, 7 and 9 |
| v9.2 | Code brackets descriptions of records nobody has seen ("the visit note documents…") unless records were attached | Run-9 audit, Major; F described an unseen record or asserted an exam finding in 7 of 9 runs (4–12). Run 12 still had one exam-finding claim the guard does not cover |
| v9.2 | Phone roles; "already done" in contractions and simple past; Medicare Advantage and Medicaid wording | Run-9 audit (C prescriber line; missed "I've contacted"; the MA fast line used for a standard request; Medicaid filing window misread as decision time) |
| v9.3 | A placeholder or estimate is never a date | Run 11 turned "[not provided — approximately two weeks before October 30, 2026]" into the notice date. A wrong notice date can produce a wrong deadline. Checked against all 74 stored decodes: only placeholders changed |
| v9.4 | Code brackets nine recurring lay-to-clinical relabels in the doctor's letter and the peer-to-peer script, when the patient's material never uses the term and no records were attached: urinary retention, foot drop, saddle anesthesia, incontinence, asserted falls, near-miss or crash, malnutrition, hypoxemia, volume overload | Run-9 audit, Major: G's "urinary retention". The prompt already said "symptoms stay in the source's own words". A scan of runs 5–12 found G's relabels in all eight runs (saddle anesthesia in 8, foot drop in 7) and F's "incontinence" for "has had accidents" in all eight. Replayed on every stored run before it shipped. Run 13: 11 brackets, in F and G only; G had no defects for the first time |
| v9.5 | The plan type is read from the head of the decode's Plan line; a negated mention never decides it | Run 13's decode of an employer HMO said "no language indicating Medicare, Medicaid, or self-funded status", and code read it as Medicare. The deadline tracker would then have told the patient that an Independent Review Entity reviews the case automatically. For an employer plan the patient must request external review, so believing that note could lose the external-review window. Checked against all 104 stored decodes: only that one changed |
| v9.6 | Three guard fixes. (1) A full stop inside a bracket no longer ends a sentence, so the "already done" guard sees the sentence after a bracket. (2) The label guard also covers the patient's own appeal letter and next-level request. (3) A label named only as a risk is not bracketed, and text inside an outer bracket is left alone | (1) Run 14's E said "The billing office has verified the codes…" right after a coding bracket that contained a full stop. The same miss was in run 12. (2) The relabel map of runs 5–14 found F's "incontinence" in the appeal letter in all ten runs and G's "foot drop" in the next-level request in six. (3) Run 14 bracketed "delay can cause permanent paralysis and [incontinence]". Replayed on all 552 stored parts before it shipped: the safety tier changed for none of the 92 decodes; 4 sentences were newly bracketed by (1); and 11 v9.4 brackets were removed by (3), all risk statements |
| v9.7 | Code adds the concurrent expedited external review under the decode's Urgent line for urgent care not yet received on an employer or marketplace plan; the next-level request is written as that one request, ready to send now | Run-16 audit, Critical (J-1): the letter offered it and the kit dropped it. The writers had also left it out of case C in 9 of 13 runs (every run from 10 to 15) |
| v9.7.1 | Code writes the tracker JSON from the decode when part 6 runs out of room; the Original Medicare rules (redetermination, reconsideration on the record, no peer-to-peer, CMS-1696, nothing billed stated from memory) | Run 17's case C lost the deadline tracker. Run 16 gave I a "115%" limiting charge and addressed the doctor's letter away from the redeterminations address; run 17 gave it a "hearing" before the reconsideration contractor |
| v9.8 | Code: a claim of legal authority the patient never made is bracketed; a first-person clinical act in a clinician document becomes "[I / Dr. ___]"; an unsourced severity word is bracketed; "since I submitted that request" becomes the passive. The handler decides the complaint route from the plan's funding, the peer-to-peer number and last day, and Original Medicare's own tracker row; a letter sent as a file gets the decode's list of printed numbers; the decode cap rose from 6,000 to 8,000 characters | Run-16 audit: I-2 (invented power of attorney), J-2 (Critical: the attending made the author of the physiatrist's consult), I-3 (severity upgrades), J-3 (the doctor told to wait for the plan's call), I-13 (plan type "other"). G's red flags were wrapped in a bracket to delete in runs 11 and 15. Run 18's J routed complaints to EBSA for a fully insured plan. Run 17's 6,000-character cap cut J's decode before its printed numbers |
| v9.8.1 | Code puts the expedited request first in "Do this first" for urgent care; only the complaint route that fits the plan's funding is kept; part 1 may write 2,000 tokens | Run-16 audit: J's decode led with a billing-office call (Major); runs 16–19 led it with a billing call, a representative form or a letter. Run 19's J added an EBSA branch to a fully insured plan's route. Run 19's longer decode hit the 1,600-token limit in case B |
| v9.8.2 | Code rewrites "not validated for" a setting or vehicle ("not appropriate for"; for a vehicle, "contraindicated for"), and brackets the hours or visits a setting is said to give when the source never gives them | Run-16 audit, J-5 (Major) and I-6: J's kits said "a skilled nursing facility offers 1–2 hours of therapy per day and is not validated for …" in every run from 16 to 20, through two prompt fixes |
| v9.8.3 | Code removes the choice and notice arguments in emergency and ancillary surprise-billing cases, while keeping the rule itself | Against the prompt, D argued "I did not choose" in every run that included it (13 of 13, runs 5–20) and H argued "no notice or consent" in 9 of 13. Every changed line in runs 5–20 was read before it shipped. Run 21: neither |
| v9.10 | Code writes the decode's "What you may actually owe" line for an Original Medicare ambulance claim and tells parts 2–6 that an ambulance claim is always paid on assignment; drops a coverage-policy number the documents do not contain; adds that the doctor can request the expedited appeal when "Do this first" already leads with it | Re-audit I-1 (Major): every I kit in runs 16–21 made the bill depend on whether the company participates, through the prompt rule against stating billing rules from memory. Run 21's "NCD 20.4". The production J kit never said the doctor can request the expedited appeal. The diff gate over all 876 stored parts changed 6 owed lines, 1 policy number and 5 "Do this first" lines, and nothing else. In run 23, I's kit has no participation question anywhere, and J's says the doctor can request it |
| v9.11 | The decode of an Original Medicare notice is told where the records go: to the family, and in with the redetermination request, never to Medicare on their own, "as additional documentation" or as a corrected claim. Parts 2–6 get the same rule from the decode. With records attached, every part is told that a dated record keeps its own words. Rules like these now live in `api/_lib/fightpack-facts.js`, so the next one needs no change to the handler | Re-audit I-4 (Major): the rule that everything goes together reached only parts 2–6, and the decode, which every writer follows, routed records to Medicare in runs 21 and 23. Re-audit J-6 (Major): run 21 moved one day's "fatigued" to the next day. In run 24 I's decode routes everything through the family, and J quotes each day's note in its own words. One residue: I's billing script still offers the company the choice to "submit additional documentation" |
| v9.12 | On Original Medicare the billing-office script's own spec asks for the records to come to the family and whether the provider will file its own redetermination, in place of "submit a corrected claim, add documentation, or appeal"; code takes the provider route out of what the writers still produce; the records rule says only what to do | The spec outvoted the v9.11 rule: case I's kits asked the ambulance company to send its records to Medicare or file a corrected claim in 7 of the 8 runs from 16 to 24. The diff gate over all 996 stored parts changed 15 lines, all in I; run ungated it would have removed 15 correct corrected-claim lines from A, D and E, so it is gated on the plan. Run 25's billing script asks for the trip report and whether Tri-County will file its own request |
| v9.12.1 | The route guard also covers the run-21 forms ("ask … to send their records to the Medicare claims office", "to Medicare and to me", the letter's "[I have asked … directly to your office]"), in each section's voice; the doctor's-letter spec on Original Medicare offers no peer-to-peer | Run 21's I-4 lines, the re-audit's own examples, were not caught by v9.12. Run 25's doctor's letter offered "[If peer-to-peer is offered, I am available …]" under the rule that says there is none |
| v9.13 | The decode's "Two requests at once" line says where the expedited external review goes on an insured plan (the state insurance department, which assigns the reviewer), that the reviewer may want the plan's expedited appeal finished first, and to ask the same day if the plan upholds; the writers are told the same. "[my / Dr. ___'s] October 26 consultation"; "not designed to" for a setting "not validated to" a task; the office's offer to fax the records to the contractor itself comes out; the Original Medicare deadline is a day of arrival, counted from presumed receipt | The third audit (run 26): J-R3-2 (borderline Critical), J-2, J-5, I-4 and I-R3-2. The diff gate changed 3 guard lines, 1 route line and the urgent line of C and J only. Run 27: J's decode and §9 send the request to the state insurance department; I's deadline counts from presumed receipt |
| v9.14 | The decode's writer is asked for the type of denial first, directly under the heading and ahead of the "Read from your letter" list. Nothing else in the instruction moved, and no guard changed. The page is sent the heading the moment it is written | Shown live, the type of denial reached a reader at 12.0 seconds on the median of three pasted cases (9.3 to 18.4 over four kits), against a target of 10: it was written after the thirteen-line list. Replayed on all 169 stored decodes with the line moved, the guards gave the same lines and nothing shown was corrected. Run 28: 2.8 to 6.7 seconds over ten kits (4.4 on the median of the eight pasted cases), the type line first and once in every decode, 13 defects against 10, 12 and 14 in runs 23 to 25, every deadline and identifier exact |
| v9.14.1 | The Original Medicare route guard, twice. (1) A question that sets someone else's resubmitting of a claim or records beside the family's own request ("Can the ambulance company resubmit the claim …, or do we need to file a redetermination …?") keeps only the family's question. (2) The rule that redirects "ask X to send it to Medicare" no longer counts "have" as asking, nor a request with no one named ("ask how to submit …", "if you are asked to send …"): what the family itself sends to Medicare is never redirected | Run 28, case I. Its insurer script offered Medicare a resubmission in a wording the guard did not know. And its billing script read "so I have time to mail everything to me": the guard had taken "I have time to mail everything to Medicare" for a request made of someone else. "You have 120 days … to send your request to Medicare" would have read "to you". The diff gate over every stored kit, and over all 846 stored parts as the server runs them: one line changes, the run-28 question. The gate also stopped the first form of rule (1), which cut a real run-20 sentence to "If the plan do I need to …". Run 29 (case I on the live site): neither wording came up, so the guard had nothing to change; no resubmission is offered, and the family's own sending steps read as written |
| v9.9 (handler only) | The free path: free tokens per visitor, with a lifetime call budget per token. The reader is told plainly when the account's spend limit is reached or a file cannot be read, instead of "try again". The prompts, plan rules and guards moved to `api/_lib/`, which the site does not serve. Later the same day, the free translator and appeal letter got the same plain budget message and a per-visitor allowance of their own | The site went free on 30 October 2026. Until then `/lib/fightpack-preamble.js` and the other engine files were downloadable from the live site. The translator and letter writer share the account's budget, and until then had no limit per visitor, so one script could have spent it for all three tools |

## 6. What generalizes

1. **Anything a rule can decide should be decided in code.** Prompt instructions lowered defect rates, but defects kept coming back after the prompt explicitly forbade them:
   - office-first emergency routing;
   - "separately reportable";
   - "in-network rates";
   - "cannot distinguish";
   - "already done" statements;
   - the consent exception;
   - lay-to-clinical relabels in the letters ("symptoms stay in the source's own words" was in the prompt throughout);
   - "not validated" for a level of care (runs 16–20, through two prompt fixes);
   - the choice and notice arguments in surprise-billing cases;
   - what a family owes for an ambulance on Original Medicare (every run from 16 to 21; gone in run 23 once code wrote it);
   - where Original Medicare records go (7 of 8 runs from 16 to 24, through the v9.11 rule; gone in runs 25–27 once code decided the section's own spec by plan; back once in run 28 in a wording the guard did not know, which v9.14.1 adds).

   Each disappeared only when code enforced it. For relabels, code turns them into prompts for the clinician.
2. **Negative examples prime the error they name.** The v9.11 records rule quoted the phrases to avoid, "as additional documentation" and "a corrected claim", and run 24 wrote both. v9.12 says only what to do.
3. **A section's own spec outvotes a rule added beside it.** The billing-office script's spec asked every writer whether the provider would "submit a corrected claim, add documentation, or appeal", which is right for a commercial coding error. A later rule said never to do that on Original Medicare, and the spec won in 7 of 8 runs. The doctor's-letter spec offered a peer-to-peer that Original Medicare does not have. Deciding the spec by plan, in code, removed both at the source (v9.12).
4. **Held-out cases are essential.** Every serious generalization failure was in a case the prompts were never tuned on: G and H in round 1, I and J (both Criticals) in round 2.
5. **Test a guard on real outputs before it ships.** Four guards misbehaved on real text that the invented test examples never showed. Each problem was found by running the guard over stored kits, before it went live:
   - the safety classifier misread conditional warnings;
   - the record bracket caught enclosure lists and quotations of the insurer;
   - the phone labels swallowed the previous number;
   - the banner was not idempotent.

   One misfire got through. The v9.4 label guard also bracketed labels named only as risks ("at risk for malnutrition"). Reading a sample of replayed kits missed it, and live run 14 showed it. Since v9.6 the gate is a diff of every stored line a guard change would alter (`qa/guard-diff.js`; `qa/replay-diff.js` for the code steps outside the guards), read in full before the change ships. The v9.8.3 choice guard went through eight rounds of that diff before it shipped. The gate also stops guards outright. The v9.13 candidate for the third audit's I-3, a bracket on "life-threatening", changed 70 stored lines, most of them D's correct prudent-layperson argument ("would recognize these symptoms as potentially life-threatening"), and was dropped. The v9.12 route guard, run ungated, would have removed 15 correct corrected-claim lines from A, D and E, so it runs only on Original Medicare. The v9.14.1 rule for the resubmission question was stopped once on the way: its first form began at "does not" in a real run-20 sentence and left "If the plan do I need to include the ER records with my appeal?". The diff showed it, and the rule was narrowed before it shipped. An automated review of the pull request then found that the rule also took out what the family itself might submit ("Can I submit additional documentation after the request is filed, or do I need to send everything at once?"). It now applies only when someone else would resubmit.
6. **A checker matches words, not priorities.** An independent reader is needed.
7. **Every fix can break something else.** The run after each change is part of the change. J-6 is the example: the fix for the run-16 quotes worked, and run 21 misstated the same therapy notes in a new way.
8. **Deterministic code has bugs too, and they sit where code reads the model's prose.** Three bugs were found, all in code, not in the model:
   - the placeholder date (run 11);
   - the plan type read from a negated mention (run 13);
   - a sentence split inside a bracket, which hid the next sentence from a guard (runs 12 and 14).

   Each surfaced only when the model phrased something in a new way. The checker caught all three, two of them by comparing the tracker's facts with hand-derived truth. Code that parses model output needs the same discipline as the guards: run it on every stored output before it ships.

   A fourth was not caught by the checker. In run 28 the Original Medicare route guard read the family's own step, "so I have time to mail everything to Medicare", as a request made of someone else, and wrote "to me" (section 4). It was found by reading the kit. The cause was one word, "have", in the guard's list of asking verbs. v9.14.1 took it out, and the unit tests now hold the family's own sending steps as written. The checker still has no check for a sentence of that kind.

## 7. Known limits

- **The corpus is small and synthetic.** It has ten cases.
- **No case is fully held out any more.** G and H informed the fixes after runs 7 and 9, and I and J the fixes after runs 16, 21 and 26; I also informed the fix after run 28. New held-out cases are needed for the next round.
- **The auditor is an AI with a physician rubric, not a licensed reviewer.** A physician should review a sample of real kits before scaling.
- **Federal rules only.** State rules beyond what the notice prints are not verified, including state external review, state step-therapy laws and California's IMR.
- **The third audit's findings are partly answered, and the answers are not yet audited.**
  - J-R3-2 (the urgent external-review route, borderline Critical), J-2 (the dated consultation in the peer-to-peer script), I-4's last line, J-5's new wording and I's deadline wording are answered in code (v9.12.1–v9.13). Run 27 shows them in the kits; no audit has read them yet.
  - I-3 (a severity upgrade in the doctor's letter) and J-R3-1 (tolerance overstated) are prose: the doctor must read the letter before signing. The bracket tried for I-3 would have damaged correct letters (section 6).
  - Minors remain, among them: the daughter's records requests lean on the CMS-1696 form, which is not a HIPAA authorization (I-N3); J's insurer script names no number and asks for the expedited appeal fifth (J-12); J's doctor's letter carries no EXPEDITED label (J-8).
  - A fourth audit of I and J, on a v9.13 or later run (27, 28 or 29), is the next check.
- **Run 28's two Original Medicare route items are answered in code, and the fix has not yet been seen at work in a live kit.** v9.14.1 takes the resubmission out of the insurer script's question and leaves the family's own sending steps alone (section 5). A replay of run 28 shows the first. Run 29, a new build of case I on the live site, was clean in both places, but the writers used neither wording in it, so the guard had nothing to change (section 4). The tests on run 28's own lines are the evidence for the fix.
- **The route guard knows the wordings it has seen.** Each new one so far has needed its own rule (runs 16 to 24, then run 28). The checker's records-route check is what catches the next.
- **The live decode has been timed from a server, not from a phone.** Run 28's times are a script's, on a server's connection (section 1). No reader's own build has been timed.
- **Clinician letters still need a clinician's read.**
  - The label guard covers nine recurring relabels. Others, and invented level-of-care rules, are not caught.
  - The relabel usually starts in the decode, which every writer follows. The guard covers the documents sent to the insurer, not the decode, the phone scripts or the notes to the doctor's office. In runs 20 and 21, 10 and 11 cells outside those documents kept a label, mostly in G.
  - When the denial arrives only as a photo or PDF, the guard cannot read the image. A term printed only in the image is bracketed for confirmation anyway — a deliberate, conservative false positive.
- **The parsers depend on the decode's line format.** The deadline, urgency, care status and plan type are read from fixed lines of the decode. A new phrasing can still defeat a parser, as two already did; the checker is what catches it.
  - When a line is not in the expected form, the parser leaves the field undecided rather than guess.
  - F's Urgent line has twice said "Your doctor decides…" (runs 15 and 21). Urgency was left undecided, so no urgency instruction was sent to the writers.
- **Free use is limited per server instance.** The per-visitor limits (the Fight Pack's free tokens, and the translator's and letter writer's allowances) live in each server instance's memory, so they slow abuse but do not stop it. The hard cap is the spend limit on the Anthropic account (README).
- **One model provider and one model.** Results may differ with another.

Two run-15 guard misfires are fixed: "causing foot drop and falls" now brackets each label with the lead word outside, and "Since I submitted that request, the patient has developed…" becomes "Since that request was submitted…", so the clinical update stays in the letter.

## 8. How to re-run

```bash
# unit tests (the live first read: test-live-read.js for the server, test-live-page.js for the page)
for t in qa/tests/*.js; do node "$t" || break; done

# live run of all ten cases against the deployed site (the preview code is never throttled)
cd qa && FP_CODE=<preview code> FP_RUN=runs30 FP_CONC=3 node fp-run.js
# one case the way a visitor builds it, through the free path
FP_FREE=1 FP_RUN=runs30-free node fp-run.js G-medicaid-mri-redflags
# all ten through the free path, with the first section asked for live as the page asks and its lines timed
# (runs 28 and 29 were built this way; prints first line, type of denial, case strength, finished section, and redo,
# which should be 0). The runner takes the next free session when one is refused for having had its 24 calls
# (three sessions an hour for a visitor, so one ten-case run an hour)
FP_FREE=1 FP_LIVE=1 FP_CONC=1 FP_RUN=runs30-free node fp-run.js
# one case the same way
FP_FREE=1 FP_LIVE=1 FP_RUN=runs30-live node fp-run.js A-sleep-paraphrase

# score it (FP_TODAY pins "today" for the date checks; list the cases a partial run ran)
FP_TODAY=2026-10-30 node fp-check.js runs30

# the must-pass safety table and the per-run summary
node safety-table.js runs30 && node run-stats.js runs30

# re-score every stored run on the cases it ran (runs 9–29 reproduce the table in section 4)
for t in evidence/raw-runs*.tar.gz; do tar xzf "$t"; done && ./rescore-all.sh rescore

# replay the current deterministic layer on a stored run, then score the replay
node replay-guards.js runs21 runs21-replay && FP_TODAY=2026-10-30 node fp-check.js runs21-replay

# before shipping a guard change: every stored line it would change, against the deployed version
OLD=/path/to/previous/api/_lib/fightpack-guards.js node guard-diff.js runs19 runs20 runs21
# the same gate for the code steps outside the guards (api/fightpack.js, api/_lib/fightpack-facts.js): replay every
# stored run in a checkout of the deployed version and in this one, then list every line the two treat differently
for r in $(ls -d runs* | grep -v replay); do node replay-guards.js $r $r-replay; done   # in both checkouts
node replay-diff.js /path/to/previous/qa

# unbracketed relabels by case, term and section
node relabel-map.js runs21

# the example kit on the homepage: build it again on the live site, score it, write sample-kit.json
# (one real kit per run; needed when the writing rules or the example letter change)
cd .. && node scripts/build-sample-kit.js
# score the stored build again without building
node scripts/build-sample-kit.js --check
```

The evidence is in:

- `qa/evidence/` — the kits and reports from runs 4–21 and 23–29, and the two production kits (`runs22-free`);
- `qa/evidence/raw-runs9-15.tar.gz`, `raw-runs16-24.tar.gz`, `raw-runs25-27.tar.gz`, `raw-runs28.tar.gz` and `raw-runs29.tar.gz` — the raw part files for runs 9–29, which can be re-scored or replayed (runs 3–8 survive as kits and reports only). The logs of runs 28 and 29 also hold the time each live line took;
- `qa/evidence/sample/` — the raw answers, checker report and build date behind `sample-kit.json`;
- `docs/qa-evidence/` — the seven audits.

## 9. Sources checked by the audits

The kits state these rules in general terms; they never cite regulation numbers.

- **ERISA claims procedure.** 29 CFR 2560.503-1: decision clocks, oral requests for urgent appeals, and a health care professional acting for the patient in an urgent case ((b)(4), (m)(1)).
- **ACA external review.** 29 CFR 2590.715-2719 and 45 CFR 147.136. It covers medical judgment and surprise-billing disputes; an expedited external review can be requested at the same time as an expedited internal appeal.
- **No Surprises Act.** 45 CFR 149.110 (emergency services) and 149.420 (non-emergency services at in-network facilities). Notice-and-consent can never waive protection for ancillary clinicians (149.420(b)). 45 CFR 149.30 covers ambulatory surgery centers.
- **Medicare Advantage.** 42 CFR 422.578, 422.584 and 422.590; form CMS-1696.
- **Original Medicare appeals.** 42 CFR 405.910 (representatives), 405.942 and 405.950 (redetermination: filing and decision time), 405.962 and 405.970 (reconsideration), 405.980 (reopening), 405.1002 (hearing).
- **Ambulance.** 42 CFR 410.40 (other means of transportation contraindicated), 414.605 (ALS1 from the condition at dispatch) and 414.610(b) (payment only on an assignment-related basis); CMS's ambulance compliance guidance.
- **Medicaid managed care.**
  - 42 CFR 438.402 and 438.408: appeal, timeframes, deemed exhaustion.
  - 42 CFR 431.244(f)(2): expedited hearing.
  - 42 U.S.C. 1396u-2(b)(2): no prior authorization for emergency services.
- **Inpatient rehabilitation.** The intensive-therapy and physician-oversight criteria (42 CFR 412.622); the AHA/ASA adult stroke rehabilitation guideline, which recommends an inpatient rehabilitation facility over a skilled nursing facility for eligible patients.
- **AASM** clinical guideline on diagnostic testing for obstructive sleep apnea (2017), on home sleep apnea testing.
- **CPT.** An ultrasound-guided major-joint injection is coded 20611, not 20610 + 76942.
- **Suspected cauda equina syndrome.** Emergency referral, under national pathway guidance. Painless urinary retention is the later stage.
- **ACG** Crohn's disease guideline (severity).
- **CMS** No Surprises complaint process: review, investigation and referral. A hold on collections must be asked of the provider.
- **Verified phone numbers:**
  - No Surprises Help Desk, 1-800-985-3059;
  - EBSA, 1-866-444-3272;
  - 1-800-MEDICARE (1-800-633-4227);
  - 988.
