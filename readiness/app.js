/* Avero Government AI Readiness Self-Diagnostic. Static, no framework, no backend. */
(function () {
  var PORTAL = '24211389';
  var FORM = '5b80993b-caef-4735-88ea-f95fca9538ba'; // existing Start at Zero form (same as Chapter 1)
  var KEY = 'avero_readiness_v1';
  var $ = function (id) { return document.getElementById(id); };
  var cfg, state, screen = 0;
  var params = new URLSearchParams(location.search);

  function track(name, data) {
    var ev = Object.assign({ event: 'readiness_' + name }, data || {});
    (window.dataLayer = window.dataLayer || []).push(ev);
  }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }

  function utm() {
    var o = {}; ['utm_source','utm_medium','utm_campaign','utm_content','utm_term'].forEach(function (k) { if (params.get(k)) o[k] = params.get(k); });
    return o;
  }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40); }
  function newTeamCode() { return Math.random().toString(36).slice(2, 8); }

  function show(id) {
    ['sLanding','sIntro','sDomain','sGate','sResults'].forEach(function (s) { $(s).classList.toggle('hidden', s !== id); });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function fillSelect(el, items, val) {
    el.innerHTML = '<option value="">Select one</option>' + items.map(function (x) { return '<option' + (x === val ? ' selected' : '') + '>' + x + '</option>'; }).join('');
  }

  function renderDomain() {
    var d = cfg.domains[screen];
    $('dCount').textContent = 'Domain ' + (screen + 1) + ' of 5';
    $('dStep').textContent = 'Step ' + (screen + 2) + ' of 7';
    $('dBar').style.width = ((screen + 1) / 6 * 100) + '%';
    $('dName').textContent = d.name;
    var html = '';
    d.questions.forEach(function (q, qi) {
      var n = screen * 4 + qi;
      html += '<fieldset class="q-block"><legend>' + (n + 1) + '. ' + q + '</legend><div class="scale">';
      cfg.scale.forEach(function (s) {
        var id = 'q' + n + '_' + s.value;
        html += '<input type="radio" name="q' + n + '" id="' + id + '" value="' + s.value + '"' + (state.answers[n] === s.value ? ' checked' : '') + ' />' +
          '<label for="' + id + '"><b>' + s.value + '</b>' + s.label + '</label>';
      });
      html += '</div></fieldset>';
    });
    $('dQuestions').innerHTML = html;
    $('dQuestions').querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('change', function () { state.answers[+inp.name.slice(1)] = +inp.value; save(); });
    });
    $('domErr').classList.add('hidden');
    show('sDomain');
    track('screen', { screen: 'domain_' + d.key });
  }

  function domainDone() {
    for (var i = 0; i < 4; i++) if (typeof state.answers[screen * 4 + i] !== 'number') return false;
    return true;
  }

  // Result code: lets teammates compare without a backend. Format AVR1.team.roleIndex.d1.d2.d3.d4.d5
  function resultCode(r) {
    return ['AVR1', state.team || '-', cfg.intro.roles.indexOf(state.intro.role), r.domains.map(function (d) { return d.score; }).join('.')].join('.');
  }
  function parseCode(s) {
    var m = String(s).match(/AVR1\.([a-z0-9-]+)\.(-?\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)\.(\d+)/i);
    if (!m) return null;
    var ds = m.slice(3, 8).map(Number);
    if (ds.some(function (v) { return v > 16; })) return null;
    return { team: m[1], role: cfg.intro.roles[+m[2]] || 'Other', domains: ds };
  }

  function renderResults() {
    var r = AveroReadiness.score(cfg, state.answers);
    $('rStageN').textContent = 'Stage ' + r.stage.n + ' of 5';
    $('rStageName').textContent = r.stage.name;
    $('rStageDesc').textContent = r.stage.desc;
    $('rTotal').textContent = r.total;
    $('rCap').textContent = r.capped ? 'Your total points to Stage ' + r.provisionalStage + ', but your weakest domain holds you to Stage ' + r.stage.n + '. A stage can be at most one above your weakest domain.' : '';
    var prior = (state.history || []).filter(function (h) { return h.date !== state.completedAt; }).slice(-1)[0];
    $('rPrior').textContent = prior ? 'Previous result (' + prior.date.slice(0, 10) + '): Stage ' + prior.stage + ', ' + prior.total + ' / 80.' : '';
    var bars = '';
    r.domains.forEach(function (d) {
      bars += '<div class="bar-row' + (d.key === r.weakest.key ? ' weak' : '') + '"><span>' + d.name + '</span><div class="bar-track"><div class="bar-fill" style="width:' + (d.score / 16 * 100) + '%"></div></div><span class="v">' + d.score + '/16</span></div>';
    });
    $('rBars').innerHTML = bars;
    $('rBars').setAttribute('aria-label', r.domains.map(function (d) { return d.name + ' ' + d.score + ' of 16'; }).join(', '));
    $('rWeakest').textContent = r.weakest.name;
    // weak domains: below Stage 4 band (under 11 of 16), always include the weakest
    var weak = r.domains.filter(function (d) { return d.score < 11 || d.key === r.weakest.key; });
    $('rMoves').innerHTML = weak.map(function (d) {
      var c = cfg.domains.filter(function (x) { return x.key === d.key; })[0];
      return '<div class="rec"><div class="rec-q">' + d.name + ': ' + d.score + ' of 16</div><ol style="padding-left:20px">' + c.moves.map(function (m) { return '<li>' + m + '</li>'; }).join('') + '</ol></div>';
    }).join('');
    var base = location.origin + location.pathname;
    var orgName = state.contact && state.contact.company;
    $('inviteUrl').value = base + '?team=' + state.team + (orgName ? '&org=' + encodeURIComponent(orgName) : '') + '&utm_source=readiness&utm_medium=team_invite';
    $('myCode').value = resultCode(r);
    show('sResults');
    track('results', { stage: r.stage.n, total: r.total });
  }

  function compare() {
    var lines = ($('compareBox').value + '\n' + $('myCode').value).split(/\s+/).map(parseCode).filter(Boolean);
    var seen = {}; lines = lines.filter(function (l) { var k = l.role + l.domains.join(); if (seen[k]) return false; seen[k] = 1; return true; });
    if (lines.length < 2) { $('compareOut').innerHTML = '<p class="err">Add at least one teammate code.</p>'; return; }
    var names = cfg.domains.map(function (d) { return d.name; });
    var stat = function (arr) { var s = arr.reduce(function (a, b) { return a + b; }, 0); return { avg: (s / arr.length).toFixed(1), min: Math.min.apply(null, arr), max: Math.max.apply(null, arr) }; };
    var h = '<table><thead><tr><th>Domain</th><th>Avg</th><th>Min</th><th>Max</th></tr></thead><tbody>';
    names.forEach(function (n, i) { var s = stat(lines.map(function (l) { return l.domains[i]; })); h += '<tr><td>' + n + '</td><td>' + s.avg + '</td><td>' + s.min + '</td><td>' + s.max + '</td></tr>'; });
    h += '</tbody></table><table><thead><tr><th>Role</th><th>People</th>' + names.map(function (n) { return '<th>' + n.split(' ')[0] + '</th>'; }).join('') + '</tr></thead><tbody>';
    var roles = {}; lines.forEach(function (l) { (roles[l.role] = roles[l.role] || []).push(l); });
    Object.keys(roles).forEach(function (role) {
      var g = roles[role];
      h += '<tr><td>' + role + '</td><td>' + g.length + '</td>' + names.map(function (_, i) { return '<td>' + stat(g.map(function (l) { return l.domains[i]; })).avg + '</td>'; }).join('') + '</tr>';
    });
    h += '</tbody></table><p class="note">' + lines.length + ' responses. Large gaps between min and max point to perception gaps worth discussing.</p>';
    $('compareOut').innerHTML = h;
    track('compare', { n: lines.length });
  }

  function cookie(name) { var m = document.cookie.match('(?:^|; )' + name + '=([^;]*)'); return m ? decodeURIComponent(m[1]) : undefined; }

  function submitGate(e) {
    e.preventDefault();
    var c = { firstname: $('firstname').value.trim(), lastname: $('lastname').value.trim(), email: $('email').value.trim(),
      company: $('company').value.trim(), jobtitle: $('jobtitle').value.trim(), state: $('state').value.trim() };
    var err = $('gateErr'); err.classList.add('hidden');
    var fail = function (m) { err.textContent = m; err.classList.remove('hidden'); };
    if ($('website').value) return; // honeypot
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c.email)) return fail('Please enter a valid work email.');
    if (!c.company) return fail('Please enter your organization.');
    if (!$('consent').checked) return fail('Please agree to be contacted so we can send your results.');
    var last = +(localStorage.getItem(KEY + '_last') || 0);
    if (Date.now() - last < 30000) return fail('Please wait a moment before submitting again.');
    var domain = c.email.split('@')[1].toLowerCase();
    var freeMail = cfg.freeMailDomains.indexOf(domain) !== -1;
    c.freeMailOverride = freeMail; // flag kept with the local record for review

    var all = ['firstname','lastname','email','company','jobtitle','state'].filter(function (k) { return c[k]; })
      .map(function (k) { return { objectTypeId: '0-1', name: k, value: c[k] }; });
    var core = all.filter(function (f) { return ['firstname','lastname','email'].indexOf(f.name) !== -1; });
    var body = function (fields) {
      return JSON.stringify({ fields: fields, context: { hutk: cookie('hubspotutk'), pageUri: location.href, pageName: 'AI Readiness Self-Diagnostic' },
        legalConsentOptions: { consent: { consentToProcess: true, text: 'I agree that Avero may contact me about my results and related services.' } } });
    };
    var url = 'https://api.hsforms.com/submissions/v3/integration/submit/' + PORTAL + '/' + FORM;
    var post = function (fields) { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body(fields) }); };
    var btn = $('gateSubmit'); btn.disabled = true; btn.textContent = 'Sending...';
    post(all).then(function (res) {
      // If the existing form rejects fields it does not include, resend with its own fields only.
      if (res.status === 400 && all.length > core.length) return post(core);
      return res;
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      localStorage.setItem(KEY + '_last', String(Date.now()));
      var r = AveroReadiness.score(cfg, state.answers);
      state.contact = c; state.talk = $('talk').checked; state.unlocked = true;
      state.completedAt = new Date().toISOString();
      state.history = (state.history || []).concat([{ date: state.completedAt, stage: r.stage.n, total: r.total, version: cfg.version }]);
      save();
      track('gate_submit', { talk: state.talk, free_mail: freeMail });
      renderResults();
    }).catch(function () {
      fail('We could not send your details. Please check your connection and try again.');
    }).then(function () { btn.disabled = false; btn.textContent = 'Show my results'; });
  }

  function init(c) {
    cfg = c; $('ver').textContent = cfg.version;
    state = load();
    state.answers = state.answers || [];
    state.intro = state.intro || {};
    state.utm = Object.keys(utm()).length ? utm() : (state.utm || {});
    var team = params.get('team');
    if (team && /^[a-z0-9-]{3,40}$/i.test(team)) state.team = team.toLowerCase();
    if (!state.team) state.team = newTeamCode();
    var org = params.get('org');
    if (org) { state.orgInvite = org.slice(0, 120); }
    save();
    if (team) {
      var tb = $('teamBanner'); tb.classList.remove('hidden');
      tb.textContent = 'You were invited to take this with your team' + (state.orgInvite ? ' at ' + state.orgInvite : '') + '. Your teammate can compare results when you share your result code at the end.';
    }
    fillSelect($('orgType'), cfg.intro.orgTypes, state.intro.orgType);
    fillSelect($('orgSize'), cfg.intro.sizes, state.intro.size);
    fillSelect($('role'), cfg.intro.roles, state.intro.role);
    if (state.contact) ['firstname','lastname','email','company','jobtitle','state'].forEach(function (k) { if (state.contact[k]) $(k).value = state.contact[k]; });
    else if (state.orgInvite) $('company').value = state.orgInvite;

    $('startBtn').onclick = function () { track('start'); show('sIntro'); };
    document.querySelectorAll('[data-go="landing"]').forEach(function (b) { b.onclick = function () { show('sLanding'); }; });
    $('introNext').onclick = function () {
      state.intro = { orgType: $('orgType').value, size: $('orgSize').value, role: $('role').value }; save();
      if (!state.intro.orgType || !state.intro.size || !state.intro.role) { $('introErr').classList.remove('hidden'); return; }
      $('introErr').classList.add('hidden'); screen = 0; renderDomain();
    };
    $('domBack').onclick = function () { if (screen === 0) show('sIntro'); else { screen--; renderDomain(); } };
    $('domNext').onclick = function () {
      if (!domainDone()) { $('domErr').classList.remove('hidden'); return; }
      if (screen < 4) { screen++; renderDomain(); } else { track('screen', { screen: 'gate' }); show('sGate'); }
    };
    $('gateBack').onclick = function () { screen = 4; renderDomain(); };
    $('email').addEventListener('blur', function () {
      var d = ($('email').value.split('@')[1] || '').toLowerCase();
      $('emailWarn').classList.toggle('hidden', cfg.freeMailDomains.indexOf(d) === -1);
    });
    $('gateForm').addEventListener('submit', submitGate);
    $('copyInvite').onclick = function () { navigator.clipboard && navigator.clipboard.writeText($('inviteUrl').value); track('cta', { cta: 'invite_copy' }); };
    $('copyCode').onclick = function () { navigator.clipboard && navigator.clipboard.writeText($('myCode').value); };
    $('compareBtn').onclick = compare;
    $('bookBtn').onclick = function () { track('cta', { cta: 'book_readout' }); };
    $('retakeBtn').onclick = function () { state.answers = []; state.unlocked = false; save(); screen = 0; show('sIntro'); };

    // Results only for someone who has already passed the gate in this browser.
    var complete = state.answers.filter(function (v) { return typeof v === 'number'; }).length === 20;
    if (state.unlocked && complete) renderResults();
  }

  fetch('config.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(init);
})();
