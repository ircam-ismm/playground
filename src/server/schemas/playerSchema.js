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
  triggerSynthFile: {
    type: 'string',
    nullable: true,
    default: null,
  },
  triggerSynthConfig: {
    type: 'any',
    nullable: true,
    default: null,
  },
  triggerSynthLoading: {
    type: 'boolean',
    default: false,
  },
  triggerSynthEvent: {
    type: 'boolean',
    default: null,
    nullable: true,
    event: true,
  },

  // granular params
  granularSynthFile: {
    type: 'string',
    nullable: true,
    default: null,
  },
  granularSynthConfig: {
    type: 'any',
    nullable: true,
    default: null,
  },
  granularSynthLoading: {
    type: 'boolean',
    default: false,
  },
  granularSynthState: {
    type: 'enum',
    list: ['start', 'stop'],
    default: 'stop',
    // event: true,
  },

  // soloist params
  soloistSynthFile: {
    type: 'string',
    nullable: true,
    default: null,
  },
  soloistSynthConfig: {
    type: 'any',
    nullable: true,
    default: null,
  },
  soloistSynthLoading: {
    type: 'boolean',
    default: false,
  },
  soloistSynthDistance: {
    type: 'float',
    default: 1,
    min: 0,
    max: 1,
    step: 0.0001,
  },
  soloistSynthStartTime: {
    type: 'float',
    default: 0,
  },
};
