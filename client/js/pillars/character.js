/* character.js — create a character (image) and reuse it as a consistent
 * reference across generated shots. References are stored locally and inlined
 * as data URIs at generation time (see lib/media.js). */
window.HG = window.HG || {};
HG.pillars = HG.pillars || {};
(function (HG) {
  'use strict';

  /* Create a character image from a prompt, save it to the project library. */
  function create(project, opts, onProgress) {
    var provider = opts.provider || 'flux';
    return HG.jobs.run(provider, { prompt: opts.prompt, width: 1024, height: 1024, ext: '.png' }, { onProgress: onProgress })
      .then(function (out) {
        var asset = {
          id: HG.store.uid('char'),
          kind: 'character',
          name: opts.name || opts.prompt.slice(0, 28),
          prompt: opts.prompt,
          provider: provider,
          refs: [out.filePath],
          createdAt: Date.now()
        };
        return HG.store.saveAsset(project, 'characters', asset);
      });
  }

  /* Register an externally supplied set of reference photos as a character. */
  function importRefs(project, opts) {
    var asset = {
      id: HG.store.uid('char'),
      kind: 'character',
      name: opts.name || 'Imported character',
      prompt: opts.prompt || '',
      refs: (opts.refs || []).slice(0, 7),
      createdAt: Date.now()
    };
    return Promise.resolve(HG.store.saveAsset(project, 'characters', asset));
  }

  /* Animate a shot that keeps the chosen character consistent.
   * Uses the character's reference images as ref2v inputs (Kling/Seedance). */
  function animate(project, opts, onProgress) {
    var chars = HG.store.listAssets(project, 'characters');
    var ch = chars.filter(function (c) { return c.id === opts.characterId; })[0];
    if (!ch) return Promise.reject(new Error('Pick a character first.'));

    var references = (ch.refs || []).slice(0, 7).map(function (r) { return HG.media.asImageInput(r); });
    var params = {
      prompt: opts.prompt,
      model: opts.model,
      mode: opts.mode || 'std',
      duration: opts.duration || 5,
      references: references,
      ext: '.mp4'
    };
    if (opts.firstFrame) params.imageUrl = HG.media.asImageInput(opts.firstFrame);
    return HG.jobs.run(opts.provider || 'kling', params, { onProgress: onProgress });
  }

  HG.pillars.character = { create: create, importRefs: importRefs, animate: animate };
})(window.HG);
