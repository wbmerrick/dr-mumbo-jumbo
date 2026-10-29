// Dr Mumbo Jumbo — Fight Pack waitlist endpoint.
// Stores email + what they're fighting. Duplicate-safe. No other data collected.
// The key below is Supabase's publishable (anon) key — public by design; the table
// is protected by row-level security that allows inserts only.

const SUPABASE_URL = 'https://jodcpflzbmhnnivtwghw.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGNwZmx6Ym1obm5pdnR3Z2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTM0NDIsImV4cCI6MjEwNTY4OTQ0Mn0.Jf3_CjQ_UALHyMvzhQTxisEvSqCK7AAM-DaKe0KJNG8';

const FIGHTING = new Set(['denied-claim', 'big-bill', 'confusing-eob', 'other']);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method', message: 'POST only.' });
    return;
  }

  let email = '';
  let fighting = null;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    email = String(body.email || '').trim().toLowerCase().slice(0, 200);
    const f = String(body.fighting || '').trim();
    fighting = FIGHTING.has(f) ? f : null;
  } catch {
    res.status(400).json({ error: 'bad_request', message: "Couldn't read that — try again." });
    return;
  }

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'email', message: 'That email doesn’t look right — double-check it?' });
    return;
  }

  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/dmj_fight_pack_waitlist?on_conflict=email`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal'
      },
      body: JSON.stringify([{ email, fighting, source: 'dr-mumbo-jumbo.com' }])
    });

    if (r.ok || r.status === 409) {
      res.status(200).json({ ok: true, message: "You're on the list. First access + the launch price are yours." });
      return;
    }
    res.status(503).json({ error: 'store', message: "Couldn't save your spot right now — try again in a minute." });
  } catch {
    res.status(503).json({ error: 'store', message: "Couldn't save your spot right now — try again in a minute." });
  }
};
