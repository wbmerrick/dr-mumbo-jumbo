// The funnel counter. Every real outcome on the server is recorded twice, on purpose,
// because each path fails differently:
//
//   1. A "[dmj] {json}" log line. Free, instant, unblockable by ad blockers — but Vercel's
//      runtime logs are short-lived and the logs API is closed on some plans, so this alone
//      cannot answer "how many kits yesterday".
//   2. A row in public.dmj_events in the Supabase project, via the insert-only dmj_count()
//      function. Permanent, queryable, plan-independent. This is the one you read.
//
// WHAT IS NEVER IN HERE: a word of what anyone pasted or uploaded, an email address, an IP,
// anything that identifies a person. Counts and flags only. privacy.html says exactly this,
// and qa/tests/test-count.js asserts it.
//
// COUNTING KITS: /api/fightpack is called once per part, parts 2-6 run in parallel, and a
// part is re-asked when sections come back missing. So:
//     kits built   = distinct data->>'kid' with all 6 parts
//     kits started = distinct data->>'kid'
//   Never count rows or log lines. See qa/tests/test-count.js.
//
// The key below is Supabase's publishable (anon) key — public by design, same as api/lead.js.
// dmj_events has RLS on with no policies, so the REST API cannot touch the table; the only
// way in is dmj_count(), which can insert and nothing else.
const SUPABASE_URL = 'https://jodcpflzbmhnnivtwghw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGNwZmx6Ym1obm5pdnR3Z2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTM0NDIsImV4cCI6MjEwNTY4OTQ0Mn0.Jf3_CjQ_UALHyMvzhQTxisEvSqCK7AAM-DaKe0KJNG8';

// A count is never worth making a visitor wait. The insert is given a short leash and
// every failure is swallowed: a counter that can break a request is worse than no counter.
const TIMEOUT_MS = 1200;

module.exports = async function count(evt, data) {
  const row = Object.assign({ evt: evt }, data || {});
  try { console.log('[dmj] ' + JSON.stringify(row)); } catch (e) { /* never fatal */ }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/rpc/dmj_count`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      signal: ctrl.signal,
      body: JSON.stringify({ p_evt: String(evt).slice(0, 64), p_data: data || {} })
    });
  } catch (e) {
    // Offline, timed out, or dmj_count() not created yet. The log line above still stands.
  } finally {
    clearTimeout(timer);
  }
};
