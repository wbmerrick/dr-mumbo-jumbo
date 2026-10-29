// Dr Mumbo Jumbo — Fight Pack unlock tokens.
// A token proves "this browser paid (or holds the preview code)" without us storing anything.
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
  return payload;
}

module.exports = { sign, verify, signingKey, TOKEN_HOURS };
