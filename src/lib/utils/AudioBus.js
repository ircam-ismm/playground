import {
  decibelToLinear
} from '@ircam/sc-utils';
import {
  GainNode,
  BiquadFilterNode,
} from 'isomorphic-web-audio-api';

class AudioBus {
  #mute
  #fade
  #volume
  #lowpass

  constructor(audioContext) {
    this.audioContext = audioContext;

    this.#mute = new GainNode(this.audioContext);
    this.#fade = new GainNode(this.audioContext);
    this.#volume = new GainNode(this.audioContext);;
    this.#lowpass = new BiquadFilterNode(this.audioContext, {
      type: 'lowpass',
    });

    this.#lowpass
      .connect(this.#volume)
      .connect(this.#fade)
      .connect(this.#mute);

    this.input = this.#lowpass;
    this.output = this.#mute;
  }

  fadeTo(value, duration = 0) {
    const now = this.audioContext.currentTime;

    this.#fade.gain.cancelScheduledValues(now);

    if (duration === 0) {
      this.#fade.gain.setTargetAtTime(value, now, 0.01);
    } else {
      this.#fade.gain.linearRampToValueAtTime(value, now + duration);
    }
  }

  set cutoffFrequency(freq) {
    const now = this.audioContext.currentTime;
    this.#lowpass.frequency.setTargetAtTime(freq, now, 0.01);
  }

  set volume(db) {
    const now = this.audioContext.currentTime;
    const gain = decibelToLinear(db);
    this.#volume.gain.setTargetAtTime(gain, now, 0.01);
  }

  set mute(mute) {
    const now = this.audioContext.currentTime;
    const gain = mute ? 0 : 1;
    this.#mute.gain.setTargetAtTime(gain, now, 0.01);
  }
}

export default AudioBus;
