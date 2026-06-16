/* Higgsfield — OPTIONAL, direct via your Pro API key.  Auth: Bearer.
 * Pattern: POST /v1/generations -> poll GET /v1/generations/{id}.
 * NOTE (verify): exact task names / param shape from your Higgsfield dashboard. */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, request = HG.http.request;
  var BASE = 'https://api.higgsfield.ai/v1';

  register({
    id: 'higgsfield',
    label: 'Higgsfield (Pro key)',
    auth: 'bearer',
    verified: false,
    capabilities: ['t2v', 'i2v', 't2i'],
    models: ['default'],

    submit: function (p, key) {
      var body = { task: p.imageUrl ? 'image-to-video' : 'text-to-image', prompt: p.prompt };
      if (p.imageUrl) body.input_image = p.imageUrl;
      if (p.duration) body.duration = p.duration;
      return request(BASE + '/generations', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key },
        body: body
      }).then(function (res) {
        if (res.status >= 300 || !res.json) throw new Error('Higgsfield submit ' + res.status + ': ' + res.text);
        return { taskId: res.json.id };
      });
    },

    poll: function (taskId, key) {
      return request(BASE + '/generations/' + taskId, { headers: { Authorization: 'Bearer ' + key } })
        .then(function (res) {
          if (!res.json) throw new Error('Higgsfield poll ' + res.status + ': ' + res.text);
          var st = String(res.json.status || '').toLowerCase();
          if (st === 'completed' || st === 'succeeded') {
            return { status: 'done', url: res.json.output_url || (res.json.output && res.json.output.url) };
          }
          if (st === 'failed') return { status: 'failed', error: 'failed' };
          return { status: 'pending' };
        });
    }
  });
})(window.HG);
