(function () {
  'use strict';

  var BOOK = window.BOOK || { chapters: [] };
  var CH = BOOK.chapters;
  var KEY = 'shenlun-book-v2';
  var state = loadState();

  var current = CH.length ? CH[0].id : '';
  var activeTab = 'map';

  /* ---------------- utils ---------------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function nl(s) { return esc(s).replace(/\n/g, '<br>'); }
  function chapterById(id) {
    for (var i = 0; i < CH.length; i++) if (CH[i].id === id) return CH[i];
    return null;
  }
  function loadState() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || '{}');
      s.status = s.status || {};
      s.wrong = s.wrong || {};
      s.best = s.best || {};
      return s;
    } catch (e) { return { status: {}, wrong: {}, best: {} }; }
  }
  function saveState() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }
  function totalCards() {
    return CH.reduce(function (n, c) { return n + (c.cards ? c.cards.length : 0); }, 0);
  }
  function knownCards() {
    var n = 0;
    CH.forEach(function (c) {
      (c.cards || []).forEach(function (_, i) {
        if (state.status[c.id + '-c' + i] === 'known') n++;
      });
    });
    return n;
  }
  function updateKnown() {
    $('knownCount').textContent = knownCards();
    $('totalCount').textContent = totalCards();
  }

  /* ---------------- routing ---------------- */
  function parseHash() {
    var h = (location.hash || '').replace(/^#/, '');
    if (!h) return;
    var parts = h.split('/');
    if (parts[0] && chapterById(parts[0])) current = parts[0];
    if (parts[1]) activeTab = parts[1];
  }
  function writeHash() {
    try { history.replaceState(null, '', '#' + current + '/' + activeTab); } catch (e) {}
  }

  /* ---------------- chapter bar / tabs ---------------- */
  function buildChapterBar() {
    var bar = $('chapterBar');
    bar.innerHTML = '';
    CH.forEach(function (ch) {
      var b = document.createElement('button');
      b.className = 'chapter-btn' + (ch.id === current ? ' on' : '');
      b.innerHTML = '<b>' + esc(ch.no) + '</b>' + esc(ch.title);
      b.addEventListener('click', function () {
        if (ch.id === current) return;
        setChapter(ch.id);
      });
      bar.appendChild(b);
    });
  }
  function updateChapterBar() {
    var btns = $('chapterBar').querySelectorAll('.chapter-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('on', CH[i].id === current);
    }
  }
  function activateTab(name, scroll) {
    activeTab = name;
    var tabs = $('tabBar').querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('active', tabs[i].getAttribute('data-tab') === name);
    }
    var panels = document.querySelectorAll('.panel');
    for (var k = 0; k < panels.length; k++) {
      panels[k].classList.toggle('active', panels[k].id === 'panel-' + name);
    }
    if (name === 'wrong') renderWrong();
    if (scroll !== false) window.scrollTo({ top: 0, behavior: 'smooth' });
    writeHash();
  }
  $('tabBar').addEventListener('click', function (e) {
    var t = e.target.closest('.tab');
    if (!t) return;
    activateTab(t.getAttribute('data-tab'), true);
  });

  function setChapter(id) {
    current = id;
    updateChapterBar();
    resetCards();
    resetCloze();
    resetQuiz();
    renderMap();
    renderMn();
    writeHash();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------------- map ---------------- */
  function renderMap() {
    var ch = chapterById(current);
    var h = '';
    h += '<div class="chapter-head">';
    h += '<div class="kicker">第 ' + esc(ch.no) + ' 章</div>';
    h += '<h2>' + esc(ch.title) + '</h2>';
    h += '<div class="tag">' + esc(ch.sub) + '</div>';
    h += '<div class="meta">';
    h += '<span>速记卡 <b>' + (ch.cards ? ch.cards.length : 0) + '</b></span>';
    h += '<span>填空 <b>' + (ch.cloze ? ch.cloze.length : 0) + '</b></span>';
    h += '<span>测验 <b>' + (ch.quiz ? ch.quiz.length : 0) + '</b></span>';
    if (ch.mn) h += '<span>口诀 <b>' + ch.mn.length + '</b></span>';
    var best = state.best[ch.id];
    if (best) h += '<span>测验最佳 <b>' + best.score + '/' + best.total + '</b></span>';
    h += '</div></div>';

    (ch.sections || []).forEach(function (sec, i) {
      h += '<section class="block"><h2 class="sec"><span class="no">' + (i + 1) + '</span>' + esc(sec.h);
      if (sec.sub) h += '<span class="s">' + esc(sec.sub) + '</span>';
      h += '</h2>';
      (sec.blocks || []).forEach(function (b) { h += renderBlock(b); });
      h += '</section>';
    });

    if (ch.gaps && ch.gaps.length) {
      h += '<div class="gap"><b>本章原文缺口：</b><br>' + ch.gaps.map(esc).join('<br>') + '</div>';
    }
    $('panel-map').innerHTML = h;
  }

  function renderBlock(b) {
    var h = '';
    if (b.type === 'kv') {
      h += '<div class="rows">';
      b.rows.forEach(function (r) {
        h += '<div class="row"><div class="k">' + esc(r[0]) + '</div><div class="v">' + nl(r[1]) + '</div></div>';
      });
      h += '</div>';
    } else if (b.type === 'table') {
      h += '<table class="mini"><thead><tr>';
      b.head.forEach(function (x) { h += '<th>' + esc(x) + '</th>'; });
      h += '</tr></thead><tbody>';
      b.rows.forEach(function (r) {
        h += '<tr>';
        r.forEach(function (x, i) {
          h += '<td' + (i === 0 ? ' class="k"' : '') + '>' + nl(x) + '</td>';
        });
        h += '</tr>';
      });
      h += '</tbody></table>';
    } else if (b.type === 'note') {
      h += '<div class="note' + (b.gold ? ' gold' : '') + '">';
      if (b.title) h += '<h3>' + esc(b.title) + '</h3>';
      h += '<div>' + nl(b.body) + '</div></div>';
    } else if (b.type === 'chips') {
      h += '<div class="note plain">';
      if (b.title) h += '<h3>' + esc(b.title) + '</h3>';
      h += '<div class="chips">';
      (b.items || []).forEach(function (x) {
        h += '<span class="t' + (b.hot ? ' hot' : '') + '">' + esc(x) + '</span>';
      });
      h += '</div>';
      if (b.note) h += '<p class="muted" style="margin-top:6px">' + esc(b.note) + '</p>';
      h += '</div>';
    } else if (b.type === 'grid') {
      h += '<div class="' + (b.cols === 3 ? 'grid3' : 'grid2') + '">';
      (b.items || []).forEach(function (it) {
        h += '<div class="note"><h3>' + esc(it.t) + '</h3><div>' + nl(it.b) + '</div></div>';
      });
      h += '</div>';
    } else if (b.type === 'list') {
      h += '<ol class="clean">';
      (b.items || []).forEach(function (x) { h += '<li>' + nl(x) + '</li>'; });
      h += '</ol>';
      if (b.after) h += '<p class="muted">' + nl(b.after) + '</p>';
    } else if (b.type === 'quote') {
      h += '<div class="quote">' + nl(b.body) + '</div>';
    } else if (b.type === 'elements') {
      (b.items || []).forEach(function (it) {
        h += '<div class="el"><div class="el-name">' + esc(it.name) + '</div><div class="el-body">';
        (it.lines || []).forEach(function (l) {
          h += '<div>' + (l.indexOf('：') > -1 ? '<b>' + esc(l.split('：')[0]) + '：</b>' + nl(l.slice(l.indexOf('：') + 1)) : nl(l)) + '</div>';
        });
        h += '</div></div>';
      });
    }
    return h;
  }

  /* ---------------- cards ---------------- */
  var curCat = '全部';
  var deck = [];
  var cardIdx = 0;
  var shuffleOn = false;
  var tally = { known: 0, weak: 0 };
  var ratings = {};

  function chapCards() {
    var ch = chapterById(current);
    return ch.cards || [];
  }
  function cardCats() {
    var set = {};
    chapCards().forEach(function (c) { set[c.cat] = 1; });
    return ['全部'].concat(Object.keys(set));
  }
  function resetCards() {
    curCat = '全部';
    buildCatChips();
    buildDeck(false);
  }
  function buildCatChips() {
    var box = $('catChips');
    box.innerHTML = '';
    cardCats().forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'chip' + (c === '全部' ? ' on' : '');
      b.textContent = c;
      b.addEventListener('click', function () {
        curCat = c;
        var all = box.querySelectorAll('.chip');
        for (var i = 0; i < all.length; i++) all[i].classList.remove('on');
        b.classList.add('on');
        buildDeck(false);
      });
      box.appendChild(b);
    });
  }
  function shuffleArr(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function buildDeck(onlyWeak) {
    var all = chapCards().map(function (c, i) {
      return { c: c, i: i, uid: current + '-c' + i };
    });
    if (curCat !== '全部') all = all.filter(function (x) { return x.c.cat === curCat; });
    if (onlyWeak) {
      all = all.filter(function (x) {
        var s = state.status[x.uid];
        return s && s !== 'known';
      });
    }
    deck = all;
    if (shuffleOn) shuffleArr(deck);
    cardIdx = 0;
    tally = { known: 0, weak: 0 };
    ratings = {};
    $('cardDone').classList.remove('show');
    $('card').style.display = '';
    $('cardStage').style.display = '';
    renderCard();
  }
  function updateCardNav(done) {
    if (!deck.length) {
      $('cardPos').textContent = '0 / 0';
      $('prevCard').disabled = true;
      $('nextCard').disabled = true;
      return;
    }
    if (done) {
      $('cardPos').textContent = '完成 · ' + deck.length + ' 张';
      $('prevCard').disabled = false;
      $('nextCard').disabled = true;
      return;
    }
    $('cardPos').textContent = (cardIdx + 1) + ' / ' + deck.length;
    $('prevCard').disabled = (cardIdx === 0);
    $('nextCard').disabled = !ratings[deck[cardIdx].uid];
  }
  function renderCard() {
    var cardEl = $('card');
    cardEl.classList.remove('flipped');
    if (!deck.length || cardIdx >= deck.length) {
      $('card').style.display = 'none';
      $('cardDone').classList.add('show');
      $('doneTotal').textContent = deck.length;
      $('doneKnown').textContent = tally.known;
      $('doneWeak').textContent = tally.weak;
      $('cardBar').style.width = '100%';
      updateCardNav(true);
      return;
    }
    $('card').style.display = '';
    var x = deck[cardIdx];
    $('cardCat').textContent = x.c.cat;
    $('cardQ').textContent = x.c.q;
    $('cardA').textContent = x.c.a;
    $('cardBar').style.width = (cardIdx / deck.length * 100) + '%';
    updateCardNav(false);
  }
  function applyRating(uid, kind) {
    var old = ratings[uid];
    if (old === kind) return;
    if (old === 'known') tally.known--;
    else if (old) tally.weak--;
    ratings[uid] = kind;
    if (kind === 'known') tally.known++;
    else tally.weak++;
  }
  function rateCard(kind, btn) {
    if (btn) btn.blur();
    if (!deck.length || cardIdx >= deck.length) return;
    var uid = deck[cardIdx].uid;
    state.status[uid] = kind;
    applyRating(uid, kind);
    saveState();
    updateKnown();
    cardIdx++;
    renderCard();
  }
  function goPrevCard() {
    if (!deck.length) return;
    if (cardIdx > 0) cardIdx--;
    renderCard();
  }
  function goNextCard() {
    if (!deck.length || cardIdx >= deck.length) return;
    if (!ratings[deck[cardIdx].uid]) return;
    cardIdx++;
    renderCard();
  }
  $('card').addEventListener('click', function (e) {
    if (e.target.closest('.rate')) return;
    if (!deck.length || cardIdx >= deck.length) return;
    this.classList.toggle('flipped');
  });
  var rateBtns = document.querySelectorAll('[data-rate]');
  for (var r = 0; r < rateBtns.length; r++) {
    rateBtns[r].addEventListener('click', function (e) {
      e.stopPropagation();
      rateCard(this.getAttribute('data-rate'), this);
    });
  }
  $('prevCard').addEventListener('click', goPrevCard);
  $('nextCard').addEventListener('click', goNextCard);
  $('shuffleBtn').addEventListener('click', function () {
    shuffleOn = !shuffleOn;
    this.textContent = shuffleOn ? '顺序：随机' : '打乱顺序';
    this.classList.toggle('primary', shuffleOn);
    buildDeck(false);
  });
  $('againBtn').addEventListener('click', function () { buildDeck(false); });
  $('weakBtn').addEventListener('click', function () { buildDeck(true); });

  /* ---------------- cloze ---------------- */
  var cIdx = 0;
  var cResults = [];
  var cChecked = false;

  function chapCloze() { return chapterById(current).cloze || []; }
  function resetCloze() {
    cIdx = 0;
    cResults = [];
    renderCloze();
  }
  function norm(s) {
    return String(s || '').replace(/[\s，。、；：""''（）()《》·,.;:!?！？]/g, '').toLowerCase();
  }
  function renderCloze() {
    var list = chapCloze();
    var box = $('clozeText');
    box.innerHTML = '';
    $('clozeFb').className = 'feedback';
    $('clozeFb').textContent = '';
    $('clozeCheck').disabled = false;
    $('clozeShow').disabled = false;
    $('clozeNext').disabled = false;
    if (!list.length) {
      box.innerHTML = '<p class="muted">本章暂无填空。</p>';
      $('clozeIdx').textContent = '';
      return;
    }
    cChecked = false;
    var item = list[cIdx];
    $('clozeIdx').textContent = '第 ' + (cIdx + 1) + ' / ' + list.length + ' 句　·　' + chapterById(current).title;
    $('clozeBar').style.width = (cIdx / list.length * 100) + '%';

    var re = /\{\{(.+?)\}\}/g;
    var last = 0, m, n = 0;
    while ((m = re.exec(item.t)) !== null) {
      if (m.index > last) box.appendChild(document.createTextNode(item.t.slice(last, m.index)));
      var ans = m[1];
      var inp = document.createElement('input');
      inp.type = 'text';
      inp.setAttribute('data-ans', ans);
      inp.setAttribute('autocomplete', 'off');
      inp.setAttribute('spellcheck', 'false');
      inp.style.width = Math.max(82, ans.length * 19 + 22) + 'px';
      inp.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); checkCloze(); }
      });
      box.appendChild(inp);
      last = m.index + m[0].length;
      n++;
    }
    box.appendChild(document.createTextNode(item.t.slice(last)));
  }
  function checkCloze() {
    if (cChecked) return;
    cChecked = true;
    var inputs = $('clozeText').querySelectorAll('input');
    if (!inputs.length) return;
    var ok = 0, answers = [];
    for (var i = 0; i < inputs.length; i++) {
      var right = inputs[i].getAttribute('data-ans');
      var accepted = right.split('|').map(norm);
      answers.push(right);
      if (norm(inputs[i].value) && accepted.indexOf(norm(inputs[i].value)) > -1) {
        inputs[i].classList.add('ok'); ok++;
      } else {
        inputs[i].classList.add('bad');
      }
    }
    cResults[cIdx] = ok;
    var fb = $('clozeFb');
    if (ok === inputs.length) {
      fb.className = 'feedback show good';
      fb.textContent = '全对：' + ok + '/' + inputs.length + '。这一句可以过。';
    } else {
      fb.className = 'feedback show bad';
      fb.textContent = '正确 ' + ok + '/' + inputs.length + ' 空。参考答案：' + answers.join('；') + '。';
    }
    $('clozeCheck').disabled = true;
  }
  function showCloze() {
    var inputs = $('clozeText').querySelectorAll('input');
    if (!inputs.length) return;
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].value = inputs[i].getAttribute('data-ans').split('|')[0];
      inputs[i].classList.remove('bad');
      inputs[i].classList.add('ok');
    }
    cChecked = true;
    cResults[cIdx] = inputs.length;
    $('clozeFb').className = 'feedback show good';
    $('clozeFb').textContent = '已填入参考答案，请出声读两遍。';
    $('clozeCheck').disabled = true;
  }
  function nextCloze() {
    var list = chapCloze();
    if (!list.length) return;
    if (cIdx < list.length - 1) { cIdx++; renderCloze(); return; }
    var done = cResults.filter(function (x) { return x !== undefined; }).length;
    $('clozeText').innerHTML = '<p style="font-family:serif;font-size:21px;letter-spacing:2px">本章填空已过完。</p>' +
      '<p class="muted">已完成 ' + done + ' 句。建议回到错句再默一遍，然后去「闯关测验」。</p>' +
      '<p><button class="btn primary" id="clozeRestart">再来一遍</button></p>';
    $('clozeIdx').textContent = '完成';
    $('clozeBar').style.width = '100%';
    $('clozeFb').className = 'feedback';
    $('clozeCheck').disabled = true;
    $('clozeShow').disabled = true;
    $('clozeNext').disabled = true;
    $('clozeRestart').addEventListener('click', function () { resetCloze(); });
  }
  $('clozeCheck').addEventListener('click', checkCloze);
  $('clozeShow').addEventListener('click', showCloze);
  $('clozeNext').addEventListener('click', nextCloze);

  /* ---------------- quiz ---------------- */
  var qOrder = [];
  var qIdx = 0;
  var qScore = 0;
  var qAnswered = false;
  var qWrong = [];
  var qList = [];

  function chapQuiz() { return chapterById(current).quiz || []; }
  function resetQuiz() {
    qList = chapQuiz();
    qOrder = qList.map(function (_, i) { return i; });
    shuffleArr(qOrder);
    qIdx = 0; qScore = 0; qWrong = [];
    $('quizDone').classList.remove('show');
    $('quizDone').style.display = 'none';
    $('quizCard').style.display = '';
    $('quizWrongList').innerHTML = '';
    if (!qList.length) {
      $('quizCard').style.display = 'none';
      return;
    }
    displayQuestion();
  }
  function displayQuestion() {
    qAnswered = false;
    var q = qList[qOrder[qIdx]];
    $('quizIdx').textContent = '第 ' + (qIdx + 1) + ' / ' + qList.length + ' 题　·　' + chapterById(current).title;
    $('quizQ').textContent = q.q;
    $('quizBar').style.width = (qIdx / qList.length * 100) + '%';
    $('quizExp').className = 'explain';
    $('quizExp').innerHTML = '';
    var box = $('quizOpts');
    box.innerHTML = '';
    var letters = ['A', 'B', 'C', 'D'];
    q.o.forEach(function (text, i) {
      var b = document.createElement('button');
      b.className = 'opt';
      b.innerHTML = '<span class="idx">' + letters[i] + '</span><span>' + esc(text) + '</span>';
      b.addEventListener('click', function () { answerQuiz(i, b); });
      box.appendChild(b);
    });
    $('quizNext').textContent = (qIdx === qList.length - 1) ? '看成绩' : '下一题';
  }
  function answerQuiz(i, btn) {
    if (qAnswered) return;
    qAnswered = true;
    var q = qList[qOrder[qIdx]];
    var opts = $('quizOpts').querySelectorAll('.opt');
    for (var k = 0; k < opts.length; k++) {
      opts[k].disabled = true;
      if (k === q.a) opts[k].classList.add('correct');
    }
    if (i === q.a) { qScore++; }
    else {
      btn.classList.add('wrong');
      qWrong.push(qOrder[qIdx]);
      var uid = current + '-q' + qOrder[qIdx];
      state.wrong[uid] = (state.wrong[uid] || 0) + 1;
      saveState();
    }
    $('quizExp').className = 'explain show';
    $('quizExp').innerHTML = '<b>' + (i === q.a ? '答对。' : '答错。') + '</b>' + esc(q.e);
  }
  function nextQuiz() {
    if (!qAnswered) {
      $('quizExp').className = 'explain show';
      $('quizExp').innerHTML = '<b>先选一个答案。</b>不确定也先选，错题会进错题本。';
      return;
    }
    if (qIdx < qList.length - 1) { qIdx++; displayQuestion(); }
    else finishQuiz();
  }
  function finishQuiz() {
    var total = qList.length;
    var prev = state.best[current];
    if (!prev || qScore > prev.score) {
      state.best[current] = { score: qScore, total: total };
      saveState();
      renderMap();
    }
    $('quizCard').style.display = 'none';
    $('quizDone').classList.add('show');
    $('quizDone').style.display = 'flex';
    $('quizScore').textContent = qScore + ' / ' + total;
    var msg = qScore === total ? '全对！这一章可以结课了。' :
      qScore >= total * 0.8 ? '很稳，把错题解析口述一遍。' :
      qScore >= total * 0.6 ? '基本盘有了，回速览补薄弱小节。' :
      '别急，先回「速览」把本章框架读两遍。';
    $('quizComment').textContent = msg;
    var box = $('quizWrongList');
    box.innerHTML = '';
    if (!qWrong.length) {
      box.innerHTML = '<p class="muted" style="text-align:center">没有错题。</p>';
    } else {
      box.innerHTML = '<p style="margin-bottom:6px"><b>错题回顾（' + qWrong.length + '）</b></p>';
      qWrong.forEach(function (qi) {
        var q = qList[qi];
        box.innerHTML += '<div class="wrong-item"><div class="wq">' + esc(q.q) + '</div>' +
          '<div class="wa">正确答案：' + esc(q.o[q.a]) + '</div>' +
          '<div class="we">' + esc(q.e) + '</div></div>';
      });
    }
  }
  $('quizNext').addEventListener('click', nextQuiz);
  $('quizAgain').addEventListener('click', function () { resetQuiz(); });
  $('quizReview').addEventListener('click', function () { activateTab('wrong'); });

  /* ---------------- mnemonics ---------------- */
  function renderMn() {
    var ch = chapterById(current);
    var box = $('mnGrid');
    box.innerHTML = '';
    (ch.mn || []).forEach(function (m) {
      box.innerHTML += '<div class="mn"><div class="th">' + esc(m.k) + '</div>' +
        '<div class="mn-body">' + nl(m.v) + '</div>' +
        (m.src ? '<div class="mn-src">对应：' + esc(m.src) + '</div>' : '') + '</div>';
    });
    if (!ch.mn || !ch.mn.length) box.innerHTML = '<p class="muted">本章暂无口诀。</p>';
  }

  /* ---------------- wrong book ---------------- */
  function renderWrong() {
    var list = $('wrongList');
    var keys = Object.keys(state.wrong);
    $('wrongCount').textContent = keys.length ? '共 ' + keys.length + ' 道' : '';
    if (!keys.length) {
      list.innerHTML = '<p class="muted">还没有错题。做完「闯关测验」后，答错的题会自动进来。</p>';
      return;
    }
    var html = '';
    var byCh = {};
    keys.forEach(function (uid) {
      var parts = uid.split('-q');
      if (parts.length !== 2) return;
      (byCh[parts[0]] = byCh[parts[0]] || []).push(parseInt(parts[1], 10));
    });
    CH.forEach(function (ch) {
      var ids = byCh[ch.id];
      if (!ids) return;
      html += '<h2 class="sec" style="margin-top:18px"><span class="no">' + esc(ch.no) + '</span>' + esc(ch.title) + '<span class="s">错 ' + ids.length + ' 题</span></h2>';
      ids.sort(function (a, b) { return a - b; }).forEach(function (qi) {
        var q = (ch.quiz || [])[qi];
        if (!q) return;
        var n = state.wrong[ch.id + '-q' + qi] || 1;
        html += '<div class="wrong-item"><div class="wq">' + esc(q.q) + '</div>' +
          '<div class="wa">正确答案：' + esc(q.o[q.a]) + '</div>' +
          '<div class="we">' + esc(q.e) + '</div>' +
          '<div class="meta">' + esc(ch.title) + '　·　错 ' + n + ' 次</div></div>';
      });
    });
    list.innerHTML = html;
  }
  $('clearWrong').addEventListener('click', function () {
    if (!Object.keys(state.wrong).length) return;
    if (confirm('确定清空全部错题记录？')) {
      state.wrong = {};
      saveState();
      renderWrong();
    }
  });

  /* ---------------- info ---------------- */
  function renderInfo() {
    var gaps = '';
    CH.forEach(function (ch) {
      if (ch.gaps && ch.gaps.length) {
        gaps += '<li><b>' + esc(ch.title) + '：</b>' + ch.gaps.map(esc).join('；') + '</li>';
      }
    });
    var html = '';
    html += '<div class="chapter-head"><div class="kicker">SOURCE NOTES</div><h2>说明与勘误</h2>' +
      '<div class="tag">这份材料哪里可靠、哪里存疑，一次讲清楚。</div></div>';

    html += '<div class="errata"><h3>一、源文件情况</h3><ul>' +
      '<li>第一次提供《第一章 概括归纳很精.docx》：24 页，实际含 <b>五章 + 补充题型</b>，文件名与内容不符；内含图片转写痕迹（工具生成语句、<code>$$...$$</code> 占位符），0 张图片。</li>' +
      '<li>第二次提供《启承申论笔记.docx》：<b>109 页、124 张图</b>，按正文顺序抽出 116 张（110 张整页 + 6 张裁剪）；文字层仅约 6,759 字，主体是拍照/截图，含大量手写批注。</li>' +
      '<li>本版新增的「材料阅读」章、以及各章新方法（对策问法矩阵、大公文、分论点三法等），来自第二份文件的逐页读图；缺页/模糊页按约定只取独立知识点，不补文章。</li>' +
      '<li>缺失的例题与答案没有补写，也没有替讲师编评分点。</li>' +
      '</ul></div>';

    html += '<div class="errata"><h3>二、具体存疑点（需要你确认）</h3><ul>' +
      '<li><span class="q">第二章：</span>“身份定位（×）”“可行性（×）”后的 × 含义不明——是不作要求、不占分，还是“不要写”？我暂未把它写成结论。</li>' +
      '<li><span class="q">第四章：</span>“（注：≤60 字时，第二段占比最大）”出现在“称谓”之后，无法判断它修饰哪一段，暂未纳入卡片。</li>' +
      '<li><span class="q">第五章：</span>“背景 / 咔咔咔”中的“咔咔咔”疑似课程内部代称（可能指背诵素材/万能句），原文如此，我未擅自解释。</li>' +
      '<li><span class="q">第五章：</span>“分论点三法”已从后半本补全；“两个分论点如何补第三个”也已录入。</li>' +
      '<li><span class="q">第四章：</span>“逻辑清晰、层次分明、观点明确、分条分类”在四种题型中的落点表（P043）手写较密，辨读存疑，暂未录入。</li>' +
      '<li><span class="q">第一章：</span>“保留核心键（键词多为名词）”应为“核心词/关键词”，已按笔误处理。</li>' +
      '<li><span class="q">第三章：</span>“句子类”开头残留“为你将这张关于……整理成……”的工具语句，已删除。</li>' +
      '</ul></div>';

    html += '<div class="errata"><h3>三、各章原文缺口</h3><ul>' + (gaps || '<li>无</li>') + '</ul></div>';

    html += '<div class="errata"><h3>四、编写口径</h3><ul>' +
      '<li>速记卡、填空、测验只使用原文明确出现的表述；推断性内容（如“常见问法”）会标“推断”或不写。</li>' +
      '<li>口诀、测验解析、界面文案为自编助记，不等于讲义原文；答题时以速记卡上的标准表述为准。</li>' +
      '<li>标点、序号、明显笔误做了统一；<b>没有改动任何结论性内容</b>。</li>' +
      '</ul></div>';

    html += '<div class="errata"><h3>五、学习记录</h3>' +
      '<p class="muted">进度只存在本机浏览器。换设备或清缓存前，先导出。</p>' +
      '<div class="actions"><button class="btn" id="exportBtn">导出学习记录</button>' +
      '<label class="btn" style="cursor:pointer">导入学习记录<input type="file" id="importFile" accept=".json,application/json" style="display:none"></label></div>' +
      '<div id="ioMsg" class="muted" style="margin-top:8px"></div></div>';

    $('panel-info').innerHTML = html;
    $('exportBtn').addEventListener('click', exportState);
    $('importFile').addEventListener('change', importState);
  }
  function exportState() {
    try {
      var blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '申论学习记录.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
      $('ioMsg').textContent = '已导出 申论学习记录.json。';
    } catch (e) {
      $('ioMsg').textContent = '导出失败：' + e.message;
    }
  }
  function importState(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var s = JSON.parse(reader.result);
        if (!s || typeof s !== 'object') throw new Error('格式不对');
        state.status = s.status || state.status;
        state.wrong = s.wrong || state.wrong;
        state.best = s.best || state.best;
        saveState();
        updateKnown();
        renderMap();
        renderWrong();
        $('ioMsg').textContent = '导入成功：已掌握 ' + knownCards() + ' 张，错题 ' + Object.keys(state.wrong).length + ' 道。';
      } catch (err) {
        $('ioMsg').textContent = '导入失败：' + err.message;
      }
    };
    reader.readAsText(f);
  }

  /* ---------------- keyboard ---------------- */
  document.addEventListener('keydown', function (e) {
    if (activeTab !== 'cards') return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (deck.length && cardIdx < deck.length) $('card').classList.toggle('flipped');
    } else if (e.key === 'ArrowRight') {
      goNextCard();
    } else if (e.key === 'ArrowLeft') {
      goPrevCard();
    } else if (e.key === '1' || e.key === '2' || e.key === '3') {
      rateCard(e.key === '1' ? 'weak' : (e.key === '2' ? 'fuzzy' : 'known'));
    }
  });

  /* ---------------- init ---------------- */
  parseHash();
  if (!chapterById(current) && CH.length) current = CH[0].id;
  buildChapterBar();
  updateKnown();
  renderMap();
  resetCards();
  resetCloze();
  resetQuiz();
  renderMn();
  renderInfo();
  renderWrong();
  if (activeTab && $('panel-' + activeTab)) activateTab(activeTab, false);
  else activateTab('map', false);
  writeHash();
})();
