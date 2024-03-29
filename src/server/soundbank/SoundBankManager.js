import JSON5 from 'json5';
import fs from 'fs';
import path from 'path';
import SoundBank from './SoundBank';

/*
  // v0.1.0
  const soundbank = soundbanks.get('vocals')
  ==> soundbank is a POJO
  sounbank.presets.autoPlaySynth.get('activated');
  sounbank.presets.autoPlaySynth.subscribe(updates => {})
  ==> soundank.presets is a {} of states

  const file = soundbank.getFile(filename);
  ==> file is a POJO
  const autoplayFilePreset = file.presets.autoPlaySynth;
  autoplayFilePreset.get('repeatPeriod');
  autoplayFilePreset.set({ repeatPeriod: 2 });

  autoplayFilePreset.dirty : Boolean
  autoplayFilePreset.save() : undefined
  autoplayFilePreset.reset() : undefined
  ===> file.presets.autoPlaySynth is a state

  we can save from whatever level


*/

/**
 * SOUND_BANK_DATA_BASENAME structure
  {
    name: '',
    path: '',
    url: '',
    version: '0.0.0',
    presets: Map{
      [preset-name-1]: {},
      [preset-name-2]: {},
    },
    files: {
     [name]: {
        name: '',
        path: '',
        url: '',
        presets: {
          [preset-name-3]: {},
          [preset-name-4]: {},
        }
      },
      [name]: {
        // ...
      }
    ]
  }
*/

const SOUND_BANK_DATA_BASENAME = '_soundbank.json';
const SOUND_BANK_DATA_VERSION = '0.0.0';

class SoundBankManager {
  constructor(soundBankDefaultPresets, soundFileDefaultPresets) {
    this.soundBankDefaultPresets = soundBankDefaultPresets;
    this.soundFileDefaultPresets = soundFileDefaultPresets;

    this.soundBanks = {};
    this._oldValues = null;

    this._observers = new Set();
  }

  subscribe(callback) {
    this._observers.add(callback);
    return () => this._observers.delete(callback);
  }

  getValues() {
    const values = {};

    for (let name in this.soundBanks) {
      values[name] = JSON.parse(JSON.stringify(this.soundBanks[name]));
    }

    return values;
  }

  updateSoundBankPreset(soundBankName, presetName, updates) {
    const soundBank = this.soundBanks[soundBankName];

    if (!soundBank) {
      throw new Error(`Undefined sound bank ${soundBankName}`);
    }

    if (this._oldValues === null) {
      this._oldValues = this.getValues();
    }

    soundBank.updatePreset(presetName, updates);
  }

  updateSoundFilePreset(soundBankName, soundFileName, presetName, updates) {
    const soundBank = this.soundBanks[soundBankName];

    if (!soundBank) {
      throw new Error(`Undefined sound bank ${soundBankName}`);
    }

    // because file tree is async...
    if (this._oldValues === null) {
      this._oldValues = this.getValues();
    }

    soundBank.updateFilePreset(soundFileName, presetName, updates);
  }

  updateFromFileTree(tree) {
    let dirty = false;

    if (this._oldValues === null) {
      this._oldValues = this.getValues();
    }

    const existingBanks = Object.keys(this._oldValues);

    tree.children.forEach(dir => {
      // do not allow top level audio files
      if (dir.type !== 'directory') {
        return;
      }

      const soundBankName = dir.name;
      const soundBankDataFile = path.join(dir.path, SOUND_BANK_DATA_BASENAME);
      // if the soundfile does not exists, thats a new soundbank
      let soundBankDataLeaf = dir.children.find(f => f.path === soundBankDataFile);
      let soundBank;

      // if the soundbank file does not exists, create it
      if (!soundBankDataLeaf) {
        const { name, path, url } = dir;
        const data = { name, path, url, version: SOUND_BANK_DATA_VERSION };
        const json = JSON.stringify(data, null, 2);
        fs.writeFileSync(soundBankDataFile, json, { encoding: 'utf8' });

        // if only the `_soundbank.json` file has been deleted,
        // we wan't to recreate the whole `SoundBank`
        if (this.soundBanks[soundBankName]) {
          delete this.soundBanks[soundBankName];
        }
      }

      // @todo - check if instance exists
      if (this.soundBanks[soundBankName]) {
        soundBank = this.soundBanks[soundBankName];
        // remove from existing bank list
        existingBanks.splice(existingBanks.indexOf(soundBankName), 1);
      } else {
        soundBank = new SoundBank(
          soundBankDataFile,
          SOUND_BANK_DATA_VERSION,
          this.soundBankDefaultPresets,
          this.soundFileDefaultPresets,
        );

        dirty = true;
      }

      soundBank.updateFromTree(dir);

      this.soundBanks[soundBankName] = soundBank;

      dirty = (dirty || soundBank.dirty);
    });

    // some banks have been removed
    if (existingBanks.length) {
      existingBanks.forEach(name => delete this.soundBanks[name]);
      dirty = true;
    }

    if (dirty) {
      const newValues = this.getValues();

      this._observers.forEach(callback => {
        callback(
          this._oldValues,
          newValues,
        )
      });

      this._oldValues = null;
    }
  }
}

export default SoundBankManager;
