/* Kling (Kuaishou) — direct.  Auth: JWT (HS256) from accessKey:secretKey.
 * Key is stored as "ACCESS_KEY:SECRET_KEY".  Pattern: create task -> poll task.
 * Best for multi-reference character consistency (image_list / @elements).
 *
 * NOTE (verify): intl base is api-singapore.klingai.com; China is api-beijing.klingai.com.
 * Model ids and the exact image-ref field evolve — confirm in the Kling dev console. */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, klingJWT = HG.providerBase.klingJWT, request = HG.http.request;
  var BASE = 'https://api-singapore.klingai.com';

  function token(key) {
    var parts = String(key).split(':');
    if (parts.length < 2) throw new Error('Kling key must be "accessKey:secretKey"');
    return klingJWT(parts[0], parts.slice(1).join(':'), 1800);
  }

  register({
    id: 'kling',
    label: 'Kling (Kuaishou)',
    auth: 'jwt',
    keyHint: 'accessKey:secretKey',
    verified: false,
    capabilities: ['t2v', 'i2v', 'ref2v'],
    models: ['kling-v2-master', 'kling-v1-6', 'kling-o1'],

    submit: function (p, key) {
      var jwt = token(key);
      var hasImage = !!p.imageUrl || (p.references && p.references.length);
      var path = hasImage ? '/v1/videos/image2video' : '/v1/videos/text2video';
      var body = {
        model_name: p.model || 'kling-v2-master',
        prompt: p.prompt || '',
        duration: String(p.duration || 5),
        mode: p.mode || 'std'
      };
      if (p.imageUrl) body.image = p.imageUrl;
      if (p.references && p.references.length) body.image_list = p.references.map(function (u) { return { image: u }; });
      return request(BASE + path, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + jwt },
        body: body
      }).then(function (res) {
        if (res.status >= 300 || !res.json || !res.json.data) throw new Error('Kling submit ' + res.status + ': ' + res.text);
        return { taskId: res.json.data.task_id, _path: path };
      });
    },

    poll: function (taskId, key, sub) {
      var jwt = token(key);
      var path = (sub && sub._path) ? sub._path : '/v1/videos/text2video';
      return request(BASE + path + '/' + taskId, { headers: { Authorization: 'Bearer ' + jwt } })
        .then(function (res) {
          if (!res.json || !res.json.data) throw new Error('Kling poll ' + res.status + ': ' + res.text);
          var d = res.json.data;
          var st = String(d.task_status || '').toLowerCase();
          if (st === 'succeed' || st === 'succeeded') {
            var v = d.task_result && d.task_result.videos && d.task_result.videos[0];
            return { status: 'done', url: v && v.url };
          }
          if (st === 'failed') return { status: 'failed', error: d.task_status_msg || 'failed' };
          return { status: 'pending' };
        });
    }
  });
})(window.HG);
