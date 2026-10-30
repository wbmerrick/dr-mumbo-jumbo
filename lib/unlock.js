// Dr Mumbo Jumbo — Fight Pack unlock tokens.
// A token proves "this browser paid, holds the preview code, or is using the free kit" without us storing anything.
// It is an HMAC-signed JSON payload with an expiry; the signing key is derived from secrets
// that live only in Vercel's environment variables.

const crypto = require('crypto');

const TOKEN_HOURS = 72;

function signingKey() {
  const base = process.env.FIGHTPACK_SECRET || '';
  const stripe = process.env.STRIPE_SECRET_KEY || '';
  if (!base && !stripe) return null;
  return crypto.createHash('sha256').update(`dmj-fightpack|${base}|${stripe}`).digest();
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function fromB64url(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(s + '==='.slice((s.length + 3) % 4), 'base64');
}

function sign(payload) {
  const key = signingKey();
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({ ...payload, iat: now, exp: now + TOKEN_HOURS * 3600 });
  const data = b64url(body);
  const sig = b64url(crypto.createHmac('sha256', key).update(data).digest());
  return `${data}.${sig}`;
}

function verify(token) {
  const key = signingKey();
  if (!key || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const expected = crypto.createHmac('sha256', key).update(parts[0]).digest();
  let given;
  try { given = fromB64url(parts[1]); } catch { return null; }
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  let payload;
  try { payload = JSON.parse(fromB64url(parts[0]).toString('utf8')); } catch { return null; }
  if (!payload || typeof payload.exp !== 'number') return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  // A free token covers a few kits over its whole life, then the browser asks for a new one (limited per visitor),
  // so a saved token cannot be replayed hour after hour.
  if (payload.sid === 'free' && !allow(`t:${parts[1]}`, FREE_CALLS_PER_TOKEN, TOKEN_HOURS * HOUR)) return null;
  return payload;
}

// ---------- free mode ----------
// The Fight Pack is free unless FIGHTPACK_FREE is set to 0 / false / off (then checkout or the preview
// code unlocks it, as before). Free use is limited per visitor so nobody can run up the model bill:
// a visitor gets a few free tokens an hour, and each token a few kits' worth of calls. The counts live in
// this server instance's memory, so they are a speed bump, not a hard cap: the hard cap is the spend
// limit on the Anthropic account (and, if wanted, a Vercel firewall rate rule on /api/).
const HOUR = 3600 * 1000;
const FREE_CALLS_PER_TOKEN = 24;   // one kit is 6 calls, plus retries: about four kits per token
const FREE_TOKENS_PER_HOUR = 3;
const FREE_TOKENS_PER_DAY = 10;
function isFree() {
  return !/^(?:0|false|off|no)$/i.test(String(process.env.FIGHTPACK_FREE || '').trim());
}
const seen = new Map();
// true while fewer than `limit` hits fell inside the window; `take` records this one
function allow(key, limit, windowMs, now = Date.now(), take = true) {
  const hits = (seen.get(key) || []).filter((t) => now - t < windowMs);
  seen.set(key, hits);
  if (hits.length >= limit) return false;
  if (take) hits.push(now);
  if (seen.size > 5000) for (const [k, v] of seen) if (!v.length || now - v[v.length - 1] > TOKEN_HOURS * HOUR) seen.delete(k);
  return true;
}
function visitorOf(req) {
  const h = (req && req.headers) || {};
  const ip = String(h['x-real-ip'] || String(h['x-forwarded-for'] || '').split(',')[0] || '').trim() || 'unknown';
  return crypto.createHash('sha256').update(`dmj-visitor|${ip}`).digest('hex').slice(0, 16);
}
function mintFree(req, now = Date.now()) {
  const v = visitorOf(req);
  if (!allow(`d:${v}`, FREE_TOKENS_PER_DAY, 24 * HOUR, now, false) || !allow(`h:${v}`, FREE_TOKENS_PER_HOUR, HOUR, now, false)) return { error: 'busy' };
  const token = sign({ sid: 'free', n: crypto.randomBytes(6).toString('hex') });
  if (!token) return { error: 'unconfigured' };
  allow(`d:${v}`, FREE_TOKENS_PER_DAY, 24 * HOUR, now);
  allow(`h:${v}`, FREE_TOKENS_PER_HOUR, HOUR, now);
  return { token };
}

module.exports = { sign, verify, signingKey, TOKEN_HOURS, isFree, mintFree, allow, visitorOf, FREE_CALLS_PER_TOKEN, FREE_TOKENS_PER_HOUR, FREE_TOKENS_PER_DAY };
