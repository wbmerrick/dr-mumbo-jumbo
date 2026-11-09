// /api/email-kit — emails a finished Fight Pack to the visitor and keeps their address for launch news.
//
// The kit text comes from the browser; it is never stored on our side and transits Resend once
// (Resend keeps its copy for its fixed 30-day retention, which privacy.html says). Needs
// RESEND_API_KEY. Optional RESEND_FROM overrides the sender: set it to Resend's own test sender
// ("Dr Mumbo Jumbo <onboarding@resend.dev>") to prove the pipeline before dr-mumbo-jumbo.com is
// verified — Resend then delivers only to the account owner's address — and remove it after.
// The unlock token the kit was built with is required: verify() debits one call from that token
// per send, so the free-mode limits in lib/unlock.js apply here without a second rate limiter.
//
// The address is kept in the same table as the waitlist (source 'kit-email'), only after the email
// actually went out. The key below is Supabase's publishable (anon) key, public by design; the table
// is protected by row-level security that allows inserts only.
const { verify } = require('../lib/unlock.js');
const count = require('./_lib/count.js');

const SUPABASE_URL = 'https://jodcpflzbmhnnivtwghw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpvZGNwZmx6Ym1obm5pdnR3Z2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTM0NDIsImV4cCI6MjEwNTY4OTQ0Mn0.Jf3_CjQ_UALHyMvzhQTxisEvSqCK7AAM-DaKe0KJNG8';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_KIT = 60000;
const RESEND_URL = 'https://api.resend.com/emails';
const DEFAULT_FROM = 'Dr Mumbo Jumbo <hello@dr-mumbo-jumbo.com>';
// Resend's edge rejects a request with no User-Agent (403, "error code: 1010") before the API
// ever sees it. Node's fetch sends one, but say so explicitly rather than depend on it.
const USER_AGENT = 'dr-mumbo-jumbo/1.0 (+https://dr-mumbo-jumbo.com)';
const SUBJECT = 'Your Fight Pack';
const FOOTER = '\n\n—\nDr Mumbo Jumbo · https://dr-mumbo-jumbo.com\nThis kit is a draft for you and your clinician to review, complete and send yourselves. Check every number against your letter before anything goes out.';

function resendConfig() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const from = String(process.env.RESEND_FROM || '').trim() || DEFAULT_FROM;
  return { key, from };
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toHtml(text) {
  return '<!doctype html><html><body style="margin:0;padding:24px;background:#fff;color:#1c1f27;font:15px/1.6 Georgia,\'Times New Roman\',serif">'
    + '<pre style="white-space:pre-wrap;word-wrap:break-word;font:inherit;margin:0">' + escapeHtml(text) + '</pre>'
    + '</body></html>';
}

// Resend's error bodies can quote an address back at us (the testing-only refusal names the
// account owner's), and we never put an address in a log line. Strip anything that looks like one, plus anything key-shaped.
function scrub(s) {
  return String(s)
    .replace(/[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}/g, '<email>')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '<redacted>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

// Turn Resend's refusal into the one thing worth knowing: what to go and fix.
// Without this a 502 on the site is unexplainable from the outside, which is how the
// email button sat broken from the evening it was switched on.
function diagnose(status, name, detail) {
  const d = String(detail || '');
  const n = String(name || '');
  if (status === 0) return { why: 'network_or_timeout', fix: 'Resend unreachable or slower than the timeout' };

  // Resend's message is the authoritative signal, its error name second, the status last. The
  // name alone misleads: "validation_error" covers a bad field (400/422), a bad key (400/401) and
  // an unverified or testing-only sending domain (403). A confidently WRONG instruction (go fix
  // the message fields when the real problem is DNS) is worse than no instruction at all.
  if (/only send testing emails|your own email address/i.test(d)) return { why: 'recipient_not_authorized', fix: 'RESEND_FROM is Resend\'s test sender, which delivers only to the Resend account owner\'s own address: verify dr-mumbo-jumbo.com at resend.com/domains, then remove RESEND_FROM' };
  if (/not verified|verify (?:your |a )?domain/i.test(d)) return { why: 'domain_not_verified', fix: 'The from-domain is not verified: add dr-mumbo-jumbo.com at resend.com/domains (exactly that, no subdomain, so it matches the from address), put its DNS records into Squarespace DNS, wait for Verified' };
  if (/api key is invalid|missing api key|key is not active|key is suspended|restricted to only send/i.test(d) || /api_key/.test(n)) return { why: 'key_rejected', fix: 'RESEND_API_KEY missing, wrong, inactive or suspended: check resend.com/api-keys and the Vercel env var (Production + Preview), then redeploy' };
  if (n === 'daily_quota_exceeded' || /daily (?:email )?(?:sending )?quota/i.test(d)) return { why: 'daily_quota_exceeded', fix: 'Free plan sends 100/day: wait for the 24h reset or upgrade at resend.com/settings/billing' };
  if (n === 'monthly_quota_exceeded' || /monthly (?:email )?(?:sending )?quota/i.test(d)) return { why: 'monthly_quota_exceeded', fix: 'Free plan sends 3,000/month: upgrade at resend.com/settings/billing' };
  if (n === 'rate_limit_exceeded' || /too many requests|requests per second/i.test(d)) return { why: 'rate_limited', fix: 'Over Resend\'s 2 requests/second: retry' };
  if ((status === 400 || status === 422) && /^(?:validation_error|missing_required_field|invalid_parameter|invalid_attachment)$/.test(n)) return { why: 'bad_request', fix: 'Resend rejected the message itself: check from/to/subject/text/html in api/email-kit.js' };

  // Status fallback, for a refusal whose body says nothing recognisable (or is not JSON).
  if (status === 401) return { why: 'key_rejected', fix: 'RESEND_API_KEY missing, wrong, inactive or suspended: check resend.com/api-keys and the Vercel env var (Production + Preview), then redeploy' };
  if (status === 403) return { why: 'forbidden', fix: 'Resend refused the send: check at resend.com that the domain is Verified, that the from address uses exactly that domain, that the key is active and not restricted to another domain, and that the request carried a User-Agent (error 1010)' };
  if (status === 404) return { why: 'endpoint_not_found', fix: 'Resend endpoint not found: the send URL in api/email-kit.js is wrong' };
  if (status === 400 || status === 422) return { why: 'bad_request', fix: 'Resend rejected the message itself: check from/to/subject/text/html in api/email-kit.js' };
  if (status === 429) return { why: 'rate_limited', fix: 'Over Resend\'s 2 requests/second: retry' };
  if (status >= 500) return { why: 'resend_down', fix: 'Resend server error: retry' };
  return { why: 'http_' + status, fix: 'Unmapped Resend status' };
}

const SEND_TIMEOUT_MS = 15000;

async function sendKit(cfg, to, kit) {
  // Exactly these five fields. Nothing else about the visitor goes to Resend.
  const body = JSON.stringify({ from: cfg.from, to: [to], subject: SUBJECT, text: kit + FOOTER, html: toHtml(kit + FOOTER) });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS);
  try {
    const r = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + cfg.key, 'Content-Type': 'application/json', 'User-Agent': USER_AGENT },
      body,
      signal: ctrl.signal
    });
    if (r.ok) return { ok: true };
    // The body is why it failed. Keep it (scrubbed) instead of throwing it away, and pull out
    // Resend's error name ({statusCode, name, message}) when the body is JSON.
    let text = '';
    try { text = await r.text(); } catch (e) { text = ''; }
    let name = null;
    try { name = String(JSON.parse(text).name || '') || null; } catch (e) { name = null; }
    return { ok: false, status: r.status, name, detail: scrub(text) };
  } finally {
    clearTimeout(timer);
  }
}

async function keepAddress(email) {
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/dmj_fight_pack_waitlist', {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: 'Bearer ' + SUPABASE_ANON_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify([{ email, fighting: null, source: 'kit-email' }])
    });
    return r.ok || r.status === 409;
  } catch {
    return false;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method', message: 'POST only.' });
    return;
  }

  let email = '', kit = '', token = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    email = String(body.email || '').trim().toLowerCase().slice(0, 200);
    kit = String(body.kit || '');
    token = String(body.token || '');
  } catch {
    res.status(400).json({ error: 'bad_request', message: "Couldn't read that — try again." });
    return;
  }

  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: 'email', message: "That email address doesn't look right." });
    return;
  }
  if (!kit.trim()) {
    res.status(400).json({ error: 'empty', message: 'Build a kit first, then email it.' });
    return;
  }
  if (kit.length > MAX_KIT) {
    res.status(413).json({ error: 'too_big', message: 'This kit is too long to email. Use Copy everything or Print instead.' });
    return;
  }

  const auth = verify(token);
  if (!auth) {
    res.status(401).json({ error: 'locked', message: 'Your free session has ended. Rebuild the kit, then email it.' });
    return;
  }

  const cfg = resendConfig();
  if (!cfg) {
    res.status(503).json({ error: 'unconfigured', message: "Email isn't switched on yet — use Copy everything or Print for now." });
    return;
  }

  let sent;
  try {
    sent = await sendKit(cfg, email, kit);
  } catch (e) {
    sent = { ok: false, status: 0, name: null, detail: e && e.name === 'AbortError' ? 'aborted after ' + SEND_TIMEOUT_MS + 'ms' : scrub(e && e.message) };
  }
  if (!sent.ok) {
    // Why it failed, in the counter, so the next failure is one query away instead of a guess.
    const d = diagnose(sent.status, sent.name, sent.detail);
    await count('kit_email_failed', { status: sent.status, name: sent.name || null, why: d.why, fix: d.fix, detail: sent.detail || null });
    res.status(502).json({ error: 'send', message: "Couldn't send it just now — try again in a minute, or use Copy everything." });
    return;
  }

  await keepAddress(email);
  await count('kit_emailed');
  res.status(200).json({ ok: true, message: 'Sent. Check your inbox — and spam, the first time.' });
};
