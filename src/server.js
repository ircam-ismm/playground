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

import Midi from '@soundworks/midi';

// import { midiInit, midiBind } from '@soundworks/midi-bind';

import globalDescription from './state-descriptions/global.js';
import soundbankDescription from './state-descriptions/soundbank.js';

import ModuleHost from './lib/modules/ModuleHost.js';
import SoundBankManager from './lib/soundbank/SoundBankManager.js';
import soundbankPresets from './lib/soundbank/soundbankPresets.js'
import soundfilesPresets from './lib/soundbank/soundfilesPresets.js'
import getProjectConfig from './lib/utils/getProjectConfig.js';

import AutoPlayServer from './modules/autoplay/AutoPlayServer.js';
import SoloistServer from './modules/soloist/SoloistServer.js';
import TriggerServer from './modules/trigger/TriggerServer.js';
import GranularServer from './modules/granular/GranularServer.js';

const config = loadConfig(process.env.ENV, import.meta.url);

// override project from command line
if (process.env.PROJECT) {
  config.env.project = process.env.PROJECT;
}

if (!config.env.project) {
  throw new Error('No project defined, either define the PROJECT environment variable, or set the the `project` entry in your env config file');
}

config.project = getProjectConfig(config.env.project);

// override app config with project config
config.app.name = config.project.name;
config.app.author = config.project.author;

const server = new Server(config);
configureHttpRouter(server);

const host = new ModuleHost(server);

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${process.env.ENV || 'default'}" environment
- [pid: ${process.pid}]
- project (${config.env.project}) "${config.project.name} ${config.project.author ? `by ${config.project.author}` : ''}"
--------------------------------------------------------
`);

host.pluginManager.register('platform-init', PluginPlatformInit);
host.pluginManager.register('sync', PluginSync);
host.pluginManager.register('checkin', PluginCheckin, {}, []);
host.pluginManager.register('position', PluginPosition, {
  xRange: [0, 1],
  yRange: [0, 1],
  backgroundImage: config.project.positionBackgroundImage
    ? path.join(config.project.pathname, config.project.positionBackgroundImage)
    : null
});
host.pluginManager.register('filesystem', PluginFilesystem, {
  dirname: path.resolve(config.project.pathname, 'sounds'),
  publicPath: 'sounds',
});
host.pluginManager.register('scripting', PluginScripting, {
  dirname: path.resolve(config.project.pathname, 'scripts'),
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
  projectId: config.env.project,
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
      case 'updateSoundBankPreset': {
        const {
          soundbank,
          presetKey,
          updates
        } = value;

        soundBankManager.updateSoundBankPreset(soundbank, presetKey, updates);
        // re-propagate so that modules can notify their clients
        soundbankState.set('updateSoundBankPresetNotification', {
          soundbank,
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


const midi = await new Midi(server);
await midi.init();

midi.bind(globalState, {
  // state: midiValue => {
  //   const list = globalDescription.state.list;
  //   const range = 127 / list.length;
  //   const index = Math.floor(midiValue / range);
  //   return list[index];
  // }
});

const applicationContext = {
  soundBankManager,
  soundbankState,
  globalState,
  midi,
};

// instantiate modules
const autoPlayServer = new AutoPlayServer(host, 'autoplay', applicationContext);
const soloistServer = new SoloistServer(host, 'soloist', applicationContext);
const triggerServer = new TriggerServer(host, 'trigger', applicationContext);
const granularServer = new GranularServer(host, 'granular', applicationContext);

await host.start();

// // init midi access
// await midiInit(server);
// // bind given state / collection
// await midiBind(globalState);
