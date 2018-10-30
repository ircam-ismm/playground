
const colors = [
  '#a6cee3',
  '#1f78b4',
  '#b2df8a',
  '#33a02c',
  '#fb9a99',
  '#e31a1c',
  '#fdbf6f',
  '#ff7f00',
  '#cab2d6',
];

class PlayerModel {
  constructor(client) {
    this.client = client;

    this.uuid = client.uuid;
    this.index = client.index;
    this.color = colors[client.index % colors.length];
    this.currentFile = {};
    this.fileLoaded = {};
  }

  setCurrentFile(type, file) {
    this.currentFile[type] = file;
    // @note - concurency here
    this.fileLoaded[type] = false;
  }

  toJSON() {
    return {
      uuid: this.uuid,
      index: this.index,
      color: this.color,
      currentFile: this.currentFile,
      fileLoaded: this.fileLoaded,
    };
  }
}

export default PlayerModel;
