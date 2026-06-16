/* jobs.js — provider-agnostic async orchestrator: submit -> poll -> download.
 * Synchronous providers (ElevenLabs) short-circuit by returning { filePath }. */
window.HG = window.HG || {};
(function (HG) {
  'use strict';
  var POLL_MS = 4000;
  var MAX_MS = 10 * 60 * 1000; // 10 min ceiling per job

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function guessExt(url) {
    var m = /\.(mp4|mov|webm|png|jpe?g|mp3|wav)(\?|#|$)/i.exec(url || '');
    return m ? '.' + m[1].toLowerCase().replace('jpeg', 'jpg') : '.bin';
  }

  function fetchToTemp(url, params) {
    if (!url) throw new Error('Provider returned no output URL');
    var ext = (params && params.ext) || guessExt(url);
    var dest = HG.store.tmpFile(ext);
    return HG.http.download(url, dest).then(function () { return { filePath: dest, url: url }; });
  }

  /* run(providerId, params, {onProgress}) -> Promise<{ filePath, url? }> */
  function run(providerId, params, opts) {
    opts = opts || {};
    var onProgress = opts.onProgress || function () {};
    var adapter = HG.providers[providerId];
    if (!adapter) return Promise.reject(new Error('Unknown provider: ' + providerId));
    var key = HG.store.getKey(providerId);
    if (!key) return Promise.reject(new Error('No API key set for "' + providerId + '". Add it in the Settings tab.'));

    onProgress({ phase: 'submitting', provider: providerId });
    return Promise.resolve(adapter.submit(params, key)).then(function (sub) {
      if (sub && sub.filePath) { onProgress({ phase: 'done' }); return { filePath: sub.filePath }; }
      if (sub && sub.url && !sub.taskId) { onProgress({ phase: 'downloading' }); return fetchToTemp(sub.url, params); }
      if (!sub || !sub.taskId) throw new Error(providerId + ': submit returned no taskId');

      var t0 = Date.now();
      function tick() {
        if (Date.now() - t0 > MAX_MS) throw new Error('Timed out waiting for ' + providerId);
        return sleep(POLL_MS)
          .then(function () { return adapter.poll(sub.taskId, key, sub); })
          .then(function (st) {
            onProgress({ phase: 'polling', status: st.status, elapsed: Math.round((Date.now() - t0) / 1000) });
            if (st.status === 'done') { onProgress({ phase: 'downloading' }); return fetchToTemp(st.url, params); }
            if (st.status === 'failed') throw new Error('Generation failed: ' + (st.error || 'unknown'));
            return tick();
          });
      }
      return tick();
    });
  }

  HG.jobs = { run: run };
})(window.HG);
