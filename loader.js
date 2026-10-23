/* 词库加载器：优先用本地缓存 → 其次压缩版 → 最后原版
   解决 CloudBase 默认域名限速导致的首次加载慢问题 */
(function () {
  var VER = 'v1';                 // 词库版本，改词库时递增即可让旧缓存失效
  var T0 = Date.now();
  var tip = document.getElementById('bootTip');

  function say(t) { if (tip) tip.textContent = t; }

  function idb() {
    return new Promise(function (res, rej) {
      var r = indexedDB.open('ew_dict', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('d'); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error || new Error('idb')); };
    });
  }
  function idbGet(k) {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('d', 'readonly');
        var q = t.objectStore('d').get(k);
        q.onsuccess = function () { res(q.result); };
        q.onerror = function () { res(null); };
      });
    }).catch(function () { return null; });
  }
  function idbPut(k, v) {
    return idb().then(function (db) {
      return new Promise(function (res) {
        var t = db.transaction('d', 'readwrite');
        t.objectStore('d').put(v, k);
        t.oncomplete = function () { res(true); };
        t.onerror = function () { res(false); };
      });
    }).catch(function () { return false; });
  }

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res;
      s.onerror = function () { rej(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* 解压 base64(zlib) → 文本 */
  function inflateB64(b64) {
    var bin = atob(b64);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    var ds = new DecompressionStream('deflate');
    var stream = new Blob([arr]).stream().pipeThrough(ds);
    return new Response(stream).text();
  }

  function useDict(txt, fromCache) {
    try { window.DICT = JSON.parse(txt); } catch (e) { return Promise.reject(e); }
    if (!fromCache) {
      // 后台缓存，下次秒开
      idbPut('dict_' + VER, txt).then(function () { console.log('dict cached'); });
    }
    say('词库就绪，用时 ' + ((Date.now() - T0) / 1000).toFixed(1) + ' 秒');
    return Promise.resolve();
  }

  function fetchDict() {
    var canZ = (typeof DecompressionStream !== 'undefined' && typeof atob === 'function');
    if (canZ) {
      return loadScript('dict.z.js').then(function () {
        return inflateB64(window.__DICT_Z__);
      }).then(function (txt) {
        delete window.__DICT_Z__;
        return txt;
      }).catch(function () {
        return loadScript('dict.js').then(function () { return null; });  // 回退：dict.js 会自己设 window.DICT
      });
    }
    return loadScript('dict.js').then(function () { return null; });
  }

  function boot() {
    if (!window.DICT) window.DICT = {};
    say('正在启动…');
    return loadScript('questions.js').then(function () {
      return loadScript('roots.js').catch(function () { });   // 词根表
    }).then(function () {
      return loadScript('phrases.js').catch(function () { }); // 词组库
    }).then(function () {
      return loadScript('icons.js').catch(function () { });   // 单色图标（失败就继续用 emoji）
    }).then(function () {
      return loadScript('app.js');
    }).then(function () {
      var m = document.getElementById('bootMask');
      if (m) m.parentNode.removeChild(m);
    });
  }

  // 主流程
  say('正在打开词库…');
  idbGet('dict_' + VER).then(function (txt) {
    if (txt && txt.length > 10000) {
      say('使用本地缓存，秒开');
      return useDict(txt, true);
    }
    say('首次加载词库（约 0.6 MB，之后会缓存到手机）…');
    return fetchDict().then(function (t) {
      if (t) return useDict(t, false);
      if (!window.DICT || !Object.keys(window.DICT).length) throw new Error('empty');
      // dict.js 已直接设置 window.DICT
      var s = JSON.stringify(window.DICT);
      idbPut('dict_' + VER, s);
      say('词库就绪，用时 ' + ((Date.now() - T0) / 1000).toFixed(1) + ' 秒');
    });
  }).catch(function (e) {
    say('词库加载失败，正在重试…');
    // 最后兜底：直接加载原版
    loadScript('dict.js').catch(function () { }).then(boot);
    return;
  }).then(boot).catch(function (e) {
    say('启动失败：' + (e && e.message ? e.message : e) + '，请刷新重试');
  });
})();
