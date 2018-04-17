import path from 'path';

class AudioFileModel {
  constructor(filename) {
    this.filename = filename;
    this.repeat = 0;
    this.period = 0;
    this.jitter = 0;

    this.preset = path.dirname(filename);
  }

  toJSON() {
    return {
      filename: this.filename,
      repeat: this.repeat,
      period: this.period,
      jitter: this.jitter,
      preset: this.preset,
    };
  }
}

export default AudioFileModel;
