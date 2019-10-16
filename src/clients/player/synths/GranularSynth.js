
import audio from 'waves-audio';

const scheduler = audio.getScheduler();
scheduler.period = 0.05;

class GranularSynth {
  constructor(audioContext, buffer) {
    this.audioContext = audioContext;

    this.env = audioContext.createGain();
    this.env.gain.value = 0;
    this.env.gain.setValueAtTime(1, audioContext.currentTime);

    this.engine = new audio.GranularEngine({
      buffer: buffer,
      cyclic: true,
    });

    this.engine.connect(this.env);

    this.playControl = new audio.PlayControl(this.engine);
  }

  connect(destination) {
    this.env.connect(destination);
  }

  set volume(value) {
    this.env.gain.linearRampToValueAtTime(value, this.audioContext.currentTime + 0.01);
  }

  updateParams(values) {
    for (let attr in values) {
      if (attr in this.engine) {
        this.engine[attr] = values[attr];
      }

      if (attr === 'speed') {
        this.playControl.speed = values[attr];
      }

      if (attr === 'volume') {
        this.volume = values[attr];
      }

      if (attr === 'releaseDuration') {
        this.releaseDuration = values[attr];
      }
    }
  }

  start() {
    this.playControl.start();
    this.env.gain.linearRampToValueAtTime(1, this.audioContext.currentTime + 0.01);
  }

  stop() {
    this.env.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + this.releaseDuration);

    setTimeout(() => {
      this.playControl.stop();
      this.playControl.set(null);
    }, (this.releaseDuration + 0.2) * 1000);
  }
}

export default GranularSynth;
