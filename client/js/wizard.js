/* wizard.js — first-run Setup wizard. A guided overlay that collects API keys
 * (with "where to get it" links) and the ffmpeg path, then saves to the local
 * config. Cross-platform: runs inside the panel on Windows and macOS alike.
 * Opened automatically on first run (no keys yet) or via Settings ▸ Run setup. */
window.HG = window.HG || {};
(function (HG) {
  'use strict';
  var CORE = ['flux', 'kling', 'seedance', 'elevenlabs'];
  var OPTIONAL = ['veo', 'runway', 'luma', 'minimax', 'higgsfield'];
  var PAGES = 4;
  var page = 0;
  var onDoneCb = null;

  function meta(id) { return (HG.providerMeta && HG.providerMeta[id]) || {}; }
  function adapter(id) { return HG.registry.get(id); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  function inputRow(opts) {
    var row = el('div', 'wz-key');
    var top = el('div', 'wz-key-top');
    top.appendChild(el('span', 'wz-key-name', opts.label));
    if (opts.getUrl) {
      var link = el('a', 'wz-get', 'Get key ↗'); link.href = '#';
      link.onclick = function (e) { e.preventDefault(); HG.cep.openUrl(opts.getUrl); };
      top.appendChild(link);
    }
    row.appendChild(top);
    if (opts.about) row.appendChild(el('div', 'wz-about', opts.about));
    var inp = el('input'); inp.id = opts.id; inp.type = opts.type || 'password';
    inp.placeholder = opts.placeholder || ''; inp.value = opts.value || '';
    inp.spellcheck = false;
    row.appendChild(inp);
    return row;
  }

  function keyRow(id) {
    var a = adapter(id), m = meta(id), cfg = HG.store.getConfig();
    return inputRow({
      label: a ? a.label : id, id: 'wz-key-' + id, getUrl: m.getUrl, about: m.about,
      placeholder: (a && a.keyHint) || 'API key', value: (cfg.keys && cfg.keys[id]) || ''
    });
  }

  function build() {
    var ov = document.getElementById('wizard');
    ov.innerHTML = '';
    ov.appendChild(el('div', 'wz-head', 'Higgesfield setup'));
    var body = el('div', 'wz-body'); ov.appendChild(body);
    var cfg = HG.store.getConfig();

    // page 0 — intro
    var p0 = el('div', 'wz-page'); p0.setAttribute('data-p', '0');
    p0.appendChild(el('p', null, 'Add API keys for the models you want. Each one talks directly to its provider — your keys stay on this machine (~/.higgesfield). Skip any now and add them later in Settings.'));
    p0.appendChild(el('p', 'wz-muted', 'Auto-Cut needs no key — only ffmpeg.'));
    body.appendChild(p0);

    // page 1 — core keys + ffmpeg
    var p1 = el('div', 'wz-page'); p1.setAttribute('data-p', '1');
    p1.appendChild(el('h3', null, 'Core keys — power the four pillars'));
    CORE.forEach(function (id) { p1.appendChild(keyRow(id)); });
    p1.appendChild(inputRow({
      label: 'ffmpeg path (Auto-Cut)', id: 'wz-ffmpeg', type: 'text', placeholder: 'ffmpeg',
      about: 'Leave as "ffmpeg" if it is on your PATH, or paste a full path. No key needed.',
      value: (cfg.defaults && cfg.defaults.ffmpegPath) || 'ffmpeg'
    }));
    body.appendChild(p1);

    // page 2 — optional
    var p2 = el('div', 'wz-page'); p2.setAttribute('data-p', '2');
    p2.appendChild(el('h3', null, 'Optional — extra video models'));
    OPTIONAL.forEach(function (id) { p2.appendChild(keyRow(id)); });
    body.appendChild(p2);

    // page 3 — summary
    var p3 = el('div', 'wz-page'); p3.setAttribute('data-p', '3');
    p3.appendChild(el('h3', null, "You're set"));
    var sum = el('div', 'wz-summary'); sum.id = 'wz-summary'; p3.appendChild(sum);
    body.appendChild(p3);

    // footer
    var foot = el('div', 'wz-foot');
    var back = el('button', 'wz-btn', 'Back'); back.id = 'wz-back';
    var skip = el('button', 'wz-btn', 'Skip'); skip.id = 'wz-skip';
    var next = el('button', 'wz-btn primary', 'Next'); next.id = 'wz-next';
    foot.appendChild(back); foot.appendChild(skip); foot.appendChild(next);
    ov.appendChild(foot);

    back.onclick = function () { go(page - 1); };
    skip.onclick = function () { collect(); close(); };
    next.onclick = function () { collect(); if (page >= PAGES - 1) close(); else go(page + 1); };
  }

  function collect() {
    var cfg = HG.store.getConfig(); cfg.keys = cfg.keys || {}; cfg.defaults = cfg.defaults || {};
    HG.registry.all().forEach(function (a) {
      var i = document.getElementById('wz-key-' + a.id);
      if (!i) return;
      var v = i.value.trim();
      if (v) cfg.keys[a.id] = v; else delete cfg.keys[a.id];
    });
    var ff = document.getElementById('wz-ffmpeg');
    if (ff) cfg.defaults.ffmpegPath = ff.value.trim() || 'ffmpeg';
    HG.store.saveConfig(cfg);
  }

  function renderSummary() {
    var k = (HG.store.getConfig().keys) || {};
    var rows = [
      ['Character — create', !!k.flux],
      ['Character — animate', !!(k.kling || k.seedance || k.runway || k.luma || k.minimax || k.veo)],
      ['Background', !!k.flux],
      ['SFX', !!k.elevenlabs],
      ['Auto-Cut', true]
    ];
    var box = document.getElementById('wz-summary'); box.innerHTML = '';
    rows.forEach(function (r) {
      var d = el('div', 'wz-sum-row');
      d.appendChild(el('span', 'wz-sum-ic' + (r[1] ? ' on' : ''), r[1] ? '✓' : '•'));
      d.appendChild(el('span', null, r[0]));
      box.appendChild(d);
    });
    var miss = !k.flux || !k.elevenlabs;
    box.appendChild(el('p', 'wz-muted', miss
      ? 'Tip: add Flux + ElevenLabs to unlock the core pillars. You can finish now and add the rest in Settings.'
      : 'All core pillars are ready.'));
  }

  function go(p) {
    page = Math.max(0, Math.min(PAGES - 1, p));
    var pages = document.querySelectorAll('#wizard .wz-page');
    Array.prototype.forEach.call(pages, function (pg) {
      pg.style.display = (pg.getAttribute('data-p') === String(page)) ? 'block' : 'none';
    });
    document.getElementById('wz-back').disabled = (page === 0);
    document.getElementById('wz-next').textContent = (page === PAGES - 1) ? 'Finish' : 'Next';
    if (page === PAGES - 1) renderSummary();
  }

  function open(cb) {
    onDoneCb = cb || null;
    build();
    document.getElementById('wizard').hidden = false;
    go(0);
  }
  function close() {
    document.getElementById('wizard').hidden = true;
    if (onDoneCb) onDoneCb();
  }

  HG.wizard = { open: open };
})(window.HG);
