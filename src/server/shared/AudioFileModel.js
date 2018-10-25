import path from 'path';

class AudioFileModel {
  constructor(filename) {
    this.filename = filename;
    this.displayName = filename.replace(/^sounds\//, '');
    this.repeat = 1;
    this.period = 0;
    this.jitter = 0;
    this.releaseDuration = 0;

    this.preset = path.dirname(filename);
  }

  toJSON() {
    return {
      filename: this.filename,
      displayName: this.displayName,
      repeat: this.repeat,
      period: this.period,
      jitter: this.jitter,
      preset: this.preset,
      releaseDuration: this.releaseDuration,
    };
  }
}

export default AudioFileModel;
