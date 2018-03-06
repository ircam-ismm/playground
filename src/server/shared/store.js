import PlayerModel from './PlayerModel';

const store = {
  init() {
    this.listeners = new Map();

    this.fileList = [];
    this.players = new Set();
  },

  getPlayerByClient(client) {
    return Array.from(this.players).find(player => player.client === client);
  },

  getPlayerByUuid(uuid) {
    return Array.from(this.players).find(player => player.uuid === uuid);
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

  setFileList(fileList) {
    this.fileList = fileList;
    this.emit('update', this.toJSON());
  },

  randomlySetPlayerFilePairs() {
    this.players.forEach(player => {
      const file = this.fileList[Math.floor(Math.random() * this.fileList.length)];
      player.currentFile = file;
      player.fileLoaded = false;

      this.emit('update-player-file', player);
    });

    this.emit('update', this.toJSON());
  },

  setPlayerFilePair(uuid, file) {
    const player = this.getPlayerByUuid(uuid);
    player.currentFile = file;
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
      fileList: this.fileList,
      players: Array.from(this.players).map(player => player.toJSON()),
    };
  },
};

export default store;
