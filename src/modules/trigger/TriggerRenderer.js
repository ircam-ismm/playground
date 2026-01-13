import {
  GainNode,
} from 'isomorphic-web-audio-api';
import {
  decibelToLinear,
  isBrowser,
} from '@ircam/sc-utils';

import Module from '../../lib/modules/Module.js';
import TriggerSynth from './audio/TriggerSynth.js';

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
    this.global = await this.host.stateManager.attach(`${this.name}:global`, [
      'volume',
      'presetKey',
    ]);

    this.state = await this.host.stateManager.create(`${this.name}:renderer`, {
      clientIndex: this.clientIndex,
      clientColor: this.clientColor,
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
            // do nothing
            break;
          }
          case 'trigger': {
            if (this.buffer) {
              const fileConfig = this.state.get('fileConfig');
              const presetKey = this.global.get('presetKey');
              const params = fileConfig.presets[presetKey];

              const synth = new TriggerSynth(this.audioContext, this.buffer, params);
              synth.connect(this.volume);
              synth.trigger();
            }
          }
        }
      }
    });
  }

  // @fixme - this is almost generic!!!
  async loadFile() {
    this.buffer = null;

    const fileConfig = this.state.get('fileConfig');

    if (fileConfig !== null) {
      this.state.set('loading', true);

      const url = fileConfig.url;
      const buffer = await this.audioBufferLoader.load(url);
      // @note
      // check that the required file is still the same one
      // after loading, to avoid concurrency issues, e.g.:
      // - selection is         "long file"   ->  "short file"
      // - order of arrival is   "short file"  ->  "long file"
      const currentUrl = this.state.get('fileConfig').url;
      // then if a file arrives too late, just ignore it
      if (url === currentUrl) {
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
