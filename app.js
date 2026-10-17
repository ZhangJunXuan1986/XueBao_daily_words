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
    papers: [], audio: {}, settings: { api: '', voice: 'real', accent: 'us', daily: 20, round: 10, inflect: 25, loose: true, modes: ['word2cn', 'ph2cn', 'au2cn', 'cn2sp', 'au2sp', 'ph2sp'] },
    daily: {}, log: {}, builtinLoaded: false, user: null, token: ''
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
      el.addEventListener('click', function (e) { ACT[el.dataset.act] && ACT[el.dataset.act](el, e); });
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

    h += '<div class="card"><h3>➕ 加入今日单词</h3>' +
      '<textarea id="inWords" placeholder="一次可粘贴多个，用空格 / 逗号 / 换行分隔&#10;例：negotiate, strawberry, variable, function"></textarea>' +
      '<label class="f">标签（可多选，方便和课堂/考试对应）</label>' +
      '<div class="chips" id="tagPick">' + S.tags.map(function (t) {
        return '<button class="chip' + (PICK.indexOf(t) >= 0 ? ' on' : '') + '" data-act="pickTag" data-t="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('') + '<button class="chip add" data-act="newTag">+ 新标签</button></div>' +
      '<div class="row mt"><button class="btn" data-act="addWords">加入词库</button>' +
      '<button class="btn gray" data-act="clearIn">清空</button></div>' +
      '<div class="muted mt">系统会自动查中文意思与音标；查不到的词会标为「待补全」，可手动填写或联网补全。</div></div>';

    h += '<div class="card"><h3>📋 今日词表 <span class="pill">' + ids.length + '</span></h3>';
    if (!ids.length) {
      h += '<div class="empty">今天还没有单词。<br>把课堂或自学遇到的词粘进来吧。</div>';
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
        var cls = 'opt';
        if (QZ.showFb) {
          if (o === q.answer) cls += ' ok';
          else if (QZ.pick === i) cls += ' bad';
          else cls += ' dis';
        } else if (QZ.pick === i) cls += ' sel';
        return '<button class="' + cls + '" data-act="choose" data-i="' + i + '">' + 'ABCD'[i] + '. ' + esc(o) + '</button>';
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
        '</div>' +
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
      '<div class="muted mb">如果你有我整理好的 .json 试卷包（含题目、答案、解析），直接导入即可，不用手动切分。</div>' +
      '<button class="btn block light" data-act="importPaperFile">选择 .json 试卷文件</button></div>';

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
        } catch (e) { alert('文件格式不对，请选择我给的 .json 试卷包'); }
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
      h += '<div class="fb ' + (it.ans ? (okk ? 'ok' : 'bad') : '') + '">' +
        (it.ans ? (okk ? '✅ 正确' : '❌ 正确答案 ' + it.ans) : '参考答案见下') +
        (it.explain ? '<br>' + esc(it.explain) : '') + '</div>';
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
        var el = new Audio(u); el.play();
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
    }
    render();
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
    var graded = tot - (PAPER_STATE.qs || []).filter(function (i) { return !i.ans; }).length;
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
  var LIBQ = '';
  function viewLib() {
    var h = '';
    var all = allWords();
    var mastered = all.filter(function (w) { return (w.box || 0) >= 5; }).length;
    var learning = all.length - mastered;
    h += '<div class="card"><h3>📖 我的词库</h3><div class="stat">' +
      '<div><b>' + all.length + '</b><span>总词数</span></div>' +
      '<div><b>' + learning + '</b><span>学习中</span></div>' +
      '<div><b>' + mastered + '</b><span>已掌握</span></div></div>' +
      '<div class="muted mt">内置离线词典 ' + Object.keys(DICT).length + ' 条（含音标与中文释义），无需联网也能查。</div></div>';

    h += '<div class="card"><h3>🔍 查词</h3>' +
      '<div class="row"><input type="text" id="libQ" placeholder="输入单词，本地查 + 联网补全" value="' + esc(LIBQ) + '">' +
      '<button class="btn" style="flex:0 0 auto" data-act="doSearch">查询</button></div>' +
      '<div id="searchOut" class="mt"></div></div>';

    h += '<div class="card"><h3>🏷 按标签</h3>' +
      (S.tags.length ? '<div class="scroll-x">' + S.tags.map(function (t) {
        return '<button class="chip" data-act="libTag" data-v="' + esc(t) + '">' + esc(t) + '</button>';
      }).join('') + '</div><div id="tagOut" class="mt"></div>' : '<div class="muted">还没有标签，去「今日」加词时创建。</div>') + '</div>';

    h += '<div class="card"><h3>🗂 全部单词 <span class="pill">' + all.length + '</span></h3>';
    if (!all.length) h += '<div class="empty">词库还是空的</div>';
    var sorted = all.sort(function (a, b) { return (a.box || 0) - (b.box || 0) || (b.bad || 0) - (a.bad || 0); });
    h += sorted.slice(0, 100).map(function (w) {
      var lv = (w.box || 0) >= 5 ? '<span class="pill ok">已掌握</span>' : ((w.bad || 0) > (w.ok || 0) ? '<span class="pill bad">易错</span>' : '<span class="pill">Lv.' + (w.box || 0) + '</span>');
      return '<div class="w"><div class="wb"><div class="ww">' + esc(w.w) + ' ' + lv + '</div>' +
        (w.ph ? '<div class="wp">/' + esc(w.ph) + '/</div>' : '') +
        '<div class="wc">' + esc(w.cn || '待补全') + '</div>' +
        '<div>' + w.tags.map(function (t) { return '<span class="tag b">' + esc(t) + '</span>'; }).join('') + '</div></div>' +
        '<div class="act"><button class="iconbtn" data-act="speak" data-w="' + esc(w.w) + '">🔊</button>' +
        '<button class="iconbtn" data-act="editWord" data-id="' + w.id + '">✏️</button>' +
        '<button class="iconbtn" data-act="delWord" data-id="' + w.id + '">🗑</button></div></div>';
    }).join('');
    if (all.length > 100) h += '<div class="muted mt center">仅显示前 100 个，可用标签筛选</div>';
    h += '</div>';
    return h;
  }
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
  ACT.delWord = function (el) { if (confirm('删除这个单词？')) { delWord(el.dataset.id); render(); } };

  /* ---------------- 云同步（连接你自己的 Python 后端） ---------------- */
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
        save(); render(); toast('注册成功，已登录：' + j.username);
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
        save(); render(); toast('登录成功：' + j.nickname);
      })
      .catch(function (e) { alert('登录失败：' + e.message); });
  };
  ACT.doLogout = function () { S.token = ''; S.user = null; save(); render(); };

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
      '<div class="mt"><button class="btn block" data-act="saveSet">保存设置</button></div></div>';

    h += '<div class="card"><h3>☁️ 云同步（连你自己的 Python 后端）</h3>';
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
  go('home');
  window.__APP__ = {
    S: S, go: go, lookup: lookup, genInflect: genInflect, parseExam: parseExam,
    near: near, makeQ: makeQ, beginQuiz: beginQuiz, addWord: addWord, render: render,
    quiz: function () { return QZ; }, act: ACT, speak: speak
  };
})();
