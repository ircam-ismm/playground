import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import '../views/elements/sw-dot-map.js';
import '../views/elements/sw-slider-enhanced.js';
import '../views/controller-components/fp-header.js';
import '../views/controller-components/fp-loading-players';
import throttle from 'lodash.throttle';

class SoloistControllerExperience extends Experience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    this.playerStates = new Map();
  }

  async start() {
    this.localState = {
      soundBankValues: {},
      // soundBankDefaultPresets: null,
      // soundFileDefaultPresets: null,
    };

    this.eventListeners = {
      updateTriggers: throttle(e => {
        this.soloistState.set({ triggers: e.detail }) ;
      }, 50),
      updateRadius: e => {
        this.soloistState.set({ radius: e.detail.value }) ;
      },
      updateSoundBank: e => {
        const soundBankName = e.target.value || null;
        this.soloistState.set({ currentSoundBank: soundBankName });
      },
    };

    this.soloistState = await this.client.stateManager.attach('soloist-controller');
    this.soloistState.subscribe(updates => this.renderApp());

    this.client.stateManager.observe(async (schemaName, nodeId) => {
      if (schemaName === 'player') {
        const state = await this.client.stateManager.attach(schemaName, nodeId);

        state.subscribe(updates => this.renderApp());

        state.onDetach(() => {
          this.playerStates.delete(nodeId);
          this.renderApp();
        });

        this.playerStates.set(nodeId, state);
        this.renderApp();
      }
    });

    // this could / should probably be a service
    this.client.socket.addListener('soundBanks', (
      values,
      soundBankDefaultPresets,
      soundFileDefaultPresets
    ) => {
      this.localState.soundBankValues = values;
      // this.localState.soundBankDefaultPresets = soundBankDefaultPresets;
      // this.localState.soundFileDefaultPresets = soundFileDefaultPresets;
      this.renderApp();
    });

    window.addEventListener('resize', () => this.renderApp());

    super.start();
  }

  renderApp() {
    const soloistState = this.soloistState.getValues();
    const playerStates = Array.from(this.playerStates.values()).map(s => s.getValues());

    const currentSoundBank = soloistState.currentSoundBank;
    const filteredSoundBankNames = Object.keys(this.localState.soundBankValues)
      .sort()
      .filter((name) => {
        return this.localState.soundBankValues[name].presets.activated.soloistSynth;
      });

    const positions = playerStates.filter(p => p.position !== null).map(p => p.position);
    const loadingPlayers = playerStates.filter(s => s.soloistSynthLoading === true);

    const { width, height } = this.$container.getBoundingClientRect();
    const areaHeight = height - 75;
    const areaWidth = width - 120;

    render(
      html`
        <fp-header
          style="height: 75px"
          list="${JSON.stringify(filteredSoundBankNames)}"
          value="${currentSoundBank ? currentSoundBank : ''}"
          @change="${this.eventListeners.updateSoundBank}"
        ></fp-header>

        <sw-slider-enhanced
          style="position: absolute; top: 20px; right: 0"
          width="300"
          height="30"
          value="${soloistState.radius}"
          min="0"
          max="1"
          step="0.01"
          label="radius"
          @change=${this.eventListeners.updateRadius}
        ></sw-slider-enhanced>

        <div style="position: relative; float: left;">
          <sw-dot-map
            class="players"
            width="${areaWidth}"
            height="${areaHeight}"
            x-range="${JSON.stringify(soloistState.xRange)}"
            y-range="${JSON.stringify(soloistState.yRange)}"
            dots-color="#ffffff"
            background-color="#232323"
            dots="${JSON.stringify(positions)}"
          ></sw-dot-map>
          <sw-dot-map
            class="feedback"
            style="position: absolute; top: 0; left: 0; z-index: 1"
            width="${areaWidth}"
            height="${areaHeight}"
            x-range="${JSON.stringify(soloistState.xRange)}"
            y-range="${JSON.stringify(soloistState.yRange)}"
            dots-color="#aa3456"
            dots-radius-rel="${soloistState.radius}"
            dots-opacity="0.2"
            background-opacity="0"
            dots="${JSON.stringify(soloistState.triggers)}"
          ></sw-dot-map>
          <sw-dot-map
            class="interactions"
            style="position: absolute; top: 0; left: 0; z-index: 2"
            width="${areaWidth}"
            height="${areaHeight}"
            x-range="${JSON.stringify(soloistState.xRange)}"
            y-range="${JSON.stringify(soloistState.yRange)}"
            dots-color="#aa3456"
            dots-radius-rel="${soloistState.radius}"
            dots-opacity="0.1"
            background-opacity="0"
            capture-events
            @input=${this.eventListeners.updateTriggers}
          ></sw-dot-map>
        </div>
        <fp-loading-players
          style="
            width: 120px;
            float: right;
            min-height:
            calc(100vh - 75px)
          "
          list=${JSON.stringify(loadingPlayers)}
          infos=${JSON.stringify({ '# players': playerStates.length })}
        ></fp-loading-players>
        `
      , this.$container
    );
  }
}

export default SoloistControllerExperience;
