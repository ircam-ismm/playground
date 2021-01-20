export default {

  master: {
    type: 'integer',
    min: -80,
    max: 6,
    default: 0,
  },
  mute: {
    type: 'boolean',
    default: false,
  },
  cutoffFrequency: {
    type: 'integer',
    min: 50,
    max: 20000,
    default: 16000,
  },
  numConnectedPlayers: {
    type: 'integer',
    default: 0,
  },
  instructionsState: {
    type: 'string',
    default: 'welcome',
  },
  // triggerPreset: {
  //   type: 'string',
  //   default: null,
  //   nullable: true,
  // },
  // triggerPresetList: {
  //   type: 'any',
  //   default: null,
  //   nullable: true,
  // },
  // granularPreset: {
  //   type: 'string',
  //   default: null,
  //   nullable: true,
  // },
  // granularPresetList: {
  //   type: 'any',
  //   default: null,
  //   nullable: true,
  // },
}
