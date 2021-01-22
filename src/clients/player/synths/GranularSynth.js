
import * as audio from 'waves-audio';

const scheduler = audio.getScheduler();
scheduler.period = 0.05;

class GranularSynth {
  constructor(audioContext, buffer) {
    this.audioContext = audioContext;

    this.releaseDuration = 1;
    this.attackDuration = 1;

    this.fade = audioContext.createGain();
    this.fade.gain.value = 0;
    this.fade.gain.setValueAtTime(0, audioContext.currentTime);

    this.gain = audioContext.createGain();
    this.gain.connect(this.fade);
    this.gain.gain.value = 0;
    this.gain.gain.setValueAtTime(0, audioContext.currentTime);

    this.engine = new audio.GranularEngine({
      audioContext: audioContext,
      buffer: buffer,
      cyclic: true,
    });

    this.engine.connect(this.gain);

    this.playControl = new audio.PlayControl(this.engine, {
      audioContext: audioContext,
    });

    this.output = this.fade;
  }

  connect(destination) {
    this.output.connect(destination);
  }

  set volume(value) {
    const now = this.audioContext.currentTime;
    this.gain.gain.setTargetAtTime(value, now, 0.01);
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

      if (attr === 'attackDuration') {
        this.attackDuration = values[attr];
      }
    }
  }

  start() {
    const now = this.audioContext.currentTime;

    this.playControl.start();
    this.fade.gain.setValueAtTime(0, now);
    this.fade.gain.linearRampToValueAtTime(1, now + this.attackDuration);
  }

  stop() {
    const now = this.audioContext.currentTime;
    this.fade.gain.cancelScheduledValues(now);
    this.fade.gain.setValueAtTime(this.fade.gain.value, now)
    this.fade.gain.linearRampToValueAtTime(0, now + this.releaseDuration);

    setTimeout(() => {
      this.playControl.stop();
      this.playControl.set(null);
    }, (this.releaseDuration + 0.2) * 1000);
  }
}

export default GranularSynth;
