export default {
  // key of the preset as hardcoded in
  presetKey: {
    type: 'string',
    required: true,
  },
  activeSoundbanks: {
    type: 'any',
    default: [],
  },
  currentSoundBank: {
    type: 'string',
    default: null,
    nullable: true,
    filterChange: false,
  },
  assignSoundbankStrategy: {
    type: 'string',
    default: 'even',
  },
  volume: {
    type: 'float',
    min: -80,
    max: 6,
    default: 0,
  },
  triggers: {
    type: 'any',
    default: [],
  },
  radius: {
    type: 'float',
    min: 0,
    max: 1,
    default: 0.3,
  },
  rotateMap: {
    type: 'boolean',
    default: true,
  },
  // override fadeout time define per file
  // cf. https://github.com/ircam-ismm/playground/issues/4
  globalFadeOutDuration: {
    type: 'float',
    min: 0,
    max: 60,
    default: 8,
  },
  globalFadeOutDurationActive: {
    type: 'boolean',
    default: false,
  },
};
