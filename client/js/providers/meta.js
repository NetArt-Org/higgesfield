/* meta.js — human-facing info per provider: a one-line "about" and where to get
 * the key. Used by the Setup wizard and the Settings tab. URLs are best-effort
 * starting points — confirm in each provider's console. */
window.HG = window.HG || {};
(function (HG) {
  'use strict';
  HG.providerMeta = {
    flux:       { about: 'Create character & background images', getUrl: 'https://dashboard.bfl.ai/', group: 'core' },
    kling:      { about: 'Animate shots; up to 7 character refs', getUrl: 'https://klingai.com/global/dev', group: 'core' },
    seedance:   { about: 'ByteDance video (1.0 / 1.5 Pro via API)', getUrl: 'https://console.byteplus.com/', group: 'core' },
    elevenlabs: { about: 'Sound-effect generation', getUrl: 'https://elevenlabs.io/app/settings/api-keys', group: 'core' },
    veo:        { about: 'Google Veo video', getUrl: 'https://aistudio.google.com/apikey', group: 'optional' },
    runway:     { about: 'Runway video', getUrl: 'https://dev.runwayml.com/', group: 'optional' },
    luma:       { about: 'Luma Dream Machine video', getUrl: 'https://lumalabs.ai/dashboard/api', group: 'optional' },
    minimax:    { about: 'MiniMax / Hailuo video', getUrl: 'https://www.minimaxi.com/', group: 'optional' },
    higgsfield: { about: 'Higgsfield (your Pro key)', getUrl: 'https://higgsfield.ai/', group: 'optional' }
  };
})(window.HG);
