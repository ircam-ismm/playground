import { AbstractExperience } from '@soundworks/core/client';
import { render, html, nothing } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import { ifDefined } from 'lit-html/directives/if-defined.js';
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
      // show an immediate feedback of the action
      // https://github.com/ircam-ismm/playground/issues/8
      startingSynths: new Set(),
    };

    this.listeners = {
      updateSoundBank: e => {
        const soundBankName = e.target.value || null;

        this.granularControllerState.set({
          currentSoundBank: soundBankName,
          startedSynths: [],
        });
      },
      toggleSynth: url => {
        const startedSynths = this.granularControllerState.get('startedSynths');
        const index = startedSynths.indexOf(url);
        let toggleSynthEvent;

        if (index === -1) {
          startedSynths.push(url);
          toggleSynthEvent = [{ action: 'start', filename: url }];
          this.localState.startingSynths.add(url);
        } else {
          startedSynths.splice(index, 1);
          toggleSynthEvent = [{ action: 'stop', filename: url }];
          this.localState.startingSynths.delete(url);
        }

        this.granularControllerState.set({ startedSynths, toggleSynthEvent });
        this.render();
      },
      toggleAllSynths: action => {
        const toggleSynthEvent = [];
        const { currentSoundBank, startedSynths } = this.granularControllerState.getValues();
        const soundfiles = this.localState.soundBankValues[currentSoundBank].files;

        for (let name in soundfiles) {
          const { url } = soundfiles[name];
          const startedIndex = startedSynths.indexOf(url);
          const started = (startedIndex !== -1);

          if (action === 'start' && started === false) {
            toggleSynthEvent.push({ action: 'start', filename: url });
            startedSynths.push(url);
            this.localState.startingSynths.add(url);
          } else if (action === 'stop' && started === true) {
            toggleSynthEvent.push({ action: 'stop', filename: url });
            startedSynths.splice(startedIndex, 1);
            this.localState.startingSynths.delete(url);
          }
        }

        this.granularControllerState.set({ startedSynths, toggleSynthEvent });
        this.render();
      },
      updateFilePreset: (soundbank, filename, param, value) => {
        this.client.socket.send('soundBanks:updateSoundFilePreset',
          soundbank,
          filename,
          'granularSynth',
          { [param]: value }
        );
      },

      // local stuff
      addToEditedFile: filename => {
        this.localState.editedFiles.add(filename);
        this.render();
      },
      removeFromEditedFile: filename => {
        this.localState.editedFiles.delete(filename);
        this.render();
      },
    };

    // listen all interesting states
    this.granularControllerState = await this.client.stateManager.attach('granular-controller');
    this.granularControllerState.subscribe(updates => {
      if ('currentSoundBank' in updates) {
        this.localState.editedFiles.clear();
        this.localState.startingSynths.clear();
      }

      if ('startedSynths' in updates) {
        const { startedSynths } = updates;

        startedSynths.forEach(filename => {
          this.localState.startingSynths.delete(filename);
        });
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
              case 'granularConfig':
              case 'granularLoading':
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
    const loadingPlayers = playerStates.filter(s => s.granularLoading === true);
    const loadedPlayers = playerStates.filter(s => s.granularConfig !== null && s.granularLoading === false);

    const {
      activeSoundbanks,
      currentSoundBank,
      startedSynths,
    } = this.granularControllerState.getValues();

    const soundBankFiles = currentSoundBank ?
      this.localState.soundBankValues[currentSoundBank].files : {};

    const width = window.innerWidth;
    const height = window.innerHeight;

    render(html`
      <playground-header
        style="min-height: 75px"
        list="${JSON.stringify(activeSoundbanks)}"
        value="${currentSoundBank ? currentSoundBank : ''}"
        @change="${this.listeners.updateSoundBank}"
      ></playground-header>

      <section style="
        width: ${width - 121}px;
        float: left;
        box-sizing: border-box;
        padding: 0 0 10px 10px
      ">
        ${currentSoundBank !== null ?
          html`
            <div style="position: relative; margin-top: 20px; margin-bottom: 40px;">
              <button
                style="
                  ${btn}
                  width: 45%;
                  position: relative;
                "
                @touchstart="${e => { e.preventDefault(); this.listeners.toggleAllSynths('start'); }}"
                @mousedown="${e => { e.preventDefault(); this.listeners.toggleAllSynths('start'); }}"
              >START ALL</button>
              <button
                style="
                  ${btn}
                  width: 45%;
                  position: absolute;
                  right: 20px;
                "
                @touchstart="${e => { e.preventDefault(); this.listeners.toggleAllSynths('stop'); }}"
                @mousedown="${e => { e.preventDefault(); this.listeners.toggleAllSynths('stop'); }}"
              >STOP ALL</button>
            </div>
          ` : nothing}

        ${Object.keys(soundBankFiles).map((filename) => {
          const url = soundBankFiles[filename].url;
          const starting = this.localState.startingSynths.has(url);
          const started = (startedSynths.indexOf(url) !== -1);
          const numPlayers = loadedPlayers.filter(p => p.granularFile === url).length;

          return html`
            <div style="position: relative; margin-top: 20px;">
              <button
                style="
                  ${btn}
                  ${(starting || started) ? btnActive : ''}
                  width: 80%;
                "
                @touchstart="${e => { e.preventDefault(); this.listeners.toggleSynth(url); }}"
                @mousedown="${e => { e.preventDefault(); this.listeners.toggleSynth(url); }}"
              >
                ${filename} - #players: ${numPlayers} -------- ${started ? 'STOP' : 'START'}
              </button>

              <playground-preset
                style="position: absolute; top: 0; right: 0;"
                width="400"
                expanded="${ifDefined(this.localState.editedFiles.has(filename) ? true : undefined)}"
                definitions="${JSON.stringify(this.localState.soundFileDefaultPresets.granularSynth)}"
                values="${JSON.stringify(soundBankFiles[filename].presets.granularSynth)}"
                @open="${e => this.listeners.addToEditedFile(filename)}"
                @close="${e => this.listeners.removeFromEditedFile(filename)}"
                @update="${e => this.listeners.updateFilePreset(currentSoundBank, filename, e.detail.name, e.detail.value)}"
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
