/* Luma Dream Machine — direct.  Auth: Bearer.  Pattern: generation -> poll.
 * NOTE (verify): confirm current model ids (ray-2 family) and asset field names. */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, request = HG.http.request;
  var BASE = 'https://api.lumalabs.ai/dream-machine/v1';

  register({
    id: 'luma',
    label: 'Luma Dream Machine',
    auth: 'bearer',
    verified: false,
    capabilities: ['t2v', 'i2v'],
    models: ['ray-2', 'ray-flash-2'],

    submit: function (p, key) {
      var body = { model: p.model || 'ray-2', prompt: p.prompt };
      if (p.imageUrl) body.keyframes = { frame0: { type: 'image', url: p.imageUrl } };
      return request(BASE + '/generations', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key },
        body: body
      }).then(function (res) {
        if (res.status >= 300 || !res.json) throw new Error('Luma submit ' + res.status + ': ' + res.text);
        return { taskId: res.json.id };
      });
    },

    poll: function (taskId, key) {
      return request(BASE + '/generations/' + taskId, { headers: { Authorization: 'Bearer ' + key } })
        .then(function (res) {
          if (!res.json) throw new Error('Luma poll ' + res.status + ': ' + res.text);
          var st = String(res.json.state || '').toLowerCase();
          if (st === 'completed') return { status: 'done', url: res.json.assets && res.json.assets.video };
          if (st === 'failed') return { status: 'failed', error: res.json.failure_reason || 'failed' };
          return { status: 'pending' };
        });
    }
  });
})(window.HG);
