// /api/email-kit — emails a finished Fight Pack to the visitor and keeps their address for launch news.
//
// The kit text comes from the browser; it is never stored on our side and transits Mailgun once.
// Needs MAILGUN_API_KEY and MAILGUN_DOMAIN (and MAILGUN_API_BASE for an EU-region account), plus the
// unlock token the kit was built with: verify() debits one call from that token per send, so the
// free-mode limits in lib/unlock.js apply here without a second rate limiter.
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
const FROM = 'Dr Mumbo Jumbo <hello@dr-mumbo-jumbo.com>';
const SUBJECT = 'Your Fight Pack';
const FOOTER = '\n\n—\nDr Mumbo Jumbo · https://dr-mumbo-jumbo.com\nThis kit is a draft for you and your clinician to review, complete and send yourselves. Check every number against your letter before anything goes out.';

function mailgunConfig() {
  const key = process.env.MAILGUN_API_KEY;
  const domain = process.env.MAILGUN_DOMAIN;
  if (!key || !domain) return null;
  const base = String(process.env.MAILGUN_API_BASE || 'https://api.mailgun.net').replace(/\/+$/, '');
  return { key, domain, base };
}

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toHtml(text) {
  return '<!doctype html><html><body style="margin:0;padding:24px;background:#fff;color:#1c1f27;font:15px/1.6 Georgia,\'Times New Roman\',serif">'
    + '<pre style="white-space:pre-wrap;word-wrap:break-word;font:inherit;margin:0">' + escapeHtml(text) + '</pre>'
    + '</body></html>';
}

// Mailgun's error bodies can quote the recipient address back at us, and we never put an
// address in a log line. Strip anything that looks like one, plus anything key-shaped.
function scrub(s) {
  return String(s)
    .replace(/[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}/g, '<email>')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '<redacted>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

// Turn Mailgun's HTTP status into the one thing worth knowing: what to go and fix.
// Without this a 502 on the site is unexplainable from the outside, which is how the
// email button sat broken from the evening it was switched on.
function diagnose(status, detail) {
  const d = String(detail || '');
  if (status === 0) return { why: 'network_or_timeout', fix: 'Mailgun unreachable or slower than the timeout' };

  // Mailgun's message is the authoritative signal; the status is only a fallback. It does
  // not use one status per condition - a sandbox refusal has been seen as both 400 and
  // 403 - and a confidently WRONG instruction (go fix DNS when the real problem is the
  // authorized-recipient list) is worse than no instruction at all. So read the words first.
  if (/sandbox|authorized recipient/i.test(d)) return { why: 'recipient_not_authorized', fix: 'Sandbox domain only sends to authorized recipients - use a verified sending domain, or add the address in Account Settings' };
  if (/not verified|unverified|verify (?:your )?domain/i.test(d)) return { why: 'domain_not_verified', fix: 'Domain added but not verified: add Mailgun DNS records at the registrar and wait for verification' };
  if (/domain not found|no such domain|unknown domain/i.test(d)) return { why: 'domain_not_found', fix: 'MAILGUN_DOMAIN is not a domain in this Mailgun account/region - check it is added exactly as spelled' };
  if (/invalid (?:private |api )?key|invalid credentials/i.test(d)) return { why: 'key_rejected', fix: 'MAILGUN_API_KEY wrong, or the account is EU-region and needs MAILGUN_API_BASE=https://api.eu.mailgun.net' };

  // Status fallback, for a refusal whose body says nothing recognisable.
  if (status === 401) return { why: 'key_rejected', fix: 'MAILGUN_API_KEY wrong, or the account is EU-region and needs MAILGUN_API_BASE=https://api.eu.mailgun.net' };
  if (status === 404) return { why: 'domain_not_found', fix: 'MAILGUN_DOMAIN is not a domain in this Mailgun account/region - check it is added exactly as spelled' };
  if (status === 403) return { why: 'forbidden', fix: 'Mailgun refused the send: check in the dashboard whether the domain is verified AND whether the recipient is allowed (a sandbox domain restricts both)' };
  if (status === 400) return { why: 'bad_request', fix: 'Mailgun rejected the message itself' };
  if (status === 429) return { why: 'rate_limited', fix: 'Mailgun rate limit' };
  if (status >= 500) return { why: 'mailgun_down', fix: 'Mailgun server error - retry' };
  return { why: 'http_' + status, fix: 'Unmapped Mailgun status' };
}

const SEND_TIMEOUT_MS = 15000;

async function sendKit(cfg, to, kit) {
  const form = new URLSearchParams();
  form.set('from', FROM);
  form.set('to', to);
  form.set('subject', SUBJECT);
  form.set('text', kit + FOOTER);
  form.set('html', toHtml(kit + FOOTER));
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SEND_TIMEOUT_MS);
  try {
    const r = await fetch(cfg.base + '/v3/' + cfg.domain + '/messages', {
      method: 'POST',
      headers: { Authorization: 'Basic ' + Buffer.from('api:' + cfg.key).toString('base64') },
      body: form,
      signal: ctrl.signal
    });
    if (r.ok) return { ok: true };
    // The body is why it failed. Keep it (scrubbed) instead of throwing it away.
    let detail = '';
    try { detail = await r.text(); } catch (e) { detail = ''; }
    return { ok: false, status: r.status, detail: scrub(detail) };
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

  const cfg = mailgunConfig();
  if (!cfg) {
    res.status(503).json({ error: 'unconfigured', message: "Email isn't switched on yet — use Copy everything or Print for now." });
    return;
  }

  let sent;
  try {
    sent = await sendKit(cfg, email, kit);
  } catch (e) {
    sent = { ok: false, status: 0, detail: e && e.name === 'AbortError' ? 'aborted after ' + SEND_TIMEOUT_MS + 'ms' : scrub(e && e.message) };
  }
  if (!sent.ok) {
    // Why it failed, in the counter, so the next failure is one query away instead of a guess.
    const d = diagnose(sent.status, sent.detail);
    await count('kit_email_failed', { status: sent.status, why: d.why, fix: d.fix, detail: sent.detail || null });
    res.status(502).json({ error: 'send', message: "Couldn't send it just now — try again in a minute, or use Copy everything." });
    return;
  }

  await keepAddress(email);
  await count('kit_emailed');
  res.status(200).json({ ok: true, message: 'Sent. Check your inbox — and spam, the first time.' });
};
