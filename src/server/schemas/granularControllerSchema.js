
export default {
  currentSoundBank: {
    type: 'string',
    default: null,
    nullable: true,
  },
  startedSynths: {
    type: 'any',
    default: [],
  },
  toggleSynthEvent: {
    type: 'any',
    default: {},
    event: true,
  },
}
