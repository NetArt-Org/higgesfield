/* index.js — provider registry + pillar routing defaults + capability lookups. */
window.HG = window.HG || {};
(function (HG) {
  'use strict';

  HG.registry = {
    // Default provider per pillar action. Users can override via the UI dropdowns.
    pillars: {
      character: {
        create:  { provider: 'flux',  cap: 't2i' },                          // make a character image
        animate: { providers: ['kling', 'seedance'], cap: 'ref2v' }          // reference -> video shot
      },
      background: {
        create:  { provider: 'flux',  cap: 't2i' }                           // environment / bg plate
      },
      sfx: {
        generate: { provider: 'elevenlabs', cap: 'sfx' }                     // prompt -> sound effect
      }
    },

    all: function () { return Object.keys(HG.providers).map(function (k) { return HG.providers[k]; }); },
    get: function (id) { return HG.providers[id]; },
    byCapability: function (cap) {
      return HG.registry.all().filter(function (a) { return (a.capabilities || []).indexOf(cap) >= 0; });
    }
  };
})(window.HG);
