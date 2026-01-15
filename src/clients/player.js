import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { LitElement, html, render, css, nothing } from 'lit';

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
import GranularRenderer from '../modules/granular/GranularRenderer.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

class AlPlayer extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      color: #040404;
    }

    .text {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      padding: 20px;
      position: relative;
    }

    .overlay {
      background-color: white;
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      width: 100%;
      height: 100%;
      opacity: 0;
      transition: opacity 50ms;
    }
  `;

  constructor() {
    super();

    this.opacity = 0;
    this.$overlay = 0;

    this.unsubscribeAutoPlayRenderer = null;
    this.unsubscribeSoloistRenderer = null;
    this.unsubscribeTriggerRenderer = null;
    this.unsubscribeGranularRenderer = null;
  }

  render() {
    const distance = this.soloistRenderer.state.get('distance');
    const trigger = this.triggerRenderer.state.get('trigger');

    if (distance < 1) {
      this.opacity = 1 - distance;
    }

    if (trigger) {
      this.opacity = 1;
    }

    return html`
      <div class="overlay"></div>
      <div class="text" style="background-color: ${this.clientColor}">
        <p>autoplay: ${this.autoPlayRenderer.state.get('filename') || 'undefined'}</p>
        <p>soloist: ${this.soloistRenderer.state.get('filename') || 'undefined'}</p>
        <p>trigger: ${this.triggerRenderer.state.get('filename') || 'undefined'}</p>
        <p>granular: ${this.granularRenderer.state.get('filename') || 'undefined'}</p>
      </div>
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    this.unsubscribeAutoPlayRenderer = this.autoPlayRenderer.state.onUpdate(() => this.requestUpdate());
    this.unsubscribeSoloistRenderer = this.soloistRenderer.state.onUpdate(() => this.requestUpdate());
    this.unsubscribeTriggerRenderer = this.triggerRenderer.state.onUpdate(() => this.requestUpdate());
    this.unsubscribeGranularRenderer = this.granularRenderer.state.onUpdate(() => this.requestUpdate());
    //
    this.#updateOpacity();
  }

  disconnectedCallback() {
    this.unsubscribeAutoPlayRenderer();
    this.unsubscribeSoloistRenderer();
    this.unsubscribeTriggerRenderer();
    this.unsubscribeGranularRenderer();

    super.disconnectedCallback();
  }

  #updateOpacity = () => {
    const distance = this.soloistRenderer.state.get('distance');
    if (distance === 1) {
      this.opacity = Math.max(this.opacity - 0.1, 0);
    }

    if (!this.$overlay) {
      this.$overlay = this.shadowRoot.querySelector('.overlay');
    }

    if (this.$overlay) {
      this.$overlay.style.opacity = this.opacity;
    }

    this.rafId = window.requestAnimationFrame(this.#updateOpacity);
  }
}

customElements.define('al-player', AlPlayer);

const audioContext = new AudioContext();

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);
  const host = new ModuleHost(client);

  client.pluginManager.register('platform-init', PluginPlatformInit, {
    audioContext,
  });
  client.pluginManager.register('checkin', PluginCheckin);
  client.pluginManager.register('position', PluginPosition, {
    randomize: !!config.project.randomlyAssignPosition,
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
  const soloistRenderer = new SoloistRenderer(host, 'soloist', app);
  const triggerRenderer = new TriggerRenderer(host, 'trigger', app);
  const granularRenderer = new GranularRenderer(host, 'granular', app);

  await host.start();

  function renderApp() {
    render(html`
      <div class="simple-layout">
        <al-player
          .clientColor=${clientColor}
          .autoPlayRenderer=${autoPlayRenderer}
          .soloistRenderer=${soloistRenderer}
          .triggerRenderer=${triggerRenderer}
          .granularRenderer=${granularRenderer}
        ></al-player>
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
