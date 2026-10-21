(function () {
  'use strict';

  var TEXT = {
    en: {
      title: 'Sudoku',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard',
      mistakes: 'Mistakes',
      time: 'Time',
      best: 'Best',
      hint: 'Pick a cell, then a number. The timer starts with your first move.',
      win: 'Solved in {t}',
      newBest: 'New best: {t}',
      reset: 'Reset',
      records: 'Records',
      clear: 'Clear',
      empty: 'No records for this level yet.',
      local: 'Records are saved only in this browser.',
      confirmClear: 'Clear all {level} records?',
      light: 'Light',
      dark: 'Dark',
      mistakeCount: '{n} mistakes',
      oneMistake: '1 mistake',
      copyright: '© 2026 Albert Huang. Released under the MIT License.',
      other: 'Schulte Grid',
      gomoku: 'Gomoku',
      lit: 'Research: Sudoku and the prefrontal cortex',
      refs: 'References'
    },
    zh: {
      title: '数独',
      easy: '简单',
      medium: '中等',
      hard: '困难',
      mistakes: '错误',
      time: '用时',
      best: '最佳',
      hint: '先选一个格子，再选数字。第一步落子时开始计时。',
      win: '完成，用时 {t}',
      newBest: '新纪录：{t}',
      reset: '重置',
      records: '记录',
      clear: '清空',
      empty: '这个难度还没有记录。',
      local: '记录只保存在当前浏览器中。',
      confirmClear: '清空“{level}”的所有记录？',
      light: '亮色',
      dark: '暗色',
      mistakeCount: '错 {n} 次',
      oneMistake: '错 1 次',
      copyright: '© 2026 Albert Huang. 以 MIT 许可证开源。',
      other: '舒尔特方格',
      gomoku: '五子棋',
      lit: '文献：数独与前额叶',
      refs: '参考文献'
    }
  };

  // Target number of givens per level. Removal stops early if no more cells
  // can go without making the solution ambiguous.
  var CLUES = { easy: 40, medium: 32, hard: 26 };
  var KEEP = 10; // records shown per level

  var $ = function (id) { return document.getElementById(id); };
  var boardEl = $('board');
  var padEl = $('pad');
  var mistakesEl = $('mistakes');
  var timeEl = $('time');
  var bestEl = $('best');
  var hintEl = $('hint');
  var historyEl = $('history');
  var emptyEl = $('empty');

  var store = {
    get: function (k, d) {
      try {
        var v = localStorage.getItem('sudoku.' + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('sudoku.' + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  var lang = store.get('lang', (navigator.language || '').toLowerCase().indexOf('zh') === 0 ? 'zh' : 'en');
  var level = store.get('level', 'easy');
  if (!CLUES[level]) level = 'easy';

  var solution, puzzle, values, cells, selected, mistakes, startAt, timer, finished, winKey;

  function t(key, vars) {
    var s = TEXT[lang][key];
    for (var k in vars) s = s.split('{' + k + '}').join(vars[k]);
    return s;
  }

  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor(s / 60) % 60;
    var ss = ('0' + (s % 60)).slice(-2);
    return h ? h + ':' + ('0' + m).slice(-2) + ':' + ss : m + ':' + ss;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var x = a[i]; a[i] = a[j]; a[j] = x;
    }
    return a;
  }

  // ---- Puzzle generation -------------------------------------------------

  var ROW = [], COL = [], BOX = [];
  for (var i = 0; i < 81; i++) {
    ROW[i] = Math.floor(i / 9);
    COL[i] = i % 9;
    BOX[i] = Math.floor(ROW[i] / 3) * 3 + Math.floor(COL[i] / 3);
  }

  // Counts solutions of grid g (0 = empty), stopping at `limit`.
  // If `fill` is true, leaves the first solution found in g.
  function solve(g, limit, fill) {
    var rows = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var cols = rows.slice(), boxes = rows.slice();
    for (var i = 0; i < 81; i++) {
      if (g[i]) {
        var b = 1 << g[i];
        rows[ROW[i]] |= b; cols[COL[i]] |= b; boxes[BOX[i]] |= b;
      }
    }
    var count = 0;
    var work = g.slice();

    function rec() {
      // Pick the empty cell with the fewest candidates.
      var best = -1, bestMask = 0, bestN = 10;
      for (var i = 0; i < 81; i++) {
        if (work[i]) continue;
        var mask = ~(rows[ROW[i]] | cols[COL[i]] | boxes[BOX[i]]) & 0x3fe;
        var n = 0;
        for (var m = mask; m; m &= m - 1) n++;
        if (n < bestN) { best = i; bestMask = mask; bestN = n; if (n <= 1) break; }
      }
      if (best < 0) {
        count++;
        if (fill && count === 1) for (var k = 0; k < 81; k++) g[k] = work[k];
        return count >= limit;
      }
      var digits = [];
      for (var d = 1; d <= 9; d++) if (bestMask & (1 << d)) digits.push(d);
      if (fill) shuffle(digits);
      for (var j = 0; j < digits.length; j++) {
        var v = digits[j], bit = 1 << v;
        work[best] = v;
        rows[ROW[best]] |= bit; cols[COL[best]] |= bit; boxes[BOX[best]] |= bit;
        if (rec()) return true;
        rows[ROW[best]] &= ~bit; cols[COL[best]] &= ~bit; boxes[BOX[best]] &= ~bit;
      }
      work[best] = 0;
      return false;
    }

    rec();
    return count;
  }

  function generate(clues) {
    var full = new Array(81).fill(0);
    solve(full, 1, true);
    var g = full.slice();
    var left = 81;
    var order = shuffle(Array.from({ length: 81 }, function (_, i) { return i; }));
    for (var k = 0; k < order.length && left > clues; k++) {
      var i = order[k], keep = g[i];
      g[i] = 0;
      if (solve(g, 2, false) !== 1) g[i] = keep;
      else left--;
    }
    return { puzzle: g, solution: full };
  }

  // ---- Game --------------------------------------------------------------

  function records() { return store.get('records.' + level, []); }

  function stopTimer() {
    if (timer) cancelAnimationFrame(timer);
    timer = null;
  }

  function tick() {
    timeEl.textContent = fmt(performance.now() - startAt);
    timer = requestAnimationFrame(tick);
  }

  function newGame() {
    stopTimer();
    var p = generate(CLUES[level]);
    puzzle = p.puzzle;
    solution = p.solution;
    values = puzzle.slice();
    selected = -1;
    mistakes = 0;
    startAt = null;
    finished = false;

    boardEl.className = 'board';
    boardEl.innerHTML = '';
    cells = [];
    var boxes = [];
    for (var b = 0; b < 9; b++) {
      var box = document.createElement('div');
      box.className = 'box';
      boardEl.appendChild(box);
      boxes.push(box);
    }
    for (var i = 0; i < 81; i++) {
      var c = document.createElement('button');
      c.type = 'button';
      c.className = 'cell' + (puzzle[i] ? ' given' : '');
      c.dataset.i = i;
      c.textContent = puzzle[i] || '';
      cells[i] = c;
    }
    // Append in box order so each .box holds its own 3x3 cells.
    for (var r = 0; r < 9; r++) {
      for (var col = 0; col < 9; col++) {
        var idx = r * 9 + col;
        boxes[BOX[idx]].appendChild(cells[idx]);
      }
    }

    mistakesEl.textContent = '0';
    timeEl.textContent = fmt(0);
    hintEl.className = 'hint';
    hintEl.textContent = t('hint');
    renderBoard();
    renderRecords();
  }

  function renderBoard() {
    var v = selected >= 0 ? values[selected] : 0;
    for (var i = 0; i < 81; i++) {
      var c = cells[i];
      var peer = selected >= 0 && i !== selected &&
        (ROW[i] === ROW[selected] || COL[i] === COL[selected] || BOX[i] === BOX[selected]);
      c.classList.toggle('sel', i === selected);
      c.classList.toggle('peer', peer);
      c.classList.toggle('same', !!v && i !== selected && values[i] === v);
      c.classList.toggle('err', !!values[i] && !puzzle[i] && values[i] !== solution[i]);
      c.textContent = values[i] || '';
    }
    // Grey out digits that are already placed correctly nine times.
    var done = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var k = 0; k < 81; k++) if (values[k] && values[k] === solution[k]) done[values[k]]++;
    padEl.querySelectorAll('button').forEach(function (b) {
      var n = +b.dataset.n;
      b.disabled = finished || (n > 0 && done[n] >= 9);
    });
  }

  function select(i) {
    if (finished) return;
    selected = i;
    renderBoard();
  }

  function enter(n) {
    if (finished || selected < 0 || puzzle[selected]) return;
    if (values[selected] === n) return;
    if (n && startAt === null) {
      startAt = performance.now();
      tick();
    }
    values[selected] = n;
    if (n && n !== solution[selected]) {
      mistakes++;
      mistakesEl.textContent = mistakes;
    }
    renderBoard();
    for (var i = 0; i < 81; i++) if (values[i] !== solution[i]) return;
    finish();
  }

  function finish() {
    stopTimer();
    finished = true;
    var ms = performance.now() - startAt;
    timeEl.textContent = fmt(ms);
    selected = -1;
    boardEl.classList.add('finished');
    renderBoard();

    var list = records();
    var prevBest = list.length ? Math.min.apply(null, list.map(function (r) { return r.ms; })) : Infinity;
    list.push({ ms: Math.round(ms), at: Date.now(), mistakes: mistakes });
    store.set('records.' + level, list);

    winKey = ms < prevBest ? 'newBest' : 'win';
    hintEl.className = 'hint win';
    hintEl.textContent = t(winKey, { t: fmt(ms) });
    renderRecords();
  }

  boardEl.addEventListener('click', function (e) {
    var c = e.target.closest('.cell');
    if (c) select(+c.dataset.i);
  });

  padEl.addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && !b.disabled) enter(+b.dataset.n);
  });

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || finished) return;
    if (e.target.tagName === 'SELECT') return;
    var k = e.key;
    if (k >= '1' && k <= '9') { enter(+k); e.preventDefault(); return; }
    if (k === '0' || k === 'Backspace' || k === 'Delete') { enter(0); e.preventDefault(); return; }
    var move = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }[k];
    if (move === undefined) return;
    e.preventDefault();
    if (selected < 0) { select(0); return; }
    var r = ROW[selected], c = COL[selected];
    if (move === -9) r = (r + 8) % 9;
    if (move === 9) r = (r + 1) % 9;
    if (move === -1) c = (c + 8) % 9;
    if (move === 1) c = (c + 1) % 9;
    select(r * 9 + c);
    cells[selected].focus();
  });

  function renderRecords() {
    var list = records();
    var best = list.length ? Math.min.apply(null, list.map(function (r) { return r.ms; })) : null;
    bestEl.textContent = best === null ? '—' : fmt(best);

    var shown = list.slice(-KEEP).reverse();
    var locale = lang === 'zh' ? 'zh-CN' : 'en-US';
    historyEl.innerHTML = '';
    shown.forEach(function (r) {
      var li = document.createElement('li');
      if (r.ms === best) li.className = 'top';
      var when = document.createElement('span');
      when.className = 'when';
      when.textContent = new Date(r.at).toLocaleString(locale, {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      var right = document.createElement('span');
      var time = document.createElement('span');
      time.className = 't';
      time.textContent = fmt(r.ms);
      right.appendChild(time);
      if (r.mistakes) {
        var m = document.createElement('span');
        m.className = 'm';
        m.textContent = r.mistakes === 1 ? t('oneMistake') : t('mistakeCount', { n: r.mistakes });
        right.appendChild(m);
      }
      li.appendChild(when);
      li.appendChild(right);
      historyEl.appendChild(li);
    });
    emptyEl.hidden = list.length > 0;
  }

  function currentTheme() {
    var set = document.documentElement.dataset.theme;
    if (set) return set;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function renderText() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });
    // The menu always reads "语言 / Language"; the current choice gets a check mark.
    var sel = $('lang');
    Array.prototype.forEach.call(sel.options, function (o) {
      if (o.value) o.textContent = (o.value === lang ? '✓ ' : ' ') + (o.value === 'zh' ? '中文' : 'English');
    });
    sel.selectedIndex = 0;
    // The button names the theme you switch to.
    $('theme').textContent = currentTheme() === 'dark' ? t('light') : t('dark');
    if (finished) hintEl.textContent = t(winKey, { t: timeEl.textContent });
  }

  function renderLevels() {
    document.querySelectorAll('.sizes button').forEach(function (b) {
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(b.dataset.level === level));
    });
  }

  document.querySelector('.sizes').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (!b) return;
    level = b.dataset.level;
    store.set('level', level);
    renderLevels();
    newGame();
  });

  $('reset').addEventListener('click', newGame);

  $('clear').addEventListener('click', function () {
    if (!records().length) return;
    if (!confirm(t('confirmClear', { level: t(level) }))) return;
    store.set('records.' + level, []);
    renderRecords();
  });

  $('lang').addEventListener('change', function (e) {
    lang = e.target.value === 'zh' ? 'zh' : 'en';
    store.set('lang', lang);
    renderText();
    renderRecords();
  });

  $('theme').addEventListener('click', function () {
    var to = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = to;
    try { localStorage.setItem('sudoku.theme', to); } catch (e) {}
    renderText();
  });

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', renderText);

  renderLevels();
  newGame();
  renderText();

})();
