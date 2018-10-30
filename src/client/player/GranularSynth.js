import { audio, audioContext } from 'soundworks/client';

const scheduler = audio.getScheduler();

class GranularSynth {
  constructor(file) {
    this.env = audioContext.createGain();
    this.env.connect(audioContext.destination);
    this.env.gain.value = 0;
    this.env.gain.setValueAtTime(1, audioContext.currentTime);

    this.engine = new audio.GranularEngine({
      buffer: file.buffer,
      cyclic: true,
    });

    this.engine.connect(this.env);

    this.playControl = new audio.PlayControl(this.engine);
    this.playControl.speed = file.speed;

    this.updateParams(file);
  }

  set volume(value) {
    this.env.gain.linearRampToValueAtTime(value, audioContext.currentTime + 0.01);
  }

  updateParams(defs) {
    for (let attr in defs) {
      if (attr in this.engine) {
        this.engine[attr] = defs[attr];
      }

      if (attr === 'speed') {
        this.playControl.speed = defs[attr];
      }

      if (attr === 'granularVolume') {
        this.volume = defs[attr];
      }

      if (attr === 'granularReleaseDuration') {
        this.releaseDuration = defs[attr];
      }
    }
  }

  start() {
    this.playControl.start();
    this.env.gain.linearRampToValueAtTime(1, audioContext.currentTime + 0.01);
  }

  stop(fadeOutDuration) {
    this.env.gain.linearRampToValueAtTime(0, audioContext.currentTime + this.releaseDuration);

    setTimeout(() => {
      this.playControl.stop();
      this.playControl.set(null);
    }, (this.releaseDuration + 0.2) * 1000);
  }
}

export default GranularSynth;
