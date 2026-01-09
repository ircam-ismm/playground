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
};
