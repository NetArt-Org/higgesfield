/* cep.js — thin bridge over the CEP runtime (window.__adobe_cep__).
 * Promisifies evalScript and provides a typed call into the ExtendScript host.
 * Avoids shipping the full official CSInterface.js; we only need a few calls. */
window.HG = window.HG || {};
(function (HG) {
  'use strict';
  var cep = (typeof window !== 'undefined') ? window.__adobe_cep__ : null;

  function evalScript(script) {
    return new Promise(function (resolve, reject) {
      if (!cep) { reject(new Error('Not running inside an Adobe CEP host.')); return; }
      cep.evalScript(script, function (res) { resolve(res); });
    });
  }

  /* Call an ExtendScript function by name with a JSON-serializable arg.
   * The host parses the JSON string and returns a JSON string (see host/index.jsx). */
  function host(fn, args) {
    var argStr = JSON.stringify(args == null ? {} : args);
    var expr = fn + '(' + JSON.stringify(argStr) + ')'; // double-encode -> safe JS string literal
    return evalScript(expr).then(function (res) {
      if (res === 'EvalScript error.' || res == null || res === 'undefined') {
        throw new Error('Host call failed: ' + fn);
      }
      var parsed;
      try { parsed = JSON.parse(res); } catch (e) { return res; }
      if (parsed && parsed.__error) throw new Error(parsed.__error);
      return parsed;
    });
  }

  function systemPath(type) {
    try { return cep && cep.getSystemPath ? decodeURIComponent(cep.getSystemPath(type)) : null; }
    catch (e) { return null; }
  }

  /* Open a URL in the user's default browser (cross-platform). */
  function openUrl(url) {
    try {
      if (window.cep && window.cep.util && window.cep.util.openURLInDefaultBrowser) {
        window.cep.util.openURLInDefaultBrowser(url); return true;
      }
    } catch (e) {}
    try {
      var cp = require('child_process'), p = process.platform;
      if (p === 'darwin') cp.exec('open "' + url + '"');
      else if (p === 'win32') cp.exec('start "" "' + url + '"');
      else cp.exec('xdg-open "' + url + '"');
      return true;
    } catch (e) {}
    try { window.open(url, '_blank'); } catch (e) {}
    return false;
  }

  HG.cep = { evalScript: evalScript, host: host, systemPath: systemPath, openUrl: openUrl, available: !!cep };
})(window.HG);
