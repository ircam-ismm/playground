
export default {
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
  triggerPlayerEvent: {
    type: 'integer',
    default: null,
    nullable: true,
    event: true,
  },
  triggerAllEvent: {
    type: 'boolean',
    default: null,
    nullable: true,
    event: true,
  },
};
