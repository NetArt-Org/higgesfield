/* media.js — local file <-> data-URI helpers.
 * Most image/video model APIs accept a public URL OR a base64 data URI for
 * reference inputs. We have local files (exported frames, generated refs), so
 * we inline them as data URIs. NOTE: a few providers require a *public URL* and
 * reject data URIs — for those, add an upload step (their file endpoint or your
 * own bucket). Flagged per-adapter. */
window.HG = window.HG || {};
(function (HG) {
  'use strict';
  var fs = require('fs');
  var path = require('path');
  var MIME = {
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.gif': 'image/gif',
    '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm',
    '.mp3': 'audio/mpeg', '.wav': 'audio/wav'
  };

  function fileToDataUri(p) {
    var ext = path.extname(p).toLowerCase();
    var mime = MIME[ext] || 'application/octet-stream';
    var b = fs.readFileSync(p);
    return 'data:' + mime + ';base64,' + b.toString('base64');
  }

  function fileToBase64(p) {
    return fs.readFileSync(p).toString('base64');
  }

  /* Resolve a "ref" (local path or already-a-url) into something a provider accepts. */
  function asImageInput(ref) {
    if (!ref) return null;
    if (/^https?:\/\//i.test(ref) || /^data:/i.test(ref)) return ref;
    return fileToDataUri(ref);
  }

  HG.media = { fileToDataUri: fileToDataUri, fileToBase64: fileToBase64, asImageInput: asImageInput, MIME: MIME };
})(window.HG);
