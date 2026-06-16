/* _interface.js — provider adapter contract + shared auth helpers.
 *
 * Every adapter is an object:
 *   {
 *     id, label, auth, capabilities:[...], models:[...], verified:bool,
 *     synchronous?:bool,
 *     submit(params, key) -> { taskId, ... }   // or { filePath } for synchronous providers
 *     poll(taskId, key, submitResult) -> { status:'pending'|'done'|'failed', url?, error? }
 *   }
 *
 * params (normalized across pillars):
 *   prompt, model, mode, duration, width, height, ratio,
 *   imageUrl (data-uri or url), references:[imageUrl...], ext
 *
 * The job layer (jobs.js) is provider-agnostic: submit -> poll-until-done -> download.
 */
window.HG = window.HG || {};
HG.providers = HG.providers || {};
(function (HG) {
  'use strict';
  var crypto = require('crypto');

  function b64url(input) {
    return Buffer.from(input).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }

  /* Kling-style JWT (HS256), signed with accessKey/secretKey. */
  function klingJWT(accessKey, secretKey, ttlSeconds) {
    var now = Math.floor(Date.now() / 1000);
    var head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    var body = b64url(JSON.stringify({ iss: accessKey, exp: now + (ttlSeconds || 1800), nbf: now - 5 }));
    var sig = b64url(crypto.createHmac('sha256', secretKey).update(head + '.' + body).digest());
    return head + '.' + body + '.' + sig;
  }

  function register(adapter) {
    if (!adapter || !adapter.id) throw new Error('Adapter needs an id');
    HG.providers[adapter.id] = adapter;
    return adapter;
  }

  HG.providerBase = { b64url: b64url, klingJWT: klingJWT, register: register };
})(window.HG);
