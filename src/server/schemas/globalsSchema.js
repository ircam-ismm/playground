export default {
  triggerPreset: {
    type: 'string',
    default: null,
    nullable: true,
  },
  triggerPresetList: {
    type: 'any',
    default: null,
    nullable: true,
  },
  granularPreset: {
    type: 'string',
    default: null,
    nullable: true,
  },
  granularPresetList: {
    type: 'any',
    default: null,
    nullable: true,
  },
  instructionsState: {
    type: 'string',
    default: 'welcome',
  },
  masterVolume: {
    type: 'integer',
    min: -80,
    max: 6,
    default: 0,
  },
}
