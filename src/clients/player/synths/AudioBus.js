function decibelToLinear(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
};

class AudioBus {
  constructor(audioContext) {
    this.audioContext = audioContext;


    this.$_mute = this.audioContext.createGain();

    this.$_fade = this.audioContext.createGain();
    this.$_fade.connect(this.$_mute);

    this.$_volume = this.audioContext.createGain();
    this.$_volume.connect(this.$_fade);

    this.$_lowpass = this.audioContext.createBiquadFilter();
    this.$_lowpass.type = 'lowpass';
    this.$_lowpass.connect(this.$_volume);

    this.input = this.$_lowpass;
    this.output = this.$_mute;
  }

  connect(destination) {
    this.output.connect(destination);
  }

  fadeTo(value, duration = 0) {
    const now = this.audioContext.currentTime;

    this.$_fade.gain.cancelScheduledValues(now);

    if (duration === 0) {
      this.$_fade.gain.setTargetAtTime(value, now, 0.01);
    } else {
      this.$_fade.gain.linearRampToValueAtTime(value, now + duration);
    }
  }

  set cutoffFrequency(freq) {
    const now = this.audioContext.currentTime;
    this.$_lowpass.frequency.setTargetAtTime(freq, now, 0.01);
  }

  set volume(db) {
    const now = this.audioContext.currentTime;
    const gain = decibelToLinear(db);
    this.$_volume.gain.setTargetAtTime(gain, now, 0.01);
  }

  set mute(mute) {
    const now = this.audioContext.currentTime;
    const gain = mute ? 0 : 1;
    this.$_mute.gain.setTargetAtTime(gain, now, 0.01);
  }
}

export default AudioBus;
