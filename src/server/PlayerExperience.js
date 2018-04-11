import { Experience } from 'soundworks/server';

// server-side 'player' experience.
class PlayerExperience extends Experience {
  constructor(clientType, store, comm) {
    super(clientType);

    this.store = store;
    this.comm = comm;

    this.checkin = this.require('checkin');
    this.locator = this.require('locator');
    this.sync = this.require('sync');
    this.audioBufferManager = this.require('audio-buffer-manager');

    this.sharedParams = this.require('shared-params');
  }

  start() {
    this.store.addListener('update-player-file', player => {
      this.send(player.client, 'update-file', player.toJSON());
    });
  }

  enter(client) {
    super.enter(client);

    const player = this.store.createPlayer(client);
    this.send(client, 'setup', player.toJSON());

    this.receive(client, 'file-loaded', uuid => {
      this.store.setFileLoaded(uuid);
    });

    // notify soloist
    this.comm.emit('player:enter', client);
  }

  exit(client) {
    super.exit(client);

    this.store.deletePlayer(client);
    // notify soloist
    this.comm.emit('player:exit', client);
  }
}

export default PlayerExperience;
