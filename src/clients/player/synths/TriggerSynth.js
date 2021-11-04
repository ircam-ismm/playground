class TriggerSynth {
  constructor(audioContext, buffer, config) {
    this.audioContext = audioContext;
    this.buffer = buffer;
    this.bufferDuration = buffer.duration;
    this.repeat = config.repeat;
    this.period = config.period === 0 ? this.buffer.duration : config.period;
    this.jitter = config.jitter;
    this.releaseDuration = config.releaseDuration;

    this.output = this.audioContext.createGain();
  }

  connect(destination) {
    this.output.connect(destination);
  }

  trigger() {
    const now = this.audioContext.currentTime;

    const env = this.audioContext.createGain();
    env.connect(this.output);
    env.gain.value = 0;
    env.gain.setValueAtTime(0, now);

    let startTime = now;

    for (let i = 0; i < this.repeat; i++) {
      const src = this.audioContext.createBufferSource();
      src.connect(env);
      src.buffer = this.buffer;

      if (i > 0) {
        startTime = now + (i * this.period) + ((Math.random() * 2 - 1)  * this.jitter);
      }

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
