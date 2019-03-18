import { Experience } from 'soundworks/server';

function getInfos(client) {
  return {
    id: client.uuid,
    index: client.index,
    x: client.coordinates[0],
    y: client.coordinates[1],
  };
}

/**
 * @warning - this is made to handle only one soloist properly
 */
class SoloistExperience extends Experience {
  constructor(clientTypes, store, comm) {
    super(clientTypes);

    this.store = store;
    this.comm = comm;

    this.players = new Set();
    this.activePlayers = new Set();
    this.lastTouches = null;

    this.sharedConfig = this.require('shared-config');
    this.sharedConfig.share('setup', 'soloist');
    this.sync = this.require('sync');
    this.sharedParams = this.require('shared-params');

    this.onPlayerEnter = this.onPlayerEnter.bind(this);
    this.onPlayerExit = this.onPlayerExit.bind(this);
  }

  start() {
    super.start();

    this.comm.addListener('player:enter', this.onPlayerEnter);
    this.comm.addListener('player:exit', this.onPlayerExit);
  }

  /**
   * Function called whenever a client enters its `Experience`. When called, the
   * given `client` can be assumed to be fully configured.
   * @param {Client} client
   */
  enter(client) {
    super.enter(client);

    // send the list of connected players
    const playerInfos = [];
    this.players.forEach(player => {
      const infos = getInfos(player);
      playerInfos.push(infos);
    });

    this.send(client, 'player:list', playerInfos);

    // listen touch inputs from the `soloist` client
    this.receive(client, 'input:change', (radius, coordinates) => {
      this.onInputChange(radius, coordinates);
    });
  }

  /**
   * Function called whenever a client exists its `Experience`.
   */
  exit(client) {}

  /**
   * Specific `enter` routine for clients of type `player`.
   */
  onPlayerEnter(client) {
    this.players.add(client);
    // format infos from the player to be consmumed by the solist
    const infos = getInfos(client);

    this.broadcast('soloist', null, 'player:add', infos);
  }

  /**
   * Specific `exit` routine for clients of type `player`.
   */
  onPlayerExit(client) {
    this.players.delete(client);
    const infos = getInfos(client);

    this.broadcast('soloist', null, 'player:remove', infos);
  }


  onInputChange(touches) {
    const activePlayers = this.activePlayers;
    const players = this.players;

    const numTouches = Object.keys(touches).length;

    if (this.lastTouches !== null && numTouches === 0) {
      // stop all players with a fade
      this.broadcast('player', null, 'soloist:release');
      activePlayers.clear();
    } else {
      if (this.lastTouches === null) {
        // send sync time as starting point
        const syncTime = this.sync.getSyncTime();
        this.broadcast('player', null, 'soloist:start', syncTime);
      }

      // update current players
      players.forEach(player => {
        let normDistance = +Infinity;
        const isActive = activePlayers.has(player);

        for (let id in touches) {
          const center = [touches[id].x, touches[id].y];
          const radius = touches[id].radius;
          const target = player.coordinates;
          normDistance = this.getNormalizedDistance(target, center, radius);
        }

        const inRadius = (normDistance <= 1);

        // not anymore in radius - make sure to shut down and remove from active list
        if (isActive && !inRadius) {
          this.send(player, 'soloist:distance', 1, true);
          activePlayers.delete(player);
        }

        // if was not in radius, add to active players
        if (!isActive && inRadius) {
          activePlayers.add(player);
        }

        if (inRadius)
          this.send(player, 'soloist:distance', normDistance, false);
      });
    }

    this.lastTouches = numTouches === 0 ? null : touches;
  }

  getNormalizedDistance(target, center, radius) {
    const dx = target[0] - center[0];
    const dy = target[1] - center[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    const normDistance = distance / radius;

    return normDistance;
  }
}

export default SoloistExperience;
