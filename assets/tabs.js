/* Sub-page navigation for a subject: tabs at top + next/prev at bottom. */
(function () {
  var LIST = [
    ['index', '🗺️ මට්ටම් සිතියම'],
    ['exam', '📋 විභාග ව්‍යුහය'],
    ['theory', '📖 පාඩම්'],
    ['memory', '🧠 මතක උපක්‍රම'],
    ['past', '📝 පසුගිය ප්‍රශ්න'],
    ['howto', '✍️ පිළිතුරු ලියන හැටි'],
    ['target', '🎯 ඉලක්ක ප්‍රශ්න'],
    ['sheet', '⚡ අවසාන රාත්‍රී සටහන'],
    ['quiz', '👾 Boss Quiz'],
    ['resources', '📁 සම්පත්']
  ];
  if (document.body.getAttribute('data-subject') === 'english') {
    var EN = { index: '🗺️ Level map', exam: '📋 Exam format', theory: '📖 Lessons', memory: '🧠 Memory tricks', past: '📝 Past papers', howto: '✍️ How to answer', target: '🎯 Target questions', sheet: '⚡ Last-night sheet', quiz: '👾 Boss Quiz', resources: '📁 Resources' };
    LIST.forEach(function (x) { x[1] = EN[x[0]] || x[1]; });
  }
  var raw = document.body.getAttribute('data-page') || 'index';
  var page = /^theory-\d+$/.test(raw) ? 'theory' : raw;
  var chapter = /^theory-(\d+)$/.exec(raw);
  var CH_COUNT = +(document.body.getAttribute('data-chapters') || 10);
  var nav = document.getElementById('tabs');
  if (nav) {
    nav.setAttribute('aria-label', 'කොටස්');
    nav.innerHTML = LIST.map(function (p) {
      return '<a href="' + p[0] + '.html"' + (p[0] === page ? ' class="on" aria-current="page"' : '') + '>' + p[1] + '</a>';
    }).join('');
  }
  var i = LIST.findIndex(function (p) { return p[0] === page; });
  var main = document.querySelector('main');
  if (main && chapter) {
    var en = document.body.getAttribute('data-subject') === 'english', CW = en ? 'Chapter ' : 'පරිච්ඡේදය ', n = +chapter[1], cp = document.createElement('div'); cp.className = 'next-prev';
    cp.innerHTML = (n > 1 ? '<a class="btn alt" href="theory-' + (n - 1) + '.html">← ' + CW + (n - 1) + '</a>' : '<a class="btn alt" href="theory.html">← ' + (en ? 'All lessons' : 'පාඩම් ලැයිස්තුව') + '</a>') +
      (n < CH_COUNT ? '<a class="btn" href="theory-' + (n + 1) + '.html">' + CW + (n + 1) + ' →</a>' : '<a class="btn" href="memory.html">🧠 ' + (en ? 'Memory tricks' : 'මතක උපක්‍රම') + ' →</a>');
    main.appendChild(cp);
  } else if (main && i >= 0) {
    var np = document.createElement('div'); np.className = 'next-prev';
    np.innerHTML = (i > 0 ? '<a class="btn alt" href="' + LIST[i - 1][0] + '.html">← ' + LIST[i - 1][1] + '</a>' : '<span></span>') +
      (i < LIST.length - 1 ? '<a class="btn" href="' + LIST[i + 1][0] + '.html">' + LIST[i + 1][1] + ' →</a>' : '');
    main.appendChild(np);
  }
})();
