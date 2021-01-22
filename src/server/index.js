import 'source-map-support/register';
import { Server } from '@soundworks/core/server';
import path from 'path';
import serveStatic from 'serve-static';
import compile from 'template-literal';
import osc from 'osc';

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
server.pluginManager.register('position', pluginPositionFactory, { area }, []);
server.pluginManager.register('filesystem', pluginFileSystemFactory, {
  directories: [
    {
      name: 'sounds',
      path: path.join('projects', config.app.project, 'sounds'),
      publicDirectory: 'sounds',
    },
    {
      name: 'archives',
      path: path.join('.archives', config.app.project),
    },
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
          colors: projectConfig.colors,
          randomlyAssignPosition: projectConfig.randomlyAssignPosition,
          connectionMessage: projectConfig.connectionMessage,
          thanksMessage: projectConfig.thanksMessage,
        },
        env: {
          type: config.env.type,
          websockets: config.env.websockets,
          assetsDomain: config.env.assetsDomain,
        }
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

    await server.start();

    autoPlayControllerExperience.start();
    soloistControllerExperience.start();
    triggerControllerExperience.start();
    granularControllerExperience.start();

    instructionsViewerExperience.start();
    mainControllerExperience.start();

    soundbankManagerExperience.start();

    playerExperience.start();

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

    // const archivesTree = fileSystem.get('archives');
    // console.log(archivesTree);



    // ------------------------------------------------------------------
    // OSC controls for /soloist-controller
    // @todo - create an abstraction able to communicate with states
    // ------------------------------------------------------------------
    // create an osc.js UDP port listening on port 57121.
    // config shoud come from env config file...
    // ------------------------------------------------------------------
    const udpPort = new osc.UDPPort({
      localAddress: '127.0.0.1',
      localPort: 57121,
      metadata: true
    });

    udpPort.on('message', msg => {
      switch (msg.address) {
        case '/soloist-controller/triggers': {
          if (msg.args.length === 2) {
            const position = {
              x: msg.args[0].value,
              y: msg.args[1].value,
            }

            soloistControllerState.set({ triggers: [position] });
          } else {
            soloistControllerState.set({ triggers: [] });
          }
          break;
        }
        case '/soloist-controller/radius': {
          const radius = msg.args[0].value;
          soloistControllerState.set({ radius });
          break;
        }
      }
    });

    udpPort.open();

  } catch (err) {
    console.error(err);
  }
})();

process.on('unhandledRejection', (reason, p) => {
  console.log('> Unhandled Promise Rejection');
  console.log(reason);
});
