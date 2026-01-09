import {
  GainNode,
} from 'isomorphic-web-audio-api';
import {
  decibelToLinear,
  isBrowser,
} from '@ircam/sc-utils';

import Module from '../../lib/modules/Module.js';
import SoloistSynth from './audio/SoloistSynth.js';

export default class AutoPlayRenderer extends Module {
  constructor(host, name, {
    globalState,
    audioContext,
    audioBufferLoader,
    masterBus,
    scheduler,
    clientIndex,
    clientColor,
  } = {}) {
    super(host, name);

    this.globalState = globalState;
    this.audioContext = audioContext;
    this.audioBufferLoader = audioBufferLoader;
    this.masterBus = masterBus;
    this.scheduler = scheduler;
    this.clientIndex = clientIndex;
    this.clientColor = clientColor;

    this.buffer = null;
    this.synth = null;
  }

  async start() {
    const position = await this.host.pluginManager.get('position');
    const sync = await this.host.pluginManager.get('sync');

    this.global = await this.host.stateManager.attach(`${this.name}:global`, [
      'volume',
      'presetKey',
      'globalFadeOutDurationActive',
      'globalFadeOutDuration',
    ]);

    this.state = await this.host.stateManager.create(`${this.name}:renderer`, {
      clientIndex: this.clientIndex,
      clientColor: this.clientColor,
      position: position.getPosition(),
    });

    this.volume = new GainNode(this.audioContext, {
      gain: decibelToLinear(this.global.get('volume')),
    });
    this.volume.connect(this.masterBus.input);

    this.global.onUpdate(async updates => {
      for (let [key, value] of Object.entries(updates)) {
        switch (key) {
          case 'volume': {
            const now = this.audioContext.currentTime;
            const gain = decibelToLinear(value);
            this.volume.gain.setTargetAtTime(gain, now, 0.01);
            break;
          }
          case 'globalFadeOutDurationActive': {
            // console.log(value, this.synth)
            if (this.synth !== null) {
              const fileConfig = this.state.get('fileConfig');
              const params = fileConfig.presets[this.global.get('presetKey')];

              if (this.global.get('globalFadeOutDurationActive')) {
                params.fadeOutDuration = this.global.get('globalFadeOutDuration');
              }

              // console.log(params);
              this.synth.params = params;
            }
            break;
          }
          case 'globalFadeOutDuration': {
            if (this.synth !== null && this.global.get('globalFadeOutDurationActive')) {
              const fileConfig = this.state.get('fileConfig');
              const params = fileConfig.presets[this.global.get('presetKey')];
              params.fadeOutDuration = value;
              this.synth.params = params;
            }
            break;
          }
        }
      }
    }, true);

    this.state.onUpdate(async updates => {
      for (let [key, value] of Object.entries(updates)) {
        switch (key) {
          case 'filename': {
            this.loadFile();
            break;
          }
          case 'fileConfig': {
            if (this.synth) {
              const presetKey = this.global.get('presetKey');
              const params = value.presets[presetKey];

              if (this.global.get('globalFadeOutDurationActive')) {
                params.fadeOutDuration = this.global.get('globalFadeOutDuration');
              }

              this.synth.params = params;
            }
            break;
          }
          case 'distance': {
            const distance = value;

            if (distance < 1) {
              if (this.synth === null) {
                if (!this.buffer) {
                  await this.loadFile();
                }

                if (this.buffer) {
                  const syncStartTime = this.state.get('startTime');
                  const fileConfig = this.state.get('fileConfig');
                  const localStartTime = sync.getLocalTime(syncStartTime);
                  const params = fileConfig.presets[this.global.get('presetKey')];

                  if (this.global.get('globalFadeOutDurationActive')) {
                    params.fadeOutDuration = this.global.get('globalFadeOutDuration');
                  }

                  this.synth = new SoloistSynth(this.audioContext, this.buffer, localStartTime);
                  this.synth.connect(this.volume);
                  this.synth.params = params;
                  this.synth.start();
                }
              }

              if (this.synth) {
                this.synth.updateDistance(distance);
              }
            } else {
              if (this.synth !== null) {
                this.synth.release();
                this.synth = null;
              }
            }
            break;
          }
        }
      }
    });
  }

  // @fixme - this is almost generic!!!
  async loadFile() {
    this.buffer = null;

    const key = isBrowser() ? 'url' : 'path';
    const fileConfig = this.state.get('fileConfig');

    if (fileConfig !== null) {
      this.state.set('loading', true);

      const urlOrPath = fileConfig[key];
      const buffer = await this.audioBufferLoader.load(urlOrPath);
      // @note
      // check that the required file is still the same one
      // after loading, to avoid concurrency issues, e.g.:
      // - selection is         "long file"   ->  "short file"
      // - order of arrival is   "short file"  ->  "long file"
      const currentUrlOrPath = this.state.get('fileConfig')[key];
      // then if a file arrives too late, just ignore it
      if (urlOrPath === currentUrlOrPath) {
        this.buffer = buffer;
        // !!! not specific
        // callback();
      }

      this.state.set('loading', false);
    } else {
      this.state.set('loading', false);
    }
  }
}
