// Unlock-token signing must not depend on the Stripe credential.
//
// It used to: signingKey() mixed STRIPE_SECRET_KEY into the HMAC key so that rotating a
// leaked payment credential also revoked every token minted under it. With the paid path
// deleted there is no payment credential, so that bought nothing - and it carried a real
// hazard. STRIPE_SECRET_KEY was unset, contributing an empty string, so the first time it
// were ever set the key would silently change, every outstanding token would stop
// verifying, and because /api/email-kit requires a valid one, visitors would lose the
// ability to email a kit they had already built. Tokens last 72h and the symptom ("Your
// free session has ended") points nowhere near the cause.
//
// Rotating FIGHTPACK_SECRET remains a complete kill switch, which is why nothing is lost.
const assert = require('assert');
const crypto = require('crypto');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

process.env.FIGHTPACK_SECRET = 'test-secret-123';
delete process.env.STRIPE_SECRET_KEY;
const u = require('../../lib/unlock.js');

// Deploying this must not invalidate tokens already in the wild: with no Stripe key set,
// the derivation has to stay byte-identical to the old one.
ok(Buffer.compare(u.signingKey(), crypto.createHash('sha256').update('dmj-fightpack|test-secret-123|').digest()) === 0,
   'key is unchanged from the pre-deletion derivation');

const token = u.sign({ sid: 'free' });
ok(!!u.verify(token), 'valid when no Stripe key exists');
for (const v of ['sk_live_the_day_we_start_charging', 'sk_live_rotated_after_a_leak']) {
  process.env.STRIPE_SECRET_KEY = v;
  ok(!!u.verify(token), 'still valid with STRIPE_SECRET_KEY=' + v.slice(0, 12) + '…');
}
delete process.env.STRIPE_SECRET_KEY;
ok(!!u.verify(token), 'still valid once it is removed again');

// The real secret still governs, or this test would pass on a signingKey() that ignored
// its input entirely.
process.env.FIGHTPACK_SECRET = 'a-different-secret';
ok(u.verify(token) === null, 'rotating FIGHTPACK_SECRET does revoke every token');
process.env.FIGHTPACK_SECRET = 'test-secret-123';
ok(!!u.verify(token), 'and restoring it brings them back');

delete process.env.FIGHTPACK_SECRET;
ok(u.signingKey() === null, 'no secret -> no key');
ok(u.sign({ sid: 'free' }) === null, 'no secret -> refuses to sign rather than signing unsigned');
process.env.FIGHTPACK_SECRET = 'test-secret-123';

console.log('token-signing tests passed (' + n + ' assertions)');
