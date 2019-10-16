
class Preset {
  constructor({
    name = '',
    files = [],
    triggerSynth = true,
    granularSynth = true,
    soloistSynth = true,
  } = {}) {
    this.name = name;
    this.files = new Set(files);

    this.triggerSynth = triggerSynth;
    this.granularSynth = granularSynth;
    this.soloistSynth = soloistSynth;
  }

  toJSON() {
    return {
      name: this.name,
      files: Array.from(this.files),
      triggerSynth: this.triggerSynth,
      granularSynth: this.granularSynth,
      soloistSynth: this.soloistSynth,
    }
  }
}

const preset = new Preset();

