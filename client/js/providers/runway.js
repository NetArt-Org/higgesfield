/* Runway — direct.  Auth: Bearer + X-Runway-Version.  Pattern: task -> poll.
 * NOTE (verify): confirm current model ids and the X-Runway-Version date string. */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, request = HG.http.request;
  var BASE = 'https://api.dev.runwayml.com/v1';
  var VERSION = '2024-11-06';

  register({
    id: 'runway',
    label: 'Runway',
    auth: 'bearer',
    verified: false,
    capabilities: ['i2v', 't2v'],
    models: ['gen4_turbo', 'gen3a_turbo'],

    submit: function (p, key) {
      var body = { model: p.model || 'gen4_turbo', promptText: p.prompt, duration: p.duration || 5 };
      if (p.imageUrl) body.promptImage = p.imageUrl;
      return request(BASE + '/image_to_video', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key, 'X-Runway-Version': VERSION },
        body: body
      }).then(function (res) {
        if (res.status >= 300 || !res.json) throw new Error('Runway submit ' + res.status + ': ' + res.text);
        return { taskId: res.json.id };
      });
    },

    poll: function (taskId, key) {
      return request(BASE + '/tasks/' + taskId, {
        headers: { Authorization: 'Bearer ' + key, 'X-Runway-Version': VERSION }
      }).then(function (res) {
        if (!res.json) throw new Error('Runway poll ' + res.status + ': ' + res.text);
        var st = String(res.json.status || '').toUpperCase();
        if (st === 'SUCCEEDED') return { status: 'done', url: res.json.output && res.json.output[0] };
        if (st === 'FAILED') return { status: 'failed', error: res.json.failure || 'failed' };
        return { status: 'pending' };
      });
    }
  });
})(window.HG);
