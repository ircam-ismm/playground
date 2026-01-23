import Module from '../../lib/modules/Module.js';

import globalDescription from './descriptions/trigger-global.js';
import rendererDescription from './descriptions/trigger-renderer.js';

import assignSoundBank from '../../lib/utils/assignSoundBank.js';

const PRESET_KEY = 'triggerSynth';

export default class AutoPlayServer extends Module {
  constructor(host, name, {
    globalState,
    soundBankManager,
    soundbankState,
    midi,
  } = {}) {
    super(host, name);

    this.globalState = globalState;
    this.soundBankManager = soundBankManager;
    this.soundbankState = soundbankState;
    this.midi = midi;

    this.host.stateManager.defineClass(`${this.name}:global`, globalDescription);
    this.host.stateManager.defineClass(`${this.name}:renderer`, rendererDescription);
  }

  async start() {
    // ------------------------------------------------------
    // This seems to be shared
    this.global = await this.host.stateManager.create(`${this.name}:global`, {
      assignSoundbankStrategy: this.globalState.getUnsafe('projectConfig').assignSoundFilesStrategy,
      presetKey: PRESET_KEY,
    });
    this.renderers = await this.host.stateManager.getCollection(`${this.name}:renderer`);

    this.midi.bind(this.global);

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

    // trigger specific
    this.global.onUpdate(updates => {
      for (let [key, value] of Object.entries(updates)) {
        switch (key) {
          case 'triggerAll': {
            this.renderers.sort((a, b) => a.get('clientIndex') < b.get('clientIndex') ? -1 : 1);
            const triggerAllFilterThreshold = this.global.get('triggerAllFilterThreshold');
            const size = this.renderers.size;
            const numTrigger = Math.max(1, size * triggerAllFilterThreshold);

            this.renderers.forEach((renderer, index) => {
              if (index < numTrigger) {
                renderer.set('trigger', true);
              }
            });
            break;
          }
        }
      }
    });
  }
}
