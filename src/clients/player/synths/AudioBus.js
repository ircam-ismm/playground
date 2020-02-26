function decibelToLinear(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
};

class AudioBus {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.gainNode = this.audioContext.createGain();
    this.muteNode = this.audioContext.createGain();
    this.muteNode.connect(this.gainNode);
  }

  connect(destination) {
    this.gainNode.connect(destination);
  }

  get input() {
    return this.muteNode;
  }

  set volume(db) {
    const gain = decibelToLinear(db);
    this.gainNode.gain.value = gain;
  }

  set mute(mute) {
    const targetValue = mute ? 0 : 1;
    this.muteNode.gain.value = targetValue;
  }
}

export default AudioBus;
