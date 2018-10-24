
class PlayerCollection {
  constructor() {
    this._players = [];
  }

  add(player) {
    this._players.push(player);
  }

  delete(player) {
    const index = this._players.indexOf(player);

    if (index !== -1) {
      this._players.splice(index, 1);
    }
  }

  forEach(func) {
    this._players.forEach(func);
  }

  getByClient(client) {
    return this._players.find(player => player.client === client);
  }

  getByUuid(uuid) {
    return this._players.find(player => player.uuid === uuid);
  }

  getListByFilename(filename) {
    return this._players.filter(player => player.currentFile && player.currentFile.filename === filename);
  }

  toJSON() {
    return this._players.map(player => player.toJSON())
  }
}

export default PlayerCollection;
