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
      currentPreset: null,
      currentPresetFileCollection: null,
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

    this.emit('update', this.toJSON());

    if (this.globals.currentPresetFileCollection !== null) {
      const collection = this.globals.currentPresetFileCollection;
      const file = collection[Math.floor(Math.random() * collection.length)];
      player.setCurrentFile(file);

      this.emit('update-player-file', player);
    }

    return player;
  },

  deletePlayer(client) {
    const player = this.playerCollection.getByClient(client);
    this.playerCollection.delete(player);

    this.emit('update', this.toJSON());
  },

  setFileList(filenames) {
    // add files
    filenames.forEach(filename => {
      const fileModel = this.fileCollection.getByName(filename);

      if (fileModel === undefined) {
        const model = new AudioFileModel(filename);
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
  updateFileAttributes(filename, defs) {
    const fileModel = this.fileCollection.getByName(filename);

    if (fileModel) {
      for (let attr in defs) {
        fileModel[attr] = defs[attr];
      }

      this.emit('update', this.toJSON());

      const players = this.playerCollection.getListByFilename(filename);

      if (Array.isArray(players)) {
        players.forEach(player => this.emit('update-player-file', player));
      }
    }
  },

  randomlySetPlayerFilePairs(preset) {
    let collection;

    if (preset === 'all') {
      collection = this.fileCollection.getAll();
    } else {
      collection = this.fileCollection.getPresetList(preset);
    }

    this.playerCollection.forEach(player => {
      const file = collection[Math.floor(Math.random() * collection.length)];
      player.setCurrentFile(file);

      this.emit('update-player-file', player);
    });

    this.globals.currentPreset = preset;
    this.globals.currentPresetFileCollection = collection;

    this.emit('update', this.toJSON());
  },

  setPlayerFilePair(uuid, filename) {
    const player = this.playerCollection.getByUuid(uuid);
    const file = this.fileCollection.getByName(filename);
    player.setCurrentFile(file);

    this.emit('update', this.toJSON());
    this.emit('update-player-file', player);
  },

  setFileLoaded(uuid) {
    const player = this.playerCollection.getByUuid(uuid);
    player.fileLoaded = true;

    this.emit('update', this.toJSON());
  },

  toJSON() {
    return {
      globals: this.globals,
      fileCollection: this.fileCollection.toJSON(),
      players: this.playerCollection.toJSON(),
    };
  },
};

export default store;
