import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';

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

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

const audioContext = new AudioContext();

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);
  const host = new ModuleHost(client);

  // Eventually register plugins
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

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await host.init();

  const globalState = await host.stateManager.attach('global');
  const checkin = await host.pluginManager.get('checkin');
  const clientIndex = checkin.getIndex();
  const projectConfig = globalState.get('projectConfig');
  const clientColor = projectConfig.colors[clientIndex % projectConfig.colors.length];

  // audio stuff
  const scheduler = new Scheduler(() => audioContext.currentTime);
  const audioBufferLoader = new AudioBufferLoader(audioContext);
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

  await host.start();

  function renderApp() {
    render(html`
      <div class="simple-layout">
        <p>Hello ${client.config.app.name}!</p>

        <sw-credits .infos="${client.config.app}"></sw-credits>
      </div>
    `, $container);
  }

  renderApp();
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
});
