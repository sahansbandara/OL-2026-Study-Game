/* ==========================================================
   O/L 2026 Study Game — shared game engine
   XP, levels, streak, badges, done-tracking, reveal, flip cards,
   quizzes. Progress lives in localStorage on this computer only.
   ========================================================== */
(function () {
  'use strict';

  var KEY = 'ol2026-game-v1';

  var SUBJECTS = {
    buddhism:   { name: 'බුද්ධ ධර්මය',            icon: '☸️', code: '11', exam: '2026-12-08T08:30' },
    sinhala:    { name: 'සිංහල භාෂාව හා සාහිත්‍යය', icon: 'අ',  code: '21', exam: '2026-12-09T08:30' },
    history:    { name: 'ඉතිහාසය',                icon: '🏰', code: '33', exam: '2026-12-10T08:30' },
    english:    { name: 'English',                icon: '🔤', code: '31', exam: '2026-12-11T08:30' },
    literature: { name: 'සිංහල සාහිත්‍ය රසාස්වාදය',  icon: '📜', code: '47', exam: '2026-12-12T13:00' },
    maths:      { name: 'ගණිතය',                  icon: '➗', code: '32', exam: '2026-12-14T08:30' },
    health:     { name: 'සෞඛ්‍ය හා ශාරීරික අධ්‍යාපනය', icon: '🏃', code: '86', exam: '2026-12-15T08:30' },
    science:    { name: 'විද්‍යාව',                 icon: '🔬', code: '34', exam: '2026-12-16T08:30' },
    civic:      { name: 'පුරවැසි අධ්‍යාපනය',         icon: '🤝', code: '62', exam: '2026-12-17T08:30' }
  };

  var PAGES = {
    exam: 'විභාග ව්‍යුහය', theory: 'පාඩම්', memory: 'මතක උපක්‍රම', past: 'පසුගිය ප්‍රශ්න',
    howto: 'පිළිතුරු ලියන හැටි', target: 'ඉලක්ක ප්‍රශ්න', sheet: 'අවසාන රාත්‍රී සටහන',
    quiz: 'Boss Quiz', resources: 'සම්පත්'
  };
  if (document.body && document.body.getAttribute('data-subject') === 'english') PAGES = {
    exam: 'Exam format', theory: 'Lessons', memory: 'Memory tricks', past: 'Past papers',
    howto: 'How to answer', target: 'Target questions', sheet: 'Last-night sheet', quiz: 'Boss Quiz', resources: 'Resources'
  };

  var BADGES = [
    { id: 'first',    icon: '🌱', name: 'පළමු පියවර',   desc: 'පළමු XP ලබා ගත්තා', test: function (s) { return s.xp > 0; } },
    { id: 'xp250',    icon: '⭐', name: 'තරුව',         desc: 'XP 250 ක්', test: function (s) { return s.xp >= 250; } },
    { id: 'xp1000',   icon: '🌟', name: 'සුපිරි තරුව',   desc: 'XP 1000 ක්', test: function (s) { return s.xp >= 1000; } },
    { id: 'xp3000',   icon: '👑', name: 'විභාග රැජින',  desc: 'XP 3000 ක්', test: function (s) { return s.xp >= 3000; } },
    { id: 'streak3',  icon: '🔥', name: 'දින 3 ගින්න',   desc: 'දින 3ක් දිගටම පාඩම්', test: function (s) { return s.streak.best >= 3; } },
    { id: 'streak7',  icon: '🚀', name: 'සතියේ වීරයා',   desc: 'දින 7ක් දිගටම පාඩම්', test: function (s) { return s.streak.best >= 7; } },
    { id: 'quiz3',    icon: '🏆', name: 'තරු තුනයි!',    desc: 'Quiz එකකින් ★★★', test: function (s) { return Object.keys(s.quiz).some(function (k) { return s.quiz[k].stars >= 3; }); } },
    { id: 'focus5',   icon: '⏱️', name: 'ෆෝකස් මාස්ටර්', desc: 'Focus sessions 5ක්', test: function (s) { return (s.focus || 0) >= 5; } }
  ];

  /* ---------- storage ---------- */
  function blank() { return { xp: 0, done: {}, reg: {}, quiz: {}, badges: {}, streak: { last: '', count: 0, best: 0 }, focus: 0 }; }
  var state;
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)) || blank(); } catch (e) { state = blank(); }
    var b = blank();
    for (var k in b) if (state[k] === undefined) state[k] = b[k];
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {} }
  load();

  /* ---------- levels ---------- */
  // level n needs 60*n*(n+1)/2 XP total: 0,60,180,360,600,900...
  function levelOf(xp) { var n = 0; while (60 * (n + 1) * (n + 2) / 2 <= xp) n++; return n + 1; }
  function levelFloor(l) { return 60 * (l - 1) * l / 2; }
  var TITLES = ['ආධුනිකයා', 'ශිෂ්‍යයා', 'ගවේෂකයා', 'දක්ෂයා', 'ශූරයා', 'වීරයා', 'මාස්ටර්', 'ප්‍රාඥයා', 'ජයග්‍රාහකයා', 'A-Pass රැජින'];
  function titleOf(l) { return TITLES[Math.min(l - 1, TITLES.length - 1)]; }

  /* ---------- day helpers ---------- */
  function dayStr(d) { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function touchStreak() {
    var today = dayStr(), s = state.streak;
    if (s.last === today) return;
    var y = new Date(); y.setDate(y.getDate() - 1);
    s.count = (s.last === dayStr(y)) ? s.count + 1 : 1;
    s.last = today; s.best = Math.max(s.best, s.count);
    save();
  }

  /* ---------- toast & confetti ---------- */
  var toastBox;
  function toast(msg, gold) {
    if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; toastBox.setAttribute('aria-live', 'polite'); document.body.appendChild(toastBox); }
    var t = document.createElement('div'); t.className = 'toast' + (gold ? ' gold' : ''); t.textContent = msg;
    toastBox.appendChild(t); setTimeout(function () { t.remove(); }, 2700);
  }
  function confetti() {
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var c = document.createElement('canvas'); c.className = 'confetti'; document.body.appendChild(c);
    var ctx = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight;
    var cols = ['#FFC93C', '#FF6B8A', '#2BB673', '#7B5CFF', '#2F7BEF', '#F29E1F'];
    var ps = []; for (var i = 0; i < 140; i++) ps.push({ x: W / 2, y: H * 0.35, vx: (Math.random() - .5) * 14, vy: Math.random() * -14 - 4, s: 5 + Math.random() * 6, c: cols[i % cols.length], r: Math.random() * 6 });
    var t0 = performance.now();
    (function tick(t) {
      ctx.clearRect(0, 0, W, H);
      ps.forEach(function (p) { p.vy += .45; p.x += p.vx; p.y += p.vy; p.r += .2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * .6); ctx.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(tick); else c.remove();
    })(t0);
  }

  /* ---------- XP ---------- */
  function addXP(n, reason) {
    var before = levelOf(state.xp);
    state.xp += n; save();
    toast('+' + n + ' XP' + (reason ? '  ' + reason : ''));
    var after = levelOf(state.xp);
    if (after > before) { setTimeout(function () { toast('🎉 Level ' + after + ' — ' + titleOf(after) + '!', true); confetti(); }, 400); }
    checkBadges(); renderPlayer();
  }
  function checkBadges() {
    BADGES.forEach(function (b) {
      if (!state.badges[b.id] && b.test(state)) { state.badges[b.id] = dayStr(); save(); setTimeout(function () { toast(b.icon + ' නව පදක්කම: ' + b.name, true); }, 900); }
    });
  }
  function markDone(id, xp, reason) {
    if (state.done[id]) return false;
    state.done[id] = dayStr(); save(); addXP(xp || 10, reason); return true;
  }
  function unmarkDone(id, xp) {
    if (!state.done[id]) return;
    delete state.done[id]; state.xp = Math.max(0, state.xp - (xp || 10)); save(); renderPlayer();
  }

  /* ---------- top bar ---------- */
  var body = document.body;
  var ROOT = body.getAttribute('data-root') || './';
  var SUBJ = body.getAttribute('data-subject');
  var PAGE = body.getAttribute('data-page');

  function renderTopbar() {
    var bar = document.createElement('header'); bar.className = 'topbar';
    var crumbs = '<a href="' + ROOT + 'index.html">🗺️ සිතියම</a>';
    if (SUBJ && SUBJECTS[SUBJ]) {
      crumbs += '<span class="sep">›</span><a href="' + ROOT + 'subjects/' + SUBJ + '/index.html">' + SUBJECTS[SUBJ].icon + ' ' + SUBJECTS[SUBJ].name + '</a>';
      var m = PAGE && PAGE.match(/^theory-(\d+)$/);
      if (m) crumbs += '<span class="sep">›</span><a href="theory.html">' + PAGES.theory + '</a><span class="sep">›</span><a href="#" aria-current="page">' + (SUBJ === 'english' ? 'Chapter ' : 'පරිච්ඡේදය ') + m[1] + '</a>';
      else if (PAGE && PAGES[PAGE]) crumbs += '<span class="sep">›</span><a href="#" aria-current="page">' + PAGES[PAGE] + '</a>';
    }
    bar.innerHTML = '<div class="wrap"><nav class="crumbs" aria-label="Breadcrumb">' + crumbs + '</nav>' +
      '<button class="ftimer" id="ftimer" hidden title="Focus timer — නවත්වන්න click කරන්න"><span>⏱️</span><b>25:00</b></button>' +
      '<div class="player" id="player"></div>' +
      '<button class="icon-btn" id="themeBtn" title="Light / dark" aria-label="Light හෝ dark mode">🌓</button></div>';
    bar.insertAdjacentHTML('beforeend', '<div class="fstrip" id="fstrip" hidden><i></i></div>');
    body.insertBefore(bar, body.firstChild);
    document.getElementById('ftimer').onclick = function () { if (confirm('Focus timer එක නවත්වන්නද?')) timer.stop(); };
    document.getElementById('themeBtn').onclick = function () {
      var cur = document.documentElement.getAttribute('data-theme');
      var dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
      var next = dark ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(KEY + '-theme', next); } catch (e) {}
    };
  }
  function renderPlayer() {
    var el = document.getElementById('player'); if (!el) return;
    var l = levelOf(state.xp), lo = levelFloor(l), hi = levelFloor(l + 1);
    var pct = Math.round((state.xp - lo) / (hi - lo) * 100);
    el.innerHTML = '<span class="chip lvl" title="' + titleOf(l) + '">Lv ' + l + '</span>' +
      '<span class="xpbar" title="' + (hi - state.xp) + ' XP to next level"><i style="width:' + pct + '%"></i></span>' +
      '<span class="chip">⚡ ' + state.xp + '</span>' +
      '<span class="chip" title="දිගටම පාඩම් කළ දින">🔥 ' + state.streak.count + '</span>';
    document.querySelectorAll('[data-bind]').forEach(function (n) {
      var k = n.getAttribute('data-bind');
      if (k === 'xp') n.textContent = state.xp;
      if (k === 'level') n.textContent = l;
      if (k === 'title') n.textContent = titleOf(l);
      if (k === 'streak') n.textContent = state.streak.count;
      if (k === 'best') n.textContent = state.streak.best;
      if (k === 'toNext') n.textContent = hi - state.xp;
      if (k === 'lvlPct') n.style.width = pct + '%';
    });
  }
  try { var th = localStorage.getItem(KEY + '-theme'); if (th) document.documentElement.setAttribute('data-theme', th); } catch (e) {}

  /* ---------- page registry (progress per subject/page) ---------- */
  function registerPage() {
    if (!SUBJ || !PAGE) return;
    var ids = [];
    document.querySelectorAll('[data-done]').forEach(function (b) { ids.push(b.getAttribute('data-done')); });
    document.querySelectorAll('[data-quiz]').forEach(function (q) { ids.push('quiz:' + q.getAttribute('data-quiz')); });
    state.reg[SUBJ] = state.reg[SUBJ] || {};
    state.reg[SUBJ][PAGE] = ids; save();
  }
  function progressOf(subj, page) {
    var reg = (state.reg[subj] || {}), tot = 0, done = 0;
    var pages = Object.keys(reg).filter(function (p) { return !page || p === page || p.indexOf(page + '-') === 0; });
    pages.forEach(function (p) { (reg[p] || []).forEach(function (id) { tot++; if (isDone(id)) done++; }); });
    return { done: done, total: tot, pct: tot ? Math.round(done / tot * 100) : 0 };
  }
  function isDone(id) {
    if (id.indexOf('quiz:') === 0) { var q = state.quiz[id.slice(5)]; return !!(q && q.stars >= 1); }
    return !!state.done[id];
  }

  /* ---------- interactive bits ---------- */
  function wireDone() {
    document.querySelectorAll('[data-done]').forEach(function (b) {
      var id = b.getAttribute('data-done'), xp = +(b.getAttribute('data-xp') || 10);
      b.classList.add('btn', 'done-btn');
      var label = b.textContent.trim() || 'ඉගෙන ගත්තා';
      function paint() {
        var d = !!state.done[id];
        b.classList.toggle('is-done', d); b.setAttribute('aria-pressed', d);
        b.textContent = d ? ' ' + label + ' — හරි!' : label + '  (+' + xp + ' XP)';
        var link = document.querySelector('.toc a[href="#' + (b.closest('[id]') || {}).id + '"]');
        if (link) link.classList.toggle('is-done', d);
      }
      paint();
      b.addEventListener('click', function () {
        if (state.done[id]) { unmarkDone(id, xp); } else { markDone(id, xp, '✓'); }
        paint(); updateLevelPaths();
      });
    });
  }
  function wireReveal() {
    document.querySelectorAll('[data-reveal]').forEach(function (b) {
      var id = b.getAttribute('data-reveal');
      var ans = b.parentElement.querySelector('.answer') || b.nextElementSibling;
      b.addEventListener('click', function () {
        var open = ans.classList.toggle('show');
        b.textContent = open ? '🙈 පිළිතුර සඟවන්න' : '👀 පිළිතුර බලන්න';
        if (open && id && !state.done['rv:' + id]) { state.done['rv:' + id] = dayStr(); save(); addXP(5, 'පිළිතුර බැලුවා'); }
      });
    });
  }
  function wireFlips() {
    document.querySelectorAll('.flip').forEach(function (f) {
      f.setAttribute('aria-pressed', 'false');
      f.addEventListener('click', function () {
        var on = f.classList.toggle('on'); f.setAttribute('aria-pressed', on);
        var id = f.getAttribute('data-id');
        if (on && id && !state.done['fl:' + id]) { state.done['fl:' + id] = dayStr(); save(); addXP(2); }
      });
    });
  }

  /* ---------- quiz engine ---------- */
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function Quiz(el) {
    var id = el.getAttribute('data-quiz');
    var src = document.getElementById(el.getAttribute('data-src'));
    var bank = JSON.parse(src.textContent);
    var count = +(el.getAttribute('data-count') || bank.length);
    var lives = +(el.getAttribute('data-lives') || 3);
    var qs, i, score, hearts, combo, bestCombo;

    function start() {
      qs = shuffle(bank).slice(0, Math.min(count, bank.length));
      i = 0; score = 0; hearts = lives; combo = 0; bestCombo = 0; show();
    }
    function hud() {
      var h = ''; for (var k = 0; k < lives; k++) h += k < hearts ? '❤️' : '🤍';
      return '<div class="quiz-hud"><span>ප්‍රශ්නය ' + (i + 1) + ' / ' + qs.length + '</span>' +
        '<span class="combo">' + (combo >= 2 ? '🔥 combo x' + combo : '') + '</span>' +
        '<span class="hearts" aria-label="ජීවිත ' + hearts + '">' + h + '</span></div>' +
        '<div class="qprog"><i style="width:' + Math.round(i / qs.length * 100) + '%"></i></div>';
    }
    function show() {
      var q = qs[i];
      var html = hud() + '<div class="qtext">' + q.q + '</div><div class="opts">';
      q.o.forEach(function (o, k) { html += '<button class="opt" data-k="' + k + '"><span class="n">' + (k + 1) + '</span><span>' + o + '</span></button>'; });
      html += '</div><div class="after"></div>';
      el.innerHTML = html;
      el.querySelectorAll('.opt').forEach(function (b) { b.onclick = function () { pick(+b.getAttribute('data-k')); }; });
    }
    function pick(k) {
      var q = qs[i], ok = k === q.a;
      el.querySelectorAll('.opt').forEach(function (b, n) { b.disabled = true; if (n === q.a) b.classList.add('right'); if (n === k && !ok) b.classList.add('wrong'); });
      if (ok) { score++; combo++; bestCombo = Math.max(bestCombo, combo); } else { combo = 0; hearts--; }
      var hs = el.querySelector('.hearts'), hh = '';
      for (var k = 0; k < lives; k++) hh += k < hearts ? '❤️' : '🤍';
      if (hs) hs.textContent = hh;
      var cb = el.querySelector('.combo'); if (cb) cb.textContent = combo >= 2 ? '🔥 combo x' + combo : '';
      var last = i === qs.length - 1 || hearts <= 0;
      el.querySelector('.after').innerHTML =
        '<div class="explain"><strong>' + (ok ? '✅ නියමයි! ' : '❌ නිවැරදි පිළිතුර: ' + (q.a + 1) + '. ') + '</strong>' + (q.e || '') + '</div>' +
        '<p style="margin-top:14px"><button class="btn">' + (last ? 'ප්‍රතිඵලය බලන්න 🏁' : 'ඊළඟ ප්‍රශ්නය ➜') + '</button></p>';
      var nb = el.querySelector('.after .btn'); nb.focus();
      nb.onclick = function () { if (last) end(); else { i++; show(); } };
    }
    function end() {
      var pct = Math.round(score / qs.length * 100);
      var stars = hearts <= 0 ? 0 : pct >= 90 ? 3 : pct >= 70 ? 2 : pct >= 50 ? 1 : 0;
      var prev = state.quiz[id] || { stars: 0, best: 0 };
      var gain = score * 5 + (stars - prev.stars > 0 ? (stars - prev.stars) * 20 : 0);
      state.quiz[id] = { stars: Math.max(prev.stars, stars), best: Math.max(prev.best, pct), last: dayStr() }; save();
      var st = ''; for (var s = 0; s < 3; s++) st += s < stars ? '⭐' : '<span class="off">⭐</span>';
      var msg = hearts <= 0 ? 'ජීවිත ඉවරයි 💔 — ආයෙත් උත්සාහ කරමු, ඔයාට පුළුවන්!' :
        stars === 3 ? 'නියමයි! ඔයා මේ කොටසේ ශූරයෙක් 🏆' : stars === 2 ? 'හොඳයි! තව ටිකයි ★★★ ගන්න' : stars === 1 ? 'පාස්! වැරදුණු ඒවා ආයේ බලමු' : 'තව ටිකක් පාඩම් කරලා ආයේ එමු 💪';
      el.innerHTML = '<div class="quiz-end"><div class="stars">' + st + '</div><h3>' + score + ' / ' + qs.length + ' (' + pct + '%)</h3>' +
        '<p>' + msg + '</p><p class="muted">හොඳම combo: ' + bestCombo + ' · හොඳම ලකුණු: ' + state.quiz[id].best + '%</p>' +
        '<p><button class="btn">🔁 ආයෙත් සෙල්ලම් කරන්න</button></p></div>';
      el.querySelector('.btn').onclick = start;
      if (gain) addXP(gain, 'Quiz');
      if (stars === 3) confetti();
      updateLevelPaths();
    }
    var intro = el.innerHTML;
    var info = state.quiz[id];
    el.innerHTML = (intro.trim() ? intro : '') + '<div class="quiz-end"><div class="stars">' +
      [0, 1, 2].map(function (s) { return info && s < info.stars ? '⭐' : '<span class="off">⭐</span>'; }).join('') +
      '</div><p>ප්‍රශ්න ' + Math.min(count, bank.length) + ' · ❤️ ජීවිත ' + lives + ' · නිවැරදි එකකට +5 XP</p>' +
      (info ? '<p class="muted">හොඳම ලකුණු: ' + info.best + '%</p>' : '') +
      '<p><button class="btn">▶️ Quiz එක පටන් ගන්න</button></p></div>';
    el.querySelector('.quiz-end .btn').onclick = start;
  }

  /* ---------- level path progress (subject home) ---------- */
  function updateLevelPaths() {
    document.querySelectorAll('.level[data-page-id]').forEach(function (a) {
      var p = progressOf(a.getAttribute('data-subj') || SUBJ, a.getAttribute('data-page-id'));
      var bar = a.querySelector('.prog i'); if (bar) bar.style.width = p.pct + '%';
      var t = a.querySelector('.pct'); if (t) t.textContent = p.total ? p.done + '/' + p.total : 'නොබැලූ';
      a.classList.toggle('complete', p.total > 0 && p.done === p.total);
    });
    document.querySelectorAll('[data-subj-progress]').forEach(function (n) {
      var p = progressOf(n.getAttribute('data-subj-progress'));
      var bar = n.querySelector('i'); if (bar) bar.style.width = p.pct + '%';
      var t = n.parentElement.querySelector('.pct'); if (t) t.textContent = p.pct + '%';
    });
  }


  /* ---------- focus timer (global: shows in top bar on every page) ---------- */
  var TK = KEY + '-timer', TLEN = 25 * 60000, tiv = null, tSubs = [];
  function tEnd() { try { return +localStorage.getItem(TK) || 0; } catch (e) { return 0; } }
  function tSet(v) { try { v ? localStorage.setItem(TK, v) : localStorage.removeItem(TK); } catch (e) {} }
  function fmt(ms) { var m = Math.floor(ms / 60000), s = Math.floor(ms % 60000 / 1000); return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }
  function tTick() {
    var e = tEnd(), left = e ? e - Date.now() : 0, chip = document.getElementById('ftimer'), strip = document.getElementById('fstrip');
    if (e && left <= 0) {
      tSet(0); clearInterval(tiv); tiv = null;
      state.focus = (state.focus || 0) + 1; save(); addXP(30, 'Focus session ⏱️'); confetti(); checkBadges();
      toast('⏰ විනාඩි 25 ඉවරයි! දැන් විනාඩි 5ක් විවේක ගන්න ☕');
      document.title = '✅ ' + document.title.replace(/^⏱️ \S+ · /, '');
      tSubs.forEach(function (f) { f('done', 0); }); left = 0; e = 0;
    }
    if (chip) {
      chip.hidden = !e;
      if (e) { chip.querySelector('b').textContent = fmt(left); chip.classList.toggle('urgent', left < 60000); }
    }
    if (strip) { strip.hidden = !e; if (e) strip.querySelector('i').style.width = (100 - left / TLEN * 100).toFixed(2) + '%'; }
    var base = document.title.replace(/^(⏱️ \S+ · |✅ )/, '');
    if (e) document.title = '⏱️ ' + fmt(left) + ' · ' + base;
    tSubs.forEach(function (f) { f(e ? 'run' : 'idle', left); });
    if (!e && tiv) { clearInterval(tiv); tiv = null; }
  }
  function tLoop() { if (!tiv) tiv = setInterval(tTick, 1000); tTick(); }
  var timer = {
    running: function () { return !!tEnd(); },
    start: function () { tSet(Date.now() + TLEN); tLoop(); },
    stop: function () { tSet(0); document.title = document.title.replace(/^⏱️ \S+ · /, ''); tTick(); },
    onTick: function (f) { tSubs.push(f); tTick(); }
  };
  window.addEventListener('storage', function (ev) { if (ev.key === TK) tLoop(); });

  /* ---------- public API ---------- */
  window.OL = {
    SUBJECTS: SUBJECTS, BADGES: BADGES, state: function () { return state; }, save: save,
    addXP: addXP, toast: toast, timer: timer, confetti: confetti, progressOf: progressOf,
    levelOf: levelOf, titleOf: titleOf, dayStr: dayStr, refresh: function () { renderPlayer(); updateLevelPaths(); },
    reset: function () { if (confirm('සියලු progress මකන්නද? මෙය ආපසු ගත නොහැක.')) { state = blank(); save(); location.reload(); } }
  };

  /* ---------- boot ---------- */
  function boot() {
    renderTopbar(); touchStreak(); registerPage();
    wireDone(); wireReveal(); wireFlips();
    document.querySelectorAll('[data-quiz]').forEach(function (q) { new Quiz(q); });
    renderPlayer(); updateLevelPaths(); checkBadges();
    if (tEnd()) tLoop();
    var on = document.querySelector('.tabs a[data-p="' + PAGE + '"]'); if (on) on.classList.add('on');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
