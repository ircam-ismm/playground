import { AbstractExperience } from '@soundworks/core/client';
import { render, html, nothing } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import { ifDefined } from 'lit-html/directives/if-defined.js';
import { repeat } from 'lit-html/directives/repeat.js';
import throttle from 'lodash.throttle';

import '@ircam/simple-components/sc-slider.js';
import '@ircam/simple-components/sc-text.js';

import '../views/playground-preset';
import '../views/playground-header';
import '../views/playground-loading-players';
import { btn, btnActive } from '../views/defaultStyles.js';

class TriggerControllerExperience extends AbstractExperience {
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
      editedFiles: new Set(), // list presets that are currently edited (GUI opened)
      padSize: 60,
      soundBankValues: null,
      soundBankDefaultPresets: null,
      soundFileDefaultPresets: null,
    };

    this.listeners = {
      updateSoundBank: soundBankName => {
        this.triggerControllerState.set({ currentSoundBank: soundBankName });
      },
      triggerPlayer: playerId => {
        this.triggerControllerState.set({ triggerPlayerEvent: playerId });
      },
      triggerAllPlayers: () => {
        this.triggerControllerState.set({ triggerAllEvent: true });
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
      updatePadSize: size => {
        this.localState.padSize = size;
        this.render();
      },
      addToEditedFile: filename => {
        this.localState.editedFiles.add(filename);
        this.render();
      },
      removeFromEditedFile: filename => {
        this.localState.editedFiles.delete(filename);
        this.render();
      },
    };

    this.globalsState = await this.client.stateManager.attach('globals');
    this.globalsState.subscribe(() => this.render());

    // listen all interesting states
    this.triggerControllerState = await this.client.stateManager.attach('trigger-controller');
    this.triggerControllerState.subscribe(updates => {
      if ('currentSoundBank' in updates) {
        this.localState.editedFiles.clear();
      }

      this.render();
    });

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
              case 'triggerConfig':
              case 'triggerLoading':
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
    // this is fucking weird...
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
    const loadingPlayers = playerStates.filter(s => s.triggerLoading === true);
    const loadedPlayers = playerStates.filter(s => s.triggerConfig !== null && s.triggerLoading === false);

    const {
      activeSoundbanks,
      currentSoundBank,
    } = this.triggerControllerState.getValues();

    const soundBankFiles = currentSoundBank ?
      this.localState.soundBankValues[currentSoundBank].files : {};

    const width = window.innerWidth;
    const height = window.innerHeight;

    render(html`
      <playground-header
        style="min-height: 75px; max-width: calc(100vw - 400px);"
        list="${JSON.stringify(activeSoundbanks)}"
        value="${currentSoundBank ? currentSoundBank : ''}"
        @change="${e => this.listeners.updateSoundBank(e.detail.value)}"
      ></playground-header>

      <div style="position: absolute; top: 6px; right: 10px; z-index: 1;">
        <div>
          <sc-text
            value="volume"
            width="100"
            readonly
          ></sc-text>
          <sc-slider
            display-number
            width="280"
            value="${this.globalsState.get('triggerVolume')}"
            min="-80"
            max="6"
            step="1"
            @input=${e => this.globalsState.set({ triggerVolume: e.detail.value })}
          ></sc-slider>
        </div>
      </div>

      <section style="
        width: ${width - 120}px;
        float: left;
        box-sizing: border-box;
        padding: 0 0 10px 10px;
      ">
        <div
          style="
            margin-top: 4px;
            margin-right: 4px;
            width: 200px;
            float: right;
          ">
          <sc-text
            value="pad size"
            width="200"
            style="display: block; margin-bottom: 4px;"
            readonly
          ></sc-text>
          <sc-slider
            width="200"
            min="20"
            max="100"
            step="1"
            value="${this.localState.padSize}"
            @input="${e => this.listeners.updatePadSize(e.detail.value)}"
          ></sc-slider>
        </div>
        ${currentSoundBank !== null ?
          html`
            <button
              style="
                ${btn}
                ${btnActive}
                width: ${width - 120 - 200 - 30}px;
                height: 64px;
                margin-top: 4px;
              "
              @mouseup="${e => { e.preventDefault(); this.listeners.triggerAllPlayers(); }}"
              @touchend="${e => { e.preventDefault(); this.listeners.triggerAllPlayers(); }}"
            >trigger all</button>
          `
        : nothing }

        ${Object.keys(soundBankFiles).map((filename) => {
          return html`
            <div style="position: relative; margin-top: 20px;">
              <header>
                <h2 style="height: 30px; line-height: 30px; font-size: 14px;">
                  > ${filename}
                </h2>
                <playground-preset
                  style="position: absolute; top: 0; right: 0;"
                  label="edit file params"
                  width="500"
                  expanded="${ifDefined(this.localState.editedFiles.has(filename) ? true : undefined)}"
                  definitions="${JSON.stringify(this.localState.soundFileDefaultPresets.triggerSynth)}"
                  values="${JSON.stringify(soundBankFiles[filename].presets.triggerSynth)}"
                  @open="${e => this.listeners.addToEditedFile(filename)}"
                  @close="${e => this.listeners.removeFromEditedFile(filename)}"
                  @update="${e => this.listeners.updateFilePreset(currentSoundBank, filename, e.detail.name, e.detail.value)}"
                ></playground-preset>
              </header>
              <section style="overflow: auto">
                ${repeat(
                  loadedPlayers.filter(player => player.triggerConfig.name === filename),
                  player => player.id,
                  player => {
                    return html`
                      <div
                        @mousedown="${e => { e.preventDefault(); this.listeners.triggerPlayer(player.id); }}"
                        @touchstart="${e => { e.preventDefault(); this.listeners.triggerPlayer(player.id); }}"
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
                          cursor: pointer;
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

export default TriggerControllerExperience;
