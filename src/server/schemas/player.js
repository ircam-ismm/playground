export default {
  id: {
    type: 'integer',
    default: null,
    nullable: true,
  },
  position: {
    type: 'any',
    nullable: true,
    default: null,
  },
  index: {
    type: 'integer',
    default: null,
    nullable: true,
  },
  color: {
    type: 'string',
    default: null,
    nullable: true,
  },

  // trigger params
  triggerFile: {
    type: 'string',
    nullable: true,
    default: null,
  },
  triggerConfig: {
    type: 'any',
    nullable: true,
    default: null,
  },
  triggerLoading: {
    type: 'boolean',
    default: false,
  },
  triggerEvent: {
    type: 'boolean',
    default: null,
    nullable: true,
    event: true,
  },

  // granular params
  granularFile: {
    type: 'string',
    nullable: true,
    default: null,
  },
  granularConfig: {
    type: 'any',
    nullable: true,
    default: null,
  },
  granularLoading: {
    type: 'boolean',
    default: false,
  },
  granularState: {
    type: 'enum',
    list: ['start', 'stop'],
    default: 'stop',
    // event: true,
  },

  // soloist params
  soloistFile: {
    type: 'string',
    nullable: true,
    default: null,
  },
  soloistConfig: {
    type: 'any',
    nullable: true,
    default: null,
  },
  soloistLoading: {
    type: 'boolean',
    default: false,
  },
  soloistDistance: {
    type: 'float',
    default: 1,
    min: 0,
    max: 1,
    step: 0.0001,
  },
  soloistStartTime: {
    type: 'float',
    default: 0,
  },

  // auto play params
  autoPlayFile: {
    type: 'string',
    nullable: true,
    default: null,
  },
  autoPlayConfig: {
    type: 'any',
    nullable: true,
    default: null,
  },
  autoPlayLoading: {
    type: 'boolean',
    default: false,
  },
  autoPlayEnabled: {
    type: 'boolean',
    default: false,
  },
};
