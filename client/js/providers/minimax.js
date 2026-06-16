/* MiniMax (Hailuo) — direct.  Auth: Bearer.  Pattern: create -> poll -> retrieve file.
 * NOTE (verify): MiniMax returns a file_id on success; you then resolve a
 * download_url via /files/retrieve. Confirm host (api.minimaxi.chat vs api.minimax.io). */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, request = HG.http.request;
  var BASE = 'https://api.minimaxi.chat/v1';

  register({
    id: 'minimax',
    label: 'MiniMax (Hailuo)',
    auth: 'bearer',
    verified: false,
    capabilities: ['t2v', 'i2v'],
    models: ['MiniMax-Hailuo-02', 'T2V-01', 'I2V-01'],

    submit: function (p, key) {
      var body = { model: p.model || 'MiniMax-Hailuo-02', prompt: p.prompt };
      if (p.imageUrl) body.first_frame_image = p.imageUrl;
      return request(BASE + '/video_generation', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + key },
        body: body
      }).then(function (res) {
        if (res.status >= 300 || !res.json) throw new Error('MiniMax submit ' + res.status + ': ' + res.text);
        return { taskId: res.json.task_id };
      });
    },

    poll: function (taskId, key) {
      return request(BASE + '/query/video_generation?task_id=' + taskId, { headers: { Authorization: 'Bearer ' + key } })
        .then(function (res) {
          if (!res.json) throw new Error('MiniMax poll ' + res.status + ': ' + res.text);
          var st = String(res.json.status || '').toLowerCase();
          if (st === 'success') {
            return request(BASE + '/files/retrieve?file_id=' + res.json.file_id, { headers: { Authorization: 'Bearer ' + key } })
              .then(function (fr) { return { status: 'done', url: fr.json && fr.json.file && fr.json.file.download_url }; });
          }
          if (st === 'fail') return { status: 'failed', error: 'failed' };
          return { status: 'pending' };
        });
    }
  });
})(window.HG);
