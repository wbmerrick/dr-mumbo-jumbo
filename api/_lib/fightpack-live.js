// The live first read: the kit's first section, sent to the page line by line while the model is
// still writing it (api/fightpack.js). Two jobs live here, both pure: reading the model API's event
// stream, and deciding which lines of the guarded text so far are settled enough to show.
//
// The guards are not in this file. The caller passes them in (decodeText, the same function the
// finished section comes from), so a line shown early has been through exactly what the finished
// section goes through. What this file adds is caution about timing: a line is shown only when the
// line after it has been written, and the lines code rewrites at the end are not shown at all.
// Checked in qa/tests/test-live-read.js, which replays every stored first section through it.

// The model API's server-sent events, one parsed object per "data:" line. The stream arrives in
// pieces cut anywhere (inside a line, inside a character), so the bytes are decoded as a stream and
// a line is read only once its end has arrived. "event:" lines, comments and blank lines carry
// nothing the data line does not; a data line that is not a JSON object is passed over.
function eventOf(line) {
  const l = line.replace(/\r$/, '');
  if (!l.startsWith('data:')) return null;
  try {
    const v = JSON.parse(l.slice(5));
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch (e) {
    return null;
  }
}
async function* modelEvents(body) {
  const decoder = new TextDecoder();
  let pending = '';
  for await (const piece of body) {
    pending += decoder.decode(piece, { stream: true });
    const lines = pending.split('\n');
    pending = lines.pop();
    for (const line of lines) {
      const ev = eventOf(line);
      if (ev) yield ev;
    }
  }
  const last = eventOf(pending + decoder.decode());
  if (last) yield last;
}

// The decode's two closing lines are rewritten by code from what stands above them: what is owed,
// from the facts (api/_lib/fightpack-facts.js owedLine), and the first step, when it must be the
// emergency department or the expedited request (renderSafety, expeditedFirst). The model's own
// version of either is not shown; they arrive with the finished section. Matched with or without a
// bullet, bold marks or the word "actually".
const HELD = [
  /^[ \t]*(?:[-*•][ \t]+)?\**[ \t]*What you may (?:actually )?owe\b/i,
  /^[ \t]*(?:[-*•][ \t]+)?\**[ \t]*Do this first\b/i
];

const blank = (line) => !line.trim();
// Which lines of a guarded text may be on the page now. None until the section's heading opens it
// (a sentence the model put first is dropped by the guards once the heading arrives). Never the
// newest line: the next one can still change it (a line code inserts under "Urgent", a list that
// goes on). The heading is the exception: the guards have already made it the section's exact
// heading, whatever the model wrote, and nothing after it changes it, so it is shown the moment it
// is complete and the reader has something on the page a line sooner. Nothing from the first held
// line on.
function showable(text) {
  let lines = String(text).split('\n');
  while (lines.length && blank(lines[0])) lines.shift();
  while (lines.length && blank(lines[lines.length - 1])) lines.pop();
  if (!lines.length || !lines[0].startsWith('## 1.')) return [];
  if (lines.length > 1) lines.pop();
  const held = lines.findIndex((line) => HELD.some((re) => re.test(line)));
  if (held >= 0) lines = lines.slice(0, held);
  while (lines.length && blank(lines[lines.length - 1])) lines.pop();
  return lines;
}

// Text in as the model writes it; out, what the page should change: "from line N, these lines".
// guard: the text so far -> the same text as the reader would get it. It is run on whole lines only
// (up to the last line break), each time a line is completed.
// redo counts the times a line already sent was changed or taken back. In the order the section is
// written, every rewrite depends on lines that come before it, and the stored sections bear that
// out: none was ever corrected. Two rewrites do look ahead in principle (the line code adds under
// "Urgent" and the Original Medicare route both read lines further down), so a section written out of
// order could show a line and then change it. The count is how anyone would find out.
function liveReader(guard) {
  let text = '';
  let seen = 0;     // how far the text has been considered: up to and including its last line break
  let shown = [];   // the lines the page holds
  let redo = 0;
  return {
    push(delta) {
      text += String(delta);
      const end = text.lastIndexOf('\n') + 1;
      if (end <= seen) return null;
      seen = end;
      const now = showable(guard(text.slice(0, end)));
      let from = 0;
      while (from < now.length && from < shown.length && now[from] === shown[from]) from++;
      if (from === now.length && from === shown.length) return null;
      if (from < shown.length) redo++;
      shown = now;
      return { from, lines: now.slice(from) };
    },
    // The finished section is in. The model's last line never ends with a line break, so push() never
    // considers it; whatever it changes above lands only when the finished section replaces the lines the
    // page holds. If those lines are not how the finished section begins, that is a correction too.
    settle(finished) {
      const lines = String(finished).split('\n');
      if (shown.some((line, i) => lines[i] !== line)) redo++;
    },
    raw: () => text,
    redo: () => redo
  };
}

module.exports = { modelEvents, HELD, showable, liveReader };
