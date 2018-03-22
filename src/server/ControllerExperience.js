import { Experience } from 'soundworks/server';

class ControllerExperience extends Experience {
  constructor(clientType, store, comm) {
    super(clientType);

    this.store = store;
    this.comm = comm;

    this.dragNDrop = this.require('drag-n-drop');
  }

  start() {
    this.store.setFileList(this.dragNDrop.getList());

    // bind drag n drop to store
    this.dragNDrop.addListener('update', files => {
      this.store.setFileList(files);
    });

    // listen store changes
    this.store.addListener('update', storeModel => {
      this.broadcast('controller', null, 'update-store', storeModel);
    });
  }

  enter(client) {
    super.enter(client);

    const storeModel = this.store.toJSON();
    this.send(client, 'update-store', storeModel);

    this.receive(client, 'update-player-file', (uuid, file) => {
      this.store.setPlayerFilePair(uuid, file);
    });

    this.receive(client, 'update-file-attr', (file, attr, value) => {
      this.store.updateFileAttribute(file, attr, value);
    });

    this.receive(client, 'allocate-randomly', () => {
      this.store.randomlySetPlayerFilePairs();
    });

    this.receive(client, 'trigger', uuid => {
      const player = this.store.getPlayerByUuid(uuid);

      if (player) {
        const client = player.client;
        this.send(client, 'trigger');
      }
    });
  }

  exit(client) {
    super.exit(client);
  }
}

export default ControllerExperience;
