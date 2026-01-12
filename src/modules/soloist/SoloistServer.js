import {
  delay
} from '@ircam/sc-utils';

import Module from '../../lib/modules/Module.js';

import globalDescription from './descriptions/soloist-global.js';
import rendererDescription from './descriptions/soloist-renderer.js';

import assignSoundBank from '../../lib/utils/assignSoundBank.js';

const PRESET_KEY = 'soloistSynth';

export default class AutoPlayServer extends Module {
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

    // soloist specific config

    this.sync = await this.host.pluginManager.get('sync');

    const { soloistGlobalFadeOutDuration } = this.globalState.get('projectConfig');
    this.global.set('globalFadeOutDurationActive', soloistGlobalFadeOutDuration);

    this.global.onUpdate(updates => {
      for (let [key, value] of Object.entries(updates)) {
        switch (key) {
          case 'triggers': {
            this.#computeDistanceAndPropagate();
            break;
          }
          case 'radius': {
            this.#computeDistanceAndPropagate();
            break;
          }
        }
      }
    });
  }

  #computeDistanceAndPropagate = () => {
    const triggers = this.global.get('triggers');

    if (triggers.length === 0) {
      this.startTime = null;

      this.renderers.set('distance', 1);
    } else {
      if (this.startTime === null) {
        this.startTime = this.sync.getSyncTime();
      }

      const rotateMap = this.global.get('rotateMap');
      const radius = this.global.get('radius');

      this.renderers.forEach(renderer => {
        const position = rotateMap ? renderer.get('positionInverse') : renderer.get('position');
        const currentDistance = renderer.get('distance');
        let normDistance = 1;

        triggers.forEach(trigger => {
          const dx = position.x - trigger.x;
          const dy = position.y - trigger.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const norm = Math.min(1, distance / radius);
          normDistance = Math.min(normDistance, norm);
        });

        // propagate startTime to trigger synthesis
        if (normDistance < 1 && currentDistance === 1) {
          renderer.set('startTime', this.startTime);
        }

        renderer.set('distance', normDistance);
      });
    }
  }
}
