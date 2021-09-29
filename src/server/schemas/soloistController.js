
const soloistSchema = {
  currentSoundBank: {
    type: 'string',
    default: null,
    nullable: true,
    filterChange: false,
  },
  xRange: {
    type: 'any',
    default: [0, 1],
  },
  yRange: {
    type: 'any',
    default: [0, 1],
  },
  triggers: {
    type: 'any',
    default: [],
  },
  radius: {
    type: 'float',
    min: 0,
    max: 1,
    default: 0.3,
  },
  // override fadeout time define per file
  // cf. https://github.com/ircam-ismm/playground/issues/4
  globalFadeOutDuration: {
    type: 'float',
    min: 0,
    default: 8,
  },
};

export default soloistSchema;
