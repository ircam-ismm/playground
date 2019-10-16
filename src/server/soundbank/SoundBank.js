import fs from 'fs';
import parameters from '@ircam/parameters';
import JSON5 from 'json5';

class Preset {
  constructor(definitions, values = {}) {
    const defaults = {};
    for (let name in definitions) {
      defaults[name] = definitions[name].default;
    }

    const newValues = Object.assign({}, defaults, values);
    // if some parameters have been removed from defaults, remove too
    for (let key in newValues) {
      if (!(key in defaults)) {
        delete newValues[key];
      }
    }

    this.values = parameters(definitions, newValues);
    this._dirty = false;

    this._dirty = this._checkDirty(values);
  }

  _checkDirty(values) {
    if (JSON.stringify(this) !== JSON.stringify(values)) {
      return true;
    }

    return false;
  }

  get dirty() {
    const dirty = this._dirty;
    this._dirty = false;
    return dirty;
  }

  update(updates) {
    for (let name in updates) {
      this.values.set(name, updates[name]);
    }

    this._dirty = true;
  }

  toJSON() {
    return this.values.getValues();
  }
}

class SoundFile {
  constructor(values, defaultPresets) {
    this.values = {
      name: values.name,
      path: values.path,
      url: values.url,
      presets: {},
    };

    this._dirty = false;

    for (let name in defaultPresets) {
      const defaults = defaultPresets[name];
      const storedValues = (values.presets && values.presets[name]) || {};
      const preset = new Preset(defaults, storedValues);

      this.values.presets[name] = preset;
    }

    if (JSON.stringify(this.values) !== JSON.stringify(values)) {
      this._dirty = true;
    }
  }

  get dirty() {
    const dirty = this._dirty;
    this._dirty = false;
    return dirty;
  }

  toJSON() {
    return this.values;
  }
}

/**
 * @todo - should update instance when preset are updated manually in the file
 */
class SoundBank {
  constructor(fileStorage, version, defaultPresets, fileDefaultPresets) {
    this._fileStorage = fileStorage;
    this._version = version;
    this._defaultPresets = defaultPresets;
    this._fileDefaultPresets = fileDefaultPresets;
    this._dirty = false;

    this.values = {
      name: null,
      url: null,
      path: null,
      version: version,
      presets: {},
      files: {},
    };

    this.createFromFile();
  }

  get dirty() {
    const dirty = this._dirty;
    this._dirty = false;
    return dirty;
  }

  _persist() {
    fs.writeFileSync(this._fileStorage, JSON.stringify(this, null, 2));
  }

  updatePreset(presetName, updates) {
    const preset = this.values.presets[presetName];

    if (!preset) {
      throw new Error(`Undefined preset ${presetName} for sound bank ${this.values.name}`);
    }

    preset.update(updates);

    if (preset.dirty) {
      this._dirty = true;
      this._persist();
    }
  }

  updateFilePreset(soundFileName, presetName, updates) {
    const soundFile = this.values.files[soundFileName];

    if (!soundFile) {
      throw new Error(`Undefined file ${soundFileName} in sound bank ${this.values.name}`);
    }

    const preset = soundFile.values.presets[presetName];

    if (!preset) {
      throw new Error(`Undefined preset ${presetName} for file ${soundFileName}, sound bank ${this.values.name}`);
    }

    preset.update(updates);

    if (preset.dirty) {
      this._dirty = true;
      this._persist();
    }
  }

  // can it be called at some other point of time except construction?
  createFromFile() {
    let dirty = false;

    const data = fs.readFileSync(this._fileStorage);
    const json = JSON.parse(data);

    if (json.version !== this._version) {
      throw new Error(`Invalid stored file version: ${this._version}, soundBank version ${json.version}`);
    }

    this.values.name = json.name;
    this.values.url = json.url;
    this.values.path = json.path;

    for (let presetName in this._defaultPresets) {
      const defaults = this._defaultPresets[presetName];
      const values = (json.presets && json.presets[presetName]) || {};
      const preset = new Preset(defaults, values);
      this.values.presets[presetName] = preset;

      dirty = (dirty || preset.dirty);
    }

    for (let filename in json.files) {
      const data = json.files[filename];
      const soundFile = new SoundFile(data, this._fileDefaultPresets);

      this.values.files[filename] = soundFile;

      dirty = (dirty || soundFile.dirty);
    }

    if (dirty === true) {
      this._dirty = true;
      // save the SOUND_BANK_DATA_BASENAME from new state
      this._persist();
    }
  }

  // we do not persist as we update the models because the file as been changed
  updateFromFile(json) {
    for (let presetName in this._defaultPresets) {
      const values = json.presets[presetName];
      this.updatePreset(presetName, values);
    }

    for (let filename in json.files) {
      for (let presetName in this._fileDefaultPresets) {
        const values = json.files[filename].presets[presetName];
        this.updateFilePreset(filename, presetName, values);
      }
    }
  }

  updateFromTree(tree) {
    const existingFiles = Object.keys(this.values.files);
    let dirty;

    tree.forEach(desc => {
      if (desc.path === this._fileStorage) {
        const data = fs.readFileSync(desc.path, { encoding: 'utf8' });
        const json = JSON5.parse(data);
        // we restringify to compare w/ the same formatting
        if (JSON.stringify(this.values) !== JSON.stringify(json)) {
          this.updateFromFile(json);
        }

        return; // goto next
      }

      const ext = desc.extension.toLowerCase();
      // we only care about sound files (for now)
      if (ext !== '.wav' && ext !== '.mp3') {
        return; // goto next
      }

      const filename = desc.name;

      if (!this.values.files[filename]) {
        // new sound file added, create SoundFile from defaults
        const { name, path, url } = desc;
        const presets = {};
        const soundFile = new SoundFile({ name, path, url, presets }, this._fileDefaultPresets);
        this.values.files[name] = soundFile;
        // mark as dirty
        dirty = true;
      } else {
        // no change, remove from existing files
        const index = existingFiles.indexOf(filename);
        existingFiles.splice(index, 1);
      }
    });

    if (existingFiles.length > 0) {
      existingFiles.forEach((filename) => delete this.values.files[filename]);
      dirty = true;
    }

    if (dirty === true) {
      this._dirty = true;
      // save the SOUND_BANK_DATA_BASENAME from new state
      this._persist();
    }
  }

  toJSON() {
    return this.values;
  }
}

export default SoundBank;
