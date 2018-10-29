import { Experience } from 'soundworks/server';

class ControllerExperience extends Experience {
  constructor(clientType, store, comm) {
    super(clientType);

    this.store = store;
    this.comm = comm;

    this.directoryWatcher = this.require('directory-watcher');
  }

  start() {
    this.store.setFileList(this.directoryWatcher.getList());

    // bind drag n drop to store
    this.directoryWatcher.addListener('update', files => {
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

    this.receive(client, 'update-player-file', (uuid) => {
      this.store.randomlySetPlayerFilePair(uuid);
    });

    this.receive(client, 'update-file-attributes', (file, defs) => {
      this.store.updateFileAttributes(file, defs);
    });

    this.receive(client, 'select-preset', (preset) => {
      this.store.randomlySetPlayerFilePairs(preset);
    });

    this.receive(client, 'trigger-file', uuid => {
      this.comm.emit('trigger-file', uuid);
    });
  }

  exit(client) {
    super.exit(client);
  }
}

export default ControllerExperience;
