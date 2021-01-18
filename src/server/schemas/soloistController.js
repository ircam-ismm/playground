
const soloistSchema = {
  currentSoundBank: {
    type: 'string',
    default: null,
    nullable: true,
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
};

export default soloistSchema;

