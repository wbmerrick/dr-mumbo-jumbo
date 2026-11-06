// /api/email-kit — emails a finished Fight Pack to the visitor and keeps their address for launch news.
//
// The kit text comes from the browser; it is never stored on our side and transits Mailgun once.
// Needs MAILGUN_API_KEY and MAILGUN_DOMAIN (and MAILGUN_API_BASE for an EU-region account), plus the
// unlock token the kit was built with: verify() debits one call from that token per send, so the
// free-mode limits in lib/unlock.js apply here without a second rate limiter.
//
// The address is kept in the same table as the waitlist (source 'kit-email'), only after the email
// actually went out. The key below is Supabase's publishable (anon) key, public by design; the table
// is protected by row-level security that allows inserts only (see api/lead.js).
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

async function sendKit(cfg, to, kit) {
  const form = new URLSearchParams();
  form.set('from', FROM);
  form.set('to', to);
  form.set('subject', SUBJECT);
  form.set('text', kit + FOOTER);
  form.set('html', toHtml(kit + FOOTER));
  const r = await fetch(cfg.base + '/v3/' + cfg.domain + '/messages', {
    method: 'POST',
    headers: { Authorization: 'Basic ' + Buffer.from('api:' + cfg.key).toString('base64') },
    body: form
  });
  if (r.ok) return { ok: true };
  // Mailgun's reason, so a refusal can be diagnosed from the response rather than from logs we may not have.
  let detail = '';
  try { const j = await r.json(); detail = String(j.message || j.error || '').slice(0, 300); } catch { try { detail = String(await r.text()).slice(0, 300); } catch {} }
  return { ok: false, status: r.status, detail };
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
  try { sent = await sendKit(cfg, email, kit); } catch (e) { sent = { ok: false, status: 0, detail: String(e && e.message || e).slice(0, 300) }; }
  if (!sent.ok) {
    console.error('email-kit: mailgun refused', sent.status, sent.detail);
    res.status(502).json({ error: 'send', message: "Couldn't send it just now — try again in a minute, or use Copy everything.", upstream: { status: sent.status, detail: sent.detail } });
    return;
  }

  await keepAddress(email);
  count('kit_emailed');
  res.status(200).json({ ok: true, message: 'Sent. Check your inbox — and spam, the first time.' });
};
