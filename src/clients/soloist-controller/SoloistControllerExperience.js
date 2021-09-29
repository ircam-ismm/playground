import { AbstractExperience } from '@soundworks/core/client';
import { render, html, nothing } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import '@ircam/simple-components/sc-slider.js';
import '@ircam/simple-components/sc-text.js';
import '@ircam/simple-components/sc-toggle.js';
import '@ircam/simple-components/sc-dot-map.js';

import '../views/playground-header.js';
import '../views/playground-loading-players';

import throttle from 'lodash.throttle';

class SoloistControllerExperience extends AbstractExperience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    this.playerStates = new Map();

    renderInitializationScreens(client, config, $container);
  }

  async start() {
    this.localState = {
      soundBankValues: {},
      rotateMap: true,
    };

    this.listeners = {
      updateTriggers: throttle(value => {
        this.soloistState.set({ triggers: value });
      }, 50),
      updateRadius: value => {
        this.soloistState.set({ radius: value });
      },
      updateFadeOutDuration: value => {
        this.soloistState.set({ globalFadeOutDuration: value });
      },
      updateSoundBank: soundBankName => {
        this.soloistState.set({ currentSoundBank: soundBankName });
      },
      rotateMap: value => {
        this.localState.rotateMap = value;
        this.render();
      }
    };

    this.soloistState = await this.client.stateManager.attach('soloist-controller');
    this.soloistState.subscribe(updates => this.render());

    this.client.stateManager.observe(async (schemaName, stateId, nodeId) => {
      if (schemaName === 'player') {
        const state = await this.client.stateManager.attach(schemaName, stateId);

        state.subscribe(updates => this.render());

        state.onDetach(() => {
          this.playerStates.delete(nodeId);
          this.render();
        });

        this.playerStates.set(nodeId, state);
        this.render();
      }
    });

    // this could / should probably be a service
    this.client.socket.addListener('soundBanks', (
      values,
      soundBankDefaultPresets,
      soundFileDefaultPresets
    ) => {
      this.localState.soundBankValues = values;
      this.render();
    });

    window.addEventListener('resize', () => this.render());

    super.start();
  }

  render() {
    const soloistState = this.soloistState.getValues();
    const playerStates = Array.from(this.playerStates.values()).map(s => s.getValues());

    const currentSoundBank = soloistState.currentSoundBank;
    const filteredSoundBankNames = Object.keys(this.localState.soundBankValues)
      .sort()
      .filter((name) => {
        return this.localState.soundBankValues[name].presets.activated.soloistSynth;
      });

    const positions = playerStates.filter(p => p.position !== null).map(p => p.position);
    const loadingPlayers = playerStates.filter(s => s.soloistLoading === true);

    const { width, height } = this.$container.getBoundingClientRect();
    const areaHeight = height - 75;
    const areaWidth = width - 120;

    let xRange = soloistState.xRange;
    let yRange = soloistState.yRange;

    if (this.localState.rotateMap) {
      xRange = xRange.slice(0).reverse();
      yRange = yRange.slice(0).reverse();
    }

    render(
      html`
        <playground-header
          style="min-height: 75px; max-width: calc(100vw - 400px);"
          list="${JSON.stringify(filteredSoundBankNames)}"
          value="${currentSoundBank ? currentSoundBank : ''}"
          @change="${e => this.listeners.updateSoundBank(e.detail.value)}"
        ></playground-header>

        <div style="position: absolute; top: 6px; right: 10px">
          <div>
            <sc-text
              value="radius"
              width="100"
              readonly
            ></sc-text>
            <sc-slider
              display-number
              width="280"
              value="${soloistState.radius}"
              min="0"
              max="1"
              step="0.01"
              @input=${e => this.listeners.updateRadius(e.detail.value)}
            ></sc-slider>
          </div>
          ${this.config.project.soloistGlobalFadeOutDuration === true ?
            html`
              <div style="margin-top: 4px">
                <sc-text
                  value="fadeout time"
                  width="100"
                  readonly
                ></sc-text>
                <sc-slider
                  display-number
                  width="280"
                  value="${soloistState.globalFadeOutDuration}"
                  min="0"
                  max="12"
                  step="0.001"
                  @input=${e => this.listeners.updateFadeOutDuration(e.detail.value)}
                ></sc-slider>
              </div>
            ` : nothing
          }
          <div style="margin-top: 4px">
            <sc-text
              value="rotate map"
              width="100"
              readonly
            ></sc-text>
            <sc-toggle
              ?active="${this.localState.rotateMap}"
              @change="${e => this.listeners.rotateMap(e.detail.value)}"
            ></sc-toggle>
          </div>
        </div>

        <div style="position: relative; float: left;">
          <!-- display map of players -->
          <sc-dot-map
            style="
              position: absolute;
              top: 0;
              left: 0;
              z-index: 0;
            "
            width="${areaWidth}"
            height="${areaHeight}"
            color="white"
            x-range="${JSON.stringify(xRange)}"
            y-range="${JSON.stringify(yRange)}"
            value="${JSON.stringify(positions)}"
          ></sc-dot-map>
           <!-- display pointer feedback -->
          <sc-dot-map
            style="
              position: absolute;
              top: 0;
              left: 0;
              z-index: 1;
            "
            width="${areaWidth}"
            height="${areaHeight}"
            x-range="${JSON.stringify(xRange)}"
            y-range="${JSON.stringify(yRange)}"
            value="${JSON.stringify(soloistState.triggers)}"
            radius-rel="${soloistState.radius}"
            color="#AA3456"
            opacity="0.2"
            background-opacity="0"
          ></sc-dot-map>
           <!-- pointer input -->
          <sc-dot-map
            style="
              position: absolute;
              top: 0;
              left: 0;
              z-index: 2;
            "
            width="${areaWidth}"
            height="${areaHeight}"
            x-range="${JSON.stringify(xRange)}"
            y-range="${JSON.stringify(yRange)}"
            radius-rel="${soloistState.radius}"
            color="#AA3456"
            opacity="0.2"
            background-opacity="0"
            capture-events
            @input="${e => this.listeners.updateTriggers(e.detail.value)}"
          ></sc-dot-map>
        </div>

        <playground-loading-players
          style="
            width: 120px;
            float: right;
            min-height:
            calc(100vh - 75px)
          "
          list=${JSON.stringify(loadingPlayers)}
          infos=${JSON.stringify({ '# players': playerStates.length })}
        ></playground-loading-players>
        `
      , this.$container
    );
  }
}

export default SoloistControllerExperience;
