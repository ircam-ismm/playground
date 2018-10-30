import path from 'path';

class AudioFileModel {
  constructor(filename, {
    repeat = 1,
    period = 0,
    jitter = 0,
    releaseDuration = 0,

    granularPlay = false,
    granularVolume = 1,
    granularReleaseDuration = 3,
    speed = 1,
    positionVar = 0.003,
    periodAbs = 0.02,
    durationAbs = 0.1,
    resampling = 0,
    resamplingVar = 0,
  } = {}) {
    // console.log(filename, options);
    this.filename = filename;
    this.filenameDisplay = filename.replace(/^sounds\//, '');
    this.preset = path.dirname(filename);
    this.presetDisplay = this.preset.replace(/^sounds\//, '');

    // @todo - create sub parameter bags for each synth

    // trigger params
    this.repeat = repeat;
    this.period = period;
    this.jitter = jitter;
    this.releaseDuration = releaseDuration;

    // granular params
    this.granularPlay = false;
    this.granularVolume = granularVolume;
    this.granularReleaseDuration = granularReleaseDuration;
    this.speed = speed;
    this.positionVar = positionVar;
    this.periodAbs = periodAbs;
    this.durationAbs = durationAbs;
    this.resampling = resampling;
    this.resamplingVar = resamplingVar;
  }

  toJSON() {
    return {
      // general
      filename: this.filename,
      filenameDisplay: this.filenameDisplay,
      preset: this.preset,
      presetDisplay: this.presetDisplay,

      // trigger params
      repeat: this.repeat,
      period: this.period,
      jitter: this.jitter,
      releaseDuration: this.releaseDuration,

      // granular params
      granularPlay: this.granularPlay,
      granularVolume: this.granularVolume,
      granularReleaseDuration: this.granularReleaseDuration,
      speed: this.speed,
      positionVar: this.positionVar,
      periodAbs: this.periodAbs,
      durationAbs: this.durationAbs,
      resampling: this.resampling,
      resamplingVar: this.resamplingVar,
    };
  }
}

export default AudioFileModel;
