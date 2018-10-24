import { audioContext } from 'soundworks/client';

class TriggerSynth {
  constructor(file) {
    this.buffer = file.buffer;
    this.repeat = file.repeat;
    this.period = file.period === 0 ? this.buffer.duration : file.period;
    this.jitter = file.jitter;
  }

  trigger() {
    const now = audioContext.currentTime;

    for (let i = 0; i < this.repeat; i++) {
      const src = audioContext.createBufferSource();
      src.connect(audioContext.destination);
      src.buffer = this.buffer;

      let startTime = now;

      if (i > 0)
        startTime = now + (i * this.period) + ((Math.random() * 2 - 1)  * this.jitter);

      src.start(startTime);
    }
  }
}

export default TriggerSynth;
