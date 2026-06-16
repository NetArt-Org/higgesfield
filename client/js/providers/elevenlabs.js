/* ElevenLabs — direct SFX (text -> sound effect).  Auth: xi-api-key.
 * SYNCHRONOUS: returns audio bytes directly, so submit() writes a temp file and
 * returns { filePath }. The job layer skips polling for synchronous providers. */
(function (HG) {
  'use strict';
  var register = HG.providerBase.register, requestToFile = HG.http.requestToFile;
  var BASE = 'https://api.elevenlabs.io/v1';

  register({
    id: 'elevenlabs',
    label: 'ElevenLabs (SFX)',
    auth: 'xi-api-key',
    verified: false,
    synchronous: true,
    capabilities: ['sfx'],
    models: ['eleven_text_to_sound_v2'],

    submit: function (p, key) {
      var dest = HG.store.tmpFile('.mp3');
      var body = { text: p.prompt, prompt_influence: (p.influence != null ? p.influence : 0.3) };
      if (p.duration) body.duration_seconds = p.duration;
      return requestToFile(BASE + '/sound-generation', {
        method: 'POST',
        headers: { 'xi-api-key': key, 'Accept': 'audio/mpeg' },
        body: body
      }, dest).then(function () {
        return { synchronous: true, filePath: dest };
      });
    }
    // no poll(): synchronous
  });
})(window.HG);
