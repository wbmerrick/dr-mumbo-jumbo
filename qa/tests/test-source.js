// Which place sent the reader who built a kit: one word, and nothing else.
//
// Why this exists: links to the site get posted in several places (a reply on X, a subreddit
// that allows it, a note to a friend), and the kit counter could say how many kits were built
// but not where their readers came from. Nobody could tell which place was worth the time.
// The page now works out one word for the visit and sends it with the kit's build calls; the
// server keeps it beside the count (api/fightpack.js, checked in test-count.js).
//
// What can go wrong is mostly saying too much, or crediting the wrong place. The word must
// never be the address of the page the reader came from: a thread, a mailbox, a search with
// their own words in it. A tag is whatever somebody typed into a link, so it is cut down before
// it leaves the browser. A look-alike host must not pass for the real one. A reader who looks
// at another page of the site and comes back is still the same reader from the same place,
// and a reader who returns next week on their own is not last week's link. And none of it may
// stop the page working in a browser that refuses storage.
//
// Runs fightpack.js itself, whole, against a small scripted browser (as test-sample-kit.js does):
// the elements it looks up, a fetch that answers from a script, timers that do not wait.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const js = fs.readFileSync(path.join(root, 'fightpack.js'), 'utf8');
const sampleText = fs.readFileSync(path.join(root, 'sample-kit.json'), 'utf8');

const fails = [];
let n = 0;
const ok = (c, what) => { n++; if (!c) fails.push(what); };
const same = (got, want, what) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) fails.push(what + '\n     got:  ' + JSON.stringify(got) + '\n     want: ' + JSON.stringify(want)); };

// A kit for the server to answer with: a stored one, cut into the six answers the page asks for.
const stored = fs.readFileSync(path.join(root, 'qa/evidence/runs27/C-prior-auth-biologic.kit.md'), 'utf8');
const at = {};
for (const m of stored.matchAll(/^## (\d{1,2})\. .*$/gm)) at[m[1]] = m.index;
const cut = (k) => stored.slice(at[k], k < 10 ? at[k + 1] : stored.length).trim();
const HOLDS = { 1: [1], 2: [2], 3: [3, 4], 4: [5, 6], 5: [7, 8], 6: [9, 10] };
const ANSWER = {};
for (const p of Object.keys(HOLDS)) ANSWER[p] = HOLDS[p].map(cut).join('\n\n');
const LETTER = 'NOTICE OF ADVERSE DETERMINATION. Prior authorization for infliximab is denied: step therapy with an immunomodulator is required first.';

function element() {
  const on = {}, cls = new Set();
  let html = '';
  const e = {
    value: '', textContent: '', hidden: false, disabled: false, style: {}, children: [],
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) },
    addEventListener: (t, f) => { (on[t] = on[t] || []).push(f); },
    removeEventListener() {}, setAttribute() {}, focus() {}, scrollIntoView() {}, click() {}, reset() {}, select() {},
    querySelector: () => element(), appendChild: (k) => { e.children.push(k); return k; }, removeChild() {},
    fire: (t) => (on[t] || []).forEach((f) => f({ preventDefault() {} }))
  };
  Object.defineProperty(e, 'className', { get: () => [...cls].join(' '), set: (v) => { cls.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)); } });
  Object.defineProperty(e, 'innerHTML', { get: () => html, set: (v) => { html = String(v); e.children = []; } });
  return e;
}

// One page load.
//   search, hash   what follows the address the reader opened
//   referrer       the page that linked here, as the browser reports it ('' when it reports none)
//   host           the site's own host name
//   tab            the tab's own storage: pass the same object again to open the site once more in the same tab
//   saved          the browser's lasting storage (outlives the tab)
//   storage        'ok' · 'refuses' every call to the tab's storage throws · 'blocked' the browser will not hand it over at all
function open({ search = '', referrer = '', hash = '', host = 'dr-mumbo-jumbo.com', tab = {}, saved = {}, storage = 'ok' } = {}) {
  const els = {};
  const $ = (id) => els[id] || (els[id] = element());
  const posts = [];
  const fetch = (url, opts) => {
    if (!opts || !opts.body) {
      return url === '/sample-kit.json' ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(sampleText)) })
        : Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error('not json')) });
    }
    const body = JSON.parse(opts.body);
    posts.push({ url, body });
    const answer = url === '/api/unlock' ? { token: 'session-1' } : { part: body.part, stop: 'end_turn', missing: [], text: ANSWER[body.part] };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(answer) });
  };
  const keeps = (bag) => ({ getItem: (k) => (k in bag ? bag[k] : null), setItem: (k, v) => { bag[k] = String(v); }, removeItem: (k) => { delete bag[k]; } });
  const no = () => { throw new Error('SecurityError: storage is not available'); };
  const win = { matchMedia: () => ({ matches: true }), location: { hash, search, hostname: host }, va() {} };
  if (storage === 'blocked') Object.defineProperty(win, 'sessionStorage', { get: no });
  else win.sessionStorage = storage === 'refuses' ? { getItem: no, setItem: no, removeItem: no } : keeps(tab);
  const soon = (fn, ms) => { if (ms <= 2000) Promise.resolve().then(fn); return 1; };
  class FileReader { readAsDataURL() { this.result = 'data:application/pdf;base64,JVBERi0x'; Promise.resolve().then(() => this.onload()); } }
  new Function('window', 'document', 'localStorage', 'navigator', 'fetch', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'AbortController', 'FileReader', js)(
    win, { getElementById: $, createElement: () => element(), body: element(), referrer }, keeps(saved), {}, fetch, soon, () => {}, () => 0, () => {},
    class { constructor() { this.signal = {}; } abort() {} }, FileReader);
  return {
    $, tab, saved,
    posts: () => posts.length,
    sent: () => posts.filter((c) => c.url === '/api/fightpack').map((c) => c.body),      // what each part's request carried
    asked: () => JSON.stringify(posts),                                                  // everything the page sent anywhere
    error: () => ($('error').classList.contains('on') ? $('error').textContent : '')
  };
}
const settle = async () => { for (let i = 0; i < 25; i++) await new Promise((r) => setImmediate(r)); };
// Open the site, type a letter, press Build.
async function built(how) {
  const page = open(how);
  page.$('denial').value = LETTER;
  page.$('buy').fire('click');
  await settle();
  return page;
}
// The word the kit's calls carried: one string when all six agree (as they must), otherwise the lot.
const wordOf = (page) => { const words = page.sent().map((b) => b.src); const one = [...new Set(words)]; return words.length === 6 && one.length === 1 ? one[0] : words; };

(async () => {
  // ---------- 1. a tagged link: the tag goes with every one of the kit's six calls ----------
  {
    const page = await built({ search: '?utm_source=reddit' });
    same(page.sent().length, 6, 'the kit is built: six calls');
    same(wordOf(page), 'reddit', 'a link tagged utm_source=reddit: every build call says reddit');
    same(page.error(), '', 'and the build raises no error');
  }

  // ---------- 2. no tag: the site that linked here, as one word from a short list ----------
  const KNOWN = [
    ['https://www.reddit.com/r/HealthInsurance/comments/1abcd/denied_mri/', 'reddit'],
    ['https://old.reddit.com/', 'reddit'],
    ['android-app://com.reddit.frontpage/', 'reddit'],
    ['https://t.co/AbC123xyz', 'x'],
    ['https://x.com/someone/status/1790000000000000000', 'x'],
    ['https://www.threads.net/@someone/post/Cabc', 'threads'],
    ['https://www.threads.com/@someone', 'threads'],
    ['https://bsky.app/profile/someone.bsky.social/post/3abc', 'bluesky'],
    ['https://news.ycombinator.com/item?id=41000000', 'hn'],
    ['https://www.facebook.com/groups/123456/', 'facebook'],
    ['https://l.facebook.com/l.php?u=https%3A%2F%2Fdr-mumbo-jumbo.com%2F', 'facebook'],
    ['https://www.linkedin.com/feed/', 'linkedin'],
    ['https://www.google.com/', 'google'],
    ['https://www.google.co.uk/search?q=insurance+denied+my+mri', 'google'],
    ['https://www.bing.com/search?q=appeal+a+denial', 'bing'],
    ['https://duckduckgo.com/', 'duckduckgo'],
    ['https://chatgpt.com/', 'chatgpt'],
    ['https://www.perplexity.ai/search/how-to-appeal-abc', 'perplexity'],
    ['https://claude.ai/chat/0a1b2c', 'claude']
  ];
  for (const [referrer, word] of KNOWN) same(wordOf(await built({ referrer })), word, 'arriving from ' + referrer + ' is counted as ' + word);

  // ---------- 3. any other site is "other": a look-alike is not the real one, and no address is kept ----------
  for (const referrer of ['https://notreddit.com/', 'https://reddit.com.evil.example/r/x', 'https://example-forum.org/thread/9', 'https://googleads.example/']) {
    same(wordOf(await built({ referrer })), 'other', 'arriving from ' + referrer + ' is counted as other');
  }
  {
    const page = await built({ referrer: 'https://mail.example.com/inbox/message/12345?user=jane.doe' });
    same(wordOf(page), 'other', 'a link opened from a mailbox is counted as other');
    ok(!/jane|inbox|12345|mail\.example|example\.com/i.test(page.asked()), 'nothing of the mailbox address is sent anywhere: ' + (page.asked().match(/.{0,30}(jane|inbox|12345|example\.com).{0,30}/i) || [''])[0]);
  }
  {
    const page = await built({ referrer: 'https://www.reddit.com/r/HealthInsurance/comments/1abcd/denied_mri/' });
    ok(!/HealthInsurance|denied_mri|1abcd|comments/i.test(page.asked()), 'only the word reddit is sent, never the thread the reader came from');
  }

  // ---------- 4. no tag and no referring page: "direct"; another page of this site: "site" ----------
  same(wordOf(await built({})), 'direct', 'a visit with no tag and no referring page is counted as direct');
  same(wordOf(await built({ referrer: 'https://dr-mumbo-jumbo.com/denials/prior-auth' })), 'site', 'arriving from another page of the site is counted as site');
  same(wordOf(await built({ referrer: 'https://www.dr-mumbo-jumbo.com/how-its-tested' })), 'site', 'with or without www');
  same(wordOf(await built({ host: 'dmj-git-preview.vercel.app', referrer: 'https://dmj-git-preview.vercel.app/denials' })), 'site', "the site's own host is read from the address bar, not written into the code");
  same(wordOf(await built({ host: 'dmj-git-preview.vercel.app', referrer: 'https://dr-mumbo-jumbo.com/' })), 'other', 'and a different host is not this site');

  // ---------- 5. the tag wins over the referring page, and is cut down before it is sent ----------
  same(wordOf(await built({ search: '?utm_source=friends', referrer: 'https://www.google.com/' })), 'friends', 'a tagged link opened from a Google page is counted by its tag');
  same(wordOf(await built({ search: '?ref=abc&utm_source=hn' })), 'hn', 'the tag is found wherever it sits in the address');
  same(wordOf(await built({ search: '?utm_source=Reddit%20Ads!' })), 'redditads', 'capitals, spaces and punctuation are taken out of a tag');
  same(wordOf(await built({ search: '?utm_source=' + 'a'.repeat(40) })), 'a'.repeat(24), 'a tag is cut to 24 characters');
  same(wordOf(await built({ search: '?utm_source=%E0%A4%A' })), 'direct', 'a tag that cannot be read is ignored, and the page still works');
  same(wordOf(await built({ search: '?utm_source=!!!' })), 'direct', 'a tag with nothing usable in it is ignored');
  same(wordOf(await built({ search: '?xutm_source=bad' })), 'direct', 'a different parameter that merely ends the same way is not the tag');
  {
    const page = await built({ search: '?utm_source=x&utm_campaign=q4-secret&email=jane.doe%40example.com' });
    same(wordOf(page), 'x', 'only utm_source is read');
    ok(!/q4-secret|jane|example\.com/i.test(page.asked()), 'nothing else in the address is sent anywhere');
  }

  // ---------- 6. the six calls carry the word and nothing new besides ----------
  {
    const page = await built({ search: '?utm_source=reddit', referrer: 'https://www.reddit.com/r/x/' });
    const keys = [...new Set(page.sent().flatMap((b) => Object.keys(b)))].sort();
    // live: the first call asks for the first section as it is written (test-live-page.js); it says nothing of the reader
    same(keys, ['decode', 'denial', 'extra', 'file', 'kid', 'live', 'part', 'records', 'src', 'token'], "a build call holds what it always held, plus src and the live flag");
  }

  // ---------- 7. the first word sticks for the tab; it does not outlive it ----------
  {
    const tab = {}, saved = {};
    await built({ search: '?utm_source=reddit', tab, saved });
    // they read "How it's tested", then come back to the front page: no tag now, and the referring page is the site's own
    same(wordOf(await built({ referrer: 'https://dr-mumbo-jumbo.com/how-its-tested', tab, saved })), 'reddit', 'after a look at another page of the site, the reader is still counted as reddit');
    // the same tab later opens the site from a search page, with no tag
    same(wordOf(await built({ referrer: 'https://www.google.com/', tab, saved })), 'reddit', 'the first word stays while the tab is open');
    // a new tagged link is a new arrival
    same(wordOf(await built({ search: '?utm_source=threads', tab, saved })), 'threads', 'a new tagged link replaces it');
    same(wordOf(await built({ referrer: 'https://dr-mumbo-jumbo.com/', tab, saved })), 'threads', 'and is the one remembered from then on');
    // next week: a new tab in the same browser, typed in by hand
    same(wordOf(await built({ saved })), 'direct', "a later visit in a new tab is not credited to last week's link");
    // the privacy page says what outlives the tab: the finished kit and the unlock token, nothing more
    same(Object.keys(saved).sort(), ['dmj_fp_kit', 'dmj_fp_token'], "the word is not written to the browser's lasting storage");
  }
  {
    // what the tab remembers is not trusted either: something else wrote to it
    const page = await built({ tab: { dmj_src: 'Mail.Example.com/inbox?u=jane' } });
    ok(/^[a-z0-9-]{1,24}$/.test(String(wordOf(page))), 'a remembered word is cut down like any other before it is sent (got ' + JSON.stringify(wordOf(page)) + ')');
  }

  // ---------- 8. a browser that refuses storage still gets its kit, counted from the link ----------
  for (const storage of ['refuses', 'blocked']) {
    const page = await built({ search: '?utm_source=bluesky', storage });
    same(wordOf(page), 'bluesky', 'storage ' + storage + ': the kit is built and counted by its tag');
    same(page.error(), '', 'storage ' + storage + ': no error is shown');
  }

  // ---------- 9. the example kit still asks the server for nothing, tag or no tag ----------
  {
    const page = open({ search: '?utm_source=hn', hash: '#sample' });
    await settle();
    ok(page.$('kitout').classList.contains('sample'), 'a tagged link to the example opens the example');
    same(page.posts(), 0, 'and still sends nothing to the server');
  }

  assert(fails.length === 0, fails.length + ' of ' + n + ' checks failed:\n  - ' + fails.slice(0, 16).join('\n  - ') + (fails.length > 16 ? '\n  … and ' + (fails.length - 16) + ' more' : ''));
  console.log('source tests passed (' + n + ' checks)');
})().catch((e) => { console.error(e.stack || e); process.exit(1); });
