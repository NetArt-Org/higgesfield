/* http.js — dependency-free HTTP via Node's built-in https/http.
 * Used instead of fetch/XHR to avoid CEP CORS restrictions when calling model APIs. */
window.HG = window.HG || {};
(function (HG) {
  'use strict';
  var https = require('https');
  var http = require('http');
  var fs = require('fs');
  var urlmod = require('url');
  var URL = urlmod.URL;

  function libFor(u) { return u.protocol === 'http:' ? http : https; }

  /* request(url, {method, headers, body, timeout}) -> {status, headers, text, json} */
  function request(urlStr, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var u;
      try { u = new URL(urlStr); } catch (e) { reject(e); return; }
      var headers = Object.assign({}, opts.headers || {});
      var payload = null;
      if (opts.body != null) {
        payload = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
        if (!headers['Content-Type'] && typeof opts.body !== 'string') headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }
      var reqOpts = {
        method: opts.method || 'GET',
        hostname: u.hostname,
        port: u.port || (u.protocol === 'http:' ? 80 : 443),
        path: u.pathname + u.search,
        headers: headers,
        timeout: opts.timeout || 120000
      };
      var req = libFor(u).request(reqOpts, function (res) {
        var chunks = [];
        res.on('data', function (c) { chunks.push(c); });
        res.on('end', function () {
          var buf = Buffer.concat(chunks);
          var text = buf.toString('utf8');
          var json = null;
          try { json = JSON.parse(text); } catch (e) { /* not json */ }
          resolve({ status: res.statusCode, headers: res.headers, text: text, json: json });
        });
      });
      req.on('timeout', function () { req.destroy(new Error('Request timed out: ' + urlStr)); });
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  }

  /* requestToFile — for endpoints that return raw bytes (e.g. ElevenLabs audio). */
  function requestToFile(urlStr, opts, destPath) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var u = new URL(urlStr);
      var headers = Object.assign({}, opts.headers || {});
      var payload = null;
      if (opts.body != null) {
        payload = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
        if (!headers['Content-Type'] && typeof opts.body !== 'string') headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = Buffer.byteLength(payload);
      }
      var reqOpts = {
        method: opts.method || 'POST', hostname: u.hostname,
        port: u.port || 443, path: u.pathname + u.search, headers: headers,
        timeout: opts.timeout || 120000
      };
      var file = fs.createWriteStream(destPath);
      var req = libFor(u).request(reqOpts, function (res) {
        if (res.statusCode >= 300) {
          var errChunks = [];
          res.on('data', function (c) { errChunks.push(c); });
          res.on('end', function () { file.close(); reject(new Error('HTTP ' + res.statusCode + ': ' + Buffer.concat(errChunks).toString('utf8'))); });
          return;
        }
        res.pipe(file);
        file.on('finish', function () { file.close(function () { resolve({ status: res.statusCode, filePath: destPath }); }); });
      });
      req.on('error', function (e) { fs.unlink(destPath, function () {}); reject(e); });
      if (payload) req.write(payload);
      req.end();
    });
  }

  /* download a URL to disk (follows one level of redirect). */
  function download(urlStr, destPath) {
    return new Promise(function (resolve, reject) {
      var u = new URL(urlStr);
      var file = fs.createWriteStream(destPath);
      var req = libFor(u).get(urlStr, function (res) {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          file.close(); fs.unlink(destPath, function () {});
          resolve(download(res.headers.location, destPath)); return;
        }
        if (res.statusCode !== 200) { file.close(); reject(new Error('Download failed ' + res.statusCode)); return; }
        res.pipe(file);
        file.on('finish', function () { file.close(function () { resolve(destPath); }); });
      });
      req.on('error', function (e) { fs.unlink(destPath, function () {}); reject(e); });
    });
  }

  HG.http = { request: request, requestToFile: requestToFile, download: download };
})(window.HG);
