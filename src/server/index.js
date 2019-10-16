import '@babel/polyfill';
import 'source-map-support/register';

import { Server } from '@soundworks/core/server';
import getConfig from './utils/getConfig';
import path from 'path';
import serveStatic from 'serve-static';
import compile from 'template-literal';

// import services
import servicePlatformFactory from '@soundworks/service-platform/server';
import serviceSyncFactory from '@soundworks/service-sync/server';
import serviceCheckinFactory from '@soundworks/service-checkin/server';
import serviceFileSystemFactory from '@soundworks/service-file-system/server';
import serviceAudioBufferLoaderFactory from '@soundworks/service-audio-buffer-loader/server';
import servicePositionFactory from '@soundworks/service-position/server';

// experiences
import PlayerExperience from './PlayerExperience';
import SoloistControllerExperience from './SoloistControllerExperience';
import TriggerControllerExperience from './TriggerControllerExperience';
import GranularControllerExperience from './GranularControllerExperience';
import SoundBankManagerExperience from './SoundBankManagerExperience';

// schemas
import globalsSchema from './schemas/globalsSchema';
import playerSchema from './schemas/playerSchema';
// controllers schema
import soloistControllerSchema from './schemas/soloistControllerSchema';
import triggerControllerSchema from './schemas/triggerControllerSchema';
import granularControllerSchema from './schemas/granularControllerSchema';

import SoundBankManager from './soundbank/SoundBankManager';

import osc from 'osc';

const ENV = process.env.ENV || 'default';
const config = getConfig(ENV);

console.log(`
--------------------------------------------------------
- running "${config.app.name}" in "${ENV}" environment -
--------------------------------------------------------
`);

(async function launch() {
  try {
    const server = new Server();

    const area = {
      xRange: [0, 1],
      yRange: [0, 1],
    }

    // -------------------------------------------------------------------
    // register services and schemas
    // -------------------------------------------------------------------

    server.registerService('platform', servicePlatformFactory, {}, []);
    server.registerService('sync', serviceSyncFactory, {}, []);
    server.registerService('checkin', serviceCheckinFactory, {}, []);
    server.registerService('audio-buffer-loader', serviceAudioBufferLoaderFactory, {}, []);
    server.registerService('position', servicePositionFactory, { area }, []);
    server.registerService('file-system', serviceFileSystemFactory, {
      directories: [{
        name: 'sounds',
        path: path.join('public', 'sounds'),
        publicDirectory: 'public',
        watch: true,
      }]
    }, []);

    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------

    await server.init(config, (clientType, config, httpRequest) => {
      return {
        clientType: clientType,
        app: {
          name: config.app.name,
          author: config.app.author,
          colors: config.app.colors,
        },
        env: {
          type: config.env.type,
          websockets: config.env.websockets,
          assetsDomain: config.env.assetsDomain,
        }
      };
    });

    // register schemas and init shared states
    server.stateManager.registerSchema('globals', globalsSchema);
    server.stateManager.registerSchema('player', playerSchema);
    server.stateManager.registerSchema('granular-controller', granularControllerSchema);
    server.stateManager.registerSchema('trigger-controller', triggerControllerSchema);
    server.stateManager.registerSchema('soloist-controller', soloistControllerSchema);

    // html template and static files (in most case, this should not be modified)
    server.configureHtmlTemplates({ compile }, path.join('.build', 'server', 'tmpl'))
    server.router.use(serveStatic('public'));
    server.router.use('build', serveStatic(path.join('.build', 'public')));

    const globalsState = server.stateManager.create('globals');
    const triggerControllerState = server.stateManager.create('trigger-controller');
    const granularControllerState = server.stateManager.create('granular-controller');
    const soloistControllerState = server.stateManager.create('soloist-controller');
    soloistControllerState.set(area); // init soloist state


    const fileSystem = server.serviceManager.get('file-system');
    const soundBankManager = new SoundBankManager(
      // presets of a given sound bank
      {
        activated: {
          triggerSynth: {
            type:'boolean',
            default: true,
          },
          soloistSynth: {
            type:'boolean',
            default: true,
          },
          granularSynth: {
            type:'boolean',
            default: true,
          },
        }
      },
      {
        triggerSynth: {
          repeat: {
            type: 'integer',
            min: 0,
            max: 20,
            default: 1,
            step: 1,
          },
          period: {
            type: 'float',
            min: 0,
            max: 5,
            default: 0,
            step: 0.001,
          },
          jitter: {
            type: 'float',
            min: 0,
            max: 2,
            default: 0,
            step: 0.001,
          },
          releaseDuration: {
            type: 'float',
            min: 0,
            max: 20,
            default: 1,
            step: 0.001,
          },
        },

        granularSynth: {
          volume: {
            type: 'float',
            min: 0,
            max: 1,
            step: 0.001,
            default: 1,
          },
          releaseDuration: {
            type: 'float',
            min: 0,
            max: 10,
            step: 0.1,
            default: 3,
          },
          speed: {
            type: 'float',
            min: -2,
            max: 2,
            step: 0.01,
            default: 1,
          },
          positionVar: {
            type: 'float',
            min: 0,
            max: 0.200,
            step: 0.001,
            default: 0.003,
          },
          periodAbs: {
            type: 'float',
            min: 0.001,
            max: 0.300,
            step: 0.001,
            default: 0.02,
          },
          durationAbs: {
            type: 'float',
            min: 0.010,
            max: 0.300,
            step: 0.001,
            default: 0.1,
          },
          resampling: {
            type: 'integer',
            min: -1200,
            max: 1200,
            step: 1,
            default: 0,
          },
          resamplingVar: {
            type: 'integer',
            min: 0,
            max: 1200,
            step: 1,
            default: 0,
          },
        },
        soloistSynth: {
          "fadeOutDuration": {
            type: 'float',
            min: 0,
            max: 40,
            step: 0.001,
            default: 8,
          },
          "decayExponent": {
            type: 'float',
            min: 0,
            max: 2,
            step: 0.001,
            default: 1.5,
          },
        },
      },
    );

    const playerExperience = new PlayerExperience(server,
      'player',
      {
        soloist: soloistControllerState,
        trigger: triggerControllerState,
        granular: granularControllerState,
      },
      soundBankManager
    );
    // controllers
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


    await server.start();
    playerExperience.start();

    soloistControllerExperience.start();
    triggerControllerExperience.start();
    granularControllerExperience.start();

    soundbankManagerExperience.start();

    // bind file-system service and soundBankManager together
    fileSystem.state.subscribe(updates => {
      for (let key in updates) {
        if (key === 'sounds') {
          soundBankManager.updateFromFileTree(updates[key]);
        }
      }
    });

    const tree = fileSystem.state.get('sounds');
    soundBankManager.updateFromFileTree(tree);


    // osc control
    // @todo - create an abstraction able to communicate with states

        // Create an osc.js UDP Port listening on port 57121.
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
