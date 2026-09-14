(function () {
  'use strict';
  var DECODER_DIR = 'player/';
  var DECODERS = {
    pt3: { file: 'pt3.js?v=16', globals: ['PT3Reader'] },
    vt2: { file: 'vt2.js?v=13', globals: ['VT2Player'] },
    psg: { file: 'psg.js?v=2', globals: ['PSGReader'] },
    fym: { file: 'fym.js?v=16', globals: ['FYMReader'] },
    stc: { file: 'stc.js?v=3', globals: ['STCReader'] },
    pt1: { file: 'pt1.js?v=1', globals: ['PT1Reader'] },
    pt2: { file: 'pt2.js?v=1', globals: ['PT2Reader'] },
    asc: { file: 'asc.js?v=1', globals: ['ASCReader'] },
    tfc: { file: 'tfc.js?v=1', globals: ['TFCReader'] },
    stp: { file: 'stp.js?v=1', globals: ['STPReader'] },
    psc: { file: 'psc.js?v=4', globals: ['PSCReader', 'PSCParser'] },
    ftc: { file: 'ftc.js?v=9', globals: ['FTCReader'] },
    sqt: { file: 'sqt.js?v=4', globals: ['SQTReader'] },
    fxm: { file: 'fxm.js?v=4', globals: ['FXMReader'] },
    mtc: { file: 'aym_reader.js?v=6', globals: ['MTCReader'], deps: ['pt3', 'psg', 'tfc'] },
    snd: { file: 'snd2psg.js?v=2', globals: ['SndToPsg'], deps: ['psg'] },
    ay: { file: null, globals: ['AYReader'] }
  };
  var AUDIO_EXT = /\.(pt3|vt2|psg|fym|stc|pt1|pt2|asc|tfc|stp|psc|ftc|sqt|fxm|mtc|snd|ay)(?:[?#]|$)/i;
  var cache = {};
  var loading = {};

  function hasGlobals(globalNames) {
    for (var i = 0; i < globalNames.length; i++) {
      try {
        if (new Function('return typeof ' + globalNames[i])() === 'undefined') return false;
      } catch (err) {
        return false;
      }
    }
    return true;
  }

  function loadScript(file, globalNames) {
    return new Promise(function (resolve, reject) {
      if (hasGlobals(globalNames)) return resolve();
      var script = document.createElement('script');
      script.src = DECODER_DIR + file;
      script.setAttribute('data-aydec', '1');
      script.async = false;
      script.onload = function () {
        if (hasGlobals(globalNames)) resolve();
        else reject(new Error('Decoder ' + file + ' loaded but globals missing'));
      };
      script.onerror = function () {
        reject(new Error('Failed to load decoder ' + file));
      };
      document.head.appendChild(script);
    });
  }

  function plan(ext) {
    var def = DECODERS[ext];
    if (!def || !def.file) return [];
    var list = [];
    var seen = {};
    (def.deps || []).forEach(function (dep) {
      var d = DECODERS[dep];
      if (d && d.file && !seen[d.file]) {
        seen[d.file] = 1;
        list.push(d);
      }
    });
    if (!seen[def.file]) list.push(def);
    return list;
  }

  function ensure(ext) {
    if (cache[ext]) return cache[ext];
    var list = plan(ext);
    if (!list.length) return Promise.resolve();
    cache[ext] = list.reduce(function (promise, def) {
      return promise.then(function () {
        return loadScript(def.file, def.globals);
      });
    }, Promise.resolve());
    return cache[ext];
  }

  function ensureFromFile(fileOrUrl) {
    var clean = String(fileOrUrl).replace(/[?#].*$/, '');
    var match = clean.match(/\.([a-z0-9]+)$/i);
    if (!match || !(match[1].toLowerCase() in DECODERS)) return Promise.resolve();
    return ensure(match[1].toLowerCase());
  }

  var proto = XMLHttpRequest.prototype;
  var realOpen = proto.open;
  var realSend = proto.send;
  var realAbort = proto.abort;
  var pending = new WeakMap();

  proto.open = function (method, url, async, user, pass) {
    var waiter = null;
    try {
      if (typeof url === 'string' && AUDIO_EXT.test(url)) {
        waiter = ensureFromFile(url);
      }
    } catch (err) {}
    if (waiter) pending.set(this, { promise: waiter, aborted: false });
    else pending['delete'](this);
    return realOpen.apply(this, arguments);
  };

  proto.send = function (body) {
    var rec = pending.get(this);
    if (rec) {
      pending['delete'](this);
      if (!rec.aborted) {
        var self = this;
        var args = arguments;
        rec.promise.then(function () {
          if (!rec.aborted) realSend.apply(self, args);
        }).catch(function () {
          realSend.apply(self, args);
        });
        return undefined;
      }
    }
    return realSend.apply(this, arguments);
  };

  proto.abort = function () {
    var rec = pending.get(this);
    if (rec) {
      rec.aborted = true;
      pending['delete'](this);
    }
    return realAbort.apply(this, arguments);
  };

  window.AYDecoders = {
    ensure: ensure,
    ensureFromFile: ensureFromFile
  };
})();