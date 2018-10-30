import db from './db';
import PlayerModel from './PlayerModel';
import PlayerCollection from './PlayerCollection';
import AudioFileModel from './AudioFileModel';
import AudioFileCollection from './AudioFileCollection';

const store = {
  init() {
    this.listeners = new Map();

    this.fileCollection = new AudioFileCollection();
    this.playerCollection = new PlayerCollection();

    this.globals = {
      currentPreset: {},
      currentPresetFileCollection: {},
    };
  },

  addListener(channel, callback) {
    if (!this.listeners.has(channel))
      this.listeners.set(channel, new Set());

    const listeners = this.listeners.get(channel);
    listeners.add(callback);
  },

  removeListener(channel, callback) {
    const listeners = this.listeners.get(channel);

    if (listeners)
      listeners.delete(callback);
  },

  emit(channel, ...args) {
    const listeners = this.listeners.get(channel);

    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  },

  createPlayer(client) {
    const player = new PlayerModel(client);
    this.playerCollection.add(player);

    // assign sound file(s) to new player of presets has already be chosen
    ['trigger', 'granular'].forEach(type => {
      if (this.globals.currentPresetFileCollection[type]) {
        const collection = this.globals.currentPresetFileCollection[type];
        const file = collection[Math.floor(Math.random() * collection.length)];

        player.setCurrentFile(type, file);

        this.emit('update-file', player, type);
      }
    });

    this.emit('update', this.toJSON());

    return player;
  },

  deletePlayer(client) {
    const player = this.playerCollection.getByClient(client);
    this.playerCollection.delete(player);

    this.emit('update', this.toJSON());
  },

  setFileList(filenames, updateFromDb = false) {
    let filesConfig = [];

    if (updateFromDb) {
      filesConfig = db.retrieve();
    }

    // add files
    filenames.forEach(filename => {
      const fileModel = this.fileCollection.getByName(filename);

      if (fileModel === undefined) {
        let options = {};

        // for now this only happens on initialization
        if (updateFromDb) {
          const storedOptions = filesConfig.find(conf => conf.filename === filename);

          if (storedOptions) {
            options = storedOptions;
          }
        }

        const model = new AudioFileModel(filename, options);

        this.fileCollection.add(model);
      }
    });

    // remove unsued files
    this.fileCollection.forEach(file => {
      if (filenames.indexOf(file.filename) === -1) {
        this.fileCollection.delete(file);
      }
    });

    this.emit('update', this.toJSON());
  },

  // change `updateFileAttribute` for that
  /**
   * @param {Boolean} quiet - if true, doesn't send back the state to the
   *  controllers, is particularly needed for sliders to work properly.
   *  This could (should?) be fixed using a proper view system such as vue.js
   */
  updateFileAttributes(filename, defs, type, quiet = false) {
    const fileModel = this.fileCollection.getByName(filename);

    if (fileModel) {
      for (let attr in defs) {
        fileModel[attr] = defs[attr];
      }

      if (!quiet) {
        // propagate state back to the controllers
        this.emit('update', this.toJSON());
      }

      const players = this.playerCollection.getListByFile(type, filename);

      if (Array.isArray(players)) {
        players.forEach(player => this.emit('update-file-attributes', player, type, filename, defs));
      }
    }
  },

  /**
   * @param {String} type - refers to the type of synth (`trigger` or `granular`)
   */
  randomlySetPlayerFilePairs(preset, type) {
    let collection;

    if (preset === 'all') {
      collection = this.fileCollection.getAll();
    } else {
      collection = this.fileCollection.getPresetList(preset);
    }

    if (type === 'granular') {
      if (this.globals.currentPresetFileCollection[type]) {
        this.globals.currentPresetFileCollection[type].forEach(file => {
          this.updateFileAttributes(file.filename, { granularPlay: false }, 'granular', true);
        });
      }
    }

    this.playerCollection.forEach(player => {
      const file = collection[Math.floor(Math.random() * collection.length)];
      player.setCurrentFile(type, file);

      this.emit(`update-file`, player, type);
    });

    this.globals.currentPreset[type] = preset;
    this.globals.currentPresetFileCollection[type] = collection;

    this.emit('update', this.toJSON());
  },

  /**
   * @param {String} type - refers to the type of synth (`trigger` or `granular`)
   */
  randomlySetPlayerFilePair(uuid, type) {
    if (this.globals.currentPresetFileCollection[type]) {
      const player = this.playerCollection.getByUuid(uuid);
      const collection = this.globals.currentPresetFileCollection[type];
      const file = collection[Math.floor(Math.random() * collection.length)];
      player.setCurrentFile(type, file);

      this.emit(`update-file`, player, type);
      this.emit('update', this.toJSON());
    }
  },

  setFileLoaded(uuid, type) {
    const player = this.playerCollection.getByUuid(uuid);
    player.fileLoaded[type] = true;

    this.emit('update', this.toJSON());
  },

  toJSON() {
    return {
      globals: this.globals,
      fileCollection: this.fileCollection.toJSON(),
      players: this.playerCollection.toJSON(),
    };
  },

  saveState() {
    const model = this.fileCollection.toJSON();
    db.persist(model);
  }
};

export default store;
