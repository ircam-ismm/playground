
class AutoPlaySynth {
  constructor(audioContext, buffer) {
    this.audioContext = audioContext;
    this.buffer = buffer;
    this.params = {};

    this.currentSrc = null;

    this.env = audioContext.createGain();
    this.env.gain.value = 0;
    this.env.gain.setValueAtTime(1, audioContext.currentTime);
  }

  updateParams(params) {
    this.params = params;
  }

  connect(destination) {
    this.env.connect(destination);
  }

  start() {
    const now = this.audioContext.currentTime;
    const { attackDuration } = this.params;

    this.env.gain.setValueAtTime(0, now);
    this.env.gain.linearRampToValueAtTime(1, now + attackDuration);
    this.trigger();
  }

  stop() {
    const { maxReleaseOffset, releaseDuration } = this.params;
    const releaseOffset = Math.random() * maxReleaseOffset;

    setTimeout(() => {
      const now = this.audioContext.currentTime;

      this.env.gain.cancelScheduledValues(now);
      this.env.gain.setValueAtTime(this.env.gain.value, now);
      this.env.gain.linearRampToValueAtTime(0, now + releaseDuration);

      this.src.stop(now + releaseDuration);

    }, releaseOffset * 1000);
  }

  trigger() {
    const { repeatPeriod } = this.params;

    this.src = this.audioContext.createBufferSource();
    this.src.connect(this.env);
    this.src.buffer = this.buffer;
    this.src.start();

    setTimeout(() => this.trigger(), repeatPeriod * 1000);
  }
}

export default AutoPlaySynth;
