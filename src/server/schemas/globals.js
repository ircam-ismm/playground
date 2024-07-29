export default {

  projectId: {
    type: 'string',
    default: '',
  },
  projectName: {
    type: 'string',
    default: '',
  },
  projectAuthor: {
    type: 'string',
    default: '',
  },

  master: {
    type: 'integer',
    min: -80,
    max: 6,
    default: 0,
  },
  mute: {
    type: 'boolean',
    default: false,
  },
  cutoffFrequency: {
    type: 'integer',
    min: 50,
    max: 20000,
    default: 16000,
  },
  soloistVolume: {
    type: 'integer',
    min: -80,
    max: 6,
    default: 0,
  },
  triggerVolume: {
    type: 'integer',
    min: -80,
    max: 6,
    default: 0,
  },
  granularVolume: {
    type: 'integer',
    min: -80,
    max: 6,
    default: 0,
  },

  numConnectedPlayers: {
    type: 'integer',
    default: 0,
  },

  instructionsState: {
    type: 'string',
    default: 'welcome',
  },

  processingArchive: {
    type: 'boolean',
    default: false,
  },

  archiveProject: {
    type: 'string',
    default: null,
    nullable: true,
    event: true,
  },
  restoreProject: {
    type: 'string',
    default: null,
    nullable: true,
    event: true,
  },
  // list of archives of the project
  archivedProjects: {
    type: 'any',
    default: [],
  },
}
