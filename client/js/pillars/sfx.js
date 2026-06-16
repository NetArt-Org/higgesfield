/* sfx.js — generate sound effects (ElevenLabs) and optionally keep them in a
 * per-project "sound profile" so the soundscape stays consistent across shots. */
window.HG = window.HG || {};
HG.pillars = HG.pillars || {};
(function (HG) {
  'use strict';

  function generate(project, opts, onProgress) {
    var params = { prompt: opts.prompt, duration: opts.duration, influence: opts.influence };
    return HG.jobs.run('elevenlabs', params, { onProgress: onProgress }).then(function (out) {
      if (opts.saveToProfile) {
        HG.store.saveAsset(project, 'sounds', {
          id: HG.store.uid('sfx'),
          kind: 'sound',
          name: opts.name || opts.prompt.slice(0, 28),
          prompt: opts.prompt,
          file: out.filePath,
          createdAt: Date.now()
        });
      }
      return out; // { filePath }
    });
  }

  function profile(project) { return HG.store.listAssets(project, 'sounds'); }

  HG.pillars.sfx = { generate: generate, profile: profile };
})(window.HG);
