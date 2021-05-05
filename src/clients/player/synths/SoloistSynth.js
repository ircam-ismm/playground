
class SoloistSynth {
  constructor(audioContext, buffer, startTime) {
    this.audioContext = audioContext;
    this.params = {};

    const now = audioContext.currentTime;

    this.fade = audioContext.createGain();
    this.fade.gain.value = 0;
    this.fade.gain.setValueAtTime(0, now);

    this.env = audioContext.createGain();
    this.env.connect(this.fade);
    this.env.gain.value = 0;
    this.env.gain.setValueAtTime(0, now);

    this.src = audioContext.createBufferSource();
    this.src.connect(this.env);
    this.src.buffer = buffer;
    this.src.loop = true;

    const offset = Math.max(0, (now - startTime) % buffer.duration);

    this.src.start(now, offset);
  }

  connect(destination) {
    this.fade.connect(destination);
  }

  updateParams(values) {
    this.params = values;
  }

  updateDistance(value) {
    const now = this.audioContext.currentTime;

    const { decayExponent } = this.params;
    const gain = Math.pow(1 - value, decayExponent);

    this.env.gain.cancelScheduledValues(now);
    this.env.gain.setTargetAtTime(gain, now, 0.01);
  }

  start() {
    const now = this.audioContext.currentTime;
    const { fadeInDuration } = this.params;

    this.fade.gain.setValueAtTime(0, now);
    // Depending on your use case, getting 95% toward the target value may
    // already be enough; in that case, you could set timeConstant to one
    // third of the desired duration.
    this.fade.gain.setTargetAtTime(1, now, fadeInDuration / 3);
  }

  release() {
    const now = this.audioContext.currentTime;
    const { fadeOutDuration } = this.params;

    this.fade.gain.cancelScheduledValues(now);
    this.fade.gain.setValueAtTime(this.env.gain.value, now);
    this.fade.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

    this.src.stop(now + fadeOutDuration);
  }
}

export default SoloistSynth;

