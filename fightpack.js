// Fight Pack page logic — loaded by fightpack.html
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var denial = $('denial'), extra = $('extra'), buy = $('buy'), example = $('example');
  var errbox = $('error'), notice = $('notice');
  var attachBtn = $('attach'), fileInput = $('file'), filechip = $('filechip'), filename = $('filename'), fileclear = $('fileclear');
  var attachRec = $('attachrec'), recInput = $('recfile'), recchip = $('recchip'), recname = $('recname'), recclear = $('recclear');
  var progress = $('progress'), kitout = $('kitout'), docsEl = $('docs');
  var attached = null, records = null, token = null, parts = {}, meta = null;
  // What each part that arrived is still short of (see shortOf). Empty for a whole kit; saved with it.
  var gaps = {};
  // The example kit on the page (sample-kit.json): what the site wrote earlier for the example
  // letter. While `sample` is true the kit shown is that one, not the reader's: it is never
  // saved, never emailed, and it never stands in for a build of the reader's own letter.
  var sample = false, sampleKit = null;
  // The Fight Pack is free and there is no checkout. Kept as a constant so the free-path
  // branches below read the same as they always did.
  var free = true;

  var EXAMPLE_DENIAL = 'EXAMPLE NOTICE OF ADVERSE BENEFIT DETERMINATION — Reference 00000000. Date of notice: 10/02/2026. Member: [name]. Provider: Example Imaging Center. Date of service: 09/14/2026. Service: MRI lumbar spine without contrast (CPT 72148), billed $1,650.00. DETERMINATION: DENIED. Reason CO-50: not deemed a medical necessity by the payer. Per policy IMG-204, advanced imaging of the lumbar spine requires documentation of at least six weeks of conservative therapy unless red-flag findings are present. Member responsibility pending appeal: $1,650.00. You or your authorized representative may file an internal appeal within 180 days of this notice.';
  var EXAMPLE_EXTRA = 'Eight weeks of physical therapy and naproxen before the MRI; new left-leg weakness and numbness started in late August; my orthopedist ordered the MRI to decide about surgery.';

  // ---------- storage helpers ----------
  // Vercel Web Analytics custom event. No-op until Web Analytics is on, and if an
  // ad blocker eats the script; the server-side [dmj] counts are the backstop.
  // Named 'track', not 'ev': every submit handler here takes an event parameter called
  // ev, which shadowed the helper and made kit_emailed and lead throw instead of fire.
  function track(name, data){ try{ if(window.va) window.va('event', { name: name, data: data || {} }); }catch(e){} }
  function save(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  function load(key){ try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }catch(e){ return null; } }
  function drop(key){ try{ localStorage.removeItem(key); }catch(e){} }
  // The reader's kit, kept in this browser. The example kit is not theirs and is never kept.
  function stash(){ if(sample) return; save('dmj_fp_kit', { parts: parts, meta: meta, gaps: gaps, ts: Date.now() }); }
  // ---------- where this reader came from ----------
  // One word for the visit. It goes with a kit's build calls, so the kit count can say which place
  // sent the people who built one (api/fightpack.js keeps it beside the count). The word is:
  //   the tag on the link they followed (?utm_source=reddit), cut down to a-z 0-9 and dashes;
  //   else the site that linked here, as a name from the short list below, or 'other' for any site not on it;
  //   else 'site' for another page of this site, and 'direct' when the browser names no page at all.
  // The address of the page they came from is never kept and never sent: only the word.
  // The first word sticks for the life of the tab, so a look at another page of the site and back does
  // not lose it; a new tagged link replaces it. It is not kept past the tab: a reader who comes back
  // next week on their own is not last week's link.
  var REFERRERS = [
    ['reddit', /(^|\.)(reddit\.com|redd\.it)$|^com\.reddit\./],
    ['x', /^t\.co$|(^|\.)(x|twitter)\.com$|^com\.twitter\./],
    ['threads', /(^|\.)threads\.(net|com)$|^com\.instagram\.barcelona$/],
    ['bluesky', /(^|\.)bsky\.app$/],
    ['hn', /^news\.ycombinator\.com$/],
    ['facebook', /(^|\.)(facebook|fb)\.com$|^com\.facebook\./],
    ['linkedin', /(^|\.)linkedin\.com$|^lnkd\.in$/],
    ['google', /(^|\.)google\.[a-z.]{2,6}$/],
    ['bing', /(^|\.)bing\.com$/],
    ['duckduckgo', /(^|\.)duckduckgo\.com$/],
    ['chatgpt', /(^|\.)chatgpt\.com$|^chat\.openai\.com$/],
    ['perplexity', /(^|\.)perplexity\.ai$/],
    ['claude', /(^|\.)claude\.ai$/]
  ];
  function cleanWord(s){ return String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 24); }
  // The host of an address (or the package of an Android app that opened the link), without "www."
  function hostOf(url){
    var m = /^[a-z][a-z0-9+.-]*:\/\/([^\/?#]*)/i.exec(String(url || ''));
    return m ? m[1].replace(/^.*@/, '').replace(/:\d+$/, '').toLowerCase().replace(/^www\./, '') : '';
  }
  function taggedAs(){
    var m = /[?&]utm_source=([^&#]*)/.exec((window.location && window.location.search) || '');
    if(!m) return '';
    try{ return cleanWord(decodeURIComponent(m[1].replace(/\+/g, ' '))); }catch(e){ return ''; }   // a tag that cannot be read is no tag
  }
  function sentBy(){
    var host = hostOf(document.referrer);
    if(!host) return 'direct';
    if(host === hostOf('https://' + ((window.location && window.location.hostname) || ''))) return 'site';
    for(var i = 0; i < REFERRERS.length; i++) if(REFERRERS[i][1].test(host)) return REFERRERS[i][0];
    return 'other';
  }
  var source = (function(){
    var tab = null;
    try{ tab = window.sessionStorage; }catch(e){}                       // some browsers refuse even to hand it over
    var kept = '';
    try{ kept = tab ? cleanWord(tab.getItem('dmj_src')) : ''; }catch(e){}
    var word = taggedAs() || kept || sentBy();
    try{ if(tab) tab.setItem('dmj_src', word); }catch(e){}
    return word;
  })();
  // ---------- files ----------
  function prepFile(f, ok, fail){
    var MAX = 3 * 1024 * 1024;
    if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
      if (f.size > MAX) { fail('That PDF is over 3 MB — export just the pages that matter and try again.'); return; }
      var r = new FileReader();
      r.onload = function(){ ok({ kind:'pdf', media_type:'application/pdf', data: String(r.result).split(',')[1], name: f.name }); };
      r.onerror = function(){ fail("Couldn't read that file — try again."); };
      r.readAsDataURL(f);
      return;
    }
    var url = URL.createObjectURL(f);
    var img = new Image();
    img.onload = function(){
      var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      var w = Math.round(img.width*scale), h = Math.round(img.height*scale);
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      var data = c.toDataURL('image/jpeg', 0.8).split(',')[1];
      if (data.length > 2000000) { fail('That image is huge even after compression — try a tighter crop.'); return; }
      ok({ kind:'image', media_type:'image/jpeg', data: data, name: f.name });
    };
    img.onerror = function(){ URL.revokeObjectURL(url); fail("Couldn't read that image — JPG, PNG, or PDF work best. (iPhone HEIC photo? Take a screenshot of it and upload that.)"); };
    img.src = url;
  }
  function hookFile(btn, input, chip, nameEl, clearBtn, setter){
    btn.addEventListener('click', function(){ input.click(); });
    clearBtn.addEventListener('click', function(){ setter(null); input.value = ''; chip.classList.remove('on'); });
    input.addEventListener('change', function(){
      var f = input.files && input.files[0];
      if(!f) return;
      hideError();
      prepFile(f, function(res){ setter(res); nameEl.textContent = res.name; chip.classList.add('on'); }, function(msg){ setter(null); input.value=''; chip.classList.remove('on'); showError(msg); });
    });
  }
  hookFile(attachBtn, fileInput, filechip, filename, fileclear, function(v){ attached = v; if(v) dropExample(true); });
  hookFile(attachRec, recInput, recchip, recname, recclear, function(v){ records = v; if(v) dropExample(true); });

  // The example: its letter and note go in the two boxes, and the kit already written for them
  // is shown under the tool, so the reader sees what a Fight Pack is before waiting for one.
  example.addEventListener('click', function(){ denial.value = EXAMPLE_DENIAL; extra.value = EXAMPLE_EXTRA; denial.focus(); showSample('button'); });
  // The example is somebody else's case. Once a reader brings something of their own - a file,
  // or a letter typed or pasted over the example's - what is left of the example in the two
  // boxes goes, so its symptoms and dates are never written into their kit. Their own words are
  // never touched: only text that is still exactly the example's is cleared.
  function dropExample(letterToo){
    if(letterToo && denial.value.trim() === EXAMPLE_DENIAL) denial.value = '';
    if(extra.value.trim() === EXAMPLE_EXTRA) extra.value = '';
  }
  // A letter that no longer opens like the example's has replaced it; one that still does is the example being tried out.
  denial.addEventListener('input', function(){ if(denial.value.slice(0, 40) !== EXAMPLE_DENIAL.slice(0, 40)) dropExample(false); });

  // ---------- motion: jargon dissolving into plain English while the kit is written; a copy toast ----------
  var MORPH = [['adverse benefit determination', 'denial'], ['letter of medical necessity', "your doctor's letter"], ['CO-50', 'not medically necessary'], ['peer-to-peer', 'a doctor-to-doctor call'], ['internal appeal', 'asking them to look again'], ['external review', 'an independent referee'], ['authorized representative', 'someone helping you']];
  function startMorph(el, pairs){
    if(!el) return; stopMorph(el);
    var from = el.querySelector('.from'), to = el.querySelector('.to'), i = 0;
    function set(){ from.textContent = pairs[i][0]; to.textContent = pairs[i][1]; i = (i + 1) % pairs.length; }
    set();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(reduce){ el._t = setInterval(set, 1800); } else { el._h = set; to.addEventListener('animationiteration', set); }
  }
  function stopMorph(el){
    if(!el) return;
    if(el._t){ clearInterval(el._t); el._t = null; }
    if(el._h){ el.querySelector('.to').removeEventListener('animationiteration', el._h); el._h = null; }
  }
  var morphEl = progress.querySelector('.morph');
  var toastEl = null, toastT = null;
  function toast(msg){
    if(!toastEl){ toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg><span></span>';
    toastEl.querySelector('span').textContent = msg;
    toastEl.classList.add('on'); clearTimeout(toastT);
    toastT = setTimeout(function(){ toastEl.classList.remove('on'); }, 1800);
  }

  // ---------- ui helpers ----------
  function showError(msg){ errbox.textContent = msg; errbox.classList.add('on'); }
  function hideError(){ errbox.classList.remove('on'); }
  function showNotice(msg){ notice.textContent = msg; notice.classList.add('on'); }
  function hideNotice(){ notice.classList.remove('on'); }
  function setStep(n, state){ var el = $('st'+n); el.className = state; el.querySelector('.pic').textContent = state==='done' ? '✓' : state==='doing' ? '' : String(n); }
  function resetSteps(){ for(var i=1;i<=4;i++){ var el=$('st'+i); el.className=''; el.querySelector('.pic').textContent = String(i); } }
  // Which progress step each generator part belongs to (part 1 = decode; 2–3 = letters; 4–5 = scripts; 6 = round two).
  var STEP_OF = { 1:1, 2:2, 3:2, 4:3, 5:3, 6:4 };
  var PART_LABEL = { 1:'Your denial, decoded', 2:'Your appeal letter', 3:"Your doctor's letter and the note for the office", 4:'Peer-to-peer brief and the insurer phone script', 5:'Billing-office script and records request', 6:'Round two and your deadlines' };
  function refreshSteps(done){
    for(var s=1;s<=4;s++){
      var partsOfStep = Object.keys(STEP_OF).filter(function(p){ return STEP_OF[p]===s; });
      var allDone = partsOfStep.every(function(p){ return done[p]; });
      var anyDone = partsOfStep.some(function(p){ return done[p]; });
      setStep(s, allDone ? 'done' : (s===1 || done[1]) ? 'doing' : (anyDone ? 'doing' : ''));
    }
  }

  // ---------- markdown-lite ----------
  function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  // **bold**, *italics* and [blanks to fill in]. Italics use the pattern plain() takes off, so a
  // list's "* " and a lone asterisk are never read as emphasis.
  function inline(s){
    return s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
            .replace(/(^|[^*\w])\*([^\s*](?:[^*\n]*[^\s*])?)\*(?![*\w])/g, '$1<em>$2</em>')
            .replace(/\[([^\[\]]{1,160})\]/g, function(m, inner){ return '<span class="ph">[' + inner + ']</span>'; });
  }
  function renderBody(md){
    var lines = escapeHtml(md).split(/\r?\n/);
    var html = '', list = null, para = [];
    function flushPara(){ if(para.length){ html += '<p>' + inline(para.join('<br>')) + '</p>'; para = []; } }
    function flushList(){ if(list){ html += (list.tag==='ul'?'<ul>':'<ol>') + list.items.map(function(i){return '<li>'+inline(i)+'</li>';}).join('') + (list.tag==='ul'?'</ul>':'</ol>'); list = null; } }
    lines.forEach(function(line){
      var t = line.replace(/\s+$/,'');
      var tt = t.trim();
      if(!tt){ flushPara(); flushList(); return; }
      if(/^-{3,}$/.test(tt)){ flushPara(); flushList(); return; }
      var h = tt.match(/^#{3,4}\s+(.*)$/);
      if(h){ flushPara(); flushList(); html += '<h4>' + inline(h[1]) + '</h4>'; return; }
      var b = tt.match(/^[-•*]\s+(.*)$/);
      if(b){ flushPara(); if(!list || list.tag !== 'ul'){ flushList(); list = {tag:'ul', items:[]}; } list.items.push(b[1]); return; }
      var n = tt.match(/^\d+[.)]\s+(.*)$/);
      if(n){ flushPara(); if(!list || list.tag !== 'ol'){ flushList(); list = {tag:'ol', items:[]}; } list.items.push(n[1]); return; }
      flushList(); para.push(tt);
    });
    flushPara(); flushList();
    return html;
  }
  function splitSections(md){
    var out = [], cur = null;
    md.split(/\r?\n/).forEach(function(line){
      var h = line.match(/^##\s+(.*)$/);
      if(h){ if(cur) out.push(cur); cur = { title: h[1].trim(), lines: [] }; return; }
      if(cur) cur.lines.push(line); else { cur = { title: '', lines: [line] }; }
    });
    if(cur) out.push(cur);
    return out.filter(function(s){ return s.title || s.lines.join('').trim(); }).map(function(s){ return { title: s.title, body: s.lines.join('\n').trim() }; });
  }
  function extractJson(md){
    var m = md.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/i);
    if(!m) return { text: md, json: null };
    var json = null; try{ json = JSON.parse(m[1]); }catch(e){}
    return { text: md.replace(m[0], '').trim(), json: json };
  }
  // The kit as plain text, for the email and the Copy buttons: the marks come off, the words stay.
  // A line of hyphens is a paragraph break (as in renderBody), and *italics* lose their asterisks
  // like **bold** does. A list's "* " and a signature line of underscores are content.
  function plain(md){
    return md
      .replace(/(?:\r?\n)*^[ \t]*-{3,}[ \t]*$(?:\r?\n)*/gm, '\n\n')
      .replace(/\*\*/g,'')
      .replace(/(^|[^*\w])\*([^\s*](?:[^*\n]*[^\s*])?)\*(?![*\w])/g, '$1$2')
      .replace(/^#{2,4}\s+/gm,'')
      .trim();
  }

  // ---------- rendering the kit ----------
  var sectionOrder = [];
  function renderKit(){
    docsEl.innerHTML = '';
    sectionOrder = [];
    // Parts render in kit order; a part that hasn't arrived yet shows a placeholder in its slot.
    // The first document, while it is still being written, is drawn from the lines sent so far (liveLines).
    [1,2,3,4,5,6].forEach(function(p){
      var live = p === 1 && !parts[1] && !!liveLines;
      var text = live ? liveLines.join('\n') : parts[p];
      if(!text){
        if(p > 1 && building){ var ph = document.createElement('div'); ph.className = 'doc panel'; ph.innerHTML = '<p class="pending">' + escapeHtml(PART_LABEL[p] || 'More') + ' — on the way…</p>'; docsEl.appendChild(ph); }
        return;
      }
      splitSections(text).forEach(function(sec){
        var tag = /medical necessity|emergency attestation/i.test(sec.title) ? 'For your doctor' : /corrected-claim/i.test(sec.title) ? 'For the billing office' : /coverage facts/i.test(sec.title) ? 'For HR / benefits' : '';
        var isStar = !!tag;
        // Documents a person sends (letters and requests) render on paper; the decode, scripts and notes stay on the dark surface.
        var isPaper = /appeal letter|medical necessity|emergency attestation|records and itemized|external review request|corrected-claim request|coverage facts/i.test(sec.title);
        var card = document.createElement('div');
        card.className = 'doc panel' + (isStar ? ' star' : '') + (isPaper ? ' paper' : '');
        var h = '<div class="doc-top"><h3>' + escapeHtml(sec.title) + (isStar ? '<span class="tag tag-accent">' + tag + '</span>' : '') + '</h3><button class="btn btn-secondary btn-sm copy-btn" type="button">Copy</button></div><div class="doc-body prose">' + renderBody(sec.body) + '</div>' + (live ? '<span class="pulse-dot" aria-hidden="true"></span>' : '');
        card.innerHTML = h;
        var btn = card.querySelector('.copy-btn');
        btn.addEventListener('click', function(){ copyText(plain(sec.title + '\n\n' + sec.body), btn); });
        docsEl.appendChild(card);
        // Text still being written is not part of the kit: "Copy everything" and the email are made from sectionOrder.
        if(!live) sectionOrder.push(sec);
      });
    });
    kitout.classList.add('on');
  }
  function copyText(text, btn){
    function done(){ toast('Copied to clipboard'); if(btn){ var lbl = btn.querySelector('span') || btn; var old = lbl.textContent; lbl.textContent = 'Copied'; setTimeout(function(){ lbl.textContent = old; }, 1600); } }
    function fallback(){ var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){} document.body.removeChild(ta); }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(fallback); } else { fallback(); }
  }
  // While the first section is still being written (liveLines) there is no kit yet to copy, print, fix or
  // rebuild: these controls are hidden then (index.html, .kitout.live) and do nothing if reached anyway.
  $('copyall').addEventListener('click', function(){
    if(liveLines) return;
    copyText(kitText(), $('copyall'));
  });
  $('printbtn').addEventListener('click', function(){ if(liveLines) return; window.print(); });

  // ---------- fix a detail everywhere ----------
  // A misread member ID or a misspelled name is corrected once and replaced in all ten sections.
  var fixform = $('fixform'), fixbtn = $('fixbtn'), fixfrom = $('fixfrom'), fixto = $('fixto'), fixmsg = $('fixmsg');
  fixbtn.addEventListener('click', function(){
    if(liveLines) return;
    var open = fixform.hidden;
    fixform.hidden = !open; fixbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if(open){ fixmsg.textContent = ''; fixfrom.focus(); }
  });
  fixform.addEventListener('submit', function(ev){
    ev.preventDefault();
    var from = fixfrom.value, to = fixto.value;
    if(!from.trim()){ fixmsg.textContent = 'Type the text to replace first.'; fixfrom.focus(); return; }
    if(from === to){ fixmsg.textContent = 'Those are the same.'; return; }
    var count = 0;
    Object.keys(parts).forEach(function(p){
      var pieces = String(parts[p] || '').split(from);
      count += pieces.length - 1;
      parts[p] = pieces.join(to);
    });
    if(!count){ fixmsg.textContent = 'Not found — check spacing and capitals exactly as they appear in the kit.'; return; }
    if(meta && meta.claim_number === from) meta.claim_number = to;
    stash();
    renderKit(); // the deadline tracker keeps whatever the reader has set
    fixmsg.textContent = 'Replaced ' + count + (count === 1 ? ' time' : ' times') + ' across your kit.';
    toast('Replaced in every section');
    fixfrom.value = ''; fixto.value = '';
  });
  $('forget').addEventListener('click', function(){ drop('dmj_fp_kit'); drop('dmj_fp_token'); parts = {}; meta = null; sample = false; kitout.classList.remove('on'); kitout.classList.remove('sample'); showNotice('Cleared from this browser.'); });

  // ---------- deadlines ----------
  var dlDenial = $('dlDenial'), dlStated = $('dlStated'), dlFiled = $('dlFiled'), dlType = $('dlType'), dlList = $('dlList'), dlDays = $('dlDays'), dlPlan = $('dlPlan');
  function addDays(iso, n){ var d = new Date(iso + 'T12:00:00'); if(isNaN(d)) return null; d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
  function fmt(iso){ if(!iso) return '—'; var d = new Date(iso + 'T12:00:00'); return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' }); }
  var dlRows = [];
  function computeDeadlines(){
    var today = new Date().toISOString().slice(0,10);
    var den = dlDenial.value, stated = dlStated.value, filed = dlFiled.value || today, type = dlType.value, plan = dlPlan.value;
    var days = parseInt(dlDays.value, 10); if(!(days > 0)) days = null;
    dlRows = [];
    // 1) Filing deadline: a date printed on the letter beats a day count from the letter, which beats the general rule.
    var defaultDays = plan === 'medicare' ? 65 : plan === 'medicaid' ? 60 : plan === 'original-medicare' ? 120 : 180;
    var appealDue = stated || (den ? addDays(den, days || defaultDays) : null);
    var appealNote = stated ? 'The deadline printed on your letter.'
      : den && days ? days + ' days from the notice date, as your letter says.'
      : den ? (plan === 'medicare' ? 'Medicare Advantage notices usually give 65 days from the notice date. Your letter controls.' : plan === 'medicaid' ? 'Medicaid notices commonly give about 60 days — check yours; your letter controls.' : plan === 'original-medicare' ? 'Original Medicare gives 120 days from the day you get the notice; the date printed on your notice controls.' : 'General rule: 180 days from the notice date. Your letter controls.')
      : 'Enter the notice date (and the days the letter gives you) above.';
    dlRows.push({ title: 'File your internal appeal by', date: appealDue, note: appealNote });
    if(appealDue){ dlRows.push({ title: 'Safe target: have it sent by', date: addDays(appealDue, -14), note: 'Two weeks early leaves room for the doctor\'s letter and certified mail.' }); }
    // 2) Decision due. Commercial and Medicare Advantage clocks happen to match: 72 h expedited, 30 days pre-service, 60 days post-service/payment.
    var decisionDays = plan === 'original-medicare' ? 60 : type === 'urgent' ? 3 : type === 'pre-service' ? 30 : 60;
    var who = plan === 'medicare' ? 'The plan' : plan === 'original-medicare' ? 'The Medicare contractor' : 'Insurer';
    if(plan === 'original-medicare'){
      dlRows.push({ title: who + '\'s written decision due', date: addDays(filed, decisionDays), note: 'A redetermination is generally decided within 60 days of receiving your request — longer if you send more evidence later.' });
    } else if(plan === 'medicaid' || plan === 'other'){
      dlRows.push({ title: who + '\'s written decision due', date: addDays(filed, decisionDays), note: 'Shown using the general rule (' + (type === 'urgent' ? '72 hours' : decisionDays + ' days') + '); ' + (plan === 'medicaid' ? 'Medicaid plans' : 'this plan type') + ' may use a different clock — the notice tells you.' });
    } else {
      dlRows.push({ title: who + '\'s written decision due', date: addDays(filed, decisionDays), note: type === 'urgent' ? 'Expedited appeals: generally 72 hours.' : (type === 'pre-service' ? 'Generally 30 days for care not yet received.' : 'Generally 60 days for care already received.') });
    }
    // 3) What happens if they say no again. The next level's clock starts on the date of the decision letter,
    //    which is not known yet, so this row carries no date: a date shown here could fall after the real one.
    if(plan === 'medicare'){
      dlRows.push({ title: 'If they uphold the denial', date: null, note: 'Medicare Advantage sends your case automatically to an Independent Review Entity — no filing needed. Watch for its letter; it explains the next appeal level.' });
    } else if(plan === 'medicaid'){
      dlRows.push({ title: 'If they uphold the denial: ask for a state fair hearing', date: null, note: 'The deadline and address are on the notice — Medicaid uses a state fair hearing rather than the external review below.' });
    } else if(plan === 'original-medicare'){
      dlRows.push({ title: 'If they uphold the denial: ask for a reconsideration', date: null, note: 'Within 180 days of getting the redetermination decision — a Qualified Independent Contractor reviews it. Original Medicare has no external review.' });
    } else if(plan === 'other'){
      dlRows.push({ title: 'If they uphold the denial', date: null, note: 'The decision letter names your next level of review and its deadline.' });
    } else {
      dlRows.push({ title: 'If they uphold the denial: request external review', date: null, note: 'Within 4 months of the date on the FINAL denial letter — count from that letter when it arrives; it also says where to file.' });
    }
    dlList.innerHTML = dlRows.map(function(r){ return '<li><div><b>' + escapeHtml(r.title) + '</b><small>' + escapeHtml(r.note) + '</small></div><span class="d">' + fmt(r.date) + '</span></li>'; }).join('');
  }
  function deadlinesText(){ return 'YOUR DEADLINES\n' + dlRows.map(function(r){ return '- ' + r.title + ': ' + fmt(r.date) + ' (' + r.note + ')'; }).join('\n'); }
  [dlDenial, dlStated, dlFiled, dlType, dlDays, dlPlan].forEach(function(el){ el.addEventListener('change', computeDeadlines); el.addEventListener('input', computeDeadlines); });
  // The case-strength chip comes from the decode (section 1) — the same line the rest of the kit was written from:
  // the finished decode when there is one, otherwise the lines of it shown so far.
  function strengthFromDecode(){
    var m = (parts[1] || (liveLines ? liveLines.join('\n') : '')).match(/case strength:?\*{0,2}\s*\*{0,2}\s*"?(strong|good|needs)/i);
    return m ? (m[1].toLowerCase() === 'needs' ? 'needs-evidence' : m[1].toLowerCase()) : null;
  }
  // Shown when a strength is known; hidden when none is (a line shown live can be taken back).
  function showStrength(){
    var chip = $('strength'), cs = strengthFromDecode() || (meta && meta.case_strength);
    if(cs === 'strong' || cs === 'good' || cs === 'needs-evidence'){
      chip.textContent = 'Case strength: ' + (cs === 'strong' ? 'Strong' : cs === 'good' ? 'Good — one thing missing' : 'Needs evidence');
      chip.className = 'tag ' + (cs === 'strong' ? 'tag-ok' : cs === 'good' ? 'tag-accent' : 'tag-warn');
      chip.style.display = 'inline-flex';
    } else chip.style.display = 'none';
  }
  function applyMeta(){
    var today = new Date().toISOString().slice(0,10);
    if(meta){
      if(meta.denial_date && /^\d{4}-\d{2}-\d{2}$/.test(meta.denial_date)) dlDenial.value = meta.denial_date;
      if(meta.stated_appeal_deadline && /^\d{4}-\d{2}-\d{2}$/.test(meta.stated_appeal_deadline)) dlStated.value = meta.stated_appeal_deadline;
      var wd = parseInt(meta.appeal_window_days, 10); if(wd > 0 && wd <= 730) dlDays.value = String(wd);
      if(meta.urgent) dlType.value = 'urgent'; else if(meta.service_type === 'pre-service') dlType.value = 'pre-service'; else dlType.value = 'post-service';
      if(meta.plan_type === 'medicare' || meta.plan_type === 'medicaid' || meta.plan_type === 'original-medicare' || meta.plan_type === 'other') dlPlan.value = meta.plan_type; else dlPlan.value = 'commercial';
    }
    showStrength();
    if(!dlFiled.value) dlFiled.value = today;
    computeDeadlines();
  }
  $('icsbtn').addEventListener('click', function(){
    var stamp = new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,'');
    var ev = dlRows.filter(function(r){ return r.date; }).map(function(r, i){
      var d = r.date.replace(/-/g,'');
      return ['BEGIN:VEVENT','UID:dmj-' + stamp + '-' + i + '@dr-mumbo-jumbo.com','DTSTAMP:' + stamp,'DTSTART;VALUE=DATE:' + d,'DTEND;VALUE=DATE:' + (addDays(r.date,1)||r.date).replace(/-/g,''),'SUMMARY:Insurance appeal — ' + r.title.replace(/,/g,'\\,'),'DESCRIPTION:' + (r.note + ' Kit: dr-mumbo-jumbo.com/fightpack').replace(/,/g,'\\,'),'BEGIN:VALARM','TRIGGER:-P3D','ACTION:DISPLAY','DESCRIPTION:Appeal deadline in 3 days','END:VALARM','END:VEVENT'].join('\r\n');
    });
    var ics = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Dr Mumbo Jumbo//Fight Pack//EN','CALSCALE:GREGORIAN'].concat(ev).concat(['END:VCALENDAR']).join('\r\n');
    var blob = new Blob([ics], { type: 'text/calendar' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'appeal-deadlines.ics'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  });

  // ---------- generation ----------
  var building = false;
  // The live first read: the first section's lines, drawn as the server sends them (api/fightpack.js).
  // liveLines holds them while that section is still being written and is null the rest of the time; they are
  // never put in `parts`, so nothing saves them, copies them or hands them to the other five parts.
  // liveShown: this build's live view has been brought into view. From then until the kit is done the reader is
  // taken to be reading it: the kit's controls stay away (index.html, .kitout.live), and nothing moves the
  // documents on their screen.
  var liveLines = null, liveShown = false;
  // A change above the documents - the strength tag arriving, the kit's controls coming back, the progress panel
  // going - made without moving what the reader is reading: the documents stay where they are on screen.
  // (Some browsers do this by themselves; where one has, there is nothing left to make up.) The site's pages
  // scroll smoothly (nocturne.css), which here would be a glide the reader watches, so it is switched off for
  // the one move, and put back.
  function holdPlace(change){
    var before = docsEl.getBoundingClientRect().top;
    change();
    var moved = docsEl.getBoundingClientRect().top - before;
    if(!moved) return;
    var root = document.documentElement, was = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollBy(0, moved);
    root.style.scrollBehavior = was;
  }
  // A browser that cannot read a reply piece by piece does not ask for one.
  var canLive = typeof TextDecoder !== 'undefined' && typeof Response !== 'undefined' && 'body' in Response.prototype;
  // What a part's answer is short of, if anything: a section the handler did not find in it, or an
  // ending the writer never reached (it ran out of room, which the handler reports as stop "max_tokens").
  function shortOf(d){
    var miss = ((d && d.missing) || []).map(function(h){ return String(h).replace(/^#+\s*/, ''); });
    if(miss.length) return 'missing ' + miss.join(' and ');
    return d && d.stop === 'max_tokens' ? 'it stops before the end' : '';
  }
  // The parts of the kit that are not whole: never arrived, or arrived short. None = a complete kit.
  function unfinished(){
    return [1,2,3,4,5,6].filter(function(p){ return !parts[p] || gaps[p]; })
      .map(function(p){ return PART_LABEL[p] + (parts[p] ? ' (' + gaps[p] + ')' : ''); });
  }
  function postJSON(url, body, ms){
    var ctrl = new AbortController();
    var t = setTimeout(function(){ ctrl.abort(); }, ms || 120000);
    return fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body), signal: ctrl.signal })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(d){ clearTimeout(t); return { ok: r.ok, status: r.status, data: d }; }); })
      .catch(function(e){ clearTimeout(t); return { ok:false, status:0, data:{ message: e && e.name === 'AbortError' ? 'That took too long — try again.' : 'Connection dropped — try again.' } }; });
  }
  // The same request, for the first section asked for live. The reply is either what any request gets (and is
  // handled exactly as postJSON handles it) or a stream of small messages: "from line N, these lines", handed to
  // onLines as they come, then the finished reply ("done") or an error. A stream that ends with neither is a
  // dropped connection.
  function postLive(url, body, onLines, ms){
    var ctrl = new AbortController();
    var t = setTimeout(function(){ ctrl.abort(); }, ms || 120000);
    return fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body), signal: ctrl.signal })
      .then(function(r){
        var type = r.headers && r.headers.get ? String(r.headers.get('content-type') || '') : '';
        if(type.indexOf('text/event-stream') !== 0){
          return r.json().catch(function(){ return {}; }).then(function(d){ clearTimeout(t); return { ok: r.ok, status: r.status, data: d }; });
        }
        // The network cuts the stream where it likes - inside a message, inside a character - so the bytes are
        // decoded as a stream and a message is read only once the blank line that ends it has arrived.
        var reader = r.body.getReader(), decoder = new TextDecoder(), pending = '';
        function next(){
          return reader.read().then(function(step){
            if(step.done) return { ok:false, status:0, data:{ message:'Connection dropped — try again.' } };
            pending += decoder.decode(step.value, { stream:true });
            var messages = pending.split('\n\n');
            pending = messages.pop();
            for(var i = 0; i < messages.length; i++){
              var m = null;
              try{ m = JSON.parse(messages[i].replace(/^data:\s?/, '')); }catch(e){}
              if(!m) continue;
              if(m.done) return { ok:true, status:200, data: m.done };
              if(m.error) return { ok:false, status: m.error.status || 0, data: m.error };
              if(m.lines) onLines(m.from, m.lines);
            }
            return next();
          });
        }
        return next().then(function(res){ clearTimeout(t); return res; });
      })
      .catch(function(e){ clearTimeout(t); return { ok:false, status:0, data:{ message: e && e.name === 'AbortError' ? 'That took too long — try again.' : 'Connection dropped — try again.' } }; });
  }
  function inputs(){ return { denial: denial.value.trim(), extra: extra.value.trim(), file: attached ? { kind: attached.kind, media_type: attached.media_type, data: attached.data } : null, records: records ? { kind: records.kind, media_type: records.media_type, data: records.data } : null }; }
  function build(tok){
    if(building) return;
    var inp = inputs();
    if(!inp.denial && !inp.file){ showError('Paste the denial letter — or add a photo or PDF of it — then rebuild.'); return; }
    building = true; hideError(); hideNotice();
    // One throwaway tag for this build's six calls. Random, not stored, never reused.
    var kid = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
    track('kit_start', { files: !!(inp.file || inp.records) });
    parts = {}; meta = null; gaps = {};
    // From here on the kit is the reader's own. If the example was up, the tracker holds its notice date
    // and its 180 days: those go, or a letter that prints no date would be given the example's deadline.
    // (Dates the reader entered for their own kit stay, as they always have.)
    if(sample) [dlDenial, dlStated, dlDays, dlFiled].forEach(function(el){ el.value = ''; });
    sample = false; kitout.classList.remove('sample');
    $('strength').style.display = 'none';   // the rating beside the heading is the last kit's; this kit's decode sets its own
    liveShown = false;
    resetSteps(); progress.classList.add('on'); startMorph(morphEl, MORPH); kitout.classList.remove('on');
    progress.scrollIntoView({ behavior:'smooth', block:'start' });
    buy.disabled = true;
    var done = {};
    refreshSteps(done);
    // One part: ask, retry once on a transient server error, retry once if a section came back missing.
    // The first lines of the decode have come: the progress panel shrinks to its heading and status line, the
    // first document opens under it, and the page is brought there once (a build starts there, so this moves
    // only a reader who has scrolled away). Each message says "from line N, these lines".
    function onLines(from, lines){
      var first = !liveLines;
      if(first){ liveLines = []; progress.classList.add('slim'); kitout.classList.add('live'); liveShown = true; }
      liveLines = liveLines.slice(0, from).concat(lines);
      renderKit();
      if(first){ showStrength(); progress.scrollIntoView({ behavior:'smooth', block:'start' }); }
      else holdPlace(showStrength);
    }
    // The live reply is over. A whole section: its lines make way for the finished text, which the caller draws;
    // the page stays as it is (panel small, controls away) until the whole kit is done, so that nothing above the
    // reader changes while they read. Anything else after lines were shown - a failure, a stream that stopped, a
    // section cut short - and the page goes back to how it is while part 1 is being written: no half-drawn
    // document, the panel full size and in view.
    function endLive(whole){
      var had = !!liveLines;
      liveLines = null;
      if(whole || !had) return;
      liveShown = false;
      kitout.classList.remove('live'); kitout.classList.remove('on'); docsEl.innerHTML = '';
      progress.classList.remove('slim');
      $('strength').style.display = 'none';
      progress.scrollIntoView({ behavior:'smooth', block:'start' });
    }
    function fetchPart(p, extraBody){
      // The decode (part 1) is asked for live where the browser can read it as it is written. Asking again after
      // a failure or a short section is done the plain way; asking again with a new session is live, since the
      // live reply has not been tried yet.
      function ask(liveToo){
        var body = Object.assign({ token: tok, part: p, kid: kid, src: source }, inp, extraBody || {});
        if(!(liveToo && p === 1 && canLive)) return postJSON('/api/fightpack', body);
        body.live = true;
        return postLive('/api/fightpack', body, onLines).then(function(res){ endLive(res.ok && !shortOf(res.data)); return res; });
      }
      return ask(true).then(function(res){
        if(!res.ok && (res.status === 0 || res.status >= 500)){
          return new Promise(function(r){ setTimeout(r, 1500); }).then(function(){ return ask(false); });
        }
        // a free token that has done its share of kits: get a fresh one once, then ask again
        if(!res.ok && res.status === 401 && free){
          return renewFree().then(function(t2){ tok = t2; return ask(true); });
        }
        return res;
      }).then(function(res){
        // A part that came back short - a section missing, or cut off before its end - is asked for once more.
        if(res.ok && shortOf(res.data)){
          return ask(false).then(function(res2){
            if(!res2.ok) return res;
            if(!shortOf(res2.data)) return res2;
            return (res2.data.missing || []).length < (res.data.missing || []).length ? res2 : res;
          });
        }
        return res;
      }).then(function(res){
        if(!res.ok){ throw new Error(res.data.message || 'Something went wrong building ' + (PART_LABEL[p] || 'part ' + p).toLowerCase() + '.'); }
        var text = res.data.text || '';
        if(p === 6){ var ex = extractJson(text); text = ex.text; meta = ex.json; }
        parts[p] = text; done[p] = true;
        var gap = shortOf(res.data); if(gap) gaps[p] = gap; else delete gaps[p];
        refreshSteps(done);
        var draw = function(){ renderKit(); if(p === 6 || (p === 1 && !meta)) applyMeta(); };
        if(liveShown) holdPlace(draw); else draw();
      });
    }
    // The decode (part 1) is the plan; parts 2–6 are written in parallel from it.
    var failures = [];
    fetchPart(1).then(function(){
      var decode = (parts[1] || '').slice(0, 8000);
      return Promise.all([2,3,4,5,6].map(function(p){
        return fetchPart(p, { decode: decode }).catch(function(e){ failures.push((PART_LABEL[p] || 'part ' + p) + ' (' + (e && e.message ? e.message : 'error') + ')'); });
      }));
    }).then(function(){
      building = false; buy.disabled = false;
      // The panel goes and, after a live view, the kit's controls come back: both above the documents. A reader
      // who watched the first section being written is somewhere in the kit, reading, and is not moved.
      var putAway = function(){ progress.classList.remove('on'); progress.classList.remove('slim'); kitout.classList.remove('live'); };
      if(liveShown) holdPlace(putAway); else putAway();
      stopMorph(morphEl);
      renderKit();
      // A part that arrived short did not finish either; the reader hears about it the same way.
      [1,2,3,4,5,6].forEach(function(p){ if(parts[p] && gaps[p]) failures.push(PART_LABEL[p] + ' (' + gaps[p] + ')'); });
      track('kit_built', { outcome: failures.length ? 'partial' : 'complete' });
      stash();
      if(failures.length){ showError('Most of your kit is below, but these sections did not finish: ' + failures.join('; ') + '. ' + tryAgain()); }
      if(!liveShown) kitout.scrollIntoView({ behavior:'smooth', block:'start' });
    }).catch(function(e){
      building = false; buy.disabled = false;
      progress.classList.remove('on'); stopMorph(morphEl);
      track('kit_failed');
      showError((e && e.message ? e.message : 'Something went wrong.') + ' ' + tryAgain());
      if(parts[1]) kitout.classList.add('on');
      $('tool').scrollIntoView({ behavior:'smooth', block:'start' });
    });
  }
  function haveToken(){
    var t = load('dmj_fp_token');
    if(t && t.token && t.exp && t.exp > Date.now()) { token = t.token; return true; }
    return false;
  }
  function keepToken(tok){ token = tok; save('dmj_fp_token', { token: tok, exp: Date.now() + 71*3600*1000 }); refreshBuyLabel(); }
  function refreshBuyLabel(){
    if(free){ buy.textContent = 'Build my Fight Pack'; $('pricenote').textContent = 'Free. Rebuild it as often as you need.'; return; }
    if(haveToken()){ buy.textContent = 'Build my Fight Pack'; $('pricenote').textContent = 'Unlocked — rebuild as often as you need for 3 days.'; }
  }
  function tryAgain(){ return free ? 'Click "Rebuild with edits" to try again.' : 'Your unlock is still valid — click "Rebuild with edits" to try again.'; }
  // Free mode: the server hands out a token per visitor, a few an hour.
  var renewing = null;
  function renewFree(){
    if(!renewing){
      renewing = postJSON('/api/unlock', { free: true }, 30000).then(function(res){
        renewing = null;
        if(!res.ok || !res.data.token){ throw new Error(res.data.message || 'Could not start your kit.'); }
        keepToken(res.data.token);
        return res.data.token;
      });
    }
    return renewing;
  }
  function freeToken(){ return haveToken() ? Promise.resolve(token) : renewFree(); }

  // ---------- the example kit ----------
  // The boxes hold the example exactly as the button leaves them: nothing changed, nothing attached.
  function isExample(){ return denial.value.trim() === EXAMPLE_DENIAL && extra.value.trim() === EXAMPLE_EXTRA && !attached && !records; }
  function loadSample(){
    if(!sampleKit){
      sampleKit = fetch('/sample-kit.json')
        .then(function(r){ return r.ok ? r.json() : null; })
        .then(function(k){ return k && k.parts && [1,2,3,4,5,6].every(function(p){ return typeof k.parts[p] === 'string' && k.parts[p]; }) ? k : null; })
        .catch(function(){ return null; })
        .then(function(k){ if(!k) sampleKit = null; return k; });   // not there this time: look again next time
    }
    return sampleKit;
  }
  // Puts the example kit on the page. Resolves false when there is none to show (the file did not
  // load) or a kit is being written; the caller then carries on as it would have without it.
  function showSample(how){
    return loadSample().then(function(k){
      if(!k || building) return false;
      var own = load('dmj_fp_kit');
      parts = {}; gaps = {};
      [1,2,3,4,5,6].forEach(function(p){ parts[p] = k.parts[p]; });
      var ex = extractJson(parts[6]); parts[6] = ex.text; meta = ex.json;   // as fetchPart does with a part 6 that just arrived
      sample = true; kitout.classList.add('sample');
      hideError(); progress.classList.remove('on');
      // the tracker shows the example's dates, not ones left from a kit that was on the page before
      [dlDenial, dlStated, dlDays, dlFiled].forEach(function(el){ el.value = ''; });
      $('strength').style.display = 'none';
      renderKit(); applyMeta();
      if(own && own.parts && own.ts && Date.now() - own.ts < 72*3600*1000) showNotice('This is the example kit. The kit you built is still saved in this browser: reload the page to see it.');
      else hideNotice();
      track('example_opened', { via: how });
      kitout.scrollIntoView({ behavior:'smooth', block:'start' });
      return true;
    });
  }

  // ---------- build ----------
  // The example letter, unchanged, already has its kit: show that one. Writing it again would cost
  // the reader a minute and tell them nothing new. Anything else is built.
  function start(){
    buy.disabled = true;
    (isExample() ? showSample('build') : Promise.resolve(false)).then(function(shown){
      if(shown){ buy.disabled = false; return; }
      return freeToken().then(function(t){ buy.disabled = false; build(t); });
    }).catch(function(e){ buy.disabled = false; showError(e.message); });
  }
  buy.addEventListener('click', function(){
    hideError();
    var inp = inputs();
    if(!inp.denial && !inp.file){ showError('Paste the denial letter — or add a photo or PDF of it — first.'); denial.focus(); return; }
    start();
  });

  $('regen').addEventListener('click', function(){
    if(liveLines) return;
    hideError();
    start();
  });

  // email me my kit
  var mailform = $('mailform'), mailemail = $('mailemail'), mailbtn = $('mailbtn'), mailmsg = $('mailmsg');
  function kitText(){ return sectionOrder.map(function(s){ return plain(s.title + '\n\n' + s.body); }).join('\n\n\n') + '\n\n\n' + deadlinesText(); }
  mailform.addEventListener('submit', function(ev){
    ev.preventDefault();
    // The example is not the reader's kit: it is not sent to them as if it were.
    if(sample){ mailmsg.className = 'wait-msg err'; mailmsg.textContent = 'This is the example kit. Build one from your own letter, then email it.'; return; }
    // The email is the copy people keep, so it goes out only when every part is in and whole.
    var short = building ? [] : unfinished();
    if(building || short.length){
      mailmsg.className = 'wait-msg err';
      mailmsg.textContent = building
        ? 'Not sent yet: your kit is still being written. Email it when all ten sections are in.'
        : 'Not sent: this kit is not complete. Still to finish: ' + short.join('; ') + '. Click "Rebuild with edits", then email it.';
      return;
    }
    mailmsg.className = 'wait-msg'; mailbtn.disabled = true; mailbtn.textContent = 'Sending…';
    var mail = { email: mailemail.value, kit: kitText() };
    function send(tok){ mail.token = tok; return postJSON('/api/email-kit', mail, 30000); }
    // The kit goes out under this browser's session, found the way a build finds it: the saved one if it
    // is still good (a page that was reloaded has the kit but has not looked for it), otherwise a new one.
    // A session the server no longer takes - it has had its share of calls - is replaced once, as for a part.
    freeToken().then(send).then(function(res){
      return !res.ok && res.status === 401 && free ? renewFree().then(send) : res;
    }).catch(function(e){
      return { ok: false, data: { message: e && e.message } };   // no session to be had: the server's reason
    }).then(function(res){
      mailbtn.disabled = false; mailbtn.textContent = 'Email me my kit';
      mailmsg.className = 'wait-msg ' + (res.ok ? 'ok' : 'err');
      mailmsg.textContent = (res.data && res.data.message) || (res.ok ? 'Sent. Check your inbox.' : "Couldn't send it — try again in a minute.");
      if(res.ok) track('kit_emailed');
      if(res.ok) mailform.reset();
    });
  });

  // ---------- boot ----------
  (function boot(){
    // No checkout, so no session to come back from and nothing to ask the server about
    // before the page is usable.
    refreshBuyLabel();

    var saved = load('dmj_fp_kit');
    if(saved && saved.parts && saved.ts && Date.now() - saved.ts < 72*3600*1000){
      parts = saved.parts; meta = saved.meta || null; gaps = saved.gaps || {}; renderKit(); applyMeta();
      showNotice('Here\'s the Fight Pack you built ' + new Date(saved.ts).toLocaleDateString('en-US', {month:'short', day:'numeric'}) + '. Edit your text and click "Rebuild with edits" to regenerate.');
    }
    // A link straight to the example (dr-mumbo-jumbo.com/#sample): its letter in the boxes, its kit on the page.
    if(window.location && window.location.hash === '#sample'){ denial.value = EXAMPLE_DENIAL; extra.value = EXAMPLE_EXTRA; showSample('link'); }
  })();
})();
