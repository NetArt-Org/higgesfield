/* background.js — generate an environment / background plate and keep it as a
 * reusable reference so every shot shares the same location & look.
 *
 * Background *replacement* on existing footage (matte the subject + composite a
 * new plate) is a planned v2 step — it needs a matting pass (a direct matting
 * service or a local model) and a compositor. Flagged here, not yet wired. */
window.HG = window.HG || {};
HG.pillars = HG.pillars || {};
(function (HG) {
  'use strict';

  function generate(project, opts, onProgress) {
    var provider = opts.provider || 'flux';
    return HG.jobs.run(provider, { prompt: opts.prompt, width: 1536, height: 864, ext: '.png' }, { onProgress: onProgress })
      .then(function (out) {
        var asset = {
          id: HG.store.uid('bg'),
          kind: 'background',
          name: opts.name || opts.prompt.slice(0, 28),
          prompt: opts.prompt,
          provider: provider,
          refs: [out.filePath],
          createdAt: Date.now()
        };
        return HG.store.saveAsset(project, 'backgrounds', asset);
      });
  }

  /* Return the active background as a reference input for shot generation. */
  function asReference(project, backgroundId) {
    var bgs = HG.store.listAssets(project, 'backgrounds');
    var bg = bgs.filter(function (b) { return b.id === backgroundId; })[0];
    return bg ? HG.media.asImageInput(bg.refs[0]) : null;
  }

  HG.pillars.background = { generate: generate, asReference: asReference };
})(window.HG);
