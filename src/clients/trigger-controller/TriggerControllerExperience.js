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

class TriggerControllerExperience extends Experience {
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
      editedFiles: new Set(), // list presets that are currently edited (GUI opened)
      padSize: 60,
      soundBankValues: null,
      soundBankDefaultPresets: null,
      soundFileDefaultPresets: null,
    };

    this.eventListeners = {
      updateSoundBank: e => {
        const soundBankName = e.target.value || null;
        this.triggerControllerState.set({ currentSoundBank: soundBankName });
      },
      triggerPlayer: e => {
        const playerId = parseInt(e.target.dataset.id);
        this.triggerControllerState.set({ triggerPlayerEvent: playerId });
      },
      updateFilePreset: throttle((soundbank, filename, param, value) => {
        this.client.socket.send('soundBanks:updateSoundFilePreset',
          soundbank,
          filename,
          'triggerSynth',
          { [param]: value }
        );
      }, 50),

      // local stuff
      updatePadSize: e => {
        const size = e.detail.value;
        this.localState.padSize = size;
        this.renderApp();
      },
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
    this.triggerControllerState = await this.client.stateManager.attach('trigger-controller');
    this.triggerControllerState.subscribe(updates => {
      if ('currentSoundBank' in updates) {
        this.localState.editedFiles.clear();
        this.renderApp();
      }
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
              case 'triggerConfig':
              case 'triggerLoading':
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
        return this.localState.soundBankValues[name].presets.activated.triggerSynth;
      });

    const playerStates = Array.from(this.playerStates.values()).map(s => s.getValues());
    const loadingPlayers = playerStates.filter(s => s.triggerLoading === true);
    const loadedPlayers = playerStates.filter(s => s.triggerConfig !== null && s.triggerLoading === false);

    const currentSoundBank = this.triggerControllerState.getValues()['currentSoundBank'];
    let soundBankFiles = {}

    if (currentSoundBank !== null) {
      soundBankFiles = this.localState.soundBankValues[currentSoundBank].files;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    render(html`
      <fp-header
        style="min-height: 75px"
        list="${JSON.stringify(filteredSoundBankNames)}"
        value="${currentSoundBank ? currentSoundBank : ''}"
        @change="${this.eventListeners.updateSoundBank}"
      ></fp-header>
      <section style="width: ${width - 120}px; float: left; box-sizing: border-box; padding: 0 0 10px 10px">
        <sw-slider-enhanced
          label="pad size"
          width="300"
          height="30"
          min="30"
          max="100"
          step="1"
          value="${this.localState.padSize}"
          @change="${this.eventListeners.updatePadSize}"
        ></sw-slider-enhanced>

        ${Object.keys(soundBankFiles).map((filename) => {
          return html`
            <div style="clear:left; position: relative; margin-top: 20px;">
              <header>
                <h2 style="height: 30px; line-height: 30px; font-size: 14px;">> ${filename}</h2>
                <sw-preset
                  style="position: absolute; top: 0; right: 0"
                  width="400"
                  expanded="${ifDefined(this.localState.editedFiles.has(filename) ? true : undefined)}"
                  definitions="${JSON.stringify(this.localState.soundFileDefaultPresets.triggerSynth)}"
                  values="${JSON.stringify(soundBankFiles[filename].presets.triggerSynth)}"
                  @open="${e => this.eventListeners.addToEditedFile(filename)}"
                  @close="${e => this.eventListeners.removeFromEditedFile(filename)}"
                  @update="${e => this.eventListeners.updateFilePreset(currentSoundBank, filename, e.detail.name, e.detail.value)}"
                ></sw-preset>
              </header>
              <section>
                ${repeat(
                  loadedPlayers.filter(player => player.triggerConfig.name === filename),
                  player => player.id,
                  player => {
                    return html`
                      <div
                        @mousedown=${this.eventListeners.triggerPlayer}
                        @touchstart=${this.eventListeners.triggerPlayer}
                        data-id=${player.id}
                        style="
                          background-color: ${player.color};
                          width: ${this.localState.padSize}px;
                          height: ${this.localState.padSize}px;
                          line-height: ${this.localState.padSize}px;
                          float: left;
                          margin: 4px;
                          user-select: none;
                          text-align: center;
                          font-size: 16px;
                        ">
                        ${player.index}
                      </div>
                    `;
                  }
                )}
              </section>
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

export default TriggerControllerExperience;
