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
  triggerAll: {
    type: 'boolean',
    event: true,
  },
  triggerAllFilterThreshold: {
    type: 'float',
    min: 0,
    max: 1,
    default: 1,
  },
  padSize: {
    type: 'integer',
    min: 20,
    max: 100,
    default: 60,
  },
};
