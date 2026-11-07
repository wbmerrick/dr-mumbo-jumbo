// One log line per thing that actually happened on the server — the honest count,
// immune to ad blockers that eat the browser analytics script.
//
// These lines carry counts and flags ONLY: never a word of what anyone pasted or
// uploaded, never an email address, never an IP. privacy.html says exactly this.
// To read them: Vercel project -> Logs (or Observability), filter on "[dmj]".
module.exports = function count(evt, data) {
  try {
    console.log('[dmj] ' + JSON.stringify(Object.assign({ evt: evt }, data || {})));
  } catch (e) { /* counting must never break a request */ }
};
