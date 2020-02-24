import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import throttle from 'lodash.throttle';
import renderAppInitialization from '../views/renderAppInitialization';
import '../views/elements/sw-slider';
import '../views/elements/sw-slider-enhanced';
import '../views/elements/sw-preset';
import '../views/controller-components/fp-header';
import '../views/controller-components/fp-loading-players';

class AutoPlayControllerExperience extends Experience {
  constructor(client, config = {}, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    // require services

    this.playerStates = new Map();

    renderAppInitialization(client, config, $container);
  }

  async start() {
    this.localState = {
      soundBankValues: null,
      soundBankDefaultPresets: null,
      soundFileDefaultPresets: null,
    };

    this.eventListeners = {
      updateSoundBank: e => {
        const soundBankName = e.target.value || null;
        this.autoPlayControllerState.set({ currentSoundBank: soundBankName });
      },
      updateFilePreset: throttle((soundbank, filename, param, value) => {
        this.client.socket.send('soundBanks:updateSoundFilePreset',
          soundbank,
          filename,
          'autoPlaySynth',
          { [param]: value }
        );
      }, 50),
      toggleSynth: e => {
        const enabled = !(this.autoPlayControllerState.get('enabled'));
        this.autoPlayControllerState.set({ enabled });
      },
    };

    // listen all interesting states
    this.autoPlayControllerState = await this.client.stateManager.attach('auto-play-controller');
    this.autoPlayControllerState.subscribe(updates => this.renderApp());

    this.client.stateManager.observe(async (schemaName, stateId, nodeId) => {
      if (schemaName === 'player') {
        const playerState = await this.client.stateManager.attach(schemaName, stateId);

        playerState.onDetach(() => {
          this.playerStates.delete(nodeId);
          this.renderApp();
        });

        playerState.subscribe(updates => {
          for (let name in updates) {
            switch (name) {
              case 'autoPlayConfig':
              case 'autoPlayLoading':
                this.renderApp();
                break;
            }
          }
        });

        this.playerStates.set(nodeId, playerState);
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
      this.localState.soundBankDefaultPresets = soundBankDefaultPresets;
      this.localState.soundFileDefaultPresets = soundFileDefaultPresets;
      this.renderApp();
    });

    window.addEventListener('resize', () => this.renderApp());

    super.start();
  }

  renderApp() {
    const filteredSoundBankNames = Object.keys(this.localState.soundBankValues)
      .sort()
      .filter((name) => {
        return this.localState.soundBankValues[name].presets.activated.autoPlaySynth;
      });

    const playerStates = Array.from(this.playerStates.values()).map(s => s.getValues());
    const loadingPlayers = playerStates.filter(s => s.autoPlayLoading === true);
    const loadedPlayers = playerStates.filter(s => s.autoPlayConfig !== null && s.autoPlayLoading === false);

    const currentSoundBank = this.autoPlayControllerState.getValues()['currentSoundBank'];
    let soundBankFiles = {}

    if (currentSoundBank !== null) {
      soundBankFiles = this.localState.soundBankValues[currentSoundBank].files;
    }

    const autoPlayState = this.autoPlayControllerState.getValues();

    const width = window.innerWidth;
    const height = window.innerHeight;

    render(html`
      <fp-header
        style="min-height: 75px"
        list="${JSON.stringify(filteredSoundBankNames)}"
        value="${currentSoundBank ? currentSoundBank : ''}"
        @change="${this.eventListeners.updateSoundBank}"
      ></fp-header>
      <section style="width: ${width - 121}px; float: left; box-sizing: border-box; padding: 0 0 10px 10px">

        <button
          style="
            width: 400px;
            height: 30px;
            background-color: ${autoPlayState.enabled ? '#dc3545' : '#242424'};
            color: #ffffff;
            margin: 20px 0;
            border-color: ${autoPlayState.enabled ? '#dc3545' : '#686868'};
            font-size: 14px;
            font-family: Consolas, monaco, monospace;
          "
          @touchstart="${this.eventListeners.toggleSynth}"
          @mousedown="${this.eventListeners.toggleSynth}"
        >${autoPlayState.enabled ? 'stop' : 'start'}</button>


        ${Object.keys(soundBankFiles).map((filename) => {
          const url = soundBankFiles[filename].url;
          const numPlayers = loadedPlayers.filter(p => p.autoPlayFile === url).length;

          return html`
            <div style="clear:left; position: relative; margin-top: 20px;">
              <sw-preset
                label="${filename} - (# players: ${numPlayers})"
                width="500"
                definitions="${JSON.stringify(this.localState.soundFileDefaultPresets.autoPlaySynth)}"
                values="${JSON.stringify(soundBankFiles[filename].presets.autoPlaySynth)}"
                @update="${e => this.eventListeners.updateFilePreset(currentSoundBank, filename, e.detail.name, e.detail.value)}"
              ></sw-preset>
            </div>
          `;
        })}
      </section>
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
    `, this.$container);
  }
}

export default AutoPlayControllerExperience;
