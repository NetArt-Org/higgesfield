/* app.js — UI controller: tabs, forms, library, settings, timeline actions. */
(function (HG) {
  'use strict';
  function $(sel) { return document.querySelector(sel); }
  function $all(sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); }

  function log(msg, cls) {
    var box = $('#status');
    var line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = msg;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }
  function progress(p) {
    if (p.phase === 'polling') log('… ' + p.status + ' (' + (p.elapsed || 0) + 's)', 'run');
    else log('… ' + p.phase, 'run');
  }
  function project() { return ($('#project').value || 'default').trim(); }

  /* Wrap an async action behind a button: disable, run, report. */
  function action(btn, label, fn) {
    btn.disabled = true;
    log('▶ ' + label, 'run');
    Promise.resolve().then(fn).then(function (msg) {
      log('✔ ' + (msg || label + ' done'), 'ok');
    }).catch(function (e) {
      log('✗ ' + (e && e.message ? e.message : String(e)), 'err');
    }).then(function () { btn.disabled = false; });
  }

  // ---- select population ----
  function videoProviders() {
    return HG.registry.all().filter(function (a) {
      var c = a.capabilities || [];
      return c.indexOf('t2v') >= 0 || c.indexOf('i2v') >= 0 || c.indexOf('ref2v') >= 0;
    });
  }
  function fillProviders(sel, adapters) {
    sel.innerHTML = '';
    adapters.forEach(function (a) {
      var o = document.createElement('option');
      o.value = a.id; o.textContent = a.label;
      sel.appendChild(o);
    });
  }
  function fillModels(sel, providerId) {
    var a = HG.registry.get(providerId);
    sel.innerHTML = '';
    ((a && a.models) || ['default']).forEach(function (m) {
      var o = document.createElement('option'); o.value = m; o.textContent = m; sel.appendChild(o);
    });
  }

  // ---- libraries ----
  function renderLibrary(kind, containerSel) {
    var box = $(containerSel); box.innerHTML = '';
    HG.store.listAssets(project(), kind).forEach(function (a) {
      var chip = document.createElement('span'); chip.className = 'asset';
      chip.appendChild(document.createTextNode(a.name || a.id));
      var x = document.createElement('span'); x.className = 'x'; x.textContent = '✕';
      x.onclick = function () { HG.store.deleteAsset(project(), kind, a.id); refreshLibraries(); };
      chip.appendChild(x);
      box.appendChild(chip);
    });
  }
  function fillCharacterPicker() {
    var sel = $('#ch-pick'); sel.innerHTML = '';
    var chars = HG.store.listAssets(project(), 'characters');
    if (!chars.length) { var o = document.createElement('option'); o.textContent = '— no characters yet —'; o.value = ''; sel.appendChild(o); return; }
    chars.forEach(function (c) { var o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.appendChild(o); });
  }
  function refreshLibraries() {
    renderLibrary('characters', '#ch-library');
    renderLibrary('backgrounds', '#bg-library');
    renderLibrary('sounds', '#sfx-library');
    fillCharacterPicker();
  }

  // ---- settings ----
  function renderKeys() {
    var box = $('#keys'); box.innerHTML = '';
    var cfg = HG.store.getConfig();
    HG.registry.all().forEach(function (a) {
      var row = document.createElement('div'); row.className = 'keyrow';
      var lab = document.createElement('label'); lab.textContent = a.id;
      var inp = document.createElement('input');
      inp.type = 'password'; inp.id = 'key-' + a.id;
      inp.placeholder = a.keyHint || 'API key';
      inp.value = (cfg.keys && cfg.keys[a.id]) || '';
      row.appendChild(lab); row.appendChild(inp);
      if (a.verified === false) { var u = document.createElement('span'); u.className = 'unverified'; u.textContent = 'verify'; u.title = 'Endpoints best-effort — confirm against current provider docs'; row.appendChild(u); }
      box.appendChild(row);
    });
    var cfg2 = HG.store.getConfig();
    $('#ffmpeg-path').value = (cfg2.defaults && cfg2.defaults.ffmpegPath) || 'ffmpeg';
  }
  function saveSettings() {
    var cfg = HG.store.getConfig(); cfg.keys = cfg.keys || {}; cfg.defaults = cfg.defaults || {};
    HG.registry.all().forEach(function (a) {
      var v = $('#key-' + a.id).value.trim();
      if (v) cfg.keys[a.id] = v; else delete cfg.keys[a.id];
    });
    cfg.defaults.ffmpegPath = $('#ffmpeg-path').value.trim() || 'ffmpeg';
    HG.store.saveConfig(cfg);
  }

  // ---- timeline ----
  function refreshSeqInfo() {
    if (!HG.cep.available) { $('#seqinfo').textContent = 'no host'; return; }
    HG.cep.host('hgSequenceInfo', {}).then(function (s) {
      $('#seqinfo').textContent = s.name + ' · ' + s.fps + 'fps';
    }).catch(function () { $('#seqinfo').textContent = 'no sequence'; });
  }

  // ---- bindings ----
  function bind() {
    $all('.tab').forEach(function (t) {
      t.onclick = function () {
        $all('.tab').forEach(function (x) { x.classList.remove('active'); });
        $all('.panel').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        $('[data-panel="' + t.dataset.tab + '"]').classList.add('active');
      };
    });

    $('#project').onchange = refreshLibraries;

    // Character — create
    $('#ch-create').onclick = function () {
      var prompt = $('#ch-prompt').value.trim();
      if (!prompt) return log('✗ Enter a character description', 'err');
      action(this, 'Create character', function () {
        return HG.pillars.character.create(project(), { name: $('#ch-name').value.trim(), prompt: prompt, provider: $('#ch-create-provider').value }, progress)
          .then(function (a) { refreshLibraries(); return 'Saved "' + a.name + '"'; });
      });
    };

    // Character — animate -> timeline
    $('#ch-anim-provider').onchange = function () { fillModels($('#ch-anim-model'), this.value); };
    $('#ch-animate').onclick = function () {
      var characterId = $('#ch-pick').value;
      if (!characterId) return log('✗ Pick a character first', 'err');
      var btn = this;
      action(btn, 'Animate shot', function () {
        var opts = {
          characterId: characterId,
          prompt: $('#ch-anim-prompt').value.trim(),
          provider: $('#ch-anim-provider').value,
          model: $('#ch-anim-model').value,
          duration: parseInt($('#ch-duration').value, 10) || 5
        };
        var pre = Promise.resolve();
        if ($('#ch-useframe').checked) {
          var framePath = HG.store.tmpFile('.png');
          pre = HG.cep.host('hgExportFrame', { path: framePath }).then(function () { opts.firstFrame = framePath; });
        }
        return pre
          .then(function () { return HG.pillars.character.animate(project(), opts, progress); })
          .then(function (out) { return HG.cep.host('hgPlaceClip', { path: out.filePath, track: 0, audio: false }); })
          .then(function () { return 'Shot placed on V1'; });
      });
    };

    // Background
    $('#bg-create').onclick = function () {
      var prompt = $('#bg-prompt').value.trim();
      if (!prompt) return log('✗ Enter an environment description', 'err');
      action(this, 'Generate background', function () {
        return HG.pillars.background.generate(project(), { name: $('#bg-name').value.trim(), prompt: prompt, provider: $('#bg-provider').value }, progress)
          .then(function (a) { refreshLibraries(); return 'Saved "' + a.name + '"'; });
      });
    };

    // SFX -> audio track
    $('#sfx-generate').onclick = function () {
      var prompt = $('#sfx-prompt').value.trim();
      if (!prompt) return log('✗ Describe the sound', 'err');
      action(this, 'Generate SFX', function () {
        var dur = parseFloat($('#sfx-duration').value);
        return HG.pillars.sfx.generate(project(), {
          name: $('#sfx-name').value.trim(), prompt: prompt,
          duration: isNaN(dur) ? undefined : dur, saveToProfile: $('#sfx-save').checked
        }, progress)
          .then(function (out) { return HG.cep.host('hgPlaceClip', { path: out.filePath, track: 0, audio: true }); })
          .then(function () { refreshLibraries(); return 'SFX placed on A1'; });
      });
    };

    // Auto-cut
    $('#ac-run').onclick = function () {
      var clip = $('#ac-clip').value.trim();
      if (!clip) return log('✗ Enter a media file path to analyze', 'err');
      action(this, 'Auto-cut', function () {
        var thr = parseFloat($('#ac-threshold').value);
        return HG.pillars.autocut.analyzeAndCut({
          clipPath: clip, mode: $('#ac-mode').value,
          threshold: isNaN(thr) ? undefined : thr, apply: $('#ac-apply').checked
        }, progress).then(function (r) {
          $('#ac-result').textContent =
            'Detected ' + r.analyzed.cuts.length + ' cut point(s):\n' +
            r.analyzed.cuts.map(function (c) { return c.toFixed(2) + 's'; }).join('  ') +
            (r.applied ? '\n\nApplied: ' + JSON.stringify(r.applied) : '\n\n(not applied)');
          return r.analyzed.cuts.length + ' cuts found';
        });
      });
    };

    $('#settings-save').onclick = function () { action(this, 'Save settings', function () { saveSettings(); renderKeys(); return 'Settings saved'; }); };
  }

  function init() {
    try { HG.store.init(); } catch (e) {}
    fillProviders($('#ch-create-provider'), HG.registry.byCapability('t2i'));
    fillProviders($('#bg-provider'), HG.registry.byCapability('t2i'));
    fillProviders($('#ch-anim-provider'), videoProviders());
    fillModels($('#ch-anim-model'), $('#ch-anim-provider').value);
    renderKeys();
    refreshLibraries();
    bind();
    refreshSeqInfo();
    log('Higgesfield ready. ' + (HG.cep.available ? 'Host connected.' : 'No CEP host (open in Premiere).'), HG.cep.available ? 'ok' : 'err');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window.HG);
