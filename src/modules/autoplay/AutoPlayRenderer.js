import {
  GainNode,
} from 'isomorphic-web-audio-api';
import {
  decibelToLinear,
  isBrowser,
} from '@ircam/sc-utils';

import Module from '../../lib/modules/Module.js';
import AutoPlaySynth from './audio/AutoPlaySynth.js';

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
      'enabled', 'volume', 'presetKey',
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
          case 'enabled': {
            this.toggleSynth(value);
            break;
          }
        }
      }
    }, true);

    // this is shared
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
              this.synth.params = params;
            }
            break;
          }
        }
      }
    });
  }

  async toggleSynth(enabled) {
    if (this.synth !== null) {
      this.synth.stop();
      this.synth = null;
    }

    if (enabled && this.buffer) {
      const fileConfig = this.state.get('fileConfig');
      const presetKey = this.global.get('presetKey');
      const params = fileConfig.presets[presetKey];

      this.synth = new AutoPlaySynth(this.audioContext, this.scheduler);
      this.synth.buffer = this.buffer;
      this.synth.params = params;
      this.synth.connect(this.volume);
      this.synth.start();
    }
  }

  // this is generic
  async loadFile(callback = () => {}) {
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
        // !!! this is specific
        const enabled = this.global.get('enabled');
        this.toggleSynth(enabled);
      }

      this.state.set('loading', false);
    } else {
      this.state.set('loading', false);
    }
  }
}
