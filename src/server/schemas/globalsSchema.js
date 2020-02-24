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
    type: 'enum',
    list: ['welcome', 'instructions', 'none'],
    default: 'welcome',
  },
}
