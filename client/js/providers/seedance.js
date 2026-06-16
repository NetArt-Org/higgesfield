/* Seedance — direct via BytePlus ModelArk (international) / Volcengine (China).
 * Auth: Bearer API key.  Pattern: create task -> poll task.
 *
 * NOTE (verify on your account): the ModelArk base host and model ids depend on
 * your region/endpoint. 1.0 / 1.5 Pro are GA via API; 2.0 is public-beta and may
 * not accept API calls yet. Update BASE and `models` from your ModelArk console. */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, request = HG.http.request;
  var BASE = 'https://ark.ap-southeast.bytepluses.com/api/v3';

  register({
    id: 'seedance',
    label: 'Seedance (BytePlus ModelArk)',
    auth: 'bearer',
    verified: false,
    capabilities: ['t2v', 'i2v', 'ref2v'],
    models: ['seedance-1-5-pro', 'seedance-1-0-pro', 'seedance-1-0-lite'],

    submit: function (p, key) {
      var content = [];
      if (p.prompt) content.push({ type: 'text', text: p.prompt });
      if (p.imageUrl) content.push({ type: 'image_url', image_url: { url: p.imageUrl } });
      (p.references || []).forEach(function (url) { content.push({ type: 'image_url', image_url: { url: url } }); });
      var body = { model: p.model || 'seedance-1-5-pro', content: content };
      if (p.duration) body.duration = p.duration;
      if (p.ratio) body.ratio = p.ratio;
      return request(BASE + '/contents/generations/tasks', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key },
        body: body
      }).then(function (res) {
        if (res.status >= 300 || !res.json) throw new Error('Seedance submit ' + res.status + ': ' + res.text);
        return { taskId: res.json.id || (res.json.data && res.json.data.id) };
      });
    },

    poll: function (taskId, key) {
      return request(BASE + '/contents/generations/tasks/' + taskId, {
        headers: { Authorization: 'Bearer ' + key }
      }).then(function (res) {
        if (!res.json) throw new Error('Seedance poll ' + res.status + ': ' + res.text);
        var d = res.json;
        var st = String(d.status || '').toLowerCase();
        if (st === 'succeeded' || st === 'success' || st === 'completed') {
          var url = (d.content && (d.content.video_url || d.content.url)) || (d.data && d.data.video_url);
          return { status: 'done', url: url };
        }
        if (st === 'failed' || st === 'error') return { status: 'failed', error: (d.error && d.error.message) || 'failed' };
        return { status: 'pending' };
      });
    }
  });
})(window.HG);
