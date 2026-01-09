export default {
  clientIndex: {
    type: 'integer',
    default: null,
    required: true,
  },
  clientColor: {
    type: 'string',
    default: null,
    required: true,
  },
  filename: {
    type: 'string',
    nullable: true,
    default: null,
  },
  fileConfig: {
    type: 'any',
    nullable: true,
    default: null,
  },
  loading: {
    type: 'boolean',
    default: false,
  },
  position: {
    type: 'any',
    required: true,
  },
  distance: {
    type: 'float',
    default: 1,
    min: 0,
    max: 1,
  },
  startTime: {
    type: 'float',
    default: 0,
  },
};
