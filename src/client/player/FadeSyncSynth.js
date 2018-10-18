import { audioContext } from 'soundworks/client';

class FadeSyncSynth {
  constructor(startTime, buffer) {
    this.fadeOutDuration = 1;

    const now = audioContext.currentTime;

    this.env = audioContext.createGain();
    this.env.connect(audioContext.destination);
    this.env.gain.value = 0;
    this.env.gain.setValueAtTime(0, now);

    this.src = audioContext.createBufferSource();
    this.src.connect(this.env);
    this.src.buffer = buffer;
    this.src.loop = true;

    const offset = Math.max(0, (now - startTime) % buffer.duration);

    this.src.start(now, offset);
  }

  set gain(value) {
    const now = audioContext.currentTime;

    this.env.gain.cancelScheduledValues(now);
    this.env.gain.setValueAtTime(this.env.gain.value, now);
    this.env.gain.linearRampToValueAtTime(value, now + 0.005);
  }

  fadeOut() {
    const now = audioContext.currentTime;

    this.env.gain.cancelScheduledValues(now);
    this.env.gain.setValueAtTime(this.env.gain.value, now);
    this.env.gain.exponentialRampToValueAtTime(0.0001, now + this.fadeOutDuration);
  }

  release() {
    this.fadeOut();

    const now = audioContext.currentTime;
    this.src.stop(now + this.fadeOutDuration);
  }
}

export default FadeSyncSynth;
