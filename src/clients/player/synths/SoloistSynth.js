
class SoloistSynth {
  constructor(audioContext, buffer, startTime) {
    this.audioContext = audioContext;
    this.params = {};

    const now = audioContext.currentTime;

    this.env = audioContext.createGain();
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
    this.env.connect(destination);
  }

  updateParams(values) {
    this.params = values;
  }

  updateDistance(value) {
    const now = this.audioContext.currentTime;

    const decayExponent = this.params.decayExponent;
    const gain = Math.pow(1 - value, decayExponent);

    this.env.gain.cancelScheduledValues(now);
    this.env.gain.setValueAtTime(this.env.gain.value, now);
    this.env.gain.linearRampToValueAtTime(gain, now + 0.005);
  }

  release() {
    const now = this.audioContext.currentTime;
    const { fadeOutDuration } = this.params;

    this.env.gain.cancelScheduledValues(now);
    this.env.gain.setValueAtTime(this.env.gain.value, now);
    this.env.gain.exponentialRampToValueAtTime(0.0001, now + fadeOutDuration);

    this.src.stop(now + fadeOutDuration);
  }
}

export default SoloistSynth;

