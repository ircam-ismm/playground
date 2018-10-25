import { audioContext } from 'soundworks/client';

class TriggerSynth {
  constructor(file) {
    this.buffer = file.buffer;
    this.bufferDuration = file.buffer.duration;
    this.repeat = file.repeat;
    this.period = file.period === 0 ? this.buffer.duration : file.period;
    this.jitter = file.jitter;
    this.releaseDuration = file.releaseDuration;
  }

  trigger() {
    const now = audioContext.currentTime;

    const env = audioContext.createGain();
    env.connect(audioContext.destination);
    env.gain.value = 0;
    env.gain.setValueAtTime(0, now);

    let startTime = now;

    for (let i = 0; i < this.repeat; i++) {
      const src = audioContext.createBufferSource();
      src.connect(env);
      src.buffer = this.buffer;

      if (i > 0)
        startTime = now + (i * this.period) + ((Math.random() * 2 - 1)  * this.jitter);

      src.start(startTime);
    }

    // compute start of release
    const lastStartTime = startTime;
    const attackTime = 0.005;
    const endTime = lastStartTime + this.bufferDuration;
    const releaseStartTime = Math.max(now + attackTime, endTime - this.releaseDuration);

    env.gain.linearRampToValueAtTime(1, now + attackTime);
    env.gain.setValueAtTime(1, releaseStartTime);
    env.gain.linearRampToValueAtTime(0, endTime);
  }
}

export default TriggerSynth;
