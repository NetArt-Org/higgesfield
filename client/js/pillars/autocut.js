/* autocut.js — analyze a clip locally (ffmpeg) for cut points, then apply the
 * cuts on the Premiere timeline via the ExtendScript host. */
window.HG = window.HG || {};
HG.pillars = HG.pillars || {};
(function (HG) {
  'use strict';

  /* mode: 'scene' | 'silence'. clipPath: media file to analyze. */
  function analyzeAndCut(opts, onProgress) {
    onProgress && onProgress({ phase: 'analyzing', mode: opts.mode });
    return HG.autocutEngine.analyze(opts.clipPath, { mode: opts.mode, threshold: opts.threshold })
      .then(function (result) {
        onProgress && onProgress({ phase: 'applying', cuts: result.cuts.length });
        if (!opts.apply) return { analyzed: result, applied: null };
        return HG.cep.host('hgApplyCuts', { cuts: result.cuts, mode: opts.mode, track: opts.track || 0 })
          .then(function (applied) { return { analyzed: result, applied: applied }; });
      });
  }

  /* Assemble a list of generated/source clips onto the active sequence in order. */
  function assemble(clipPaths, opts) {
    opts = opts || {};
    var i = 0;
    function next(prev) {
      if (i >= clipPaths.length) return Promise.resolve(prev);
      var path = clipPaths[i++];
      return HG.cep.host('hgAppendClip', { path: path, track: opts.track || 0, audio: !!opts.audio }).then(next);
    }
    return next(null);
  }

  HG.pillars.autocut = { analyzeAndCut: analyzeAndCut, assemble: assemble };
})(window.HG);
