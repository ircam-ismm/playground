
class AudioFileModel {
  constructor(filename) {
    this.filename = filename;
    this.repeat = 0;
    this.period = 0;
    this.jitter = 0;
  }

  toJSON() {
    return {
      filename: this.filename,
      repeat: this.repeat,
      period: this.period,
      jitter: this.jitter,
    };
  }
}

export default AudioFileModel;
