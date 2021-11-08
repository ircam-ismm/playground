import { AbstractExperience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import throttle from 'lodash.throttle';

import '../views/playground-preset.js';
import '../views/playground-header.js';
import '../views/playground-loading-players.js';
import { btn, btnActive } from '../views/defaultStyles.js';

class AutoPlayControllerExperience extends AbstractExperience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;
    this.playerStates = new Map();

    renderInitializationScreens(client, config, $container);
  }

  async start() {
    this.localState = {
      soundBankValues: null,
      soundBankDefaultPresets: null,
      soundFileDefaultPresets: null,
    };

    this.eventListeners = {
      updateSoundBank: soundBankName => {
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
        e.preventDefault();
        const enabled = !(this.autoPlayControllerState.get('enabled'));
        this.autoPlayControllerState.set({ enabled });
      },
    };

    // listen all interesting states
    this.autoPlayControllerState = await this.client.stateManager.attach('autoplay-controller');
    this.autoPlayControllerState.subscribe(updates => this.render());

    this.client.stateManager.observe(async (schemaName, stateId, nodeId) => {
      if (schemaName === 'player') {
        const playerState = await this.client.stateManager.attach(schemaName, stateId);

        playerState.onDetach(() => {
          this.playerStates.delete(nodeId);
          this.render();
        });

        playerState.subscribe(updates => {
          for (let name in updates) {
            switch (name) {
              case 'autoPlayConfig':
              case 'autoPlayLoading':
                this.render();
                break;
            }
          }
        });

        this.playerStates.set(nodeId, playerState);
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
      this.localState.soundBankDefaultPresets = soundBankDefaultPresets;
      this.localState.soundFileDefaultPresets = soundFileDefaultPresets;
      this.render();
    });

    window.addEventListener('resize', () => this.render());

    super.start();
  }

  render() {
    const playerStates = Array.from(this.playerStates.values()).map(s => s.getValues());
    const loadingPlayers = playerStates.filter(s => s.autoPlayLoading === true);
    const loadedPlayers = playerStates.filter(s => s.autoPlayConfig !== null && s.autoPlayLoading === false);

    const {
      activeSoundbanks,
      currentSoundBank,
      enabled,
    } = this.autoPlayControllerState.getValues();


    const soundBankFiles = currentSoundBank ?
      this.localState.soundBankValues[currentSoundBank].files : {};

    const autoPlayState = this.autoPlayControllerState.getValues();

    const width = window.innerWidth;
    const height = window.innerHeight;

    render(html`
      <playground-header
        style="min-height: 75px"
        list="${JSON.stringify(activeSoundbanks)}"
        value="${currentSoundBank ? currentSoundBank : ''}"
        @change="${e => this.eventListeners.updateSoundBank(e.detail.value)}"
      ></playground-header>

      <section style="
        width: ${width - 121}px;
        float: left;
        box-sizing: border-box;
        padding: 0 0 10px 10px;
      ">

        <button
          style="
            ${btn}
            ${enabled ? btnActive : ''}
            margin-top: 20px;
            width: 50%;
          "
          @touchstart="${this.eventListeners.toggleSynth}"
          @mousedown="${this.eventListeners.toggleSynth}"
        >${enabled ? 'stop' : 'start'}</button>


        ${Object.keys(soundBankFiles).map((filename) => {
          const url = soundBankFiles[filename].url;
          const numPlayers = loadedPlayers.filter(p => p.autoPlayFile === url).length;

          return html`
            <div style="position: relative; margin-top: 20px;">
              <h2 style="height: 30px; line-height: 30px; font-size: 14px;">
                > ${filename} - (# players: ${numPlayers})
              </h2>
              <playground-preset
                style="position: absolute; top: 0; right: 0"
                label="edit file params"
                width="500"
                definitions="${JSON.stringify(this.localState.soundFileDefaultPresets.autoPlaySynth)}"
                values="${JSON.stringify(soundBankFiles[filename].presets.autoPlaySynth)}"
                @update="${e => this.eventListeners.updateFilePreset(currentSoundBank, filename, e.detail.name, e.detail.value)}"
              ></playground-preset>
            </div>
          `;
        })}
      </section>

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
    `, this.$container);
  }
}

export default AutoPlayControllerExperience;
