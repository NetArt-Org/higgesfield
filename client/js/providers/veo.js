/* Google Veo via the Gemini API — direct.  Auth: API key (query param).
 * Pattern: predictLongRunning -> poll operation.
 * NOTE (verify): Vertex AI is the alternative (OAuth + GCP project). The returned
 * video may be a short-lived URI you must download promptly. Confirm model ids. */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, request = HG.http.request;
  var BASE = 'https://generativelanguage.googleapis.com/v1beta';

  register({
    id: 'veo',
    label: 'Google Veo (Gemini API)',
    auth: 'google',
    verified: false,
    capabilities: ['t2v', 'i2v'],
    models: ['veo-3.1-generate-preview', 'veo-3.0-generate-001'],

    submit: function (p, key) {
      var model = p.model || 'veo-3.1-generate-preview';
      var instance = { prompt: p.prompt };
      if (p.imageUrl) instance.image = { gcsUri: p.imageUrl };
      return request(BASE + '/models/' + model + ':predictLongRunning?key=' + encodeURIComponent(key), {
        method: 'POST',
        body: { instances: [instance] }
      }).then(function (res) {
        if (res.status >= 300 || !res.json) throw new Error('Veo submit ' + res.status + ': ' + res.text);
        return { taskId: res.json.name, _op: res.json.name };
      });
    },

    poll: function (taskId, key, sub) {
      var name = (sub && sub._op) || taskId;
      return request(BASE + '/' + name + '?key=' + encodeURIComponent(key), {}).then(function (res) {
        if (!res.json) throw new Error('Veo poll ' + res.status + ': ' + res.text);
        if (res.json.error) return { status: 'failed', error: res.json.error.message };
        if (res.json.done) {
          var resp = res.json.response || {};
          var vid = resp.generatedVideos && resp.generatedVideos[0];
          var url = vid && vid.video && (vid.video.uri || vid.video.gcsUri);
          return { status: 'done', url: url };
        }
        return { status: 'pending' };
      });
    }
  });
})(window.HG);
