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
  enabled: {
    type: 'boolean',
    default: false,
  },
  volume: {
    type: 'float',
    min: -80,
    max: 6,
    default: 0,
  },
};
