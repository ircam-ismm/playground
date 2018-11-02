import { Experience } from 'soundworks/server';

class ControllerExperience extends Experience {
  constructor(clientType, store, comm) {
    super(clientType);

    this.store = store;
    this.comm = comm;
  }

  start() {
    // listen store changes
    this.store.addListener('update', storeModel => {
      this.broadcast('controller', null, 'update-store', storeModel);
    });
  }

  enter(client) {
    super.enter(client);

    this.send(client, 'update-store', this.store.toJSON());

    this.receive(client, 'errored-client', (uuid) => {
      this.store.randomlySetPlayerFilePair(uuid, 'trigger');
    });

    this.receive(client, 'select-preset', (preset) => {
      this.store.randomlySetPlayerFilePairs(preset, 'trigger');
    });

    this.receive(client, 'update-file-attributes', (file, defs) => {
      this.store.updateFileAttributes(file, defs, 'trigger');
    });

    this.receive(client, 'save-state', () => {
      this.store.saveState();
    });

    this.receive(client, 'trigger-file', uuid => {
      this.comm.emit('trigger-file', uuid);
    });

    this.receive(client, 'trigger-all', () => {
      this.comm.emit('trigger-all');
    });
  }

  exit(client) {
    super.exit(client);
  }
}

export default ControllerExperience;
