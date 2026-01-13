import {
  GainNode,
  AudioBufferSourceNode,
} from 'isomorphic-web-audio-api';

class GranularSynth {
  constructor(audioContext, scheduler, buffer) {
    this.audioContext = audioContext;
    this.scheduler = scheduler;
    this.buffer = buffer;

    this.params = {
      volume: 1,
      releaseDuration: 1,
      attackDuration: 1,
      speed: 1,
      positionVar: 0.003,
      periodAbs: 0.02,
      durationAbs: 0.1,
      resampling: 0,
      resamplingVar: 0,
    }



    this.output = new GainNode(this.audioContext, { gain: 0 });
    this.output.gain.setValueAtTime(0, this.audioContext.currentTime);

    this.playhead = 0; // logical time in buffer
    this.stopAt = null;
  }

  connect(destination) {
    this.output.connect(destination);
  }

  set volume(value) {
    const now = this.audioContext.currentTime;
    this.gain.gain.setTargetAtTime(value, now, 0.01);
  }

  #process = (currentTime) => {
    const now = currentTime + Math.random() * 0.003;
    const bufferDuration = this.buffer.duration;

    let offset = this.playhead + Math.random() * this.params.positionVar;
    offset = Math.max(0, Math.min(bufferDuration, offset));

    const duration = Math.min(this.params.durationAbs, bufferDuration - offset);
    const detune = this.params.resampling + Math.random() * this.params.resamplingVar;

    const src = new AudioBufferSourceNode(this.audioContext, { buffer: this.buffer, detune });
    const env = new GainNode(this.audioContext, { gain: 0 });
    src.connect(env).connect(this.output);

    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(this.params.volume, now + duration / 2);
    env.gain.linearRampToValueAtTime(0, now + duration);

    src.start(now, offset);
    src.stop(now + duration);

    // update playhead
    this.playhead += (this.params.periodAbs * this.params.speed);

    if (this.playhead < 0) {
      this.playhead = bufferDuration + this.playhead;
    } else if (this.playhead >= bufferDuration) {
      this.playhead -= bufferDuration;
    }

    if (this.stopAt === null || currentTime + this.params.periodAbs < this.stopAt) {
      return currentTime + this.params.periodAbs;
    } else {
      return null;
    }
  }

  start() {
    const now = this.audioContext.currentTime;
    this.scheduler.add(this.#process, now);

    this.output.gain.setValueAtTime(0, now);
    this.output.gain.linearRampToValueAtTime(1, now + this.params.attackDuration);
  }

  stop() {
    const now = this.audioContext.currentTime;
    this.stopAt = now + this.params.releaseDuration;

    if (this.output.gain.cancelAndHoldAtTime) {
      this.output.gain.cancelAndHoldAtTime(now);
    } else {
      this.output.gain.cancelScheduledValues(now);
    }

    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(0, this.stopAt);
  }
}

export default GranularSynth;
