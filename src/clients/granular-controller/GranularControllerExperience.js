import { AbstractExperience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import { ifDefined } from 'lit-html/directives/if-defined';
import throttle from 'lodash.throttle';

import '../views/playground-preset.js';
import '../views/playground-header.js';
import '../views/playground-loading-players.js';
import { btn, btnActive } from '../views/defaultStyles.js';

class GranularControllerExperience extends AbstractExperience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    // require services

    this.playerStates = new Map();

    renderInitializationScreens(client, config, $container);
  }

  async start() {
    this.localState = {
      editedFiles: new Set(),
      soundBankValues: null,
      soundBankDefaultPresets: null,
      soundFileDefaultPresets: null,
    };

    this.eventListeners = {
      updateSoundBank: e => {
        const soundBankName = e.target.value || null;

        this.granularControllerState.set({
          currentSoundBank: soundBankName,
          startedSynths: [],
        });
      },
      toggleSynth: filename => {
        const startedSynths = this.granularControllerState.getValues()['startedSynths'];
        const index = startedSynths.indexOf(filename);
        let toggleSynthEvent;

        if (index === -1) {
          startedSynths.push(filename);
          toggleSynthEvent = { action: 'start', filename };
        } else {
          startedSynths.splice(index, 1);
          toggleSynthEvent = { action: 'stop', filename };
        }

        this.granularControllerState.set({ startedSynths, toggleSynthEvent });
      },
      updateFilePreset: throttle((soundbank, filename, param, value) => {
        this.client.socket.send('soundBanks:updateSoundFilePreset',
          soundbank,
          filename,
          'granularSynth',
          { [param]: value }
        );
      }, 50),

      // local stuff
      addToEditedFile: filename => {
        this.localState.editedFiles.add(filename);
        this.renderApp();
      },
      removeFromEditedFile: filename => {
        this.localState.editedFiles.delete(filename);
        this.renderApp();
      },
    };

    // listen all interesting states
    this.granularControllerState = await this.client.stateManager.attach('granular-controller');
    this.granularControllerState.subscribe(updates => {
      if ('currentSoundBank' in updates) {
        this.localState.editedFiles.clear();
      }

      this.renderApp();
    });

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
              case 'granularConfig':
              case 'granularLoading':
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
        return this.localState.soundBankValues[name].presets.activated.granularSynth;
      });

    const granularState = this.granularControllerState.getValues();
    const playerStates = Array.from(this.playerStates.values()).map(s => s.getValues());
    const loadingPlayers = playerStates.filter(s => s.granularLoading === true);
    const loadedPlayers = playerStates.filter(s => s.granularConfig !== null && s.granularLoading === false);

    const currentSoundBank = this.granularControllerState.getValues()['currentSoundBank'];
    let soundBankFiles = {}

    if (currentSoundBank !== null) {
      soundBankFiles = this.localState.soundBankValues[currentSoundBank].files;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    render(html`
      <playground-header
        style="min-height: 75px"
        list="${JSON.stringify(filteredSoundBankNames)}"
        value="${currentSoundBank ? currentSoundBank : ''}"
        @change="${this.eventListeners.updateSoundBank}"
      ></playground-header>

      <section style="width: ${width - 121}px; float: left; box-sizing: border-box; padding: 0 0 10px 10px">
        ${Object.keys(soundBankFiles).map((filename) => {
          const url = soundBankFiles[filename].url;
          const started = (granularState.startedSynths.indexOf(url) !== -1);
          const numPlayers = loadedPlayers.filter(p => p.granularFile === url).length;

          return html`
            <div style="clear:left; position: relative; margin-top: 20px;">
              <h2 style="height: 30px; line-height: 30px; font-size: 14px;">
                > ${filename}
                <span style="display: inline-block; font-size: 10px;">
                  (# players: ${numPlayers})
                </span>
              </h2>
              <button
                style="
                  ${btn}
                  ${started ? btnActive : ''}
                  width: 400px;
                  position: absolute;
                  right: 160px;
                  top: 0;
                "
                data-filename="${url}"
                @touchstart="${e => this.eventListeners.toggleSynth(url)}"
                @mousedown="${e => this.eventListeners.toggleSynth(url)}"
              >${started ? 'stop' : 'start'}</button>
              <playground-preset
                style="position: absolute; top: 0; right: 0"
                width="400"
                expanded="${ifDefined(this.localState.editedFiles.has(filename) ? true : undefined)}"
                definitions="${JSON.stringify(this.localState.soundFileDefaultPresets.granularSynth)}"
                values="${JSON.stringify(soundBankFiles[filename].presets.granularSynth)}"
                @open="${e => this.eventListeners.addToEditedFile(filename)}"
                @close="${e => this.eventListeners.removeFromEditedFile(filename)}"
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
          min-height: calc(100vh - 75px)
        "
        list=${JSON.stringify(loadingPlayers)}
        infos=${JSON.stringify({ '# players': playerStates.length })}
      ></playground-loading-players>
    `, this.$container);
  }
}

export default GranularControllerExperience;
