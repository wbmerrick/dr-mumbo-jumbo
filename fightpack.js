// Fight Pack page logic — loaded by fightpack.html
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var denial = $('denial'), extra = $('extra'), buy = $('buy'), example = $('example');
  var errbox = $('error'), notice = $('notice'), wait = $('wait');
  var attachBtn = $('attach'), fileInput = $('file'), filechip = $('filechip'), filename = $('filename'), fileclear = $('fileclear');
  var attachRec = $('attachrec'), recInput = $('recfile'), recchip = $('recchip'), recname = $('recname'), recclear = $('recclear');
  var progress = $('progress'), kitout = $('kitout'), docsEl = $('docs');
  var attached = null, records = null, token = null, parts = {}, meta = null;
  var configured = null;
  // Free unless the server says otherwise (GET /api/checkout → free:false switches back to checkout).
  var free = true;

  var EXAMPLE_DENIAL = 'EXAMPLE NOTICE OF ADVERSE BENEFIT DETERMINATION — Reference 00000000. Date of notice: 10/02/2026. Member: [name]. Provider: Example Imaging Center. Date of service: 09/14/2026. Service: MRI lumbar spine without contrast (CPT 72148), billed $1,650.00. DETERMINATION: DENIED. Reason CO-50: not deemed a medical necessity by the payer. Per policy IMG-204, advanced imaging of the lumbar spine requires documentation of at least six weeks of conservative therapy unless red-flag findings are present. Member responsibility pending appeal: $1,650.00. You or your authorized representative may file an internal appeal within 180 days of this notice.';
  var EXAMPLE_EXTRA = 'Eight weeks of physical therapy and naproxen before the MRI; new left-leg weakness and numbness started in late August; my orthopedist ordered the MRI to decide about surgery.';

  // ---------- storage helpers ----------
  function save(key, val){ try{ localStorage.setItem(key, JSON.stringify(val)); }catch(e){} }
  function load(key){ try{ var v = localStorage.getItem(key); return v ? JSON.parse(v) : null; }catch(e){ return null; } }
  function drop(key){ try{ localStorage.removeItem(key); }catch(e){} }
  function stashInputs(){
    var text = { denial: denial.value, extra: extra.value, fileName: attached ? attached.name : null, recName: records ? records.name : null };
    try{ sessionStorage.setItem('dmj_fp_text', JSON.stringify(text)); }catch(e){}
    try{ sessionStorage.setItem('dmj_fp_files', JSON.stringify({ file: attached, records: records })); }catch(e){ try{ sessionStorage.removeItem('dmj_fp_files'); }catch(e2){} }
  }
  function restoreInputs(){
    try{
      var t = JSON.parse(sessionStorage.getItem('dmj_fp_text') || 'null');
      if(t){ denial.value = t.denial || ''; extra.value = t.extra || ''; }
      var f = JSON.parse(sessionStorage.getItem('dmj_fp_files') || 'null');
      if(f){
        if(f.file){ attached = f.file; filename.textContent = attached.name; filechip.classList.add('on'); }
        if(f.records){ records = f.records; recname.textContent = records.name; recchip.classList.add('on'); }
      } else if(t && (t.fileName || t.recName)){
        showNotice('Your text is back. Browser storage couldn\'t hold the attachment across checkout — please add the ' + (t.fileName ? 'photo/PDF of the denial' : 'records file') + ' again, then click Rebuild.');
      }
    }catch(e){}
  }
  function clearStash(){ try{ sessionStorage.removeItem('dmj_fp_text'); sessionStorage.removeItem('dmj_fp_files'); }catch(e){} }

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
  hookFile(attachBtn, fileInput, filechip, filename, fileclear, function(v){ attached = v; });
  hookFile(attachRec, recInput, recchip, recname, recclear, function(v){ records = v; });

  example.addEventListener('click', function(){ denial.value = EXAMPLE_DENIAL; extra.value = EXAMPLE_EXTRA; denial.focus(); });

  // ---------- ui helpers ----------
  function showError(msg){ errbox.textContent = msg; errbox.classList.add('on'); }
  function hideError(){ errbox.classList.remove('on'); }
  function showNotice(msg){ notice.textContent = msg; notice.classList.add('on'); }
  function hideNotice(){ notice.classList.remove('on'); }
  function setStep(n, state){ var el = $('st'+n); el.className = state; el.querySelector('.pic').textContent = state==='done' ? '✓' : state==='doing' ? '' : String(n); }
  function resetSteps(){ for(var i=1;i<=4;i++){ var el=$('st'+i); el.className=''; el.querySelector('.pic').textContent = String(i); } }
  // Which progress step each generator part belongs to (part 1 = decode; 2–3 = letters; 4–5 = scripts; 6 = round two).
  var STEP_OF = { 1:1, 2:2, 3:2, 4:3, 5:3, 6:4 };
  var PART_LABEL = { 2:'Your appeal letter', 3:"Your doctor's letter and the note for the office", 4:'Peer-to-peer brief and the insurer phone script', 5:'Billing-office script and records request', 6:'Round two and your deadlines' };
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
  function inline(s){
    return s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\[([^\[\]]{1,160})\]/g, function(m, inner){ return '<span class="ph">[' + inner + ']</span>'; });
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
  function plain(md){ return md.replace(/\*\*/g,'').replace(/^#{2,4}\s+/gm,'').trim(); }

  // ---------- rendering the kit ----------
  var sectionOrder = [];
  function renderKit(){
    docsEl.innerHTML = '';
    sectionOrder = [];
    // Parts render in kit order; a part that hasn't arrived yet shows a placeholder in its slot.
    [1,2,3,4,5,6].forEach(function(p){
      if(!parts[p]){
        if(p > 1 && building){ var ph = document.createElement('div'); ph.className = 'doc panel'; ph.innerHTML = '<p class="pending">' + escapeHtml(PART_LABEL[p] || 'More') + ' — on the way…</p>'; docsEl.appendChild(ph); }
        return;
      }
      splitSections(parts[p]).forEach(function(sec){
        var tag = /medical necessity|emergency attestation/i.test(sec.title) ? 'For your doctor' : /corrected-claim/i.test(sec.title) ? 'For the billing office' : /coverage facts/i.test(sec.title) ? 'For HR / benefits' : '';
        var isStar = !!tag;
        // Documents a person sends (letters and requests) render on paper; the decode, scripts and notes stay on the dark surface.
        var isPaper = /appeal letter|medical necessity|emergency attestation|records and itemized|external review request|corrected-claim request|coverage facts/i.test(sec.title);
        var card = document.createElement('div');
        card.className = 'doc panel' + (isStar ? ' star' : '') + (isPaper ? ' paper' : '');
        var h = '<div class="doc-top"><h3>' + escapeHtml(sec.title) + (isStar ? '<span class="tag tag-accent">' + tag + '</span>' : '') + '</h3><button class="btn btn-secondary btn-sm copy-btn" type="button">Copy</button></div><div class="doc-body prose">' + renderBody(sec.body) + '</div>';
        card.innerHTML = h;
        var btn = card.querySelector('.copy-btn');
        btn.addEventListener('click', function(){ copyText(plain(sec.title + '\n\n' + sec.body), btn); });
        docsEl.appendChild(card);
        sectionOrder.push(sec);
      });
    });
    kitout.classList.add('on');
  }
  function copyText(text, btn){
    function done(){ if(btn){ var lbl = btn.querySelector('span') || btn; var old = lbl.textContent; lbl.textContent = 'Copied'; setTimeout(function(){ lbl.textContent = old; }, 1600); } }
    function fallback(){ var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){} document.body.removeChild(ta); }
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done).catch(fallback); } else { fallback(); }
  }
  $('copyall').addEventListener('click', function(){
    var all = sectionOrder.map(function(s){ return plain(s.title + '\n\n' + s.body); }).join('\n\n\n');
    copyText(all + '\n\n\n' + deadlinesText(), $('copyall'));
  });
  $('printbtn').addEventListener('click', function(){ window.print(); });

  // ---------- fix a detail everywhere ----------
  // A misread member ID or a misspelled name is corrected once and replaced in all ten sections.
  var fixform = $('fixform'), fixbtn = $('fixbtn'), fixfrom = $('fixfrom'), fixto = $('fixto'), fixmsg = $('fixmsg');
  fixbtn.addEventListener('click', function(){
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
    save('dmj_fp_kit', { parts: parts, meta: meta, ts: Date.now() });
    renderKit(); // the deadline tracker keeps whatever the reader has set
    fixmsg.textContent = 'Replaced ' + count + (count === 1 ? ' time' : ' times') + ' across your kit.';
    fixfrom.value = ''; fixto.value = '';
  });
  $('forget').addEventListener('click', function(){ drop('dmj_fp_kit'); drop('dmj_fp_token'); parts = {}; meta = null; kitout.classList.remove('on'); showNotice('Cleared from this browser.'); });

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
  // The case-strength chip comes from the decode (section 1) — the same line the rest of the kit was written from.
  function strengthFromDecode(){
    var m = (parts[1] || '').match(/case strength:?\*{0,2}\s*\*{0,2}\s*"?(strong|good|needs)/i);
    return m ? (m[1].toLowerCase() === 'needs' ? 'needs-evidence' : m[1].toLowerCase()) : null;
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
    var chip = $('strength'), cs = strengthFromDecode() || (meta && meta.case_strength);
    if(cs === 'strong' || cs === 'good' || cs === 'needs-evidence'){
      chip.textContent = 'Case strength: ' + (cs === 'strong' ? 'Strong' : cs === 'good' ? 'Good — one thing missing' : 'Needs evidence');
      chip.className = 'tag ' + (cs === 'strong' ? 'tag-ok' : cs === 'good' ? 'tag-accent' : 'tag-warn');
      chip.style.display = 'inline-flex';
    }
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
  function postJSON(url, body, ms){
    var ctrl = new AbortController();
    var t = setTimeout(function(){ ctrl.abort(); }, ms || 120000);
    return fetch(url, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body), signal: ctrl.signal })
      .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(d){ clearTimeout(t); return { ok: r.ok, status: r.status, data: d }; }); })
      .catch(function(e){ clearTimeout(t); return { ok:false, status:0, data:{ message: e && e.name === 'AbortError' ? 'That took too long — try again.' : 'Connection dropped — try again.' } }; });
  }
  function inputs(){ return { denial: denial.value.trim(), extra: extra.value.trim(), file: attached ? { kind: attached.kind, media_type: attached.media_type, data: attached.data } : null, records: records ? { kind: records.kind, media_type: records.media_type, data: records.data } : null }; }
  function build(tok){
    if(building) return;
    var inp = inputs();
    if(!inp.denial && !inp.file){ showError('Paste the denial letter — or add a photo or PDF of it — then rebuild.'); return; }
    building = true; hideError(); hideNotice();
    parts = {}; meta = null;
    resetSteps(); progress.classList.add('on'); kitout.classList.remove('on');
    progress.scrollIntoView({ behavior:'smooth', block:'start' });
    buy.disabled = true;
    var done = {};
    refreshSteps(done);
    // One part: ask, retry once on a transient server error, retry once if a section came back missing.
    function fetchPart(p, extraBody){
      function ask(){ return postJSON('/api/fightpack', Object.assign({ token: tok, part: p }, inp, extraBody || {})); }
      return ask().then(function(res){
        if(!res.ok && (res.status === 0 || res.status >= 500)){
          return new Promise(function(r){ setTimeout(r, 1500); }).then(ask);
        }
        // a free token that has done its share of kits: get a fresh one once, then ask again
        if(!res.ok && res.status === 401 && free){
          return renewFree().then(function(t2){ tok = t2; return ask(); });
        }
        return res;
      }).then(function(res){
        if(res.ok && res.data.missing && res.data.missing.length){
          return ask().then(function(res2){
            if(res2.ok && (!res2.data.missing || res2.data.missing.length < res.data.missing.length)) return res2;
            return res;
          });
        }
        return res;
      }).then(function(res){
        if(!res.ok){ throw new Error(res.data.message || 'Something went wrong building ' + (PART_LABEL[p] || 'part ' + p).toLowerCase() + '.'); }
        var text = res.data.text || '';
        if(p === 6){ var ex = extractJson(text); text = ex.text; meta = ex.json; }
        parts[p] = text; done[p] = true;
        refreshSteps(done);
        renderKit();
        if(p === 6 || (p === 1 && !meta)) applyMeta();
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
      progress.classList.remove('on');
      renderKit();
      save('dmj_fp_kit', { parts: parts, meta: meta, ts: Date.now() });
      clearStash();
      if(failures.length){ showError('Most of your kit is below, but these sections did not finish: ' + failures.join('; ') + '. ' + tryAgain()); }
      kitout.scrollIntoView({ behavior:'smooth', block:'start' });
    }).catch(function(e){
      building = false; buy.disabled = false;
      progress.classList.remove('on');
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
  // Paid mode (free:false from the server) restores the checkout copy.
  function applyMode(){
    if(free) return;
    $('eyebrow').textContent = 'One denial · built by a practicing physician';
    $('codelink').hidden = false;
    if(!haveToken()){ buy.textContent = 'Get my Fight Pack'; $('pricenote').textContent = 'One-time. Use it for this denial as often as you need for 3 days.'; }
    refreshBuyLabel();
  }

  $('regen').addEventListener('click', function(){
    if(free){ hideError(); freeToken().then(function(t){ build(t); }).catch(function(e){ showError(e.message); }); return; }
    if(!haveToken()){ showError('Your 3-day unlock has ended. Get a new Fight Pack for a new denial.'); $('tool').scrollIntoView({behavior:'smooth'}); return; }
    build(token);
  });

  // ---------- unlock paths ----------
  function unlockWith(body){
    hideError();
    return postJSON('/api/unlock', body, 30000).then(function(res){
      if(!res.ok){ throw new Error(res.data.message || 'Could not unlock.'); }
      keepToken(res.data.token);
      return res.data.token;
    });
  }
  $('havecode').addEventListener('click', function(){
    if(haveToken()){ build(token); return; }
    var code = window.prompt('Enter your code:');
    if(!code) return;
    unlockWith({ code: code.trim() }).then(function(tok){ build(tok); }).catch(function(e){ showError(e.message); });
  });

  buy.addEventListener('click', function(){
    hideError();
    var inp = inputs();
    if(free){
      if(!inp.denial && !inp.file){ showError('Paste the denial letter — or add a photo or PDF of it — first.'); denial.focus(); return; }
      buy.disabled = true;
      freeToken().then(function(t){ buy.disabled = false; build(t); }).catch(function(e){ buy.disabled = false; showError(e.message); });
      return;
    }
    if(!inp.denial && !inp.file){ showError('Paste the denial letter — or add a photo or PDF of it — first, so your kit is ready the moment you\'re back from checkout.'); denial.focus(); return; }
    if(haveToken()){ build(token); return; }
    if(configured === false){ wait.classList.add('on'); wait.scrollIntoView({behavior:'smooth', block:'center'}); return; }
    buy.disabled = true; buy.textContent = 'Opening secure checkout…';
    stashInputs();
    postJSON('/api/checkout', {}, 30000).then(function(res){
      if(res.ok && res.data.url){ location.href = res.data.url; return; }
      buy.disabled = false; buy.textContent = 'Get my Fight Pack';
      if(res.status === 503){ configured = false; wait.classList.add('on'); wait.scrollIntoView({behavior:'smooth', block:'center'}); return; }
      showError(res.data.message || "Couldn't start checkout. Try again in a moment.");
    });
  });

  // waitlist (fallback)
  var leadform = $('leadform'), leademail = $('leademail'), leadbtn = $('leadbtn'), leadmsg = $('leadmsg');
  leadform.addEventListener('submit', function(ev){
    ev.preventDefault();
    leadmsg.className = 'wait-msg'; leadbtn.disabled = true; leadbtn.textContent = 'Saving…';
    postJSON('/api/lead', { email: leademail.value, fighting: 'denied-claim' }, 20000).then(function(res){
      leadbtn.disabled = false; leadbtn.textContent = 'Reserve the founding price';
      leadmsg.className = 'wait-msg ' + (res.ok ? 'ok' : 'err');
      leadmsg.textContent = (res.data && res.data.message) || (res.ok ? "You're on the list." : "Couldn't save your spot — try again in a minute.");
      if(res.ok) leadform.reset();
    });
  });

  // ---------- boot ----------
  (function boot(){
    var q; try{ q = new URLSearchParams(location.search); }catch(e){ q = null; }
    var sid = q && q.get('session_id');
    var canceled = q && q.get('canceled');
    if(sid || canceled){ restoreInputs(); try{ history.replaceState(null, '', '/fightpack'); }catch(e){} }
    if(canceled){ showNotice('No charge was made. Your text is still here whenever you\'re ready.'); }

    refreshBuyLabel();
    fetch('/api/checkout', { method:'GET' }).then(function(r){ return r.json(); }).then(function(d){ configured = !!d.configured; free = d.free !== false; applyMode(); if(!free && !configured && !sid && !haveToken()){ $('pricenote').textContent = 'Launching shortly — reserve the founding price below.'; } }).catch(function(){ configured = null; });

    if(sid){
      showNotice('Payment received — unlocking your kit…');
      unlockWith({ session_id: sid }).then(function(tok){ hideNotice(); build(tok); }).catch(function(e){
        showError('Payment went through but the unlock didn\'t: ' + e.message + ' Reload this page to try again; if it keeps failing, your Stripe receipt has the seller\'s contact details.');
      });
      return;
    }
    var saved = load('dmj_fp_kit');
    if(saved && saved.parts && saved.ts && Date.now() - saved.ts < 72*3600*1000){
      parts = saved.parts; meta = saved.meta || null; renderKit(); applyMeta();
      showNotice('Here\'s the Fight Pack you built ' + new Date(saved.ts).toLocaleDateString('en-US', {month:'short', day:'numeric'}) + '. Edit your text and click "Rebuild with edits" to regenerate.');
    }
  })();
})();
