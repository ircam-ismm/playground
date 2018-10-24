
class AudioFileCollection {
  constructor() {
    this._audioFiles = [];
  }

  add(audioFile) {
    this._audioFiles.push(audioFile);
  }

  delete(audioFile) {
    const index = this._audioFiles.indexOf(audioFile);
    if (index !== -1) {
      this._audioFiles.splice(index, 1);
    }
  }

  forEach(func) {
    this._audioFiles.forEach(func);
  }

  getAll() {
    return this._audioFiles;
  }

  getByName(filename) {
    return this._audioFiles.find(model => model.filename === filename);
  }

  getPresetList(presetName) {
    return this._audioFiles.filter(file => file.preset === presetName);
  }

  toJSON() {
    return this._audioFiles.map(fileModel => fileModel.toJSON());
  }

  toString() {
    const filenames = this._audioFiles.map(file => file.filename);
    console.log(filenames);
  }
}

export default AudioFileCollection;
