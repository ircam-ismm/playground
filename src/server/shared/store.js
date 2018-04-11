import PlayerModel from './PlayerModel';
import AudioFileModel from './AudioFileModel';

const store = {
  init() {
    this.listeners = new Map();

    this.fileCollection = [];
    this.players = new Set();
  },

  getPlayerByClient(client) {
    return Array.from(this.players).find(player => player.client === client);
  },

  getPlayerByUuid(uuid) {
    return Array.from(this.players).find(player => player.uuid === uuid);
  },

  getPlayersByFilename(filename) {
    return Array.from(this.players).filter(player => player.currentFile && player.currentFile.filename === filename);
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
    this.players.add(player);

    this.emit('update', this.toJSON());

    return player;
  },

  deletePlayer(client) {
    const player = this.getPlayerByClient(client);
    this.players.delete(player);

    this.emit('update', this.toJSON());
  },

  setFileList(filenames) {
    // filenames = ['public/a', 'public/b'];

    // add files
    filenames.forEach(filename => {
      const fileModel = this.fileCollection.find(model => model.filename === filename);

      if (!fileModel) {
        const model = new AudioFileModel(filename);
        this.fileCollection.push(model);
      }
    });

    // remove files
    for (let i = this.fileCollection.length - 1; i >= 0; i--) {
      if (filenames.indexOf(this.fileCollection[i].filename) === -1)
        this.fileCollection.splice(i, 1);
    }

    this.emit('update', this.toJSON());
  },

  updateFileAttribute(filename, attr, value) {
    const fileModel = this.fileCollection.find(model => model.filename === filename);

    if (fileModel) {
      fileModel[attr] = value;

      this.emit('update', this.toJSON());

      const players = this.getPlayersByFilename(filename);

      players.forEach(player => {
        this.emit('update-player-file', player);
      });
    }
  },

  randomlySetPlayerFilePairs() {
    this.players.forEach(player => {
      const file = this.fileCollection[Math.floor(Math.random() * this.fileCollection.length)];
      player.currentFile = file;
      player.fileLoaded = false;

      this.emit('update-player-file', player);
    });

    this.emit('update', this.toJSON());
  },

  setPlayerFilePair(uuid, filename) {
    const player = this.getPlayerByUuid(uuid);
    player.currentFile = this.fileCollection.find(model => model.filename === filename);
    player.fileLoaded = false;

    this.emit('update', this.toJSON());
    this.emit('update-player-file', player);
  },

  setFileLoaded(uuid) {
    const player = this.getPlayerByUuid(uuid);
    player.fileLoaded = true;

    this.emit('update', this.toJSON());
  },

  toJSON() {
    return {
      fileCollection: this.fileCollection.map(fileModel => fileModel.toJSON()),
      players: Array.from(this.players).map(player => player.toJSON()),
    };
  },
};

export default store;
