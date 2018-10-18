import { audioContext } from 'soundworks/client';

class TriggerSynth {
  constructor(file) {
    this.buffer = file.filename;
    this.repeat = file.repeat;
    this.period = file.period === 0 ? buffer.duration : file.period;
    this.jitter = file.jitter;
  }

  trigger() {
    const now = audioContext.currentTime;

    for (let i = 0; i < this.repeat + 1; i++) {
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
