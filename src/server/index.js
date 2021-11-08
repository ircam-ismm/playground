import 'source-map-support/register';
import { Server } from '@soundworks/core/server';
import { StateManagerOsc } from '@soundworks/state-manager-osc';
import path from 'path';
import serveStatic from 'serve-static';
import compile from 'template-literal';

// import plugins
import pluginPlatformFactory from '@soundworks/plugin-platform/server';
import pluginSyncFactory from '@soundworks/plugin-sync/server';
import pluginCheckinFactory from '@soundworks/plugin-checkin/server';
import pluginFileSystemFactory from '@soundworks/plugin-filesystem/server';
import pluginAudioBufferLoaderFactory from '@soundworks/plugin-audio-buffer-loader/server';
import pluginPositionFactory from '@soundworks/plugin-position/server';
import pluginScriptingFactory from '@soundworks/plugin-scripting/server';

// experiences
import PlayerExperience from './PlayerExperience.js';
import AutoPlayControllerExperience from './AutoPlayControllerExperience.js';
import SoloistControllerExperience from './SoloistControllerExperience.js';
import TriggerControllerExperience from './TriggerControllerExperience.js';
import GranularControllerExperience from './GranularControllerExperience.js';
import SoundBankManagerExperience from './SoundBankManagerExperience.js';

import InstructionsViewerExperience from './InstructionsViewerExperience.js';
import ControllerExperience from './ControllerExperience.js';
import DebugExperience from './DebugExperience.js';

// schemas
import globalsSchema from './schemas/globals.js';
import playerSchema from './schemas/player.js';
// controllers schema
import autoPlayControllerSchema from './schemas/autoPlayController.js';
import soloistControllerSchema from './schemas/soloistController.js';
import triggerControllerSchema from './schemas/triggerController.js';
import granularControllerSchema from './schemas/granularController.js';

import SoundBankManager from './soundbank/SoundBankManager.js';
import soundbankPresets from './soundbank/soundbankPresets.js'
import soundfilesPresets from './soundbank/soundfilesPresets.js'

import getConfig from './utils/getConfig.js';
import getProjectConfig from './utils/getProjectConfig.js';

const ENV = process.env.ENV || 'default';
const config = getConfig(ENV);
const server = new Server();

const projectConfig = getProjectConfig(config.app.project);
const area = { xRange: [0, 1], yRange: [0, 1] };
config.project = projectConfig;

// html template and static files (in most case, this should not be modified)
server.templateEngine = { compile };
server.templateDirectory = path.join('.build', 'server', 'tmpl');
server.router.use(serveStatic('public'));
server.router.use('build', serveStatic(path.join('.build', 'public')));
server.router.use('vendors', serveStatic(path.join('.vendors', 'public')));
// projcet specific routes
server.router.use('sounds', serveStatic(path.join('projects', config.app.project, 'sounds')));
server.router.use('images', serveStatic(path.join('projects', config.app.project, 'images')));

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${ENV}" environment
- [pid: ${process.pid}]
- project (${config.app.project}) "${projectConfig.name} by ${projectConfig.author}"
--------------------------------------------------------
`);

// -------------------------------------------------------------------
// register plugins and schemas
// -------------------------------------------------------------------

server.pluginManager.register('platform', pluginPlatformFactory, {}, []);
server.pluginManager.register('sync', pluginSyncFactory, {}, []);
server.pluginManager.register('checkin', pluginCheckinFactory, {}, []);
server.pluginManager.register('audio-buffer-loader', pluginAudioBufferLoaderFactory, {}, []);
server.pluginManager.register('position', pluginPositionFactory, {
  area,
  backgroundImage: projectConfig.positionBackgroundImage || '',
}, []);
server.pluginManager.register('filesystem', pluginFileSystemFactory, {
  directories: [
    {
      name: 'sounds',
      path: path.join('projects', config.app.project, 'sounds'),
      publicDirectory: 'sounds',
    },
    // {
    //   name: 'archives',
    //   path: path.join('.archives', config.app.project),
    // },
  ]
}, []);

server.pluginManager.register('scripting', pluginScriptingFactory, {
  directory: path.join('projects', config.app.project, 'scripts'),
}, []);

// -------------------------------------------------------------------
// register schemas
// -------------------------------------------------------------------
server.stateManager.registerSchema('globals', globalsSchema);
server.stateManager.registerSchema('player', playerSchema);
server.stateManager.registerSchema('autoplay-controller', autoPlayControllerSchema);
server.stateManager.registerSchema('granular-controller', granularControllerSchema);
server.stateManager.registerSchema('trigger-controller', triggerControllerSchema);
server.stateManager.registerSchema('soloist-controller', soloistControllerSchema);

(async function launch() {
  try {
    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------

    await server.init(config, (clientType, config, httpRequest) => {
      return {
        clientType: clientType,
        app: {
          name: projectConfig.name,
          author: projectConfig.author,
        },
        env: {
          type: config.env.type,
          websockets: config.env.websockets,
          assetsDomain: config.env.assetsDomain,
        },
        project: projectConfig,
      };
    });

    const globalsState = await server.stateManager.create('globals', {
      projectId: config.app.project,
      projectName: projectConfig.name,
      projectAuthor: projectConfig.author,
    });
    const autoPlayControllerState = await server.stateManager.create('autoplay-controller');
    const triggerControllerState = await server.stateManager.create('trigger-controller');
    const granularControllerState = await server.stateManager.create('granular-controller');
    const soloistControllerState = await server.stateManager.create('soloist-controller', area);

    const fileSystem = server.pluginManager.get('filesystem');
    // @note - we propabably should review this SoundBank stuff at some point
    const soundBankManager = new SoundBankManager(soundbankPresets, soundfilesPresets);

    const playerExperience = new PlayerExperience(server,
      'player',
      {
        autoPlay: autoPlayControllerState,
        soloist: soloistControllerState,
        trigger: triggerControllerState,
        granular: granularControllerState,
      },
      soundBankManager
    );
    // controllers
    const autoPlayControllerExperience = new AutoPlayControllerExperience(server,
      'autoplay-controller',
      soundBankManager
    );

    const soloistControllerExperience = new SoloistControllerExperience(server,
      'soloist-controller',
      soundBankManager
    );

    const triggerControllerExperience = new TriggerControllerExperience(server,
      'trigger-controller',
      soundBankManager
    );

    const granularControllerExperience = new GranularControllerExperience(server,
      'granular-controller',
      soundBankManager
    );

    // soundbank manager
    const soundbankManagerExperience = new SoundBankManagerExperience(server,
      'soundbank-manager',
      soundBankManager
    );

    const instructionsViewerExperience = new InstructionsViewerExperience(server, 'instructions-viewer');
    const mainControllerExperience = new ControllerExperience(server, 'controller');

    const debugExperience = new DebugExperience(server,
      'debug',
      soundBankManager
    );

    await server.start();

    autoPlayControllerExperience.start();
    soloistControllerExperience.start();
    triggerControllerExperience.start();
    granularControllerExperience.start();
    instructionsViewerExperience.start();
    mainControllerExperience.start();
    soundbankManagerExperience.start();
    debugExperience.start();
    playerExperience.start();

    soundBankManager.subscribe((oldValues, newValues) => {
      const soundbanks = Object.values(newValues);

      const autoPlaySoundbanks = soundbanks
        .filter(s => s.presets.activated.autoPlaySynth)
        .map(s => s.name)
        .sort();
      autoPlayControllerState.set({ activeSoundbanks: autoPlaySoundbanks });

      const granularSoundbanks = soundbanks
        .filter(s => s.presets.activated.granularSynth)
        .map(s => s.name)
        .sort();
      granularControllerState.set({ activeSoundbanks: granularSoundbanks });

      const soloistSoundbanks = soundbanks
        .filter(s => s.presets.activated.soloistSynth)
        .map(s => s.name)
        .sort();
      soloistControllerState.set({ activeSoundbanks: soloistSoundbanks });

      const triggerSoundbanks = soundbanks
        .filter(s => s.presets.activated.triggerSynth)
        .map(s => s.name)
        .sort();
      triggerControllerState.set({ activeSoundbanks: triggerSoundbanks });
    });

    // bind filesystem plugin and soundBankManager together
    fileSystem.state.subscribe(updates => {
      for (let key in updates) {
        if (key === 'sounds') {
          soundBankManager.updateFromFileTree(updates[key]);
        }
      }
    });

    const soundsTree = fileSystem.get('sounds');
    soundBankManager.updateFromFileTree(soundsTree);

    // initialize the StateManagerOsc component
    const oscConfig = { // these are the defaults
      localAddress: '0.0.0.0',
      localPort: 57121,
      remoteAddress: '127.0.0.1',
      remotePort: 57122,
    };

    const oscStateManager = new StateManagerOsc(server.stateManager, oscConfig);
    await oscStateManager.init();

  } catch (err) {
    console.error(err);
  }
})();

process.on('unhandledRejection', (reason, p) => {
  console.log('> Unhandled Promise Rejection');
  console.log(reason);
});
