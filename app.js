/* 每日单词 App —— 本地优先的英语随身练（专升本 / 四级 / Python） */
(function () {
  'use strict';

  var KEY = 'ew_v1';
  var DICT = window.DICT || {};
  var BUILTIN = window.BUILTIN_PAPERS || [];

  /* ---------------- 基础工具 ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var today = function () {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  var addDays = function (n) {
    var d = new Date(); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  var shuf = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

  /* ---------------- 数据 ---------------- */
  var DEF = {
    words: {}, tags: ['专升本核心', '四级高频', 'Python', '课堂', '错题本'],
    papers: [], audio: {}, settings: { api: '', voice: 'real', accent: 'us', daily: 20, round: 10, rate: 1, inflect: 25, loose: true, modes: ['word2cn', 'ph2cn', 'au2cn', 'cn2sp', 'au2sp', 'ph2sp'] },
    daily: {}, log: {}, builtinLoaded: false, user: null, token: '',
    users: {},        // { 用户名: {words, daily, log} } 登录后各自的库
    guest: null,      // 未登录时的临时库快照（切回时用）
  };
  var S;
  function load() {
    try { S = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { S = null; }
    if (!S) S = JSON.parse(JSON.stringify(DEF));
    for (var k in DEF) if (!(k in S)) S[k] = JSON.parse(JSON.stringify(DEF[k]));
    if (!S.settings.modes || !S.settings.modes.length) S.settings.modes = DEF.settings.modes.slice();
    if (!S.daily[today()]) S.daily[today()] = [];
    if (!S.audio) S.audio = {};
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { alert('存储空间不足，请清理旧数据'); } }
  load();

  /* ---------------- 词库查询 ---------------- */
  // 不规则变形 -> 原形（专升本/四级高频）
  var IRREG = {
    wrote: 'write', written: 'write', wrote2: 'write', wrote_: 'write',
    began: 'begin', begun: 'begin', took: 'take', taken: 'take',
    went: 'gone', gone: 'go', did: 'do', done: 'do', made: 'make',
    saw: 'see', seen: 'see', came: 'come', got: 'get', gotten: 'get',
    knew: 'know', known: 'know', thought: 'think', brought: 'bring',
    caught: 'catch', taught: 'teach', bought: 'buy', fought: 'fight',
    found: 'find', built: 'build', sent: 'send', spent: 'spend',
    kept: 'keep', slept: 'sleep', felt: 'feel', left: 'leave',
    meant: 'mean', paid: 'pay', said: 'say', sold: 'sell', told: 'tell',
    understood: 'understand', stood: 'stand', ran: 'run', sang: 'sing',
    drank: 'drink', swam: 'swim', rang: 'ring', began_: 'begin',
    chose: 'choose', chosen: 'choose', broke: 'break', broken: 'break',
    spoke: 'speak', spoken: 'speak', stole: 'steal', stolen: 'steal',
    drove: 'drive', driven: 'drive', rode: 'ride', risen: 'rise',
    fell: 'fall', fallen: 'fall', hid: 'hide', hidden: 'hide',
    lay: 'lie', lain: 'lie', led: 'lead', lost: 'lose', won: 'win',
    held: 'hold', sat: 'sit', beat: 'beat', become: 'become',
    children: 'child', feet: 'foot', teeth: 'tooth', men: 'man',
    women: 'woman', mice: 'mouse', geese: 'goose', lives: 'life',
    knives: 'knife', wives: 'wife', leaves: 'leaf', halves: 'half',
    wolves: 'wolf', selves: 'self', thieves: 'thief', shelves: 'shelf',
    potatoes: 'potato', tomatoes: 'tomato', heroes: 'hero',
    analyses: 'analysis', bases: 'basis', crises: 'crisis',
    criteria: 'criterion', phenomena: 'phenomenon', data_: 'datum',
    better: 'good', best: 'good', worse: 'bad', worst: 'bad',
    farther: 'far', further: 'far', older: 'old', elder: 'old'
  };
  var IRREG_LABEL = { pl: '复数', pt: '过去式', pp: '过去分词', ing: '现在分词', s3: '三单' };
  var INFLECT_ORDER = ['pl', 'pt', 'pp', 'ing', 's3'];

  function genInflect(w) {
    var f = {};
    if (/[^aeiou]y$/.test(w)) {
      f.pl = w.slice(0, -1) + 'ies'; f.s3 = f.pl; f.pt = w.slice(0, -1) + 'ied'; f.pp = f.pt; f.ing = w + 'ing';
    } else if (/(s|x|z|ch|sh)$/.test(w)) {
      f.pl = w + 'es'; f.s3 = f.pl; f.pt = w + 'ed'; f.pp = w + 'ed'; f.ing = w + 'ing';
    } else if (/e$/.test(w)) {
      f.pl = w + 's'; f.s3 = f.pl; f.pt = w + 'd'; f.pp = w + 'd'; f.ing = w.slice(0, -1) + 'ing';
    } else if (/[^aeiou][aeiou][bdgklmnprt]$/.test(w) && w.length <= 5 && !/(er|ow|ay|ey|oy|ai)$/.test(w)) {
      var last = w.slice(-1);
      f.pl = w + 's'; f.s3 = f.pl; f.pt = w + last + 'ed'; f.pp = f.pt; f.ing = w + last + 'ing';
    } else {
      f.pl = w + 's'; f.s3 = f.pl; f.pt = w + 'ed'; f.pp = w + 'ed'; f.ing = w + 'ing';
    }
    return f;
  }

  /** 查词：本地词库优先，其次变形还原，返回 {w,cn,ph,base,tag,found} */
  function lookup(w) {
    w = (w || '').trim().toLowerCase();
    if (!w) return null;
    var e = DICT[w];
    if (e) return { w: w, cn: tidy(e.c || ''), ph: tidyPh(e.p || ''), en: '', base: '', found: true, book: e.b || '' };
    // 变形还原
    var base = IRREG[w];
    var kind = null;
    if (base) {
      kind = guessKind(w, base);
    } else {
      var cand = baseOf(w);
      for (var i = 0; i < cand.length; i++) {
        if (DICT[cand[i]]) { base = cand[i]; kind = kindOf(w, cand[i]); break; }
      }
    }
    if (base && DICT[base]) {
      var d = DICT[base];
      return { w: w, cn: tidy(d.c || ''), ph: tidyPh(d.p || ''), en: '', base: base, kind: kind || '', found: true, book: d.b || '' };
    }
    return { w: w, cn: '', ph: '', en: '', base: '', found: false };
  }
  function baseOf(w) {
    var out = [];
    if (/ies$/.test(w)) out.push(w.slice(0, -3) + 'y');
    if (/(ches|shes|xes|zes|sses)$/.test(w)) out.push(w.slice(0, -2));
    if (/s$/.test(w)) { out.push(w.slice(0, -1)); out.push(w.slice(0, -2)); }
    if (/ied$/.test(w)) out.push(w.slice(0, -3) + 'y');
    if (/ed$/.test(w)) { out.push(w.slice(0, -2)); out.push(w.slice(0, -1)); }
    if (/ing$/.test(w)) { out.push(w.slice(0, -3)); out.push(w.slice(0, -3) + 'e'); out.push(w.slice(0, -4)); }
    if (/er$/.test(w)) { out.push(w.slice(0, -2)); out.push(w.slice(0, -1)); }
    if (/est$/.test(w)) { out.push(w.slice(0, -3)); out.push(w.slice(0, -2)); }
    return out.filter(function (x) { return x && x.length > 1; });
  }
  function kindOf(w, base) {
    var f = genInflect(base);
    for (var k in f) if (f[k] === w) return k;
    return '';
  }
  function guessKind(w, base) {
    var f = genInflect(base);
    if (f.pp === w) return 'pp';
    if (f.pt === w) return 'pt';
    if (f.pl === w) return 'pl';
    return 'pp';
  }
  function tidy(c) {
    return String(c || '').replace(/\s+/g, ' ').replace(/<[^>]*>/g, '').trim();
  }
  function tidyPh(p) { return String(p || '').replace(/:/g, 'ː').trim(); }

  /* ---------------- 联网补全（尽力而为） ---------------- */
  var netCache = {};
  function online(w) {
    if (netCache[w]) return Promise.resolve(netCache[w]);
    var url = 'https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(w);
    var t = new Promise(function (res) {
      var done = function (r) { netCache[w] = r; res(r); };
      var timer = setTimeout(function () { done({ ph: '', en: '' }); }, 8000);
      fetch(url).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
        clearTimeout(timer);
        var ph = '', en = '';
        try {
          var e = j && j[0];
          if (e) {
            ph = e.phonetic || (e.phonetics && e.phonetics.filter(function (p) { return p.text; })[0] || {}).text || '';
            var m = e.meanings && e.meanings[0];
            if (m && m.definitions && m.definitions[0]) en = m.definitions[0].definition;
          }
        } catch (err) { }
        done({ ph: (ph || '').replace(/\//g, ''), en: en || '' });
      }).catch(function () { clearTimeout(timer); done({ ph: '', en: '' }); });
    });
    netCache[w] = null;
    return t;
  }

  /* ---------------- 听力音频（IndexedDB 存 Blob，离线可用） ---------------- */
  var DBP = null;
  function openDB() {
    if (DBP) return DBP;
    DBP = new Promise(function (res, rej) {
      try {
        var r = indexedDB.open('ew_audio', 1);
        r.onupgradeneeded = function () { r.result.createObjectStore('audio'); };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error || new Error('idb')); };
      } catch (e) { rej(e); }
    });
    return DBP;
  }
  function putAudio(k, blob) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('audio', 'readwrite');
        t.objectStore('audio').put(blob, k);
        t.oncomplete = function () { res(true); };
        t.onerror = function () { rej(t.error); };
      });
    });
  }
  function getAudio(k) {
    return openDB().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('audio', 'readonly');
        var q = t.objectStore('audio').get(k);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { res(null); };
      });
    });
  }
  function delAudio(k) {
    return openDB().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('audio', 'readwrite');
        t.objectStore('audio').delete(k);
        t.oncomplete = function () { res(true); };
        t.onerror = function () { res(false); };
      });
    });
  }

  var AC = {};                 // paperId -> {url, el, name}
  var segTimer = null;
  function loadPaperAudio(pid) {
    var rec = S.audio[pid];
    if (!rec || !rec.file) return Promise.resolve(null);
    if (AC[pid]) return Promise.resolve(AC[pid]);
    return getAudio(rec.file).then(function (blob) {
      if (!blob) return null;
      var url = URL.createObjectURL(blob);
      var el = new Audio(url);
      el.preload = 'auto';
      AC[pid] = { url: url, el: el, name: rec.name || '' };
      return AC[pid];
    }).catch(function () { return null; });
  }
  function stopAudio(pid) {
    clearTimeout(segTimer);
    if (AC[pid] && AC[pid].el) { try { AC[pid].el.pause(); } catch (e) { } }
  }
  /** 播放某题：从 start 播到 end（默认 35 秒或下一题起点） */
  function playSeg(pid, start, end, cb) {
    loadPaperAudio(pid).then(function (a) {
      if (!a) { if (cb) cb(false); return; }
      var el = a.el;
      try {
        clearTimeout(segTimer);
        el.pause();
        el.currentTime = Math.max(0, start || 0);
        el.playbackRate = S.settings.rate || 1;
        var p = el.play();
        if (p && p.catch) p.catch(function () { });
        var stopAt = (end && end > start) ? end : (start || 0) + 35;
        segTimer = setTimeout(function () { try { el.pause(); } catch (e) { } }, (stopAt - (start || 0)) * 1000);
        if (cb) cb(true);
      } catch (e) { if (cb) cb(false); }
    });
  }

  /* ---------------- 发音 ---------------- */
  var ttsReady = false;
  function speak(w, force) {
    w = (w || '').trim();
    if (!w) return;
    var st = S.settings;
    if (st.voice === 'real' && !force) {
      var type = st.accent === 'uk' ? 1 : 2;
      var a = new Audio('https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(w) + '&type=' + type);
      a.onerror = function () { tts(w); };
      var p = a.play();
      if (p && p.catch) p.catch(function () { tts(w); });
      return;
    }
    tts(w);
  }
  function tts(w) {
    try {
      if (!window.speechSynthesis) return;
      var u = new SpeechSynthesisUtterance(w);
      u.lang = S.settings.accent === 'uk' ? 'en-GB' : 'en-US';
      u.rate = .9;
      speechSynthesis.cancel();
      speechSynthesis.speak(u);
      ttsReady = true;
    } catch (e) { }
  }

  /* ---------------- 单词本 ---------------- */
  function allWords() {
    return Object.keys(S.words).map(function (k) { return S.words[k]; });
  }
  function todayIds() { return S.daily[today()] || []; }
  function dueIds() {
    var t = today();
    return allWords().filter(function (w) { return !w.due || w.due <= t; }).map(function (w) { return w.id; });
  }
  function addWord(w, cn, ph, tags, extra) {
    w = (w || '').trim().toLowerCase();
    if (!w) return null;
    var exist = allWords().filter(function (x) { return x.w === w; })[0];
    var e = exist;
    if (!e) {
      e = { id: uid(), w: w, cn: cn || '', ph: ph || '', en: '', tags: tags || [], box: 0, due: today(), ok: 0, bad: 0, added: Date.now() };
      S.words[e.id] = e;
    } else {
      if (cn && !e.cn) e.cn = cn;
      if (ph && !e.ph) e.ph = ph;
      (tags || []).forEach(function (t) { if (e.tags.indexOf(t) < 0) e.tags.push(t); });
    }
    if (extra) for (var k in extra) e[k] = extra[k];
    var d = today();
    if (S.daily[d].indexOf(e.id) < 0) S.daily[d].push(e.id);
    save();
    return e;
  }
  function delWord(id) {
    delete S.words[id];
    for (var d in S.daily) S.daily[d] = S.daily[d].filter(function (x) { return x !== id; });
    save();
  }
  // 复习算法（简化 SM-2）
  var STEP = [0, 1, 2, 4, 7, 15, 30, 60];
  function review(id, ok) {
    var w = S.words[id]; if (!w) return;
    if (ok) { w.box = Math.min((w.box || 0) + 1, STEP.length - 1); w.ok = (w.ok || 0) + 1; }
    else {
      w.box = 0; w.bad = (w.bad || 0) + 1;
      if (w.tags.indexOf('错题本') < 0) w.tags.push('错题本');   // 错题自动归集
    }
    w.due = addDays(STEP[w.box] || 1);
    save();
  }

  /* ---------------- 出题 ---------------- */
  function poolOf(scope, tag) {
    var ids = [];
    if (scope === 'today') ids = todayIds();
    else if (scope === 'due') ids = dueIds();
    else if (scope === 'all') ids = allWords().map(function (w) { return w.id; });
    else if (scope === 'weak') ids = allWords().filter(function (w) { return (w.bad || 0) >= (w.ok || 0); }).map(function (w) { return w.id; });
    else if (scope === 'wrongbook') ids = allWords().filter(function (w) { return w.tags.indexOf('错题本') >= 0; }).map(function (w) { return w.id; });
    else ids = todayIds().concat(dueIds());
    if (tag && tag !== '__all') ids = ids.filter(function (id) { return S.words[id] && S.words[id].tags.indexOf(tag) >= 0; });
    ids = ids.filter(function (id) { return S.words[id]; });
    // 到期优先 + 随机
    ids = shuf(ids);
    ids.sort(function (a, b) { return (S.words[a].due || '') < (S.words[b].due || '') ? -1 : 1; });
    return ids.slice(0, S.settings.round || 10);
  }
  function shortCn(cn) {
    cn = tidy(cn).replace(/^[a-z]{1,5}\.\s*/i, '');
    if (cn.length > 26) cn = cn.slice(0, 26) + '…';
    return cn || '（无释义）';
  }
  function distracts(cn, n) {
    var out = [], pool = allWords();
    var tries = 0;
    while (out.length < n && tries < 200) {
      tries++;
      var w = pool[Math.floor(Math.random() * pool.length)];
      if (!w || !w.cn) continue;
      var c = shortCn(w.cn);
      if (c === cn || out.indexOf(c) >= 0) continue;
      out.push(c);
    }
    if (pool.length < n + 1) {
      var keys = Object.keys(DICT);
      while (out.length < n && tries < 400) {
        tries++;
        var k = keys[Math.floor(Math.random() * keys.length)];
        var e = DICT[k]; if (!e || !e.c) continue;
        var c2 = shortCn(e.c);
        if (c2 === cn || out.indexOf(c2) >= 0) continue;
        out.push(c2);
      }
    }
    return out;
  }
  function makeQ(id, mode) {
    var w = S.words[id]; if (!w) return null;
    var word = w.w, cn = w.cn || '', ph = w.ph || '';
    var useInf = false, infWord = word, infLabel = '';
    if (mode === 'cn2sp' || mode === 'au2sp' || mode === 'ph2sp') {
      if (Math.random() * 100 < (S.settings.inflect || 0)) {
        var f = genInflect(word);
        var ks = INFLECT_ORDER.filter(function (k) { return f[k]; });
        if (ks.length) {
          var k = ks[Math.floor(Math.random() * ks.length)];
          infWord = f[k]; infLabel = IRREG_LABEL[k]; useInf = true;
        }
      }
    }
    var q = { id: id, mode: mode, word: word, cn: cn, ph: ph, ans: infWord, inf: useInf, infLabel: infLabel };
    q.cnShow = shortCn(cn) + (useInf ? '（' + infLabel + '）' : '');
    if (mode === 'word2cn' || mode === 'ph2cn' || mode === 'au2cn') {
      var ds = distracts(shortCn(cn), 3);
      q.options = shuf(ds.concat([shortCn(cn)]));
      q.answer = shortCn(cn);
    }
    return q;
  }
  function norm(s) {
    return String(s || '').trim().toLowerCase().replace(/[\s.!?,;:'"’]/g, '');
  }
  function near(a, b) {
    a = norm(a); b = norm(b);
    if (a === b) return true;
    if (!S.settings.loose) return false;
    if (Math.abs(a.length - b.length) > 2) return false;
    // 编辑距离 <=1 视为对（宽容判分）
    var n = 0, i = 0, j = 0;
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; }
      else { n++; if (n > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } }
    }
    return true;
  }

  /* ---------------- 渲染框架 ---------------- */
  var TAB = 'home';
  var app = $('#app');
  var TITLES = { home: '今日单词', practice: '练习', paper: '真题', lib: '词库', me: '我的' };

  function go(tab) {
    TAB = tab;
    Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function (b) {
      b.classList.toggle('on', b.dataset.tab === tab);
    });
    $('#hdTitle').firstChild.nodeValue = ({ home: '📚 ', practice: '🎯 ', paper: '📝 ', lib: '📖 ', me: '⚙️ ' })[tab] + TITLES[tab] + ' ';
    window.scrollTo(0, 0);
    render();
  }
  function render() {
    var f = { home: viewHome, practice: viewPractice, paper: viewPaper, lib: viewLib, me: viewMe }[TAB];
    app.innerHTML = '<div>' + (f ? f() : '') + '</div>';
    bind();
    if (TAB === 'practice' && !QZ) updPool();
  }
  function bind() {
    Array.prototype.forEach.call(app.querySelectorAll('[data-act]'), function (el) {
      el.addEventListener('click', function (e) {
        // 嵌套的 [data-act]（如选项里的「全文」）优先响应，不触发外层按钮
        var inner = e.target.closest ? e.target.closest('[data-act]') : null;
        if (inner && inner !== el && ACT[inner.dataset.act]) {
          e.stopPropagation(); ACT[inner.dataset.act](inner, e); return;
        }
        ACT[el.dataset.act] && ACT[el.dataset.act](el, e);
      });
    });
    Array.prototype.forEach.call(app.querySelectorAll('[data-chg]'), function (el) {
      el.addEventListener('change', function (e) { ACT[el.dataset.chg] && ACT[el.dataset.chg](el, e); });
    });
  }

  /* ---------------- 首页 ---------------- */
  function viewHome() {
    var ids = todayIds();
    var due = dueIds().filter(function (id) { return S.words[id]; });
    var goal = S.settings.daily || 20;
    var pct = Math.min(100, Math.round(ids.length / goal * 100));
    var h = '';
    h += '<div class="card"><h3>今日进度 <span class="muted">' + today() + '</span></h3>' +
      '<div class="stat"><div><b>' + ids.length + '</b><span>今日新增</span></div>' +
      '<div><b>' + due.length + '</b><span>待复习</span></div>' +
      '<div><b>' + goal + '</b><span>每日目标</span></div></div>' +
      '<div class="bar mt"><i style="width:' + pct + '%"></i></div></div>';

    var wbN = allWords().filter(function (w) { return w.tags.indexOf('错题本') >= 0; }).length;
    if (wbN) {
      h += '<div class="card"><h3>🗂 错题本 <span class="pill bad">' + wbN + ' 词</span></h3>' +
        '<div class="muted mb">答错的词会自动进这里，集中攻克。</div>' +
        '<button class="btn block" data-act="quickPractice" data-scope="wrongbook">只练错题</button></div>';
    }

    if (due.length) {
      h += '<div class="card"><h3>⏰ 该复习了 <span class="pill">' + due.length + ' 词到期</span></h3>' +
        '<div class="muted mb">按遗忘曲线，今天这些词不练就会忘。</div>' +
        '<button class="btn block" data-act="quickPractice" data-scope="due">立即复习</button></div>';
    }

    // 登录条：未登录醒目提示，已登录显示身份
    if (S.token && S.user) {
      h += '<div class="card" style="border-left:4px solid #12b886">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="flex:1"><b>' + esc(S.user.nickname || S.user.username) + '</b>' +
        '<div class="muted" style="font-size:12.5px">已登录 · ' + esc(S.user.username) +
        '　词库数据归此账号</div></div>' +
        '<button class="btn sm gray" data-act="doLogout">退出</button></div></div>';
    } else {
      h += '<div class="card" style="border-left:4px solid #f0a500">' +
        '<div style="display:flex;align-items:center;gap:10px">' +
        '<div style="flex:1"><b>未登录</b>' +
        '<div class="muted" style="font-size:12.5px">当前是临时库，换设备或清缓存会丢失。' +
        '登录后数据归你账号所有。</div></div>' +
        '<button class="btn sm" data-act="goLogin">登录 / 注册</button></div></div>';
    }

    h += nextStepCard();

    h += '<div class="card"><h3>➕ 加入今日单词</h3>' +
      '<textarea id="inWords" placeholder="一次可粘贴多个，用空格 / 逗号 / 换行分隔&#10;例：negotiate, strawberry, variable, function"></textarea>' +
      '<label class="f">标签（可多选，方便和课堂/考试对应）</label>' +
      '<div class="chips" id="tagPick">' + S.tags.map(function (t) {
        return '<button class="chip' + (PICK.indexOf(t) >= 0 ? ' on' : '') + '" data-act="pickTag" data-t="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('') + '<button class="chip add" data-act="newTag">+ 新标签</button></div>' +
      '<div class="row mt"><button class="btn" data-act="addWords">加入词库</button>' +
      '<button class="btn gray" data-act="clearIn">清空</button></div>' +
      '<div id="inCheck" class="mt"></div>' +
      '<div class="muted mt">系统会自动查中文意思与音标；<b style="color:#f0454c">红色</b>表示词库里查不到，' +
      '会标为「待补全」，可手动填写或联网补全。</div></div>';

    h += '<div class="card"><h3>📋 今日词表 <span class="pill">' + ids.length + '</span></h3>';
    if (!ids.length) {
      h += '<div class="empty">今天还没有单词。<br>把课堂或自学遇到的词粘进来吧。</div>' +
        '<div class="row mt center"><button class="btn sm" data-act="goHomeAdd2">填入示例词</button></div>';
    } else {
      h += ids.map(function (id) {
        var w = S.words[id]; if (!w) return '';
        return '<div class="w"><div class="wb"><div class="ww">' + esc(w.w) +
          (w.base ? ' <span class="tag">' + esc(w.base) + ' 的变形</span>' : '') + '</div>' +
          (w.ph ? '<div class="wp">/' + esc(w.ph) + '/</div>' : '') +
          '<div class="wc">' + (w.cn ? esc(w.cn) : '<span class="pill bad">待补全</span>') + '</div>' +
          '<div>' + w.tags.map(function (t) { return '<span class="tag b">' + esc(t) + '</span>'; }).join('') + '</div></div>' +
          '<div class="act"><button class="iconbtn" data-act="speak" data-w="' + esc(w.w) + '">🔊</button>' +
          '<button class="iconbtn" data-act="editWord" data-id="' + id + '">✏️</button></div></div>';
      }).join('');
      h += '<div class="row mt"><button class="btn" data-act="quickPractice" data-scope="today">练习今日单词</button>' +
        '<button class="btn light" data-act="goPractice">更多练习</button></div>';
    }
    h += '</div>';

    // 最近 7 天
    var days = Object.keys(S.daily).sort().reverse().slice(0, 7);
    if (days.length > 1) {
      h += '<div class="card"><h3>📅 最近记录</h3>' + days.map(function (d) {
        return '<div class="list-item"><div class="t"><b>' + d + '</b><span>' + S.daily[d].length + ' 个单词</span></div>' +
          '<button class="btn sm gray" data-act="practiceDay" data-d="' + d + '">练习</button></div>';
      }).join('') + '</div>';
    }
    return h;
  }

  var PICK = (S.tags && S.tags[0]) ? [S.tags[0]] : [];
  var ACT = {};

  ACT.pickTag = function (el) {
    var t = el.dataset.t;
    var i = PICK.indexOf(t);
    if (i >= 0) PICK.splice(i, 1); else PICK.push(t);
    Array.prototype.forEach.call(document.querySelectorAll('#tagPick .chip'), function (c) {
      if (c.dataset.t) c.classList.toggle('on', PICK.indexOf(c.dataset.t) >= 0);
    });
  };
  ACT.newTag = function () {
    var t = prompt('新标签名（如：Unit 3、专升本核心、Python）');
    if (!t) return;
    t = t.trim();
    if (t && S.tags.indexOf(t) < 0) { S.tags.push(t); save(); }
    if (t && PICK.indexOf(t) < 0) PICK.push(t);
    render();
  };
  ACT.clearIn = function () { $('#inWords').value = ''; };
  ACT.speak = function (el) { speak(el.dataset.w); };

  ACT.addWords = function () {
    var raw = ($('#inWords').value || '').trim();
    if (!PICK.length) { PICK = [S.tags[0]].filter(Boolean); }
    if (!raw) { alert('请先输入或粘贴单词'); return; }
    var list = raw.split(/[\s,，;；\n\t、\/]+/).map(function (s) {
      return s.trim().toLowerCase().replace(/^[^a-z]+|[^a-z\-']+$/g, '');
    }).filter(function (s) { return s && /^[a-z]/.test(s); });
    var seen = {}, uniq = [];
    list.forEach(function (w) { if (!seen[w]) { seen[w] = 1; uniq.push(w); } });
    if (!uniq.length) { alert('没有识别到英文单词'); return; }
    var found = [], miss = [];
    uniq.forEach(function (w) {
      var r = lookup(w);
      if (r && r.found) {
        addWord(w, r.cn, r.ph, PICK.slice(), r.base ? { base: r.base } : null);
        found.push(w);
      } else {
        addWord(w, '', '', PICK.slice());
        miss.push(w);
      }
    });
    $('#inWords').value = '';
    render();
    if (miss.length) {
      setTimeout(function () {
        autoFill(miss);
        toast('已加入 ' + uniq.length + ' 词，其中 ' + miss.length + ' 个本地未收录，正在联网补全…');
      }, 60);
    } else {
      toast('已加入 ' + found.length + ' 个单词');
    }
    setTimeout(function () { nearTip(uniq); }, 700);
  };

  function nearTip(words) {
    var pairs = [];
    (words || []).forEach(function (w) {
      var ns = nearWords(w, 3);
      if (ns.length) pairs.push({ w: w, ns: ns });
    });
    if (!pairs.length) return;
    var box = document.createElement('div');
    box.id = 'nearBox';
    box.style.cssText = 'position:fixed;inset:0;z-index:190;background:rgba(20,26,40,.45);' +
      'display:flex;align-items:center;justify-content:center;padding:22px';
    var h = '<div style="background:#fff;border-radius:14px;padding:18px;max-width:340px;' +
      'width:100%;max-height:70vh;overflow:auto">' +
      '<div style="font-weight:600;font-size:14.5px;margin-bottom:8px">⚠️ 有词长得很像</div>' +
      '<div class="muted" style="font-size:12.5px;margin-bottom:12px;line-height:1.7">' +
      '形近词最容易混，放一起看一眼反而记得更牢。</div>';
    pairs.forEach(function (pr) {
      h += '<div style="margin-bottom:12px"><div style="font-weight:600;font-size:14px">' +
        esc(pr.w) + '</div>';
      pr.ns.forEach(function (n) {
        h += '<div class="muted" style="font-size:12.5px;padding:3px 0 3px 10px;' +
          'border-left:2px solid #e8ecf4;margin-top:3px">vs <b>' + esc(n.w) + '</b>　' +
          esc(shortCn(n.cn)) + '</div>';
      });
      h += '</div>';
    });
    h += '<button class="btn block gray mt" id="nearOk">知道了</button></div>';
    box.innerHTML = h;
    document.body.appendChild(box);
    document.getElementById('nearOk').onclick = function () { box.remove(); };
  }
  /* 输入时实时检查：存在的绿色，查不到的红色 */
  ACT.checkIn = function () {
    var box = $('#inCheck'); if (!box) return;
    var raw = ($('#inWords').value || '').trim();
    if (!raw) { box.innerHTML = ''; return; }
    var list = raw.split(/[\s,，;；\n\t、\/]+/).map(function (s) {
      return s.trim().toLowerCase().replace(/^[^a-z]+|[^a-z\-']+$/g, '');
    }).filter(function (s) { return s && /^[a-z]/.test(s); });
    var seen = {}, uniq = [];
    list.forEach(function (w) { if (!seen[w]) { seen[w] = 1; uniq.push(w); } });
    var okN = 0, missN = 0, h = '';
    uniq.slice(0, 60).forEach(function (w) {
      var r = lookup(w);
      if (r && r.found) {
        okN++;
        h += '<span class="chip" style="background:#e6f9f1;color:#0a8a5f">' + esc(w) + '</span> ';
      } else {
        missN++;
        h += '<span class="chip" style="background:#ffecec;color:#c92a2a;border:1px solid #ffc9c9">' +
          esc(w) + ' ?</span> ';
      }
    });
    if (uniq.length > 60) h += '<span class="muted">…还有 ' + (uniq.length - 60) + ' 个</span>';
    var head = '<div class="muted" style="font-size:12.5px;margin-bottom:6px">实时检查：' +
      '<b style="color:#0a8a5f">' + okN + ' 个已收录</b>' +
      (missN ? '　<b style="color:#f0454c">' + missN + ' 个查不到</b>' : '') + '</div>';
    box.innerHTML = head + '<div class="chips">' + h + '</div>';
  };
  ACT.editWord = function (el) { editWord(el.dataset.id); };
  ACT.quickPractice = function (el) { startPractice(el.dataset.scope || 'today'); };
  ACT.practiceDay = function (el) { startPractice('day', el.dataset.d); };
  ACT.goPractice = function () { go('practice'); };

  function editWord(id) {
    var w = S.words[id]; if (!w) return;
    var cn = prompt('中文意思', w.cn || '');
    if (cn === null) return;
    var ph = prompt('音标（可留空）', w.ph || '');
    if (ph === null) ph = w.ph;
    w.cn = cn.trim(); w.ph = ph.trim();
    save(); render();
  }

  function autoFill(list) {
    list.forEach(function (w) {
      online(w).then(function (r) {
        var e = allWords().filter(function (x) { return x.w === w; })[0];
        if (!e) return;
        if (r && r.ph && !e.ph) e.ph = r.ph;
        if (r && r.en && !e.cn) e.cn = r.en;
        save();
        if (TAB === 'home') render();
      });
    });
  }

  var toastT;
  function toast(msg) {
    var d = document.createElement('div');
    d.style.cssText = 'position:fixed;left:50%;top:12%;transform:translateX(-50%);background:rgba(28,35,51,.92);color:#fff;padding:10px 16px;border-radius:10px;font-size:14px;z-index:999;max-width:80%;text-align:center';
    d.textContent = msg;
    document.body.appendChild(d);
    clearTimeout(toastT);
    toastT = setTimeout(function () { d.remove(); }, 2200);
  }

  /* ---------------- 练习 ---------------- */
  var QZ = null;
  var MODES = [
    { k: 'word2cn', n: '看词选义', d: '显示单词，选中文' },
    { k: 'ph2cn', n: '看音标选义', d: '显示音标，选中文' },
    { k: 'au2cn', n: '听音选义', d: '听发音，选中文' },
    { k: 'cn2sp', n: '看义拼写', d: '看中文，写单词' },
    { k: 'au2sp', n: '听音拼写', d: '听发音，写单词' },
    { k: 'ph2sp', n: '看音标拼写', d: '看音标，写单词' }
  ];

  function viewPractice() {
    if (QZ) return viewQuiz();
    var h = '';
    h += '<div class="card"><h3>🎯 选词范围</h3>' +
      '<div class="scroll-x">' +
      ['today:今日单词', 'due:待复习', 'wrongbook:错题本', 'all:全部词库'].map(function (s, i) {
        var kv = s.split(':');
        return '<button class="chip' + (i === 0 ? ' on' : '') + '" data-act="pickScope" data-v="' + kv[0] + '">' + kv[1] + '</button>';
      }).join('') + '</div>';
    if (S.tags.length) {
      h += '<label class="f">按标签（可多选）</label><div class="scroll-x">' +
        '<button class="chip on" data-act="pickPTag" data-v="__all">全部</button>' +
        S.tags.map(function (t) { return '<button class="chip" data-act="pickPTag" data-v="' + esc(t) + '">' + esc(t) + '</button>'; }).join('') + '</div>';
    }
    h += '<div class="muted mt" id="poolInfo"></div></div>';

    h += '<div class="card"><h3>📝 练习方向</h3>' +
      MODES.map(function (m) {
        var on = S.settings.modes.indexOf(m.k) >= 0;
        return '<div class="list-item"><div class="t"><b>' + m.n + '</b><span>' + m.d + '</span></div>' +
          '<button class="btn sm ' + (on ? '' : 'gray') + '" data-act="toggleMode" data-v="' + m.k + '">' + (on ? '已选' : '选择') + '</button></div>';
      }).join('') +
      '<div class="row mt"><button class="btn light sm" data-act="allModes">全选</button>' +
      '<button class="btn light sm" data-act="sel3">只练听+拼写</button></div></div>';

    h += '<div class="card"><button class="btn block" data-act="startQuiz">开始练习（' + (S.settings.round || 10) + ' 题）</button>' +
      '<div class="muted mt">提示：拼写题会按你的设置随机加「（复数）（过去式）」等提示，答案写对应形式；大小写不敏感。</div></div>';
    return h;
  }

  var PS = { scope: 'today', tag: '__all' };
  ACT.pickScope = function (el) {
    PS.scope = el.dataset.v;
    Array.prototype.forEach.call(app.querySelectorAll('[data-act=pickScope]'), function (c) { c.classList.toggle('on', c === el); });
    updPool();
  };
  ACT.pickPTag = function (el) {
    PS.tag = PS.tag === el.dataset.v ? '__all' : el.dataset.v;
    Array.prototype.forEach.call(app.querySelectorAll('[data-act=pickPTag]'), function (c) {
      c.classList.toggle('on', c.dataset.v === PS.tag);
    });
    updPool();
  };
  function updPool() {
    var n = poolOf(PS.scope, PS.tag).length;
    var el = $('#poolInfo');
    if (el) el.textContent = '当前可练 ' + n + ' 词' + (n ? '' : '（先去「今日」加词，或换范围）');
  }
  ACT.toggleMode = function (el) {
    var v = el.dataset.v, i = S.settings.modes.indexOf(v);
    if (i >= 0) { if (S.settings.modes.length > 1) S.settings.modes.splice(i, 1); }
    else S.settings.modes.push(v);
    save(); render();
  };
  ACT.allModes = function () { S.settings.modes = MODES.map(function (m) { return m.k; }); save(); render(); };
  ACT.sel3 = function () { S.settings.modes = ['au2cn', 'cn2sp', 'au2sp']; save(); render(); };

  function startPractice(scope, day) {
    var ids = scope === 'day' ? (S.daily[day] || []) : poolOf(scope || PS.scope, PS.tag);
    if (!ids.length) { toast('这个范围暂时没有单词'); return; }
    beginQuiz(ids);
    go('practice');
  }
  ACT.startQuiz = function () { startPractice(PS.scope); };

  function beginQuiz(ids) {
    var modes = S.settings.modes;
    var qs = [];
    ids.forEach(function (id) {
      var m = modes[Math.floor(Math.random() * modes.length)];
      var q = makeQ(id, m);
      if (q) qs.push(q);
    });
    QZ = { list: qs, i: 0, right: 0, wrong: [], done: false, pick: null, showFb: false };
    if (qs.length) setTimeout(function () { autoSpeak(qs[0]); }, 400);
  }

  function autoSpeak(q) {
    if (!q) return;
    if (q.mode === 'au2cn' || q.mode === 'au2sp') speak(q.word);
  }

  function viewQuiz() {
    var q = QZ.list[QZ.i];
    if (!q) return viewResult();
    var h = '';
    h += '<div class="card"><div class="q-top"><span>第 ' + (QZ.i + 1) + ' / ' + QZ.list.length + ' 题</span>' +
      '<span>✅ ' + QZ.right + '　❌ ' + QZ.wrong.length + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.round(QZ.i / QZ.list.length * 100) + '%"></i></div>';

    var isSp = /sp$/.test(q.mode);
    if (q.mode === 'word2cn') {
      h += '<div class="stem"><div class="big">' + esc(q.word) + '</div>' + (q.ph ? '<div class="ph">/' + esc(q.ph) + '/</div>' : '') + '</div>';
    } else if (q.mode === 'ph2cn') {
      h += '<div class="stem"><div class="ph" style="font-size:24px">/' + esc(q.ph || '—') + '/</div>' +
        '<div class="muted mt">这是哪个词的意思？</div></div>';
    } else if (q.mode === 'au2cn') {
      h += '<div class="stem"><button class="btn" data-act="replay">🔊 再听一次</button>' +
        '<div class="muted mt">听发音，选择正确的中文意思</div></div>';
    } else if (q.mode === 'cn2sp') {
      h += '<div class="stem"><div class="cn">' + esc(q.cnShow) + '</div>' +
        '<div class="muted mt">写出英文单词' + (q.inf ? '（注意形式）' : '') + '</div></div>';
    } else if (q.mode === 'au2sp') {
      h += '<div class="stem"><button class="btn" data-act="replay">🔊 播放单词</button>' +
        '<div class="muted mt">/' + esc(q.ph || '') + '/　听音写词</div></div>';
    } else if (q.mode === 'ph2sp') {
      h += '<div class="stem"><div class="ph" style="font-size:24px">/' + esc(q.ph || '—') + '/</div>' +
        '<div class="muted mt">看音标写单词' + (q.inf ? '（' + esc(q.infLabel) + '）' : '') + '</div></div>';
    }

    if (!isSp) {
      h += (q.options || []).map(function (o, i) {
        var cls = 'opt opt2';
        if (QZ.showFb) {
          if (o === q.answer) cls += ' ok';
          else if (QZ.pick === i) cls += ' bad';
          else cls += ' dis';
        } else if (QZ.pick === i) cls += ' sel';
        // 答题中只显示第一义项（训练快速识别），答完自动展开完整
        var show = QZ.showFb ? o : shortCn(o);
        var more = (!QZ.showFb && hasMoreCn(o));
        return '<button class="' + cls + '" data-act="choose" data-i="' + i + '">' +
          '<span class="optk">' + 'ABCD'[i] + '.</span>' +
          '<span class="optv">' + esc(show) + (more ? '<span class="optdot">⋯</span>' : '') + '</span>' +
          (more ? '<span class="optmore" data-act="showFullCn" data-w="" data-cn="' + esc(o) + '">全文</span>' : '') +
          '</button>';
      }).join('');
    } else {
      h += '<input class="big-inp" id="spIn" type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="输入单词">' +
        '<div class="row mt"><button class="btn" data-act="submitSp">提交</button>' +
        '<button class="btn gray" data-act="giveUp">看答案</button></div>';
    }

    if (QZ.showFb) {
      var w = S.words[q.id] || {};
      h += '<div class="fb ' + (QZ.fbOk ? 'ok' : 'bad') + '">' +
        '<b>' + esc(q.word) + '</b> /' + esc(q.ph || '') + '/ ' + (q.inf ? '　答案形式：<b>' + esc(q.ans) + '</b>（' + esc(q.infLabel) + '）' : '') +
        '<br>' + esc(q.cn || '') +
        '</div>';
      // 答错时给词根拆解（在做的过程中学技巧，而不是让用户去翻手册）
      if (!QZ.fbOk && typeof findRoots === 'function') {
        var roots = findRoots(q.word);
        if (roots.length) {
          h += '<div class="card" style="background:#f2f7ff;border-left:3px solid #3b6ef6">' +
            '<div style="font-weight:600;font-size:13.5px;margin-bottom:6px">💡 拆词记忆</div>' +
            roots.map(function (r) {
              return '<div style="font-size:13px;line-height:1.9"><b>' + esc(r.k) + '</b> = ' +
                esc(r.m) + ' <span class="muted">(' + esc(r.t) + ')</span></div>';
            }).join('') +
            '<div class="muted" style="font-size:12.5px;margin-top:6px;line-height:1.7">同根词：' +
            esc(roots[0].ex.slice(0, 4).join('　')) + '</div></div>';
        }
      }
      h +=
        '<div class="row mt"><button class="btn" data-act="next">' + (QZ.i + 1 >= QZ.list.length ? '看结果' : '下一题') + '</button>' +
        '<button class="btn gray" data-act="speakNow" data-w="' + esc(q.word) + '">🔊 读</button></div>';
    }
    h += '</div>';
    h += '<div class="center"><button class="btn sm gray" data-act="quitQuiz">结束练习</button></div>';
    if (isSp && !QZ.showFb) h += '<script>setTimeout(function(){var e=document.getElementById("spIn");if(e)e.focus();},80)<\/script>';
    return h;
  }

  ACT.replay = function () { autoSpeak(QZ.list[QZ.i]); };
  ACT.speakNow = function (el) { speak(el.dataset.w); };
  ACT.choose = function (el) {
    if (QZ.showFb) return;
    var i = +el.dataset.i, q = QZ.list[QZ.i];
    QZ.pick = i;
    var ok = q.options[i] === q.answer;
    QZ.showFb = true; QZ.fbOk = ok;
    if (ok) QZ.right++; else QZ.wrong.push({ id: q.id, mode: q.mode, word: q.word, cn: q.cn, ans: q.ans });
    review(q.id, ok);
    if (!ok) speak(q.word);
    render();
  };
  ACT.submitSp = function () {
    if (QZ.showFb) return;
    var v = ($('#spIn').value || '');
    var q = QZ.list[QZ.i];
    var ok = near(v, q.ans);
    QZ.showFb = true; QZ.fbOk = ok;
    if (ok) QZ.right++; else QZ.wrong.push({ id: q.id, mode: q.mode, word: q.word, cn: q.cn, ans: q.ans, mine: v });
    review(q.id, ok);
    if (!ok) speak(q.word);
    render();
  };
  ACT.giveUp = function () {
    var q = QZ.list[QZ.i];
    QZ.showFb = true; QZ.fbOk = false;
    QZ.wrong.push({ id: q.id, mode: q.mode, word: q.word, cn: q.cn, ans: q.ans, mine: '' });
    review(q.id, false);
    speak(q.word);
    render();
  };
  ACT.next = function () {
    QZ.i++; QZ.pick = null; QZ.showFb = false;
    if (QZ.i >= QZ.list.length) { QZ.done = true; return viewResult(), render(); }
    render();
    setTimeout(function () { autoSpeak(QZ.list[QZ.i]); }, 250);
  };
  ACT.quitQuiz = function () { QZ = null; render(); };

  function viewResult() {
    var total = QZ.list.length, r = QZ.right, pct = total ? Math.round(r / total * 100) : 0;
    var h = '<div class="card center"><h3 class="center" style="justify-content:center">🎉 本轮完成</h3>' +
      '<div class="stat"><div><b>' + r + '/' + total + '</b><span>正确</span></div>' +
      '<div><b>' + pct + '%</b><span>正确率</span></div>' +
      '<div><b>' + QZ.wrong.length + '</b><span>错题</span></div></div></div>';
    if (QZ.wrong.length) {
      h += '<div class="card"><h3>❌ 错题回顾</h3>' + QZ.wrong.map(function (w) {
        return '<div class="w"><div class="wb"><div class="ww">' + esc(w.word) + '</div>' +
          '<div class="wc">' + esc(w.cn || '') + (w.mine ? '　你写了：' + esc(w.mine) : '') + '</div></div>' +
          '<div class="act"><button class="iconbtn" data-act="speak" data-w="' + esc(w.word) + '">🔊</button></div></div>';
      }).join('') +
        '<button class="btn block mt" data-act="reDoWrong">只练这些错题</button></div>';
    }
    h += '<div class="row"><button class="btn block" data-act="again">再来一轮</button>' +
      '<button class="btn gray" data-act="quitQuiz">返回</button></div>';
    // 记录日志
    var d = today();
    S.log[d] = S.log[d] || { n: 0, ok: 0 };
    S.log[d].n += total; S.log[d].ok += r;
    save();
    return h;
  }
  ACT.again = function () { var ids = QZ.list.map(function (q) { return q.id; }); beginQuiz(shuf(ids)); render(); };
  ACT.reDoWrong = function () { var ids = QZ.wrong.map(function (w) { return w.id; }); beginQuiz(ids); render(); };

  /* ---------------- 真题 ---------------- */
  var PAPER_STATE = { view: 'list', cur: null, qi: 0, right: 0, wrong: [], fb: null };

  function loadBuiltin() {
    if (S.builtinLoaded) return;
    BUILTIN.forEach(function (p) {
      p.builtin = true;
      S.papers.push(p);
    });
    S.builtinLoaded = true;
    save();
  }
  loadBuiltin();

  function viewPaper() {
    if (PAPER_STATE.view === 'audio') return viewAudio();
    if (PAPER_STATE.view === 'quiz') return viewPaperQuiz();
    if (PAPER_STATE.view === 'result') return viewPaperResult();
    if (PAPER_STATE.view === 'edit') return viewPaperEdit();
    var h = '';
    h += '<div class="card"><h3>📄 题库</h3>';
    if (!S.papers.length) h += '<div class="empty">还没有试卷，先导入一套真题吧。</div>';
    h += S.papers.map(function (p) {
      var n = (p.items || []).length;
      var hasAudio = (p.items || []).some(function (i) { return i.type === '听力'; });
      return '<div class="list-item"><div class="t"><b>' + esc(p.name) + '</b>' +
        '<span>' + n + ' 题 · ' + (p.builtin ? '内置样题' : '我导入的') + ' · ' + esc(p.src || '') + '</span></div>' +
        '<div style="display:flex;gap:6px">' +
        (hasAudio ? '<button class="btn sm light" data-act="openAudio" data-id="' + p.id + '">🎧</button>' : '') +
        '<button class="btn sm" data-act="openPaper" data-id="' + p.id + '">练习</button>' +
        (p.builtin ? '' : '<button class="btn sm gray" data-act="delPaper" data-id="' + p.id + '">删</button>') + '</div></div>';
    }).join('');
    h += '</div>';

    h += '<div class="card"><h3>📥 导入试卷文件</h3>' +
      '<div class="card" style="background:#f7f9fd"><h3>📍 题目 / 音频 / 答案 分别在哪</h3>' +
      '<div class="muted" style="font-size:12.5px;line-height:1.9">' +
      '<b>题目</b>　下面选一种方式导入 → 存进「📝真题」列表<br>' +
      '<b>音频</b>　导入后点进这套卷 → 上传音频（存手机本地，离线可听）<br>' +
      '<b>答案</b>　整卷包(.json)自带；PDF/Word 解析出来的<b>没有答案</b>，需另配' +
      '</div></div>' +
      '<div class="muted mb">选一种方式把题目弄进来。解析都在<b>你手机上完成</b>，不上传任何服务器。</div>' +
      '<div class="chips mb">' +
      '<button class="chip' + (IMP_TYPE === 'json' ? ' on' : '') + '" data-act="impType" data-v="json">📦 整卷包(.json)</button>' +
      '<button class="chip' + (IMP_TYPE === 'pdf' ? ' on' : '') + '" data-act="impType" data-v="pdf">📄 PDF 真题</button>' +
      '<button class="chip' + (IMP_TYPE === 'docx' ? ' on' : '') + '" data-act="impType" data-v="docx">📝 Word 真题</button>' +
      '<button class="chip' + (IMP_TYPE === 'txt' ? ' on' : '') + '" data-act="impType" data-v="txt">✍️ 粘贴文字</button>' +
      '<button class="chip' + (IMP_TYPE === 'img' ? ' on' : '') + '" data-act="impType" data-v="img">🖼️ 图片/扫描件</button>' +
      '</div>' + impPanel() + '</div>';

    h += '<div class="card"><h3>⬆️ 粘贴真题文本</h3>' +
      '<div class="muted mb">把真题文字（PDF/图片用微信「提取文字」后复制）粘贴进来，程序会按题型自动切分，切完可手工校正。</div>' +
      '<input type="text" id="pName" placeholder="试卷名，如：2024年专升本英语真题">' +
      '<div class="row mt"><button class="btn sm light" data-act="setPType" data-v="zsb">专升本</button>' +
      '<button class="btn sm gray" data-act="setPType" data-v="cet4">英语四级</button></div>' +
      '<textarea id="pText" class="mt" placeholder="在此粘贴真题全文…"></textarea>' +
      '<div class="row mt"><button class="btn" data-act="parsePaper">解析并预览</button>' +
      '<button class="btn gray" data-act="demoText">填入示例</button></div></div>';

    h += '<div class="card"><h3>ℹ️ 关于真题</h3><div class="muted">' +
      '真题受版权保护，本应用不内置、不抓取往年真题。推荐流程：自己拿到真题文本 → 粘贴导入 → 永久保存在手机里随时练。<br><br>' +
      '内置的是<b>自编仿真样题</b>，用于熟悉题型与流程，不替代真题。</div></div>';
    return h;
  }

  /* ---- 懒加载解析库：只在需要时才下载，不拖慢主程序 ---- */
  var LIBS = {};
  function loadParseLib(kind) {
    var cfg = {
      pdf: ['lib/pdf.min.js'],   // worker 由 pdf.js 内部按 workerSrc 自行加载
      docx: ['lib/mammoth.min.js']
    }[kind];
    if (!cfg) return Promise.reject(new Error('未知类型'));
    var jobs = cfg.map(function (src) {
      if (LIBS[src]) return Promise.resolve();
      return new Promise(function (res, rej) {
        var sc = document.createElement('script');
        sc.src = src;
        sc.onload = function () { LIBS[src] = 1; res(); };
        sc.onerror = function () { rej(new Error('解析库加载失败：' + src)); };
        document.head.appendChild(sc);
      });
    });
    return Promise.all(jobs);
  }

  function impPanel() {
    var t = IMP_TYPE;
    if (t === 'json') {
      return '<div class="muted mb small">我整理好的整卷包，<b>含题目、答案、解析</b>，最完整。</div>' +
        '<button class="btn block light" data-act="importPaperFile">选择 .json 文件</button>';
    }
    if (t === 'pdf' || t === 'docx') {
      return '<div class="muted mb small">' +
        (t === 'pdf' ? '直接在手机上解析 PDF 文字层，自动拆题号和选项。<b>首次会下载约 1.4 MB 解析库</b>（之后就缓存了）。'
                     : '直接在手机上读 Word 内容，自动拆题号和选项。<b>首次会下载约 630 KB 解析库</b>。') +
        '<br>扫描版（图片型）PDF 没有文字层，解析不出来，那种要先 OCR。</div>' +
        '<button class="btn block light" data-act="importDocFile" data-kind="' + t + '">选择 .' + t + ' 文件</button>' +
        '<div id="impRes" class="mt"></div>';
    }
    if (t === 'img') {
      return '<div class="card" style="background:#fff8e6;border-left:3px solid #f0a500">' +
        '<div style="font-size:13.5px;line-height:1.8">' +
        '<b>先说清楚：图片不能直接变题目。</b><br>' +
        '扫描版 PDF、拍照、截图里面是<b>像素不是文字</b>，App 读不出内容，' +
        '必须先「认字」（OCR）转成文字，再粘进来。<br><br>' +
        '<b>最快：微信「提取文字」</b><br>' +
        '长按图片 → 提取文字 → 全选复制 → 回到本页选「✍️ 粘贴文字」粘进去。<br>' +
        '手机自带，不用装东西，识别率也不错。<br><br>' +
        '<b>批量：电脑端识别工具</b><br>' +
        '一次拖 8 张进去，自动去荧光笔、自动拼成完整文本，再复制过来。<br>' +
        '适合整套卷子、或者带荧光笔的资料。' +
        '</div></div>' +
        '<div class="row mt"><button class="btn light" data-act="impType" data-v="txt">去粘贴文字 →</button></div>';
    }
    // txt：粘贴
    return '<div class="muted mb small">从 WPS / PDF 里复制文字粘进来，自动按题号拆分。适合只要几道题的情况。</div>' +
      '<textarea id="impTxt" rows="6" placeholder="把题目文字粘进来，例如：&#10;46. What do we learn...?&#10;A) ...  B) ...  C) ...  D) ..."></textarea>' +
      '<label class="f mt">试卷名称</label>' +
      '<input type="text" id="impName" placeholder="例如：2025年6月四级第1套">' +
      '<div class="row mt"><button class="btn" data-act="importPasteText">解析并导入</button>' +
      '<button class="btn gray sm" data-act="fillSample">填入示例（先试一道）</button></div>' +
      '<div class="muted mt small">不确定格式对不对？先点「填入示例」试一道，能出来就是对的。</div>';
  }

  ACT.impType = function (el) { IMP_TYPE = el.dataset.v; render(); };

  /* 通用：把文本解析成试卷并存进去 */
  function addPaperFromText(txt, name) {
    var items = parseExam(txt);
    if (!items || !items.length) return 0;
    var p = {
      id: 'p' + Date.now(),
      name: name || ('导入试卷 ' + new Date().toLocaleDateString('zh-CN')),
      items: items,
      at: today()
    };
    S.papers.push(p); save();
    return items.length;
  }

  ACT.fillSample = function () {
    var ta = document.querySelector('#impTxt');
    if (ta) {
      ta.value = '46. What do we learn from new research about pandas?\n' +
        'A) They are losing habitat due to building roads.\n' +
        'B) They have stopped seeking new mates.\n' +
        'C) They may not adapt to fragmentation.\n' +
        'D) They may cease to exist from too good a life.';
    }
    var nm = document.querySelector('#impName');
    if (nm) nm.value = '测试-单题';
    toast('已填入示例，点「解析并导入」试试');
  };
  ACT.importPasteText = function () {
    var txt = ($('#impTxt').value || '').trim();
    if (!txt) { alert('请先粘贴题目文字'); return; }
    var n = addPaperFromText(txt, ($('#impName').value || '').trim());
    if (!n) { alert('没能识别出题目。请检查格式：题号要用「1.」或「46.」这种形式。'); return; }
    toast('已导入 ' + n + ' 道题');
    render();
  };

  ACT.importDocFile = function (btn) {
    var kind = btn.dataset.kind;
    var i = document.createElement('input');
    i.type = 'file';
    i.accept = kind === 'pdf' ? '.pdf,application/pdf' : '.docx,.doc,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    i.onchange = function () {
      var f = i.files[0]; if (!f) return;
      var box = document.getElementById('impRes');
      if (box) box.innerHTML = '<div class="muted">正在加载解析库…</div>';
      var fr = new FileReader();
      fr.onload = function () {
        var buf = fr.result;
        loadParseLib(kind).then(function () {
          if (box) box.innerHTML = '<div class="muted">正在解析 ' + esc(f.name) + '…</div>';
          if (kind === 'pdf') return parsePdfBuf(buf);
          return mammoth.extractRawText({ arrayBuffer: buf }).then(function (o) { return o.value; });
        }).then(function (txt) {
          if (!txt || !txt.trim()) throw new Error('这个文件里没有文字（可能是扫描版图片 PDF）');
          var n = addPaperFromText(txt, f.name.replace(/\.[^.]+$/, ''));
          if (!n) throw new Error('没识别出题目。可以改用「粘贴文字」手动整理。');
          toast('已导入 ' + n + ' 道题');
          render();
        }).catch(function (e) {
          if (box) box.innerHTML = '<div class="err" style="background:#fff0f0;color:#c92a2a;padding:10px;border-radius:8px;font-size:13px">' +
            '解析失败：' + esc(e.message || e) + '</div>';
        });
      };
      fr.readAsArrayBuffer(f);
    };
    i.click();
  };

  function parsePdfBuf(buf) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
    return pdfjsLib.getDocument({ data: buf }).promise.then(function (doc) {
      var jobs = [];
      for (var i = 1; i <= doc.numPages; i++) {
        jobs.push(doc.getPage(i).then(function (p) {
          return p.getTextContent().then(function (c) {
            return c.items.map(function (it) { return it.str; }).join('\n');
          });
        }));
      }
      return Promise.all(jobs).then(function (arr) { return arr.join('\n'); });
    });
  }

  ACT.importPaperFile = function () {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = '.json,application/json';
    i.onchange = function () {
      var f = i.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result);
          var ps = o.papers || (o.items ? [o] : null);
          if (!ps || !ps.length) throw 0;
          var added = 0, skipped = 0;
          ps.forEach(function (p) {
            if (!p.items || !p.items.length) return;
            if (S.papers.some(function (x) { return x.id === p.id; })) { skipped++; return; }
            p.items.forEach(function (it) { if (!it.id) it.id = uid(); });
            S.papers.push(p); added++;
          });
          save(); render();
          toast(added ? ('导入成功：新增 ' + added + ' 套' + (skipped ? '，跳过重复 ' + skipped + ' 套' : '')) : '这套试卷已经在题库里了');
        } catch (e) {
          alert('这个文件不是 .json 试卷包。\n\n' +
            '如果你手里是 PDF 或 Word 真题：\n' +
            '发给我（元宝），我帮你转成 .json，再回来导入。\n\n' +
            'JSON 是中间格式，App 只认它。');
        }
      };
      fr.readAsText(f);
    };
    i.click();
  };

  ACT.openAudio = function (el) {
    PAPER_STATE.pid = el.dataset.id;
    PAPER_STATE.view = 'audio';
    render();
  };

  function viewAudio() {
    var pid = PAPER_STATE.pid;
    var p = S.papers.filter(function (x) { return x.id === pid; })[0];
    if (!p) { PAPER_STATE.view = 'list'; return viewPaper(); }
    var rec = S.audio[pid] || { file: null, name: '', marks: {} };
    var listen = (p.items || []).filter(function (i) { return i.type === '听力'; });
    var marked = Object.keys(rec.marks || {}).length;
    var h = '';

    h += '<div class="card"><h3>🎧 听力音频 <span class="pill">' + esc(p.name) + '</span></h3>';
    if (rec.file) {
      h += '<div class="list-item"><div class="t"><b>' + esc(rec.name || '已上传音频') + '</b>' +
        '<span>已打点 ' + marked + ' / ' + listen.length + ' 题' + (rec.size ? '　' + (rec.size / 1048576).toFixed(1) + ' MB' : '') + '</span></div>' +
        '<button class="btn sm gray" data-act="delAudio">移除</button></div>';
    } else {
      h += '<div class="muted mb">这套试卷有 ' + listen.length + ' 道听力题，还没有音频。<br>' +
        '请找老师要音频文件（mp3 / m4a / wav 都行），在这里上传。<br>' +
        '<b>建议用 WiFi 上传一次</b>，之后会存在手机里，离线也能听。</div>' +
        '<button class="btn block" data-act="pickAudio">选择音频文件</button>';
    }
    h += '</div>';

    if (rec.file) {
      // 整段播放控制
      h += '<div class="card"><h3>▶️ 整段试听</h3>' +
        '<div class="row"><button class="btn light" data-act="auPlay">播放 / 暂停</button>' +
        '<button class="btn gray" data-act="auBack">⏪ 10 秒</button>' +
        '<button class="btn gray" data-act="auFwd">⏩ 10 秒</button></div>' +
        '<div class="muted mt" id="auTime">当前位置：--:--</div></div>';

      // 打点
      h += '<div class="card"><h3>📍 打点（把每题的开始位置标出来）</h3>' +
        '<div class="muted mb">边听边打点：听到第 N 题开始时，点一下右边的「标记」。<br>' +
        '打完点，做题时就能直接播放那一题，不用自己拖进度条。<br>' +
        '打点可以分几次做，随时能改。</div>';
      h += '<div class="center mb"><button class="btn block" data-act="auPlay">▶ 播放</button></div>';
      h += listen.map(function (it) {
        var t = rec.marks[it.no];
        return '<div class="list-item"><div class="t"><b>第 ' + it.no + ' 题</b>' +
          '<span>' + (t != null ? '已标记 ' + fmtT(t) : '未标记') + '</span></div>' +
          '<div style="display:flex;gap:6px">' +
          '<button class="btn sm ' + (t != null ? '' : 'gray') + '" data-act="markHere" data-no="' + it.no + '">' + (t != null ? '重标' : '标记') + '</button>' +
          (t != null ? '<button class="btn sm light" data-act="playMark" data-no="' + it.no + '">试听</button>' : '') +
          '</div></div>';
      }).join('');
      h += '<div class="row mt"><button class="btn" data-act="saveMarks">保存打点</button>' +
        '<button class="btn gray" data-act="backPaper">返回题库</button></div></div>';

      h += '<div class="card"><h3>💡 说明</h3><div class="muted">' +
        '音频存在手机本地（IndexedDB），<b>不占云端空间、不联网也能放</b>。<br>' +
        '但导出备份时<b>不含音频</b>——换手机要重新上传一次。<br>' +
        '如果老师给的是「每题一个文件」而不是一整段，也可以批量上传，按文件名里的数字自动匹配题号。</div>' +
        '<button class="btn block light mt" data-act="pickMulti">批量上传分题音频</button></div>';
    }
    return h;
  }
  function fmtT(s) {
    s = Math.round(s || 0);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  ACT.backPaper = function () { stopAudio(PAPER_STATE.pid); PAPER_STATE.view = 'list'; render(); };
  ACT.pickAudio = function () {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = 'audio/*,.mp3,.m4a,.wav,.aac';
    i.onchange = function () {
      var f = i.files[0]; if (!f) return;
      var id = 'a_' + uid();
      toast('正在保存音频…');
      putAudio(id, f).then(function () {
        S.audio[PAPER_STATE.pid] = { file: id, name: f.name, size: f.size, marks: {} };
        save(); render(); toast('音频已存到手机');
      }).catch(function () { alert('保存失败，可能是浏览器存储受限'); });
    };
    i.click();
  };
  ACT.pickMulti = function () {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = 'audio/*'; i.multiple = true;
    i.onchange = function () {
      var fs = Array.prototype.slice.call(i.files || []);
      if (!fs.length) return;
      toast('正在保存 ' + fs.length + ' 个音频…');
      var pid = PAPER_STATE.pid;
      var rec = S.audio[pid] || { file: null, name: '', marks: {} };
      rec.separate = rec.separate || {};
      var jobs = fs.map(function (f) {
        var id = 'a_' + uid();
        var m = (f.name.match(/(\d{1,2})/) || [])[1];
        return putAudio(id, f).then(function () { if (m) rec.separate[+m] = id; return true; });
      });
      Promise.all(jobs).then(function () {
        rec.name = '分题音频 × ' + fs.length;
        S.audio[pid] = rec; save(); render();
        toast('已保存，匹配到 ' + Object.keys(rec.separate).length + ' 题');
      });
    };
    i.click();
  };
  ACT.delAudio = function () {
    if (!confirm('移除这套试卷的音频和所有打点？')) return;
    var rec = S.audio[PAPER_STATE.pid];
    if (rec && rec.file) delAudio(rec.file);
    Object.keys(rec.separate || {}).forEach(function (k) { delAudio(rec.separate[k]); });
    if (AC[PAPER_STATE.pid] && AC[PAPER_STATE.pid].url) URL.revokeObjectURL(AC[PAPER_STATE.pid].url);
    delete AC[PAPER_STATE.pid];
    delete S.audio[PAPER_STATE.pid];
    save(); render();
  };
  ACT.auPlay = function () {
    var pid = PAPER_STATE.pid;
    loadPaperAudio(pid).then(function (a) {
      if (!a) { toast('没有音频'); return; }
      var el = a.el;
      el.playbackRate = S.settings.rate || 1;
      if (el.paused) { var p = el.play(); if (p && p.catch) p.catch(function () { }); }
      else el.pause();
      clearInterval(ACT._auTick);
      ACT._auTick = setInterval(function () {
        var t = document.getElementById('auTime');
        if (t) t.textContent = '当前位置：' + fmtT(el.currentTime) + (el.duration ? ' / ' + fmtT(el.duration) : '');
        else clearInterval(ACT._auTick);
      }, 400);
    });
  };
  ACT.auBack = function () {
    var a = AC[PAPER_STATE.pid]; if (a) a.el.currentTime = Math.max(0, a.el.currentTime - 10);
  };
  ACT.auFwd = function () {
    var a = AC[PAPER_STATE.pid]; if (a) a.el.currentTime = Math.min(a.el.duration || 0, a.el.currentTime + 10);
  };
  ACT.markHere = function (el) {
    var pid = PAPER_STATE.pid, no = +el.dataset.no;
    loadPaperAudio(pid).then(function (a) {
      if (!a) { toast('没有音频'); return; }
      var rec = S.audio[pid]; rec.marks = rec.marks || {};
      rec.marks[no] = Math.round(a.el.currentTime * 10) / 10;
      save(); render(); toast('第 ' + no + ' 题已标记在 ' + fmtT(rec.marks[no]));
    });
  };
  ACT.playMark = function (el) {
    var pid = PAPER_STATE.pid, no = +el.dataset.no;
    var rec = S.audio[pid];
    var p = S.papers.filter(function (x) { return x.id === pid; })[0];
    var listen = (p.items || []).filter(function (i) { return i.type === '听力'; }).map(function (i) { return i.no; });
    var idx = listen.indexOf(no);
    var nxt = idx >= 0 && idx < listen.length - 1 ? rec.marks[listen[idx + 1]] : null;
    playSeg(pid, rec.marks[no] || 0, nxt);
  };
  ACT.saveMarks = function () { save(); toast('打点已保存'); };

  /* 自定义确认框：比原生 confirm 可靠，安卓 WebView / 微信里也能弹 */
  function showConfirm(msg, onYes) {
    var old = document.getElementById('cfBox');
    if (old) old.remove();
    var box = document.createElement('div');
    box.id = 'cfBox';
    box.style.cssText = 'position:fixed;inset:0;z-index:200;background:rgba(20,26,40,.45);' +
      'display:flex;align-items:center;justify-content:center;padding:20px';
    box.innerHTML = '<div style="background:#fff;border-radius:14px;padding:18px;max-width:320px;width:100%">' +
      '<div style="font-size:14.5px;line-height:1.6;margin-bottom:16px">' + esc(msg) + '</div>' +
      '<div style="display:flex;gap:8px">' +
      '<button id="cfNo" style="flex:1;background:#eef1f7;color:#1c2333;border:none;border-radius:9px;padding:11px;font-size:14px">取消</button>' +
      '<button id="cfYes" style="flex:1;background:#f0454c;color:#fff;border:none;border-radius:9px;padding:11px;font-size:14px;font-weight:500">删除</button>' +
      '</div></div>';
    document.body.appendChild(box);
    document.getElementById('cfNo').onclick = function () { box.remove(); };
    document.getElementById('cfYes').onclick = function () { box.remove(); onYes(); };
  }

  var PTYPE = 'zsb';
  ACT.setPType = function (el) {
    PTYPE = el.dataset.v;
    Array.prototype.forEach.call(app.querySelectorAll('[data-act=setPType]'), function (b) {
      b.className = 'btn sm ' + (b.dataset.v === PTYPE ? '' : 'gray');
    });
  };
  ACT.demoText = function () {
    $('#pText').value = 'Part I Vocabulary and Structure\n1. It is high time that we ______ measures to protect the environment.\nA. take  B. took  C. will take  D. have taken\n2. The book ______ by the famous writer is very popular.\nA. writing  B. written  C. to write  D. writes\n参考答案：1-2 B B';
  };
  ACT.parsePaper = function () {
    var txt = ($('#pText').value || '').trim();
    if (txt.length < 20) { alert('请粘贴真题文本'); return; }
    var name = ($('#pName').value || '').trim() || ('我的真题 ' + today());
    var items = parseExam(txt);
    PAPER_STATE.cur = { id: uid(), name: name, src: PTYPE === 'zsb' ? '专升本' : '四级', items: items };
    PAPER_STATE.view = 'edit';
    render();
    toast('解析出 ' + items.length + ' 题，请核对后保存');
  };

  /** 真题解析：按题型关键词 + 题号切分 */
  function parseExam(txt) {
    txt = txt.replace(/\r/g, '').replace(/[ \t]+/g, ' ');
    var SEC = [
      { k: /词汇与语法|Vocabulary\s*(and|&)\s*Structure|语法词汇|单项选择|Part\s*I\b/i, t: '词汇语法' },
      { k: /完形填空|Cloze| cloze/i, t: '完形填空' },
      { k: /阅读理解|Reading Comprehension|Passage\s*(One|Two|Three|1|2|3)/i, t: '阅读理解' },
      { k: /翻译|Translation|汉译英|英译汉/i, t: '翻译' },
      { k: /写作|Writing|作文/i, t: '写作' }
    ];
    // 按题号切块
    var lines = txt.split('\n');
    var blocks = [], cur = null;
    var numRe = /^\s*(\d{1,2})\s*[\.、．\)]\s*(.*)$/;
    lines.forEach(function (ln) {
      var m = ln.match(numRe);
      if (m) {
        if (cur) blocks.push(cur);
        cur = { no: +m[1], text: m[2] || '', lines: [] };
      } else if (cur) {
        cur.lines.push(ln);
      }
    });
    if (cur) blocks.push(cur);

    var items = blocks.map(function (b) {
      var body = [b.text].concat(b.lines).join('\n');
      var type = '词汇语法';
      for (var i = 0; i < SEC.length; i++) if (SEC[i].k.test(body.slice(0, 200))) { type = SEC[i].t; break; }
      // 选项
      var options = [], ans = '';
      var re = /([A-D])\s*[\.、．\)：:]\s*(.*?)(?=(?:\s{2,}|\s)[A-D]\s*[\.、．\)：:]|$)/gm, mm;
      while ((mm = re.exec(body))) {
        options.push({ k: mm[1], v: mm[2].trim() });
      }
      var seenK = {};
      options = options.filter(function (o) { if (seenK[o.k]) return false; seenK[o.k] = 1; return true; });
      // 题干 = 第一个选项之前的部分
      var stem = body;
      if (options.length) {
        var idx = body.search(/[A-D]\s*[\.、．\)：:]\s*/);
        stem = body.slice(0, idx);
      }
      stem = stem.replace(/\s+/g, ' ').trim();
      return {
        id: uid(), no: b.no, type: type, stem: stem || body.slice(0, 120),
        passage: '', options: options, ans: ans, explain: ''
      };
    });

    // 匹配答案
    var all = txt.match(/(?:参考答案|答案|Keys?|Answer)[^\n]*(?:\n[^\n]*){0,15}/i);
    if (all) {
      var seg = all[0];
      var pairs = {};
      var r1 = /(\d{1,2})\s*[-~—]\s*(\d{1,2})\s*[:：]?\s*([A-D\s]{1,12})/g, m1;
      while ((m1 = r1.exec(seg))) {
        var a = +m1[1], b2 = +m1[2], s = m1[3].replace(/\s/g, '');
        for (var i = 0; i < s.length && a + i <= b2; i++) pairs[a + i] = s[i];
      }
      var r2 = /(\d{1,2})\s*[\.、．\)]\s*([A-D])/g, m2;
      while ((m2 = r2.exec(seg))) pairs[+m2[1]] = m2[2];
      items.forEach(function (it) { if (pairs[it.no]) it.ans = pairs[it.no]; });
    }
    return items;
  }

  function viewPaperEdit() {
    var p = PAPER_STATE.cur;
    var h = '<div class="card"><h3>✏️ 校正题目 <span class="pill">' + p.items.length + ' 题</span></h3>' +
      '<div class="muted mb">核对题型、选项与答案；答案留空的题只做练习不判分。</div>';
    h += p.items.map(function (it, i) {
      return '<div class="card" style="box-shadow:none;border:1px solid var(--line);padding:12px">' +
        '<div class="row" style="align-items:center"><b style="flex:0 0 auto">' + (i + 1) + '.</b>' +
        '<select data-chg="setType" data-i="' + i + '" style="flex:1">' +
        ['词汇语法', '完形填空', '阅读理解', '翻译', '写作'].map(function (t) {
          return '<option' + (t === it.type ? ' selected' : '') + '>' + t + '</option>';
        }).join('') + '</select></div>' +
        '<div class="q-text mt">' + esc(it.stem) + '</div>' +
        (it.options || []).map(function (o) { return '<div class="small" style="padding:3px 0">' + o.k + '. ' + esc(o.v) + '</div>'; }).join('') +
        '<div class="row mt" style="align-items:center">' +
        '<input type="text" value="' + esc(it.ans) + '" placeholder="答案" data-chg="setAns" data-i="' + i + '" style="flex:1">' +
        '<button class="btn sm gray" data-act="delItem" data-i="' + i + '">删除</button></div></div>';
    }).join('');
    h += '<div class="row"><button class="btn" data-act="savePaper">保存到题库</button>' +
      '<button class="btn gray" data-act="cancelPaper">放弃</button></div></div>';
    return h;
  }
  ACT.setType = function (el) { PAPER_STATE.cur.items[+el.dataset.i].type = el.value; };
  ACT.setAns = function (el) { PAPER_STATE.cur.items[+el.dataset.i].ans = el.value.trim().toUpperCase(); };
  ACT.delItem = function (el) { PAPER_STATE.cur.items.splice(+el.dataset.i, 1); render(); };
  ACT.savePaper = function () {
    var p = PAPER_STATE.cur;
    if (!p.items.length) { alert('没有题目'); return; }
    p.items = p.items.filter(function (it) { return it.stem; });
    S.papers.push(p); save();
    PAPER_STATE.view = 'list'; PAPER_STATE.cur = null;
    render(); toast('已保存：' + p.name);
  };
  ACT.cancelPaper = function () { PAPER_STATE.view = 'list'; PAPER_STATE.cur = null; render(); };
  ACT.delPaper = function (el) {
    if (!confirm('删除这套题？')) return;
    S.papers = S.papers.filter(function (p) { return p.id !== el.dataset.id; });
    save(); render();
  };

  // 试卷练习
  var PFLT = '__all';
  ACT.openPaper = function (el) {
    var p = S.papers.filter(function (x) { return x.id === el.dataset.id; })[0];
    if (!p) return;
    PAPER_STATE.pid = p.id;
    PAPER_STATE.view = 'quiz';
    PFLT = '__all';
    beginPaper(p, PFLT);
    render();
  };
  function beginPaper(p, flt) {
    var items = (p.items || []).filter(function (it) { return flt === '__all' || it.type === flt; });
    PAPER_STATE.qs = items; PAPER_STATE.qi = 0; PAPER_STATE.right = 0; PAPER_STATE.wrong = []; PAPER_STATE.fb = null;
  }
  function viewPaperQuiz() {
    var p = S.papers.filter(function (x) { return x.id === PAPER_STATE.pid; })[0];
    if (!p) { PAPER_STATE.view = 'list'; return viewPaper(); }
    var items = PAPER_STATE.qs || [];
    if (PAPER_STATE.qi >= items.length) { PAPER_STATE.view = 'result'; return viewPaperResult(); }
    var it = items[PAPER_STATE.qi];
    // 题型筛选栏
    var types = {};
    (p.items || []).forEach(function (x) { types[x.type] = (types[x.type] || 0) + 1; });
    var h = '<div class="card"><div class="q-top"><span>' + esc(p.name) + '</span><span>' +
      (PAPER_STATE.qi + 1) + ' / ' + items.length + '</span></div>' +
      '<div class="bar"><i style="width:' + Math.round(PAPER_STATE.qi / items.length * 100) + '%"></i></div>' +
      '<div class="scroll-x">' + '<button class="chip' + (PFLT === '__all' ? ' on' : '') + '" data-act="setFlt" data-v="__all">全部</button>' +
      Object.keys(types).map(function (t) {
        return '<button class="chip' + (PFLT === t ? ' on' : '') + '" data-act="setFlt" data-v="' + esc(t) + '">' + esc(t) + ' ' + types[t] + '</button>';
      }).join('') + '</div></div>';

    if (it.type === '听力' && S.audio[p.id]) {
      var mk = (S.audio[p.id].marks || {})[it.no];
      h += '<div class="card" style="padding:12px"><div class="row">' +
        '<button class="btn light" data-act="qPlay">' + (mk != null ? '▶ 播放本题（' + fmtT(mk) + '）' : '▶ 播放听力') + '</button>' +
        '<button class="btn gray" data-act="qStop" style="flex:0 0 auto">⏹</button></div>' +
        (mk == null ? '<div class="muted mt">还没打点，播放将从头开始。去「🎧」里标记每题位置更好用。</div>' : '') +
        '</div>';
    }
    h += '<div class="card"><div class="small muted mb">' + esc(it.type) + (it.no ? ' · 第' + it.no + '题' : '') + '</div>' +
      '<div class="q-text">' + esc(it.stem) + '</div>';
    if (it.passage) h += '<div class="q-text mt" style="color:var(--sub)">' + esc(it.passage) + '</div>';
    if ((it.options || []).length) {
      h += (it.options).map(function (o, i) {
        var cls = 'opt';
        if (PAPER_STATE.fb) {
          if (it.ans && o.k === it.ans) cls += ' ok';
          else if (PAPER_STATE.fb === o.k) cls += ' bad';
          else cls += ' dis';
        }
        return '<button class="' + cls + '" data-act="pChoose" data-k="' + o.k + '">' + o.k + '. ' + esc(o.v) + '</button>';
      }).join('');
    } else {
      h += '<textarea id="pAns" placeholder="写下你的答案（翻译/写作题自评）"></textarea>' +
        '<div class="row mt"><button class="btn" data-act="pSelf">我写完了，看参考答案</button></div>';
    }
    if (PAPER_STATE.fb) {
      var okk = it.ans && PAPER_STATE.fb === it.ans;
      if (it.ans) {
        h += '<div class="fb ' + (okk ? 'ok' : 'bad') + '">' +
          (okk ? '✅ 正确' : '❌ 正确答案 ' + it.ans) +
          (it.explain ? '<br>' + esc(it.explain) : '') + '</div>';
      } else if (it._self) {
        h += '<div class="fb ' + (it._self === 'ok' ? 'ok' : 'bad') + '">' +
          (it._self === 'ok' ? '✅ 你判为答对' : '❌ 你判为答错（已进错题本）') +
          (it.explain ? '<br>' + esc(it.explain) : '') + '</div>';
      } else if (PAPER_STATE.needSelf) {
        h += '<div class="fb">这套卷子没有提供答案，你自己判一下：</div>' +
          '<div class="row"><button class="btn" data-act="pSelfOk">✅ 我答对了</button>' +
          '<button class="btn gray" data-act="pSelfBad">❌ 我答错了</button></div>';
      } else {
        h += '<div class="fb">' + (it.explain ? esc(it.explain) : '（无标准答案）') + '</div>';
      }
      h += '<div class="row mt"><button class="btn" data-act="pNext">' + (PAPER_STATE.qi + 1 >= items.length ? '看结果' : '下一题') + '</button></div>';
    }
    h += '</div><div class="center"><button class="btn sm gray" data-act="pQuit">返回题库</button></div>';
    return h;
  }
  ACT.qPlay = function () {
    var p = S.papers.filter(function (x) { return x.id === PAPER_STATE.pid; })[0];
    var it = PAPER_STATE.qs[PAPER_STATE.qi];
    var rec = S.audio[p.id] || {};
    if (rec.separate && rec.separate[it.no]) {
      getAudio(rec.separate[it.no]).then(function (blob) {
        if (!blob) return;
        stopAudio(p.id);
        var u = URL.createObjectURL(blob);
        var el = new Audio(u); el.playbackRate = S.settings.rate || 1; el.play();
        ACT._sep = el;
      });
      return;
    }
    var listen = (p.items || []).filter(function (i) { return i.type === '听力'; }).map(function (i) { return i.no; });
    var idx = listen.indexOf(it.no);
    var nxt = idx >= 0 && idx < listen.length - 1 ? (rec.marks || {})[listen[idx + 1]] : null;
    playSeg(p.id, (rec.marks || {})[it.no] || 0, nxt);
  };
  ACT.qStop = function () {
    stopAudio(PAPER_STATE.pid);
    if (ACT._sep) { try { ACT._sep.pause(); } catch (e) { } ACT._sep = null; }
  };
  ACT.goLogin = function () {
    go('me');
    setTimeout(function () {
      var el = document.querySelector('#auUser') || document.querySelector('#setApi');
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus(); }
      var c = document.querySelector('.card');
      var cards = document.querySelectorAll('.card');
      for (var i = 0; i < cards.length; i++) {
        if (cards[i].textContent.indexOf('云同步') >= 0) {
          cards[i].style.boxShadow = '0 0 0 3px rgba(59,110,246,.35)';
          setTimeout(function (x) { return function () { x.style.boxShadow = ''; }; }(cards[i]), 2200);
          break;
        }
      }
    }, 250);
  };
  ACT.setFlt = function (el) {
    PFLT = el.dataset.v;
    var p = S.papers.filter(function (x) { return x.id === PAPER_STATE.pid; })[0];
    beginPaper(p, PFLT);
    render();
  };
  ACT.pChoose = function (el) {
    if (PAPER_STATE.fb) return;
    var k = el.dataset.k, it = PAPER_STATE.qs[PAPER_STATE.qi];
    PAPER_STATE.fb = k;
    if (it.ans) {
      if (k === it.ans) PAPER_STATE.right++;
      else PAPER_STATE.wrong.push(it);
    } else {
      // 这套卷子没给答案（比如 PDF 里没答案区），让用户自己判
      PAPER_STATE.needSelf = true;
    }
    render();
  };
  ACT.pSelfOk = function () {
    var it = PAPER_STATE.qs[PAPER_STATE.qi];
    PAPER_STATE.needSelf = false; it._self = 'ok'; PAPER_STATE.right++;
    render(); toast('记为正答');
  };
  ACT.pSelfBad = function () {
    var it = PAPER_STATE.qs[PAPER_STATE.qi];
    PAPER_STATE.needSelf = false; it._self = 'bad'; PAPER_STATE.wrong.push(it);
    render(); toast('已加入错题');
  };
  ACT.pSelf = function () { PAPER_STATE.fb = 'self'; render(); };
  ACT.pNext = function () {
    PAPER_STATE.qi++; PAPER_STATE.fb = null;
    if (PAPER_STATE.qi >= (PAPER_STATE.qs || []).length) { PAPER_STATE.view = 'result'; }
    render();
  };
  ACT.pQuit = function () { ACT.qStop(); PAPER_STATE.view = 'list'; render(); };
  function viewPaperResult() {
    var tot = (PAPER_STATE.qs || []).length;
    var graded = (PAPER_STATE.qs || []).filter(function (i) { return i.ans || i._self; }).length;
    var h = '<div class="card center"><h3 style="justify-content:center">📊 本套结果</h3>' +
      '<div class="stat"><div><b>' + PAPER_STATE.right + '/' + graded + '</b><span>答对/可判分</span></div>' +
      '<div><b>' + tot + '</b><span>已练题数</span></div></div></div>';
    if (PAPER_STATE.wrong.length) {
      h += '<div class="card"><h3>❌ 错题</h3>' + PAPER_STATE.wrong.map(function (it) {
        return '<div class="list-item"><div class="t"><b>' + esc(it.stem.slice(0, 40)) + '…</b>' +
          '<span>正确：' + esc(it.ans) + '</span></div></div>';
      }).join('') + '</div>';
    }
    h += '<div class="row"><button class="btn" data-act="pAgain">再练一次</button>' +
      '<button class="btn gray" data-act="pQuit">返回</button></div>';
    return h;
  }
  ACT.pAgain = function () {
    var p = S.papers.filter(function (x) { return x.id === PAPER_STATE.pid; })[0];
    beginPaper(p, PFLT); PAPER_STATE.view = 'quiz'; render();
  };

  /* ---------------- 词库 ---------------- */
  var LIBQ = '', MYQ = '', LIBC = '', LIB_TAG = '', LIB_CHAR = '';
  var IMP_TYPE = 'json';
  /* 分页：看到哪加载到哪，接近底部就预加载下一批 */
  var LIB_PAGE = 1, PAGE_SIZE = 50;
  function resetPage() { LIB_PAGE = 1; }
  function initScroll() {
    if (typeof window === 'undefined' || !window.addEventListener) return;
    var t = null;
    window.addEventListener('scroll', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (TAB !== 'lib') return;
        var more = document.getElementById('libMore');
        if (!more) return;                       // 没有"加载更多"标记=已到底
        var r = more.getBoundingClientRect();
        // 距离底部 400px 就开始预加载，滚到时内容已就位
        if (r.top < window.innerHeight + 400) ACT.libMore();
      }, 120);
    });
  }

  function viewLib() {
    var h = '';
    var all = allWords();

    /* ---- 两级分类：标签=大类，首字母=小类 ---- */
    var byTag = {};
    all.forEach(function (w) {
      var ts = (w.tags && w.tags.length) ? w.tags : ['未分类'];
      ts.forEach(function (t) { (byTag[t] = byTag[t] || []).push(w); });
    });
    var tagKeys = Object.keys(byTag).sort(function (a, b) { return byTag[b].length - byTag[a].length; });

    // 大类导航（标签）
    h += '<div class="card"><h3>🏷 大类：标签</h3><div class="chips">' +
      '<button class="chip' + (LIB_TAG ? '' : ' on') + '" data-act="libTagPick" data-v="">全部 ' + all.length + '</button>' +
      tagKeys.map(function (t) {
        return '<button class="chip' + (LIB_TAG === t ? ' on' : '') + '" data-act="libTagPick" data-v="' + esc(t) + '">' +
          esc(t) + ' <span style="opacity:.6">' + byTag[t].length + '</span></button>';
      }).join('') + '</div></div>';

    var pool = LIB_TAG ? (byTag[LIB_TAG] || []) : all;

    // 小类导航（首字母），只在选定大类后出现
    var byChar = {};
    pool.forEach(function (w) {
      var c = (w.w || '').charAt(0).toLowerCase();
      if (!/[a-z]/.test(c)) c = '#';
      (byChar[c] = byChar[c] || []).push(w);
    });
    var charKeys = Object.keys(byChar).sort();
    if (charKeys.length > 1) {
      h += '<div class="card"><h3>🔤 小类：首字母</h3><div class="chips">' +
        '<button class="chip' + (LIB_CHAR ? '' : ' on') + '" data-act="libChar" data-v="">全部 ' + pool.length + '</button>' +
        charKeys.map(function (c) {
          return '<button class="chip' + (LIB_CHAR === c ? ' on' : '') + '" data-act="libChar" data-v="' + c + '">' +
            c.toUpperCase() + ' <span style="opacity:.6">' + byChar[c].length + '</span></button>';
        }).join('') + '</div></div>';
    }

    if (!all.length) {
      h += '<div class="card"><div class="empty">词库还是空的，去「今日」加词吧。</div></div>';
      return h;
    }

    /* ---- 单词列表：分页 ---- */
    var show = LIB_CHAR ? (byChar[LIB_CHAR] || []) : pool;
    show = show.slice().sort(function (a, b) { return a.w.localeCompare(b.w); });
    var total = show.length;
    var n = Math.min(LIB_PAGE * PAGE_SIZE, total);

    h += '<div class="card"><h3>📋 ' +
      (LIB_TAG ? esc(LIB_TAG) + ' · ' : '') + (LIB_CHAR ? LIB_CHAR.toUpperCase() + ' 开头 · ' : '') +
      '共 ' + total + ' 词 <span class="pill">已显示 ' + n + '</span></h3>';

    if (!total) {
      h += '<div class="empty">这一类还没有单词</div>';
    } else {
      h += show.slice(0, n).map(function (w) { return wordRow(w); }).join('');
      if (n < total) {
        h += '<div id="libMore" class="center muted mt" style="padding:14px">' +
          '<button class="btn light sm" data-act="libMore">加载更多（还有 ' + (total - n) + ' 个）</button>' +
          '<div class="muted" style="font-size:12px;margin-top:6px">继续下滑会自动加载</div></div>';
      } else {
        h += '<div class="center muted mt" style="padding:14px;font-size:12.5px">— 已全部显示 —</div>';
      }
    }
    h += '</div>';

    /* ---- 搜索 / 导入 / 查词 ---- */
    h += '<div class="card"><h3>🔍 在我的词库里搜索</h3>' +
      '<div class="row"><input type="text" id="myQ" placeholder="输单词或中文，实时筛选" ' +
      'value="' + esc(MYQ || '') + '" oninput="__APP__.act.filterMine(this.value)">' +
      (MYQ ? '<button class="btn gray" style="flex:0 0 auto" data-act="clearMyQ">清除</button>' : '') + '</div>' +
      '<div id="myOut" class="mt"></div></div>';

    h += '<div class="card"><h3>📥 导入词表（合并，不覆盖）</h3>' +
      '<div class="muted mb">把电脑识别工具导出的 .txt/.csv 传进来，会<b>追加</b>到现有词库。</div>' +
      '<button class="btn block light" data-act="importWordList">选择词表文件</button></div>';

    h += '<div class="card"><h3>📗 查词典（本地 12,619 词）</h3>' +
      '<div class="row"><input type="text" id="libQ" placeholder="查词库里有没有这个词" value="' + esc(LIBQ) + '">' +
      '<button class="btn" style="flex:0 0 auto" data-act="doSearch">查询</button></div>' +
      '<div id="searchOut" class="mt"></div></div>';

    return h;
  }

  ACT.libTagPick = function (el) {
    LIB_TAG = el.dataset.v; LIB_CHAR = ''; resetPage(); render();
  };
  ACT.libChar = function (el) {
    LIB_CHAR = (LIB_CHAR === el.dataset.v) ? '' : el.dataset.v;
    resetPage(); render();
  };
  ACT.libMore = function () {
    var all = allWords();
    var pool = all;
    if (LIB_TAG) pool = pool.filter(function (w) { return (w.tags || []).indexOf(LIB_TAG) >= 0; });
    if (LIB_CHAR) pool = pool.filter(function (w) {
      var c = (w.w || '').charAt(0).toLowerCase();
      return (c === LIB_CHAR) || (!/[a-z]/.test(c) && LIB_CHAR === '#');
    });
    if (LIB_PAGE * PAGE_SIZE < pool.length) { LIB_PAGE++; render(); }
  };
  ACT.clearMyQ = function () { MYQ = ''; render(); };
  ACT.filterMine = function (v) {
    MYQ = (v || '').trim().toLowerCase();
    var out = $('#myOut');
    if (!out) return;
    if (!MYQ) { out.innerHTML = ''; return; }
    var hit = allWords().filter(function (w) {
      return (w.w || '').toLowerCase().indexOf(MYQ) >= 0 ||
        (w.cn || '').toLowerCase().indexOf(MYQ) >= 0;
    });
    if (!hit.length) { out.innerHTML = '<div class="muted">没找到「' + esc(MYQ) + '」</div>'; return; }
    out.innerHTML = '<div class="muted" style="font-size:12.5px;margin-bottom:6px">找到 ' + hit.length + ' 个</div>' +
      hit.slice(0, 80).map(function (w) { return wordRow(w); }).join('') +
      (hit.length > 80 ? '<div class="muted center mt">仅显示前 80 个，再输几个字母缩小范围</div>' : '');
  };

  /* 单词行：带发音、编辑、删除 */
  function wordRow(w) {
    var lv = (w.box || 0) >= 5 ? '<span class="pill ok">已掌握</span>'
      : ((w.bad || 0) > (w.ok || 0) ? '<span class="pill bad">易错</span>'
        : '<span class="pill">Lv.' + (w.box || 0) + '</span>');
    return '<div class="w"><div class="wb"><div class="ww">' + esc(w.w) + ' ' + lv + '</div>' +
      (w.ph ? '<div class="wp">/' + esc(w.ph) + '/</div>' : '') +
      '<div class="wc">' + (w.cn ? esc(w.cn) : '<span class="pill bad">待补全</span>') + '</div>' +
      '<div>' + w.tags.map(function (t) { return '<span class="tag b">' + esc(t) + '</span>'; }).join('') + '</div></div>' +
      '<div class="act"><button class="iconbtn" data-act="speak" data-w="' + esc(w.w) + '">🔊</button>' +
      '<button class="iconbtn" data-act="editWord" data-id="' + w.id + '">✏️</button>' +
      '<button class="iconbtn" data-act="delWord" data-id="' + w.id + '">🗑</button></div></div>';
  }

  ACT.libChar = function (el) {
    LIBC = (LIBC === el.dataset.v) ? '' : el.dataset.v;
    render();
  };
  ACT.clearMyQ = function () { MYQ = ''; render(); };
  ACT.filterMine = function (v) {
    MYQ = (v || '').trim().toLowerCase();
    var out = $('#myOut');
    if (!out) return;
    if (!MYQ) { out.innerHTML = ''; return; }
    var all = allWords();
    var hit = all.filter(function (w) {
      return (w.w || '').toLowerCase().indexOf(MYQ) >= 0 ||
        (w.cn || '').toLowerCase().indexOf(MYQ) >= 0;
    });
    if (!hit.length) { out.innerHTML = '<div class="muted">没找到「' + esc(MYQ) + '」</div>'; return; }
    out.innerHTML = '<div class="muted" style="font-size:12.5px;margin-bottom:6px">找到 ' + hit.length + ' 个</div>' +
      hit.slice(0, 80).map(function (w) { return wordRow(w); }).join('') +
      (hit.length > 80 ? '<div class="muted center mt">仅显示前 80 个，再输几个字母缩小范围</div>' : '');
  };
  ACT.doSearch = function () {
    LIBQ = ($('#libQ').value || '').trim().toLowerCase();
    var out = $('#searchOut');
    if (!LIBQ) { out.innerHTML = ''; return; }
    var r = lookup(LIBQ);
    var hw = '<div class="w"><div class="wb"><div class="ww">' + esc(LIBQ) + '</div>' +
      (r && r.ph ? '<div class="wp">/' + esc(r.ph) + '/</div>' : '') +
      '<div class="wc">' + (r && r.cn ? esc(r.cn) : '<span class="pill bad">本地未收录</span>') +
      (r && r.base ? '　<span class="tag">' + esc(r.base) + ' 的变形</span>' : '') + '</div></div>' +
      '<div class="act"><button class="iconbtn" data-act="speak" data-w="' + esc(LIBQ) + '">🔊</button></div></div>';
    out.innerHTML = hw + '<div class="small muted" id="netTip">正在尝试联网补全…</div>' +
      '<div class="row mt"><button class="btn sm" data-act="addThis" data-w="' + esc(LIBQ) + '">加入今日单词</button></div>';
    if (!r || !r.found) {
      online(LIBQ).then(function (net) {
        var t = $('#netTip');
        if (t) t.innerHTML = (net.ph ? '联网音标：/' + esc(net.ph) + '/　' : '') + (net.en ? '英文释义：' + esc(net.en) : (net.ph ? '' : '联网也没查到，可手动填写中文意思'));
        if (net.ph) {
          var wp = out.querySelector('.wp');
          if (!wp) { var d = document.createElement('div'); d.className = 'wp'; d.textContent = '/' + net.ph + '/'; out.querySelector('.wb').insertBefore(d, out.querySelector('.wc')); }
        }
      });
    } else {
      var t2 = $('#netTip'); if (t2) t2.textContent = '来自本地离线词库（' + (r.book || '通用') + '）';
    }
  };
  ACT.addThis = function (el) {
    var w = el.dataset.w, r = lookup(w);
    addWord(w, r && r.cn, r && r.ph, [], null);
    toast('已加入今日单词');
  };
  ACT.libTag = function (el) {
    var t = el.dataset.v;
    var ws = allWords().filter(function (w) { return w.tags.indexOf(t) >= 0; });
    $('#tagOut').innerHTML = ws.length ? ws.map(function (w) {
      return '<div class="w"><div class="wb"><div class="ww">' + esc(w.w) + '</div><div class="wc">' + esc(w.cn || '') + '</div></div>' +
        '<div class="act"><button class="iconbtn" data-act="speak" data-w="' + esc(w.w) + '">🔊</button></div></div>';
    }).join('') + '<button class="btn block mt" data-act="practiceTag" data-v="' + esc(t) + '">练习「' + esc(t) + '」</button>'
      : '<div class="muted">该标签下暂无单词</div>';
    bind();
  };
  ACT.practiceTag = function (el) { PS.tag = el.dataset.v; PS.scope = 'all'; startPractice('all'); };
  /* 删除：不弹确认框，直接删 + 给 6 秒撤销窗口
     这是现代应用的标准做法（Gmail 首创）——比「确定删除吗」体验好得多：
     没有打断感，误删还能救回来。 */
  var UNDO = null, undoT = null;
  ACT.delWord = function (el) {
    var id = el.dataset.id;
    var w = S.words[id];
    if (!w) return;
    var backup = JSON.parse(JSON.stringify(w));
    var tag = LIB_TAG, ch = LIB_CHAR, page = LIB_PAGE;
    var name = w.w;
    delWord(id);
    render();
    showUndo('已删除「' + name + '」', function () {
      S.words[id] = backup;
      save();
      LIB_TAG = tag; LIB_CHAR = ch; LIB_PAGE = page;
      render();
      toast('已恢复 ' + name);
    });
  };

  function showUndo(msg, onUndo) {
    var old = document.getElementById('undoBar');
    if (old) old.remove();
    clearTimeout(undoT);
    var bar = document.createElement('div');
    bar.id = 'undoBar';
    bar.style.cssText = 'position:fixed;left:12px;right:12px;bottom:70px;z-index:160;' +
      'background:#1c2333;color:#fff;border-radius:11px;padding:12px 14px;' +
      'display:flex;align-items:center;gap:10px;box-shadow:0 6px 22px rgba(0,0,0,.28)';
    bar.innerHTML = '<div style="flex:1;font-size:13.5px">' + esc(msg) + '</div>' +
      '<button id="undoBtn" style="background:#3b6ef6;color:#fff;border:none;border-radius:8px;' +
      'padding:8px 14px;font-size:13.5px;font-weight:600">撤销</button>';
    document.body.appendChild(bar);
    document.getElementById('undoBtn').onclick = function () {
      clearTimeout(undoT); bar.remove(); onUndo();
    };
    undoT = setTimeout(function () {
      if (bar.parentNode) {
        bar.style.transition = 'opacity .3s'; bar.style.opacity = '0';
        setTimeout(function () { bar.remove(); }, 300);
      }
    }, 6000);
  }

  /* ---------------- 用户库 / 临时库 切换 ---------------- */
  /* 规则：
     未登录  → 用 S.words（临时库），数据只在手机浏览器里
     登录后  → 切到 S.users[用户名] 里存的那份，互不可见
     退出    → 切回临时库（临时库内容原样保留） */

  function saveCurLib() {
    if (S.user && S.user.username) {
      S.users[S.user.username] = S.users[S.user.username] || {};
      S.users[S.user.username].words = S.words;
      S.users[S.user.username].daily = S.daily;
      S.users[S.user.username].log = S.log;
    } else {
      S.guest = { words: S.words, daily: S.daily, log: S.log };
    }
    save();
  }

  function loadLib(username) {
    if (username) {
      var u = S.users[username] || {};
      S.words = u.words || {};
      S.daily = u.daily || {};
      S.log = u.log || {};
    } else {
      var g = S.guest || {};
      S.words = g.words || {};
      S.daily = g.daily || {};
      S.log = g.log || {};
    }
    var today = (function () {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    })();
    if (!S.daily[today]) S.daily[today] = [];
    save();
  }

  function switchUser(username) {
    saveCurLib();          // 先把当前库存好
    loadLib(username);     // 再切到目标库
  }

  /* ---------------- 首次引导：让用户做一遍，而不是看一遍 ---------------- */
  var GUIDE = [
    {
      t: '第 1 步 · 加 3 个词',
      d: '把今天遇到的单词粘进去，系统自动查中文和音标。',
      act: 'goHomeAdd',
      tip: '输入框里已经填好示例，直接点「加入词库」'
    },
    {
      t: '第 2 步 · 做 1 道题',
      d: '练习会强制你主动回忆，比反复看单词表有效得多。',
      act: 'goPractice1',
      tip: '选一个答案，答完看反馈'
    },
    {
      t: '第 3 步 · 会用了',
      d: '核心就三步：加词 → 练习 → 复习到期。其余功能用到时再看。',
      act: 'guideDone',
      tip: '首页顶部的卡片会告诉你下一步该干嘛'
    }
  ];

  function showGuide(step) {
    var g = GUIDE[step];
    if (!g) return;
    var box = document.createElement('div');
    box.id = 'guideBox';
    box.style.cssText = 'position:fixed;inset:0;z-index:300;background:rgba(20,26,40,.62);' +
      'display:flex;align-items:center;justify-content:center;padding:22px';
    box.innerHTML = '<div style="background:#fff;border-radius:16px;padding:20px;max-width:340px;width:100%">' +
      '<div style="font-size:16px;font-weight:600;margin-bottom:8px">' + esc(g.t) + '</div>' +
      '<div class="muted" style="font-size:13.5px;line-height:1.75;margin-bottom:12px">' + esc(g.d) + '</div>' +
      '<div style="background:#f2f7ff;border-radius:9px;padding:10px;font-size:12.5px;color:#3b6ef6;margin-bottom:16px">' +
      esc(g.tip) + '</div>' +
      '<div class="row"><button class="btn" id="gGo" style="flex:1">开始</button>' +
      '<button class="btn gray" id="gSkip">跳过引导</button></div>' +
      '<div class="center muted mt" style="font-size:12px">' + (step + 1) + ' / ' + GUIDE.length + '</div>' +
      '</div>';
    document.body.appendChild(box);
    document.getElementById('gSkip').onclick = function () {
      S.guided = 1; save(); box.remove();
    };
    document.getElementById('gGo').onclick = function () { box.remove(); ACT[g.act](); };
  }

  ACT.goHomeAdd = function () {
    go('home');
    setTimeout(function () {
      var ta = document.querySelector('#inWords');
      if (ta && !ta.value) {
        ta.value = 'negotiate, strawberry, variable';
        ACT.checkIn();
        ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      // 监听是否真的加了词
      var n0 = allWords().length;
      var iv = setInterval(function () {
        if (allWords().length > n0) {
          clearInterval(iv);
          setTimeout(function () { showGuide(1); }, 400);
        }
      }, 600);
      setTimeout(function () { clearInterval(iv); }, 120000);
    }, 350);
  };

  ACT.goPractice1 = function () {
    go('practice');
    setTimeout(function () {
      var iv = setInterval(function () {
        var el = document.querySelector('[data-act=startPractice]') ||
                 document.querySelector('[data-act=quickPractice]');
        if (el) { clearInterval(iv); el.click(); }
      }, 400);
      setTimeout(function () { clearInterval(iv); }, 8000);
      // 做完一题后进入第三步
      var iv2 = setInterval(function () {
        if (TAB === 'practice' && QZ && QZ.i > 0) {
          clearInterval(iv2);
          setTimeout(function () { showGuide(2); }, 600);
        }
      }, 700);
      setTimeout(function () { clearInterval(iv2); }, 180000);
    }, 300);
  };

  ACT.guideDone = function () { S.guided = 1; save(); toast('搞定！开始用吧'); };

  /* ---------------- 首页「下一步」卡片 ---------------- */
  function nextStepCard() {
    var all = allWords();
    var due = dueIds().filter(function (id) { return S.words[id]; });
    var todayIds = S.daily[today()] || [];
    var doneToday = (S.log && S.log[today()]) ? (S.log[today()].total || 0) : 0;

    if (!all.length) {
      return '<div class="card" style="border-left:4px solid #3b6ef6">' +
        '<div style="font-weight:600;font-size:14.5px;margin-bottom:4px">👋 先加 5 个词试试</div>' +
        '<div class="muted mb" style="font-size:12.5px">把今天课堂或自学遇到的词粘进来，' +
        '系统自动查意思和音标。</div>' +
        '<div class="row"><button class="btn sm" data-act="goHomeAdd2">加示例词</button>' +
        '<button class="btn sm light" data-act="goOcrTip">用图片导入</button></div></div>';
    }
    if (due.length) {
      return '<div class="card" style="border-left:4px solid #f0a500">' +
        '<div style="font-weight:600;font-size:14.5px;margin-bottom:4px">⏰ ' + due.length + ' 个词该复习了</div>' +
        '<div class="muted mb" style="font-size:12.5px">按遗忘曲线，今天不练就会忘。</div>' +
        '<button class="btn block" data-act="quickPractice" data-scope="due">立即复习</button></div>';
    }
    if (!doneToday) {
      return '<div class="card" style="border-left:4px solid #12b886">' +
        '<div style="font-weight:600;font-size:14.5px;margin-bottom:4px">🎯 今天还没练习</div>' +
        '<div class="muted mb" style="font-size:12.5px">主动回忆比反复看有效得多，做一轮？</div>' +
        '<button class="btn block" data-act="quickPractice" data-scope="today">开始练习</button></div>';
    }
    return '<div class="card" style="border-left:4px solid #12b886">' +
      '<div style="font-weight:600;font-size:14.5px;margin-bottom:4px">✅ 今日已练 ' + doneToday + ' 题</div>' +
      '<div class="muted mb" style="font-size:12.5px">要不要再来一轮？</div>' +
      '<button class="btn block light" data-act="quickPractice" data-scope="today">多练一轮</button></div>';
  }

  ACT.goHomeAdd2 = function () {
    go('home');
    setTimeout(function () {
      var ta = document.querySelector('#inWords');
      if (ta && !ta.value) { ta.value = 'negotiate, strawberry, variable'; ACT.checkIn(); }
      ta && ta.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
  };
  ACT.goOcrTip = function () { alert('把资料拍成照片，用微信「提取文字」复制后粘贴进来；\n或者用电脑端识别工具批量处理。'); };

  /* ---------------- 中文释义显示 ---------------- */
  /* 按「义项」智能截断：取第一个完整义项，而不是按字数硬切。
     词典释义通常按使用频率排，第一个是最常用的义项。 */
  function shortCn(cn) {
    cn = (cn || '').trim();
    if (!cn) return '';
    // 先按分号切成义项
    var parts = cn.split(/[；;]/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!parts.length) return cn;
    var first = parts[0];
    // 如果第一个义项里含多个词性（如 "n. 主题；科目 adj. 服从的"），
    // 继续按词性标记切
    var posRe = /(?:^|\s)(n|v|vt|vi|adj|adv|prep|conj|pron|num|art|int|aux|pl|pt|pp)\./g;
    var segs = [];
    var last = 0, m;
    while ((m = posRe.exec(first)) !== null) {
      if (m.index > 0) { segs.push(first.slice(last, m.index).trim()); last = m.index; }
    }
    segs.push(first.slice(last).trim());
    segs = segs.filter(Boolean);
    var out = segs.length ? segs[0] : first;
    // 还是太长就按逗号取前两段
    if (out.length > 22) {
      var cs = out.split(/[，,]/);
      out = cs.slice(0, Math.max(2, Math.ceil(cs.length / 2))).join('，');
    }
    return out;
  }
  function hasMoreCn(cn) {
    var c = (cn || '').trim();
    return c.length > 0 && shortCn(c).length < c.length;
  }

  /* 完整释义弹窗 */
  ACT.showFullCn = function (el) {
    var w = el.dataset.w, cn = el.dataset.cn || '', ph = el.dataset.ph || '';
    var roots = (typeof findRoots === 'function') ? findRoots(w) : [];
    var box = document.createElement('div');
    box.style.cssText = 'position:fixed;inset:0;z-index:210;background:rgba(20,26,40,.5);' +
      'display:flex;align-items:flex-end;justify-content:center';
    var segs = cn.split(/[；;]/).map(function (x) { return x.trim(); }).filter(Boolean);
    box.innerHTML = '<div style="background:#fff;border-radius:16px 16px 0 0;padding:18px;' +
      'max-width:520px;width:100%;max-height:78vh;overflow:auto">' +
      '<div style="font-size:19px;font-weight:600;margin-bottom:4px">' + esc(w) + '</div>' +
      (ph ? '<div class="muted" style="margin-bottom:12px">/' + esc(ph) + '/</div>' : '') +
      '<div style="font-size:14.5px;line-height:1.95">' +
      segs.map(function (x) {
        return '<div style="padding:7px 0;border-bottom:1px solid #f0f2f7">' + esc(x) + '</div>';
      }).join('') + '</div>' +
      (roots.length ? '<div style="margin-top:14px;background:#f2f7ff;border-radius:10px;padding:12px">' +
        '<div style="font-weight:600;font-size:13.5px;margin-bottom:6px">💡 拆词记忆</div>' +
        roots.map(function (r) {
          return '<div style="font-size:13px;line-height:1.8"><b>' + esc(r.k) + '</b> ' +
            esc(r.m) + ' <span class="muted">(' + esc(r.t) + ')</span></div>';
        }).join('') +
        '<div class="muted" style="font-size:12.5px;margin-top:6px">' +
        esc(roots[0].ex.slice(0, 4).join('　')) + '</div></div>' : '') +
      '<div class="row mt"><button class="btn block gray" id="fcClose">关闭</button></div></div>';
    document.body.appendChild(box);
    box.onclick = function (e) { if (e.target === box) box.remove(); };
    document.getElementById('fcClose').onclick = function () { box.remove(); };
  };

  /* ---------------- 形近词对比 ---------------- */
  /* 找长得很像的词放一起记，反而记得更清楚——因为你会主动找差异 */
  function nearWords(word, limit) {
    var w = (word || '').toLowerCase();
    if (!w || w.length < 4) return [];
    limit = limit || 4;
    var all = allWords();
    var out = [];
    all.forEach(function (o) {
      var x = (o.w || '').toLowerCase();
      if (x === w || Math.abs(x.length - w.length) > 3) return;
      var d = edist(w, x);
      var cap = x.length >= 8 ? 2 : 1;
      if (d >= 1 && d <= cap) out.push({ w: o.w, cn: o.cn || '', d: d });
    });
    out.sort(function (a, b) { return a.d - b.d || a.w.localeCompare(b.w); });
    return out.slice(0, limit);
  }
  function edist(a, b) {
    var n = a.length, m = b.length;
    if (Math.abs(n - m) > 3) return 99;
    var prev = [], cur = [], i, j;
    for (j = 0; j <= m; j++) prev[j] = j;
    for (i = 1; i <= n; i++) {
      cur[0] = i;
      for (j = 1; j <= m; j++) {
        var c = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + c);
      }
      var t = prev; prev = cur; cur = t;
    }
    return prev[m];
  }

  /* ---------------- 版本检测与自动更新 ---------------- */
  var APP_VER = '2-3-1', APP_BUILD = 2026012102;

  function checkVersion() {
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (v) {
        if (!v || !v.build) return;
        var oldB = +(S.build || 0);
        if (v.build > oldB) {
          // 记下新版本，弹提示
          S.build = v.build; save();
          showUpdate(v);
        }
      }).catch(function () { });
  }

  function showUpdate(v) {
    var box = document.createElement('div');
    box.id = 'updBox';
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:70px;z-index:150;' +
      'background:#fff;border-radius:12px;padding:14px;box-shadow:0 6px 24px rgba(28,35,51,.18);' +
      'border-left:4px solid #3b6ef6';
    box.innerHTML =
      '<div style="font-weight:600;font-size:14.5px;margin-bottom:4px">发现新版本 ' + esc(v.version) + '</div>' +
      '<div class="muted" style="font-size:12.5px;margin-bottom:10px">' + esc(v.note || '优化与修复') + '</div>' +
      '<div style="display:flex;gap:8px">' +
      '<button id="updNow" style="flex:1;background:#3b6ef6;color:#fff;border:none;border-radius:9px;' +
      'padding:10px;font-size:14px;font-weight:500">立即更新</button>' +
      '<button id="updLater" style="background:#eef1f7;color:#1c2333;border:none;border-radius:9px;' +
      'padding:10px 16px;font-size:14px">稍后</button></div>';
    document.body.appendChild(box);
    document.getElementById('updNow').onclick = function () { doUpdate(); };
    document.getElementById('updLater').onclick = function () { box.remove(); };
  }

  function doUpdate() {
    var b = document.getElementById('updBox');
    if (b) b.innerHTML = '<div class="muted" style="text-align:center">正在更新…</div>';
    // 让 sw 跳过等待
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage('CLEAR_CACHE');
    }
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(function (rs) {
        Promise.all(rs.map(function (r) { return r.unregister(); }))
          .then(function () {
            // 清掉词库缓存之外的旧资源，重载拿新版
            if (window.caches) {
              caches.keys().then(function (ks) {
                Promise.all(ks.map(function (k) { return caches.delete(k); }))
                  .then(function () { location.reload(true); })
                  .catch(function () { location.reload(true); });
              });
            } else { location.reload(true); }
          }).catch(function () { location.reload(true); });
      });
    } else { location.reload(true); }
  }

  /* ---------------- 后端类型 A：腾讯云开发数据库（前端直连，不用服务器） ---------------- */
  /* 特点：不用开电脑、不用自己写后端、国内必通
     依赖：从腾讯 CDN 加载 SDK，加载失败会自动回退，不影响 App 正常使用 */
  var CB = { app: null, auth: null, db: null, ready: false };

  function cbInit(envId) {
    if (CB.ready && CB.app) return Promise.resolve(true);
    return new Promise(function (res, rej) {
      if (window.cloudbase) return res();
      var sc = document.createElement('script');
      sc.src = 'https://static.cloudbase.net/cloudbase-js-sdk/latest/cloudbase.full.js';
      sc.onload = function () { res(); };
      sc.onerror = function () { rej(new Error('SDK 加载失败')); };
      document.head.appendChild(sc);
      setTimeout(function () { if (!window.cloudbase) rej(new Error('SDK 加载超时')); }, 15000);
    }).then(function () {
      CB.app = window.cloudbase.init({ env: envId });
      CB.auth = CB.app.auth({ persistence: 'local' });
      CB.db = CB.app.database();
      CB.ready = true;
      return true;
    });
  }

  function cbUser() { return CB.auth && CB.auth.currentUser; }

  ACT.cbRegister = function () {
    var u = ($('#cbUser').value || '').trim(), p = ($('#cbPass').value || '').trim();
    var env = (S.settings.cbEnv || '').trim();
    if (!env) { alert('请先填云开发环境 ID'); return; }
    if (u.length < 3 || p.length < 6) { alert('用户名至少 3 位，密码至少 6 位'); return; }
    toast('正在注册…');
    cbInit(env).then(function () {
      return CB.auth.signUpWithUsernameAndPassword(u, p);
    }).then(function () {
      return CB.auth.signInWithUsernameAndPassword(u, p);
    }).then(function () {
      S.user = { username: u, nickname: u }; S.token = 'cb:' + u;
      S.settings.apiKind = 'cb'; save(); render();
      toast('注册成功，已登录：' + u);
    }).catch(function (e) {
      alert('注册失败：' + (e && e.message ? e.message : e) +
        '\n\n如果提示未开启，去云开发控制台 → 登录授权 → 开启「用户名密码登录」。');
    });
  };

  ACT.cbLogin = function () {
    var u = ($('#cbUser').value || '').trim(), p = ($('#cbPass').value || '').trim();
    var env = (S.settings.cbEnv || '').trim();
    if (!env) { alert('请先填云开发环境 ID'); return; }
    if (!u || !p) { alert('请输入用户名和密码'); return; }
    toast('登录中…');
    cbInit(env).then(function () {
      return CB.auth.signInWithUsernameAndPassword(u, p);
    }).then(function () {
      S.user = { username: u, nickname: u }; S.token = 'cb:' + u;
      S.settings.apiKind = 'cb'; save(); render();
      toast('登录成功：' + u);
      ACT.cbPull();
    }).catch(function (e) {
      alert('登录失败：' + (e && e.message ? e.message : e));
    });
  };

  ACT.cbPush = function () {
    if (!CB.ready) { alert('请先登录'); return; }
    var me = cbUser(); if (!me) { alert('请先登录'); return; }
    var list = allWords().map(function (w) {
      return { word: w.w, cn: w.cn || '', ph: w.ph || '', tags: w.tags || [],
               box: w.box || 0, due: w.due || '', ok: w.ok || 0, bad: w.bad || 0,
               uid: me.uid };
    });
    if (!list.length) { alert('本地还没有单词'); return; }
    toast('正在上传 ' + list.length + ' 个单词…');
    var col = CB.db.collection('words');
    var jobs = [];
    // 先拉一份线上已有，决定新增还是更新
    col.where({ uid: me.uid }).limit(1000).get().then(function (r) {
      var have = {};
      (r.data || []).forEach(function (d) { have[d.word] = d._id; });
      list.forEach(function (w) {
        if (have[w.word]) jobs.push(col.doc(have[w.word]).update(w));
        else jobs.push(col.add(w));
      });
      return Promise.all(jobs);
    }).then(function () {
      toast('已备份到云端：' + list.length + ' 词');
    }).catch(function (e) { alert('上传失败：' + (e && e.message ? e.message : e)); });
  };

  ACT.cbPull = function () {
    if (!CB.ready) { alert('请先登录'); return; }
    var me = cbUser(); if (!me) { alert('请先登录'); return; }
    toast('正在从云端恢复…');
    CB.db.collection('words').where({ uid: me.uid }).limit(1000).get().then(function (r) {
      var n = 0;
      (r.data || []).forEach(function (w) {
        var e = addWord(w.word, w.cn, w.ph, w.tags || []);
        if (e) { e.box = w.box || 0; e.due = w.due || ''; e.ok = w.ok || 0; e.bad = w.bad || 0; n++; }
      });
      save(); render(); toast('已恢复 ' + n + ' 个单词');
    }).catch(function (e) { alert('恢复失败：' + (e && e.message ? e.message : e)); });
  };

  ACT.saveCbEnv = function () {
    S.settings.cbEnv = ($('#cbEnv').value || '').trim();
    S.settings.apiKind = 'cb';
    save(); toast('环境 ID 已保存');
  };

  /* ---------------- 后端类型 B：自建 Python 后端 ---------------- */
  function apiBase() { return (S.settings.api || '').replace(/\/+$/, ''); }
  function apiHeaders(withAuth) {
    var h = { 'Content-Type': 'application/json' };
    if (withAuth && S.token) h['Authorization'] = 'Bearer ' + S.token;
    return h;
  }
  function apiCall(path, method, body, auth) {
    var base = apiBase();
    if (!base) return Promise.reject(new Error('还没填后端地址'));
    var opt = { method: method || 'GET', headers: apiHeaders(auth !== false) };
    if (body) opt.body = JSON.stringify(body);
    return fetch(base + path, opt).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok) throw new Error(j.detail || ('HTTP ' + r.status));
        return j;
      });
    });
  }

  ACT.goMe = function () { go('me'); setTimeout(function () {
      var el = document.querySelector('#auUser'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200); };

  ACT.checkUpd = function () {
    toast('正在检查…');
    fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (v) {
        if (v && v.build > APP_BUILD) showUpdate(v);
        else toast('已经是最新版（' + APP_VER + '）');
      }).catch(function () { toast('检查失败，请联网后重试'); });
  };

  ACT.setKind = function (el) {
    S.settings.apiKind = el.dataset.v; save(); render();
  };
  ACT.saveApi = function () {
    S.settings.api = ($('#setApi').value || '').trim();
    save(); toast('后端地址已保存');
    if (S.token) ACT.loadStats();
  };
  ACT.doRegister = function () {
    var u = ($('#auUser').value || '').trim(), p = ($('#auPass').value || '').trim();
    if (u.length < 3 || p.length < 6) { alert('用户名至少 3 位，密码至少 6 位'); return; }
    toast('注册中…');
    apiCall('/register', 'POST', { username: u, password: p, nickname: u }, false)
      .then(function (j) {
        S.token = j.token; S.user = { username: j.username, nickname: j.nickname };
        var had = Object.keys(S.words || {}).length;
        switchUser(j.username);
        // 首次登录：把临时库里的词带进用户库
        var u = S.users[j.username] || {};
        if (!u.words || !Object.keys(u.words).length) {
          var g = S.guest || {};
          if (g.words && Object.keys(g.words).length) {
            S.words = g.words; S.daily = g.daily || {}; S.log = g.log || {};
            saveCurLib();
            toast('注册成功！已把临时库的 ' + Object.keys(g.words).length + ' 个词带入你的账户');
            render(); return;
          }
        }
        render(); toast('注册成功，已登录：' + j.username);
      })
      .catch(function (e) { alert('注册失败：' + e.message); });
  };
  ACT.doLogin = function () {
    var u = ($('#auUser').value || '').trim(), p = ($('#auPass').value || '').trim();
    if (!u || !p) { alert('请输入用户名和密码'); return; }
    toast('登录中…');
    apiCall('/login', 'POST', { username: u, password: p }, false)
      .then(function (j) {
        S.token = j.token; S.user = { username: j.username, nickname: j.nickname };
        switchUser(j.username);
        render();
        toast('登录成功：' + j.nickname + '，词库 ' + Object.keys(S.words).length + ' 词');
      })
      .catch(function (e) { alert('登录失败：' + e.message); });
  };
  ACT.doLogout = function () {
    switchUser(null);
    S.token = ''; S.user = null; save(); render();
    toast('已退出，当前使用临时库（' + Object.keys(S.words).length + ' 词）');
  };

  ACT.pushWords = function () {
    if (!S.token) { alert('请先登录'); return; }
    var list = allWords().map(function (w) {
      return { word: w.w, cn: w.cn || '', ph: w.ph || '', tags: (w.tags || []).join(','),
               box: w.box || 0, due: w.due || '', ok_count: w.ok || 0, bad_count: w.bad || 0 };
    });
    if (!list.length) { alert('本地还没有单词'); return; }
    toast('正在上传 ' + list.length + ' 个单词…');
    apiCall('/sync', 'POST', { words: list }).then(function (j) {
      toast('已备份到服务器：共 ' + j.total + ' 词'); ACT.loadStats();
    }).catch(function (e) { alert('上传失败：' + e.message); });
  };

  ACT.pullWords = function () {
    if (!S.token) { alert('请先登录'); return; }
    if (!confirm('会用服务器上的单词覆盖本地吗？建议先导出备份。')) return;
    toast('正在下载…');
    apiCall('/words', 'GET').then(function (list) {
      var n = 0;
      list.forEach(function (w) {
        var e = addWord(w.word, w.cn, w.ph, w.tags ? w.tags.split(',') : []);
        if (e) {
          e.box = w.box || 0; e.due = w.due || ''; e.ok = w.ok_count || 0; e.bad = w.bad_count || 0; n++;
        }
      });
      save(); render(); toast('已下载 ' + n + ' 个单词');
    }).catch(function (e) { alert('下载失败：' + e.message); });
  };

  ACT.loadStats = function () {
    if (!S.token) return;
    apiCall('/stats', 'GET').then(function (s) {
      var el = $('#cloudStats');
      if (el) {
        el.innerHTML = '<div class="stat"><div><b>' + s.word_count + '</b><span>云端词数</span></div>' +
          '<div><b>' + s.mastered + '</b><span>已掌握</span></div>' +
          '<div><b>' + s.days + '</b><span>打卡天数</span></div></div>' +
          '<div class="muted mt">累计做题 ' + s.total_questions + ' 道，正确率 ' + s.accuracy + '%</div>';
      }
    }).catch(function () { });
  };

  /* ---------------- 我的 ---------------- */
  function viewMe() {
    var st = S.settings;
    var h = '';
    h += '<div class="card"><h3>🔊 发音</h3>' +
      '<div class="row"><button class="btn sm ' + (st.voice === 'real' ? '' : 'gray') + '" data-act="setVoice" data-v="real">真人优先</button>' +
      '<button class="btn sm ' + (st.voice === 'tts' ? '' : 'gray') + '" data-act="setVoice" data-v="tts">系统语音</button></div>' +
      '<div class="row mt"><button class="btn sm ' + (st.accent === 'us' ? '' : 'gray') + '" data-act="setAcc" data-v="us">美音</button>' +
      '<button class="btn sm ' + (st.accent === 'uk' ? '' : 'gray') + '" data-act="setAcc" data-v="uk">英音</button>' +
      '<button class="btn sm light" data-act="testVoice">试听 hello</button></div>' +
      '<div class="muted mt">真人发音取自公开词典音频，首次播放需联网，之后浏览器会缓存；取不到时自动改用手机自带语音。</div></div>';

    h += '<div class="card"><h3>⚙️ 学习设置</h3>' +
      '<label class="f">每日目标（词）</label>' +
      '<input type="number" id="setDaily" value="' + st.daily + '" min="5" max="200">' +
      '<label class="f">每轮题量（道）</label>' +
      '<div class="scroll-x">' + [5, 10, 20, 30, 50].map(function (n) {
        return '<button class="chip' + (st.round === n ? ' on' : '') + '" data-act="setRound" data-v="' + n + '">' + n + ' 题</button>';
      }).join('') + '</div>' +
      '<label class="f">拼写题出「变形」的比例（%）</label>' +
      '<input type="number" id="setInf" value="' + st.inflect + '" min="0" max="100">' +
      '<label class="f">判分宽松度</label>' +
      '<div class="row"><button class="btn sm ' + (st.loose ? '' : 'gray') + '" data-act="setLoose" data-v="1">宽容（差1字母算对）</button>' +
      '<button class="btn sm ' + (st.loose ? 'gray' : '') + '" data-act="setLoose" data-v="0">严格</button></div>' +
      '<label class="f">听力播放倍速</label>' +
      '<div class="row">' + [0.7, 0.85, 1, 1.25, 1.5].map(function (r) {
        return '<button class="btn sm ' + ((S.settings.rate || 1) === r ? '' : 'gray') +
          '" data-act="setRate" data-r="' + r + '">' + r + '×</button>';
      }).join('') + '</div>' +
      '<div class="muted mt small">精听建议 0.7× 或 0.85×，先把每个词听清；熟练后 1.25× 提速。</div>' +
      '<div class="mt"><button class="btn block" data-act="saveSet">保存设置</button></div></div>';

    // 登录卡片：置顶 + 高亮
    var isLogin = !!(S.user && S.user.username);
    h += '<div class="card" style="' + (isLogin ? 'border:1.5px solid #12b886' : 'border:1.5px solid #3b6ef6;background:#f8faff') + '">' +
      '<h3>' + (isLogin ? '👤 我的账户' : '🔑 登录 / 注册') + '</h3>';
    if (!isLogin) {
      h += '<div class="muted mb" style="color:#3b6ef6"><b>登录后：</b>每个人有独立的词库，换手机、换设备登录就能接着背；' +
        '不登录数据只存在这台手机，清理缓存就没了。</div>';
    }
    if (!S.settings.api) {
      h += '<div class="muted mb">填你电脑上跑起来的后端地址，就能把单词备份到 MySQL，换手机也不丢。</div>';
    }
    h += '<label class="f">后端地址</label>' +
      '<input type="text" id="setApi" placeholder="http://192.168.1.5:8000" value="' + esc(S.settings.api || '') + '">' +
      '<div class="muted mt small">电脑和手机连同一个 WiFi，填电脑的内网 IP（cmd 里 ipconfig 查）。</div>' +
      '<div class="row mt"><button class="btn sm light" data-act="saveApi">保存地址</button></div>';

    if (S.token && S.user) {
      h += '<div class="mt"><div class="list-item"><div class="t"><b>已登录：' + esc(S.user.nickname || S.user.username) + '</b>' +
        '<span>' + esc(S.user.username) + '</span></div>' +
        '<button class="btn sm gray" data-act="doLogout">退出</button></div></div>' +
        '<div id="cloudStats" class="mt"></div>' +
        '<div class="row mt"><button class="btn" data-act="pushWords">⬆️ 备份到云端</button>' +
        '<button class="btn gray" data-act="pullWords">⬇️ 从云端恢复</button></div>';
    } else {
      h += '<label class="f">用户名（至少 3 位）</label>' +
        '<input type="text" id="auUser" autocomplete="off" placeholder="例如：zhongshan01">' +
        '<label class="f">密码（至少 6 位）</label>' +
        '<input type="password" id="auPass" autocomplete="new-password" placeholder="至少 6 位">' +
        '<div class="row mt"><button class="btn" data-act="doRegister">注册</button>' +
        '<button class="btn gray" data-act="doLogin">登录</button></div>';
    }
    h += '</div>';

    h += '<div class="card"><h3>🔄 版本</h3>' +
      '<div class="list-item"><div class="t"><b>当前版本 ' + APP_VER + '</b>' +
      '<span>有新版本会自动提示</span></div>' +
      '<button class="btn sm light" data-act="checkUpd">检查更新</button></div></div>';

    h += '<div class="card"><h3>💾 数据</h3>' +
      '<div class="row"><button class="btn light" data-act="export">导出备份</button>' +
      '<button class="btn gray" data-act="import">导入备份</button></div>' +
      '<div class="row mt"><button class="btn gray" data-act="clearAll">清空所有数据</button></div>' +
      '<div class="muted mt">数据只存在这台手机的浏览器里，不上传任何服务器。换手机前记得导出备份。</div></div>';

    h += '<div class="card"><h3>📌 使用说明</h3><div class="muted">' +
      '1. 每天把课堂/自学的词粘进「今日」，打上标签（如 Unit 3、专升本核心、Python）。<br>' +
      '2. 到期词会自动进入复习队列，按遗忘曲线安排。<br>' +
      '3. 真题自己导入，永久保存在手机里，可按题型练。<br>' +
      '4. 添加到主屏幕后可离线使用（首次联网加载词库后会被缓存）。<br>' +
      '<br>数据来源：开源英汉词库 + CMU 发音词典（离线）／公开词典接口（联网补全）。</div></div>';
    return h;
  }
  ACT.setVoice = function (el) { S.settings.voice = el.dataset.v; save(); render(); };
  ACT.setAcc = function (el) { S.settings.accent = el.dataset.v; save(); render(); };
  ACT.testVoice = function () { speak('hello'); };
  ACT.setLoose = function (el) { S.settings.loose = el.dataset.v === '1'; save(); render(); };
  ACT.setRound = function (el) {
    S.settings.round = +el.dataset.v; save();
    Array.prototype.forEach.call(app.querySelectorAll('[data-act=setRound]'), function (c) {
      c.classList.toggle('on', +c.dataset.v === S.settings.round);
    });
  };
  ACT.importWordList = function () {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = '.txt,.csv,.json,text/plain';
    i.onchange = function () {
      var f = i.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var raw = String(fr.result || '');
          var list = [];
          if (/\.json$/i.test(f.name)) {
            var o = JSON.parse(raw);
            var arr = Array.isArray(o) ? o : (o.words || o.list || o.items || []);
            list = arr.map(function (x) {
              return typeof x === 'string' ? x : (x.word || x.w || x.name || '');
            });
          } else if (/\.csv$/i.test(f.name)) {
            raw.split(/\r?\n/).forEach(function (line, idx) {
              if (idx === 0 && /单词|word/i.test(line)) return;   // 跳过表头
              var c0 = line.split(',')[0].trim();
              if (c0) list.push(c0);
            });
          } else {
            list = raw.split(/[\s,;，、|\t]+/);
          }
          list = list.map(function (w) { return String(w || '').trim().toLowerCase(); })
            .filter(function (w) { return /^[a-z][a-z\-']{1,}$/.test(w); });
          list = list.filter(function (w, i) { return list.indexOf(w) === i; });
          if (!list.length) { alert('没从文件里找到英文单词'); return; }

          var added = 0, withCn = 0;
          list.forEach(function (w) {
            // S.words 按 id 存，查重要按 w 字段比对
            var exist = allWords().filter(function (x) { return x.w === w; })[0];
            if (exist) { added++; return; }             // 已有，跳过不覆盖
            var r = lookup(w);
            addWord(w, r && r.cn ? r.cn : '', r && r.ph ? r.ph : '', ['导入']);
            if (r && r.cn) withCn++;
            added++;
          });
          save(); render();
          toast('导入完成：共 ' + added + ' 词，其中 ' + withCn + ' 词自动查到释义');
        } catch (e) { alert('读取失败：' + (e && e.message ? e.message : e)); }
      };
      fr.readAsText(f);
    };
    i.click();
  };

  ACT.setRate = function (el) {
    S.settings.rate = parseFloat(el.dataset.r);
    save();
    var a = AC[PAPER_STATE.pid];
    if (a && a.el) a.el.playbackRate = S.settings.rate;
    render(); toast('倍速已设为 ' + S.settings.rate + '×');
  };
  ACT.saveSet = function () {
    S.settings.daily = Math.max(1, +$('#setDaily').value || 20);
    S.settings.inflect = Math.max(0, Math.min(100, +$('#setInf').value || 0));
    save(); toast('已保存');
  };
  ACT.export = function () {
    var data = JSON.stringify(S);
    var blob = new Blob([data], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '每日单词备份_' + today() + '.json';
    a.click();
    toast('已导出');
  };
  ACT.import = function () {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = '.json';
    i.onchange = function () {
      var f = i.files[0]; if (!f) return;
      var fr = new FileReader();
      fr.onload = function () {
        try {
          var o = JSON.parse(fr.result);
          if (!o.words) throw 0;
          S = o; load2(); save(); render(); toast('导入成功');
        } catch (e) { alert('文件格式不对'); }
      };
      fr.readAsText(f);
    };
    i.click();
  };
  function load2() { for (var k in DEF) if (!(k in S)) S[k] = JSON.parse(JSON.stringify(DEF[k])); if (!S.daily[today()]) S.daily[today()] = []; }
  ACT.clearAll = function () {
    if (!confirm('会删除所有单词、真题与设置，确定？')) return;
    localStorage.removeItem(KEY);
    S = JSON.parse(JSON.stringify(DEF)); loadBuiltin(); save(); render();
  };

  /* ---------------- 启动 ---------------- */
  Array.prototype.forEach.call(document.querySelectorAll('#nav button'), function (b) {
    b.addEventListener('click', function () { go(b.dataset.tab); });
  });
  $('#hdBadge').textContent = Object.keys(DICT).length + ' 词离线库';
  // 事件委托：render 会重建 DOM，直接绑在元素上会丢失
  if (typeof document !== 'undefined' && document.addEventListener) {
    document.addEventListener('input', function (e) {
      if (e.target && e.target.id === 'inWords') ACT.checkIn();
    });
    document.addEventListener('paste', function (e) {
      if (e.target && e.target.id === 'inWords') setTimeout(ACT.checkIn, 30);
    });
  }
  go('home');
  initScroll();

  /* 跨天检测：手机把页面挂后台几天后再打开，日期还停在打开那天。
     这里在「页面重新可见」和「每分钟轮询」两个时机检查日期，
     一旦跨天就重新渲染，避免今日进度和复习计划失真。 */
  (function () {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    var lastDay = today();
    function checkDay() {
      var d = today();
      if (d !== lastDay) {
        lastDay = d;
        // 新的一天：重建今日容器，然后重渲染
        if (!S.daily[d]) S.daily[d] = [];
        save();
        render();
        toast('新的一天：' + d);
      }
    }
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) checkDay();
    });
    window.addEventListener('pageshow', checkDay);
    window.addEventListener('focus', checkDay);
    setInterval(checkDay, 60000);
  })();
  if (!S.guided && typeof window !== 'undefined' && window.addEventListener) {
    setTimeout(function () { showGuide(0); }, 900);
  }
  window.__APP__ = {
    S: S, go: go, lookup: lookup, genInflect: genInflect, parseExam: parseExam,
    near: near, makeQ: makeQ, beginQuiz: beginQuiz, addWord: addWord, render: render,
    quiz: function () { return QZ; }, act: ACT, speak: speak,
    allWords: allWords, delWord: delWord, today: today,
    shortCn: shortCn, hasMoreCn: hasMoreCn, nearWords: nearWords, findRoots: (typeof findRoots === 'function' ? findRoots : null),
    paper: function () { return PAPER_STATE; }, beginPaper: beginPaper
  };
})();
