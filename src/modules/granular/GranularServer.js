import Module from '../../lib/modules/Module.js';

import globalDescription from './descriptions/granular-global.js';
import rendererDescription from './descriptions/granular-renderer.js';

import assignSoundBank from '../../lib/utils/assignSoundBank.js';

const PRESET_KEY = 'granularSynth';

export default class GranularServer extends Module {
  constructor(host, name, {
    globalState,
    soundBankManager,
    soundbankState,
  } = {}) {
    super(host, name);

    this.globalState = globalState;
    this.soundBankManager = soundBankManager;
    this.soundbankState = soundbankState;
    this.startTime = null;

    this.host.stateManager.defineClass(`${this.name}:global`, globalDescription);
    this.host.stateManager.defineClass(`${this.name}:renderer`, rendererDescription);

    this.host.stateManager.registerUpdateHook(`${this.name}:global`, updates => {
      if ('currentSoundBank' in updates) {
        return {
          startedSynths: [],
          ...updates,
        }
      }
    });
  }

  async start() {
    // ------------------------------------------------------
    // This seems to be shared
    this.global = await this.host.stateManager.create(`${this.name}:global`, {
      assignSoundbankStrategy: this.globalState.getUnsafe('projectConfig').assignSoundFilesStrategy,
      presetKey: PRESET_KEY,
    });
    this.renderers = await this.host.stateManager.getCollection(`${this.name}:renderer`);

    // assign selected soundbank to newly connected renderer, if any
    this.renderers.onAttach(state => {
      const currentSoundBank = this.global.get('currentSoundBank');
      const soundBank = this.soundBankManager.get(currentSoundBank);
      const strategy = this.global.get('assignSoundbankStrategy');
      assignSoundBank(state, soundBank, PRESET_KEY, strategy);
    }, true);

    // update soundbank
    this.global.onUpdate(updates => {
      for (let [key, value] of Object.entries(updates)) {
        switch (key) {
          case 'currentSoundBank': {
            const soundBank = this.soundBankManager.get(value);
            const strategy = this.global.get('assignSoundbankStrategy');
            assignSoundBank(this.renderers, soundBank, PRESET_KEY, strategy);
            break;
          }
        }
      }
    }, true);

    // keep active soundbanks synced with filesystem
    this.soundbankState.onUpdate(async updates => {
      for (let [key, value] of Object.entries(updates)) {
        switch (key) {
          case 'soundBanks': {
            const activeSoundbanks = Object.values(value)
              .filter(s => s.presets.activated[PRESET_KEY])
              .map(s => s.name)
              .sort();

            await this.global.set({ activeSoundbanks });
            break;
          }
          case 'updateSoundFilePresetNotification': {
            const {
              soundbank,
              filename,
              presetKey,
            } = value;

            if (presetKey === PRESET_KEY) {
              const currentSoundBank = this.global.get('currentSoundBank');

              if (currentSoundBank === soundbank) {
                const soundbankData = this.soundBankManager.get(currentSoundBank);

                this.renderers.forEach(renderer => {
                  const rendererFilename = renderer.get('filename');

                  if (filename === rendererFilename) {
                    const fileConfig = soundbankData.files[filename];
                    renderer.set({ fileConfig });
                  }
                });
              }
            }
          }
        }
      }
    }, true);
    // end share
    // ------------------------------------------------------

    // granular specific
    this.global.onUpdate(async updates => {
      for (let [key, value] of Object.entries(updates)) {
        switch (key) {
          case 'toggleSynthEvent': {
            const { action, filename } = value;
            const startedSynths = new Set(this.global.get('startedSynths'));

            if (action === 'start') {
              if (Array.isArray(filename)) {
                filename.forEach(filename => startedSynths.add(filename));
              } else {
                startedSynths.add(filename);
              }
            } else {
              if (Array.isArray(filename)) {
                filename.forEach(filename => startedSynths.delete(filename));
              } else {
                startedSynths.delete(filename);
              }
            }

            await this.global.set('startedSynths', Array.from(startedSynths));
            break;
          }
        }
      }
    });
  }
}
