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
  startedSynths: {
    type: 'any',
    default: [],
  },
  toggleSynthEvent: {
    type: 'any',
    event: true,
    acknowledge: false,
  },
};
