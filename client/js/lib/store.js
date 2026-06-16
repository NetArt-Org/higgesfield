/* store.js — per-machine config (API keys) + per-project consistency store.
 * Lives under ~/.higgesfield  (NOT in the repo). */
window.HG = window.HG || {};
(function (HG) {
  'use strict';
  var fs = require('fs');
  var os = require('os');
  var path = require('path');

  var ROOT = path.join(os.homedir(), '.higgesfield');
  var CONFIG = path.join(ROOT, 'config.json');
  var PROJECTS = path.join(ROOT, 'projects');
  var TMP = path.join(ROOT, 'tmp');

  function ensure(dir) { try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {} }
  function init() { ensure(ROOT); ensure(PROJECTS); ensure(TMP); }
  function readJSON(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; } }
  function writeJSON(file, obj) { ensure(path.dirname(file)); fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8'); }
  function sanitize(s) { return String(s || 'default').replace(/[^a-z0-9_\-]+/gi, '_'); }
  function uid(prefix) { return (prefix || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ---- config / API keys ----
  function getConfig() { return readJSON(CONFIG, { keys: {}, defaults: { ffmpegPath: 'ffmpeg', project: 'default' } }); }
  function saveConfig(cfg) { writeJSON(CONFIG, cfg); }
  function getKey(provider) { var c = getConfig(); return (c.keys && c.keys[provider]) || null; }
  function setKey(provider, value) { var c = getConfig(); c.keys = c.keys || {}; if (value) c.keys[provider] = value; else delete c.keys[provider]; saveConfig(c); }

  // ---- consistency store (per project) ----
  // kind is one of: 'characters' | 'backgrounds' | 'sounds'
  function projectDir(name) { var d = path.join(PROJECTS, sanitize(name)); ensure(d); return d; }
  function assetFile(project, kind) { return path.join(projectDir(project), kind + '.json'); }
  function listAssets(project, kind) { return readJSON(assetFile(project, kind), []); }
  function saveAsset(project, kind, asset) {
    var arr = listAssets(project, kind);
    var i = arr.findIndex(function (a) { return a.id === asset.id; });
    if (i >= 0) arr[i] = asset; else arr.push(asset);
    writeJSON(assetFile(project, kind), arr);
    return asset;
  }
  function deleteAsset(project, kind, id) {
    var arr = listAssets(project, kind).filter(function (a) { return a.id !== id; });
    writeJSON(assetFile(project, kind), arr);
  }

  function tmpFile(ext) { init(); return path.join(TMP, uid('hg') + (ext || '')); }

  HG.store = {
    init: init, ROOT: ROOT, TMP: TMP, uid: uid,
    getConfig: getConfig, saveConfig: saveConfig, getKey: getKey, setKey: setKey,
    projectDir: projectDir, listAssets: listAssets, saveAsset: saveAsset, deleteAsset: deleteAsset,
    tmpFile: tmpFile, readJSON: readJSON, writeJSON: writeJSON
  };
})(window.HG);
