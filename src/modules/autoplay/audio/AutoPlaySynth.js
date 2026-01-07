
import {
  GainNode,
  AudioBufferSourceNode,
} from 'isomorphic-web-audio-api';
import {
  sleep
} from '@ircam/sc-utils';

export default class AutoPlaySynth {
  constructor(audioContext, scheduler) {
    this.audioContext = audioContext;
    this.scheduler = scheduler;
    this.buffer = null;
    this.params = {};

    this.sources = new Set();
    this.env = new GainNode(this.audioContext, { gain: 0 });
  }

  connect(...args) {
    this.env.connect(...args);
  }

  start() {
    const now = this.audioContext.currentTime;
    const { attackDuration } = this.params;

    this.env.gain.setValueAtTime(0, now);
    this.env.gain.linearRampToValueAtTime(1, now + attackDuration);
    this.scheduler.add(this.#trigger);
  }

  async stop() {
    const { maxReleaseOffset, releaseDuration } = this.params;
    const releaseOffset = Math.random() * maxReleaseOffset;
    this.scheduler.remove(this.#trigger);

    await sleep(releaseOffset);

    const now = this.audioContext.currentTime;

    // best effort for old iOS
    // @check - https://github.com/orottier/web-audio-api-rs/issues/557
    if (this.env.gain.cancelAndHoldAtTime) {
      this.env.gain.cancelAndHoldAtTime(now);
    } else {
      this.env.gain.cancelScheduledValues(now);
    }

    this.env.gain.setValueAtTime(this.env.gain.value, now);
    this.env.gain.linearRampToValueAtTime(0, now + releaseDuration);

    this.sources.forEach(src => src.stop(now + releaseDuration));
    this.sources.clear();
  }

  #trigger = (currentTime) => {
    const { repeatPeriod } = this.params;

    const src = new AudioBufferSourceNode(this.audioContext, { buffer: this.buffer });
    src.connect(this.env);
    src.start();
    // bookkeeping
    this.sources.add(src);
    src.addEventListener('ended', () => this.sources.delete(src));

    return currentTime + repeatPeriod;
  }
}
