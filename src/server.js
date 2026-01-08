import path from 'node:path';

import '@soundworks/helpers/polyfills.js';
import '@soundworks/helpers/catch-unhandled-errors.js';
import { Server } from '@soundworks/core/server.js';
import { loadConfig, configureHttpRouter } from '@soundworks/helpers/server.js';

// import plugins
import PluginPlatformInit from '@soundworks/plugin-platform-init/server.js';
import PluginSync from '@soundworks/plugin-sync/server.js';
import PluginCheckin from '@soundworks/plugin-checkin/server.js';
import PluginFilesystem from '@soundworks/plugin-filesystem/server.js';
import PluginPosition from '@soundworks/plugin-position/server.js';
import PluginScripting from '@soundworks/plugin-scripting/server.js';

import globalDescription from './state-descriptions/global.js';
import soundbankDescription from './state-descriptions/soundbank.js';

import ModuleHost from './lib/modules/ModuleHost.js';
import SoundBankManager from './lib/soundbank/SoundBankManager.js';
import soundbankPresets from './lib/soundbank/soundbankPresets.js'
import soundfilesPresets from './lib/soundbank/soundfilesPresets.js'
import getProjectConfig from './lib/utils/getProjectConfig.js';

import AutoPlayServer from './modules/autoplay/AutoPlayServer.js';

const config = loadConfig(process.env.ENV, import.meta.url);
const server = new Server(config);
configureHttpRouter(server);

const host = new ModuleHost(server);

if (process.env.PROJECT) {
  config.app.project = process.env.PROJECT;
}

config.project = getProjectConfig(config.app.project);

// project specific routes
// server.router.use('images', serveStatic(path.join('projects', config.app.project, 'images')));

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
- project (${config.app.project}) "${config.project.name} by ${config.project.author}"
--------------------------------------------------------
`);

host.pluginManager.register('platform-init', PluginPlatformInit);
host.pluginManager.register('sync', PluginSync);
host.pluginManager.register('checkin', PluginCheckin, {}, []);
host.pluginManager.register('position', PluginPosition, {
  xRange: [0, 1],
  yRange: [0, 1],
  // backgroundImage: config.project.positionBackgroundImage || '',
});
host.pluginManager.register('filesystem', PluginFilesystem, {
  dirname: path.join('projects', config.app.project, 'sounds'),
  publicPath: 'sounds',
});
host.pluginManager.register('scripting', PluginScripting, {
  dirname: path.join('projects', config.app.project, 'scripts'),
});

// -------------------------------------------------------------------
// register Descriptions
// -------------------------------------------------------------------
server.stateManager.defineClass('global', globalDescription);
server.stateManager.defineClass('soundbank', soundbankDescription);

// -------------------------------------------------------------------
// launch application
// -------------------------------------------------------------------
await host.init();

// init global state
const globalState = await server.stateManager.create('global', {
  projectId: config.app.project,
  projectName: config.project.name,
  projectAuthor: config.project.author,
  projectConfig: config.project,
});

// init and bind soundbank manager with filesystem
const filesystem = await host.pluginManager.get('filesystem');
const soundBankManager = new SoundBankManager(soundbankPresets, soundfilesPresets);
soundBankManager.updateFromFileTree(filesystem.getTree());

const soundBanks = soundBankManager.getValues();
const { soundBankDefaultPresets, soundFileDefaultPresets } = soundBankManager;
const soundbankState = await host.stateManager.create('soundbank', {
  soundBanks,
  soundBankDefaultPresets,
  soundFileDefaultPresets,
});

soundBankManager.subscribe((newValues, soundBankDefaultPresets, soundFileDefaultPresets) => {
  // const { soundBankDefaultPresets, soundFileDefaultPresets } = soundBankManager;
  soundbankState.set({
    soundBanks: newValues,
    soundBankDefaultPresets,
    soundFileDefaultPresets
  });
});

soundbankState.onUpdate(updates => {
  for (let [key, value] of Object.entries(updates)) {
    switch (key) {
      case 'updateSoundFilePreset': {
        const {
          soundbank,
          filename,
          presetKey,
          updates
        } = value;

        soundBankManager.updateSoundFilePreset(soundbank, filename, presetKey, updates);
        // re-propagate so that modules can notify their clients
        soundbankState.set('updateSoundFilePresetNotification', {
          soundbank,
          filename,
          presetKey,
        })
        break;
      }
    }
  }
});

filesystem.onUpdate(({ tree }) => {
  soundBankManager.updateFromFileTree(tree);
}, true);

// fileSystem.state.subscribe(updates => {
//   for (let key in updates) {
//     if (key === 'sounds') {
//       soundBankManager.updateFromFileTree(updates[key]);
//     }
//   }
// });

const applicationContext = {
  soundBankManager,
  soundbankState,
  globalState,
};

// instantiate modules
const autoPlayServer = new AutoPlayServer(host, 'autoplay', applicationContext);

await host.start();


// console.log(soundBanks, soundBankDefaultPresets, soundFileDefaultPresets);


// soundBankManager.subscribe((oldValues, newValues) => {
//   const soundbanks = Object.values(newValues);

//   const autoPlaySoundbanks = soundbanks
//     .filter(s => s.presets.activated.autoPlaySynth)
//     .map(s => s.name)
//     .sort();
//   autoPlayControllerState.set({ activeSoundbanks: autoPlaySoundbanks });

//   const granularSoundbanks = soundbanks
//     .filter(s => s.presets.activated.granularSynth)
//     .map(s => s.name)
//     .sort();
//   granularControllerState.set({ activeSoundbanks: granularSoundbanks });

//   const soloistSoundbanks = soundbanks
//     .filter(s => s.presets.activated.soloistSynth)
//     .map(s => s.name)
//     .sort();
//   soloistControllerState.set({ activeSoundbanks: soloistSoundbanks });

//   const triggerSoundbanks = soundbanks
//     .filter(s => s.presets.activated.triggerSynth)
//     .map(s => s.name)
//     .sort();
//   triggerControllerState.set({ activeSoundbanks: triggerSoundbanks });
// });

// // initialize the StateManagerOsc component
// const oscConfig = { // these are the defaults
//   localAddress: '0.0.0.0',
//   localPort: 57121,
//   remoteAddress: '127.0.0.1',
//   remotePort: 57122,
// };

// const oscStateManager = new StateManagerOsc(server.stateManager, oscConfig);
// await oscStateManager.init();
