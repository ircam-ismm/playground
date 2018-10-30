import { Experience } from 'soundworks/server';

class GranularControllerExperience extends Experience {
  constructor(clientType, store, comm) {
    super(clientType)

    this.store = store;
    this.comm = comm;
  }

  start() {
    this.store.addListener('update', storeModel => {
      this.broadcast('granular-controller', null, 'update-store', storeModel);
    });
  }

  enter(client) {
    super.enter(client);

    this.send(client, 'update-store', this.store.toJSON());

    this.receive(client, 'errored-client', (uuid) => {
      this.store.randomlySetPlayerFilePair(uuid, 'granular');
    });

    this.receive(client, 'select-preset', (preset) => {
      this.store.randomlySetPlayerFilePairs(preset, 'granular');
    });

    this.receive(client, 'update-file-attributes', (file, defs, silent) => {
      this.store.updateFileAttributes(file, defs, 'granular', silent);
    });

    this.receive(client, 'save-state', () => {
      this.store.saveState();
    });
  }

  exit(client) {
    super.exit(client);
  }
}

export default GranularControllerExperience;
