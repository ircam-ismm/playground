
export default {
  currentSoundBank: {
    type: 'string',
    default: null,
    nullable: true,
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
