import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/node.js';

import PluginPlatformInit from '@soundworks/plugin-platform-init/client.js';
import PluginSync from '@soundworks/plugin-sync/client.js';
import PluginCheckin from '@soundworks/plugin-checkin/client.js';
import PluginPosition from '@soundworks/plugin-position/client.js';
// import PluginScripting from '@soundworks/plugin-scripting/client.js';

import { Scheduler } from '@ircam/sc-scheduling';
import { AudioBufferLoader } from '@ircam/sc-loader';
import { AudioContext } from 'isomorphic-web-audio-api';

import ModuleHost from '../lib/modules/ModuleHost.js';
import AudioBus from '../lib/utils/AudioBus.js';

import AutoPlayRenderer from '../modules/autoplay/AutoPlayRenderer.js';
import SoloistRenderer from '../modules/soloist/SoloistRenderer.js';
import TriggerRenderer from '../modules/trigger/TriggerRenderer.js';


// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function bootstrap() {
  const config = loadConfig(process.env.ENV, import.meta.url);
  const client = new Client(config);
  const host = new ModuleHost(client);

  const audioContext = new AudioContext();

  client.pluginManager.register('platform-init', PluginPlatformInit, {
    audioContext,
  });
  client.pluginManager.register('checkin', PluginCheckin);
  client.pluginManager.register('position', PluginPosition, {
    randomize: true,
  });
  client.pluginManager.register('sync', PluginSync, {
    getTimeFunction: () => audioContext.currentTime,
  }, ['platform-init']);

  // https://soundworks.dev/tools/helpers.html#nodelauncher
  launcher.register(client);

  await host.init();

  const globalState = await host.stateManager.attach('global');
  const checkin = await host.pluginManager.get('checkin');
  const clientIndex = checkin.getIndex();
  const projectConfig = globalState.get('projectConfig');
  const clientColor = projectConfig.colors[clientIndex % projectConfig.colors.length];

  // audio stuff
  const serverAddress = `${config.env.useHttps ? 'https' : 'http'}://${config.env.serverAddress ? config.env.serverAddress : '127.0.0.1'}:${config.env.port}`
  const audioBufferLoader = new AudioBufferLoader(audioContext, serverAddress);
  const scheduler = new Scheduler(() => audioContext.currentTime);
  const masterBus = new AudioBus(audioContext);
  masterBus.output.connect(audioContext.destination);

  globalState.onUpdate(updates => {
    for (let [key, value] of Object.entries(updates)) {
      switch (key) {
        case 'master': {
          masterBus.volume = value;
          break;
        }
        case 'mute': {
          masterBus.mute = value;
          break;
        }
        case 'cutoffFrequency': {
          masterBus.cutoffFrequency = value;
          break;
        }
      }
    }
  }, true);

  const app = {
    globalState,
    audioContext,
    audioBufferLoader,
    masterBus,
    scheduler,
    clientIndex,
    clientColor,
  };

  const autoPlayRenderer = new AutoPlayRenderer(host, 'autoplay', app);
  const soloistRenderer = new SoloistRenderer(host, 'soloist', app);
  const triggerRenderer = new TriggerRenderer(host, 'trigger', app);

  await host.start();

  console.log(`Hello ${client.config.app.name}!`);
}

// The launcher allows to launch multiple clients in the same terminal window
// e.g. `EMULATE=10 npm run watch thing` to run 10 clients side-by-side
launcher.execute(bootstrap, {
  numClients: process.env.EMULATE ? parseInt(process.env.EMULATE) : 1,
  moduleURL: import.meta.url,
});
