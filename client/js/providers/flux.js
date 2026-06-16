/* Flux (Black Forest Labs) — direct.  Auth: x-key header.
 * Used for create-character and background image generation.
 * Pattern: submit -> poll polling_url. */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, request = HG.http.request;
  var BASE = 'https://api.bfl.ai/v1';

  register({
    id: 'flux',
    label: 'Flux (Black Forest Labs)',
    auth: 'x-key',
    verified: false,
    capabilities: ['t2i', 'i2i'],
    models: ['flux-pro-1.1', 'flux-pro', 'flux-dev'],

    submit: function (p, key) {
      var model = p.model || 'flux-pro-1.1';
      var body = { prompt: p.prompt, width: p.width || 1024, height: p.height || 1024 };
      if (p.imageUrl) body.image_prompt = p.imageUrl;
      return request(BASE + '/' + model, {
        method: 'POST',
        headers: { 'x-key': key },
        body: body
      }).then(function (res) {
        if (res.status >= 300 || !res.json) throw new Error('Flux submit ' + res.status + ': ' + res.text);
        return { taskId: res.json.id, _pollUrl: res.json.polling_url };
      });
    },

    poll: function (taskId, key, sub) {
      var url = (sub && sub._pollUrl) ? sub._pollUrl : (BASE + '/get_result?id=' + taskId);
      return request(url, { headers: { 'x-key': key } }).then(function (res) {
        if (!res.json) throw new Error('Flux poll ' + res.status + ': ' + res.text);
        var st = String(res.json.status || '').toLowerCase();
        if (st === 'ready') return { status: 'done', url: res.json.result && res.json.result.sample };
        if (st === 'error' || st === 'failed' || st === 'content_moderated') return { status: 'failed', error: res.json.status };
        return { status: 'pending' };
      });
    }
  });
})(window.HG);
