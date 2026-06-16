/* analyze.js — local cut detection via ffmpeg (no API, no key).
 * Requires ffmpeg on PATH, or set defaults.ffmpegPath in ~/.higgesfield/config.json.
 *   - scene   : visual shot-change detection (select='gt(scene,threshold)')
 *   - silence : audio dead-air detection (silencedetect)
 * Both parse ffmpeg's stderr diagnostics. Returns { mode, cuts:[seconds...] }. */
window.HG = window.HG || {};
(function (HG) {
  'use strict';
  var spawn = require('child_process').spawn;

  function ffmpegPath() {
    var c = HG.store.getConfig();
    return (c.defaults && c.defaults.ffmpegPath) || 'ffmpeg';
  }

  function runFFmpeg(args) {
    return new Promise(function (resolve, reject) {
      var p, err = '';
      try { p = spawn(ffmpegPath(), args); }
      catch (e) { reject(e); return; }
      p.stderr.on('data', function (d) { err += d.toString(); });
      p.on('error', function (e) {
        reject(new Error('ffmpeg not found. Install it or set defaults.ffmpegPath. (' + e.message + ')'));
      });
      p.on('close', function () { resolve(err); }); // ffmpeg prints detection info to stderr
    });
  }

  function matchAll(re, str) {
    var out = [], m;
    while ((m = re.exec(str)) !== null) out.push(parseFloat(m[1]));
    return out;
  }

  function detectScenes(clipPath, threshold) {
    threshold = (threshold != null) ? threshold : 0.4;
    return runFFmpeg(['-i', clipPath, '-filter:v', "select='gt(scene," + threshold + ")',showinfo", '-f', 'null', '-'])
      .then(function (out) { return matchAll(/pts_time:([0-9.]+)/g, out); });
  }

  function detectSilence(clipPath, noiseDb, minDur) {
    noiseDb = (noiseDb != null) ? noiseDb : -30;
    minDur = (minDur != null) ? minDur : 0.5;
    return runFFmpeg(['-i', clipPath, '-af', 'silencedetect=noise=' + noiseDb + 'dB:d=' + minDur, '-f', 'null', '-'])
      .then(function (out) {
        var starts = matchAll(/silence_start:\s*([0-9.]+)/g, out);
        var ends = matchAll(/silence_end:\s*([0-9.]+)/g, out);
        return starts.concat(ends).sort(function (a, b) { return a - b; });
      });
  }

  function analyze(clipPath, opts) {
    opts = opts || {};
    if (!clipPath) return Promise.reject(new Error('No clip path to analyze.'));
    var p = (opts.mode === 'silence')
      ? detectSilence(clipPath, opts.threshold)
      : detectScenes(clipPath, opts.threshold);
    return p.then(function (cuts) { return { mode: opts.mode || 'scene', cuts: cuts }; });
  }

  HG.autocutEngine = { analyze: analyze, detectScenes: detectScenes, detectSilence: detectSilence };
})(window.HG);
