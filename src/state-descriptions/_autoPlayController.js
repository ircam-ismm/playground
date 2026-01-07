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
  enabled: {
    type: 'boolean',
    default: false,
  },
}
