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
  projectConfig: {
    type: 'any',
    default: null,
  },

  master: {
    type: 'float',
    min: -80,
    max: 6,
    default: 0,
  },
  mute: {
    type: 'boolean',
    default: false,
  },
  cutoffFrequency: {
    type: 'float',
    min: 50,
    max: 20000,
    default: 16000,
  },

  instructionsState: {
    type: 'enum',
    list: ['welcome', 'instructions', 'none', 'thanks'],
    default: 'welcome',
  },

  // not implemented
  // processingArchive: {
  //   type: 'boolean',
  //   default: false,
  // },

  // archiveProject: {
  //   type: 'string',
  //   default: null,
  //   nullable: true,
  //   event: true,
  // },
  // restoreProject: {
  //   type: 'string',
  //   default: null,
  //   nullable: true,
  //   event: true,
  // },
  // // list of archives of the project
  // archivedProjects: {
  //   type: 'any',
  //   default: [],
  // },
}
