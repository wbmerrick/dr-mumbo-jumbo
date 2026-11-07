// One log line per thing that actually happened on the server — the honest count,
// immune to ad blockers that eat the browser analytics script.
//
// These lines carry counts and flags ONLY: never a word of what anyone pasted or
// uploaded, never an email address, never an IP. privacy.html says exactly this.
// To read them: Vercel project -> Logs (or Observability), filter on "[dmj]".
//
// Counting kits: each kit emits one kit_part line per part that succeeded, all sharing a
// kid. Kits BUILT = distinct kid whose lines cover all 6 parts. Kits STARTED = distinct
// kid. Anything in between is a kit that fell over partway. Never count lines.
module.exports = function count(evt, data) {
  try {
    console.log('[dmj] ' + JSON.stringify(Object.assign({ evt: evt }, data || {})));
  } catch (e) { /* counting must never break a request */ }
};
