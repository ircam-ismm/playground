import { AbstractExperience } from '@soundworks/core/server';

function getNormalizedDistance(center, target, radius) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const normDistance = Math.min(1, distance / radius);

  return normDistance;
}

class PlayerExperience extends AbstractExperience {
  constructor(
    server,
    clientTypes,
    controllerStates,
    soundBankManager
  ) {
    super(server, clientTypes);

    this.platform = this.require('platform');
    this.sync = this.require('sync');
    this.checkin = this.require('checkin');
    this.position = this.require('position');
    this.audioBufferLoader = this.require('audio-buffer-loader');
    this.scripting = this.require('scripting');

    this.controllerStates = controllerStates;

    this.soundBankManager = soundBankManager;

    this.players = new Map();
  }

  async start() {
    super.start();

    const globals = await this.server.stateManager.attach('globals');

    // ------------------------------------------------------------
    // propagate param change to players...
    // @note - this is not clean, we need a way to create several identical
    // states on 1 node...
    this.soundBankManager.subscribe((oldValues, newValues) => {
      // get what changed
      const updated = {};

      for (let bankName in newValues) {
        for (let filename in newValues[bankName].files) {
          if (
            oldValues[bankName] &&
            oldValues[bankName].files[filename]
          ) {
            const path = newValues[bankName].files[filename].path;
            const _old = JSON.stringify(oldValues[bankName].files[filename]);
            const _new = JSON.stringify(newValues[bankName].files[filename]);

            if (_old !== _new) {
              updated[path] = {
                raw: newValues[bankName].files[filename],
                json: _new,
              };
            }
          }
        }
      }

      for (let [nodeId, playerState] of this.players) {
        const state = playerState.getValues();

        ['triggerConfig', 'soloistConfig', 'granularConfig', 'autoPlayConfig'].forEach(configName => {
          const config = state[configName];

          for (let path in updated) {
            if (
              config &&
              config.path === path &&
              JSON.stringify(config) !== updated[path].json
            ) {
              playerState.set({ [configName]: updated[path].raw });
            }
          }
        });
      }
    });

    // ------------------------------------------------------------
    // END - propagate param change to players...
    // ------------------------------------------------------------


    // ------------------------------------------------------------
    // observe players
    // ------------------------------------------------------------
    this.server.stateManager.observe(async (schemaName, stateId, nodeId) => {
      if (schemaName === 'player') {
        const player = await this.server.stateManager.attach(schemaName, stateId);

        player.onDetach(() => {
          this.players.delete(nodeId);
          globals.set({ numConnectedPlayers: this.players.size });
        });

        // add new player to current synth preset
        ['soloist', 'trigger', 'granular', 'autoPlay'].forEach(async type => {
          const currentSoundBank = this.controllerStates[type].getValues()['currentSoundBank'];

          if (currentSoundBank !== null) {
            const soundBank = this.soundBankManager.getValues()[currentSoundBank];
            await this.assignSoundFile(type, soundBank, player);

            // if granular is enabled when the user connects
            if (type === 'granular') {
              const startedGranularSynths = this.controllerStates['granular'].get('startedSynths');

              startedGranularSynths.forEach(file => {
                if (file === player.get('granularFile')) {
                  player.set({ granularState: 'start' });
                }
              });
            }

            // if autoPlay is enabled when the user connects
            if (type === 'autoPlay') {
              const autoPlayEnabled = this.controllerStates['autoPlay'].get('enabled');
              player.set({ autoPlayEnabled: autoPlayEnabled });
            }
          }

          // if soloist and config.project.soloistGlobalFadeOutDuration is true
          // assign current value to player.soloistGlobalFadeOutTime
          if (type === 'soloist') {
            if (this.server.config.project.soloistGlobalFadeOutDuration === true) {
              const currentValue = this.controllerStates['soloist'].get('globalFadeOutDuration');
              player.set({ soloistGlobalFadeOutDuration: currentValue });
            }
          }
        });

        this.players.set(nodeId, player);
        globals.set({ numConnectedPlayers: this.players.size });
      }
    });


    // ------------------------------------------------------------
    // trigger controller state
    // ------------------------------------------------------------
    this.controllerStates['trigger'].subscribe(updates => {
      for (let name in updates) {
        switch (name) {
          case 'currentSoundBank': {
            this.assignSoundBank('trigger', updates['currentSoundBank']);
            break;
          }
          // ok weird, but consistent with other synths...
          case 'triggerPlayerEvent': {
            const playerId = updates[name];
            const playerState = this.players.get(playerId);
            playerState.set({ triggerEvent: true });
            break;
          }

          case 'triggerAllEvent': {
            this.players.forEach(playerState => {
              playerState.set({ triggerEvent: true });
            });
            break;
          }
        }
      }
    });

    // ------------------------------------------------------------
    // granular controller state
    // ------------------------------------------------------------
    this.controllerStates['granular'].subscribe(updates => {
      // assign sound file
      for (let name in updates) {
        switch (name) {
          case 'currentSoundBank': {
            for (let [id, playerState] of this.players.entries()) {
              playerState.set({ granularState: 'stop' });
            }

            this.assignSoundBank('granular', updates['currentSoundBank']);
            break;
          }
          case 'toggleSynthEvent': {
            updates[name].forEach(event => {
              const { action, filename } = event;

              for (let [id, playerState] of this.players.entries()) {
                const playerFile = playerState.get('granularFile');

                if (playerFile === filename) {
                  playerState.set({ granularState: action });
                }
              }
            });

            break;
          }
        }
      }
    });

    // ------------------------------------------------------------
    // soloist controller state
    // ------------------------------------------------------------
    let radius = this.controllerStates['soloist'].getValues('radius');
    let soloistStartTime = null;
    let triggers = null;
    const soloistActivePlayers = new Set();

    const soloistTrigger = () => {
      if (triggers.length === 0) {
        soloistStartTime = null;

        this.players.forEach(player => {
          player.set({ soloistDistance: 1 });
        })
      } else {
        if (soloistStartTime === null) {
          soloistStartTime = this.sync.getSyncTime();
        }

        const radius = this.controllerStates['soloist'].get('radius');
        const triggers = this.controllerStates['soloist'].get('triggers');

        this.players.forEach(player => {
          const position = player.get('position');
          const currentDistance = player.get('soloistDistance');
          let normDistance = 1;

          triggers.forEach(trigger => {
            const triggerNormDistance = getNormalizedDistance(trigger, position, radius);
            normDistance = Math.min(normDistance, triggerNormDistance);
          });

          if (normDistance < 1 && currentDistance === 1) {
            player.set({
              soloistDistance: normDistance,
              soloistStartTime: soloistStartTime,
            });
          } else {
            // if distance is still 1, the value won't be propagated on the network
            player.set({
              soloistDistance: normDistance,
            });
          }
        });
      }
    }

    this.controllerStates['soloist'].subscribe(updates => {
      for (let key in updates) {
        switch (key) {
          case 'currentSoundBank': {
            this.assignSoundBank('soloist', updates['currentSoundBank']);
            break;
          }
          case 'radius': {
            radius = updates[key];

            if (triggers !== null) {
              soloistTrigger();
            }
            break;
          }
          case 'triggers': {
            triggers = updates[key]
            soloistTrigger();
            break;
          }
          case 'globalFadeOutDuration': {
            if (this.server.config.project.soloistGlobalFadeOutDuration === true) {
              const value = updates[key];
              this.players.forEach(player => {
                console.log(value);
                player.set({ soloistGlobalFadeOutDuration: value });
              });
            }
            break;
          }
        }
      }
    });


    this.controllerStates['autoPlay'].subscribe(updates => {
      for (let key in updates) {
        switch (key) {
          case 'currentSoundBank': {
            if (updates['currentSoundBank'] === null) {
              for (let playerState of this.players.values()) {
                playerState.set({ autoPlayEnabled: false });
              }
            }
            this.assignSoundBank('autoPlay', updates['currentSoundBank']);
            break;
          }
          case 'enabled': {
            for (let playerState of this.players.values()) {
              playerState.set({ autoPlayEnabled: updates[key] });
            }
            break;
          }
        }
      }
    });
  }

  enter(client) {
    super.enter(client);
  }

  exit(client) {
    super.exit(client);
  }

  // randomly assign sound files from sound bank
  async assignSoundBank(type, soundBankName) {
    if (soundBankName === null) {
      for (let playerState of this.players.values()) {
        const playerSynthConfigKey = `${type}Config`;
        const playerSynthFileKey = `${type}File`;

        await playerState.set({
          [playerSynthConfigKey]: null,
          [playerSynthFileKey]: null,
        });
      }
    } else {
      const soundBank = this.soundBankManager.getValues()[soundBankName];
      // console.time('assignFiles');
      for (let playerState of this.players.values()) {
        await this.assignSoundFile(type, soundBank, playerState);
      }
      // console.timeEnd('assignFiles');
    }
  }

  async assignSoundFile(type, soundBank, playerState) {
    const synthConfigKey = `${type}Config`;
    const synthFileKey = `${type}File`;

    let filename;
    const filenames = Object.keys(soundBank.files);

    // pick strategy from config file
    const strategy = this.server.config.project.assignSoundFilesStrategy;

    if (strategy === 'even') {
      // evenly distribute soundfiles between all clients
      // @todo - make that more efficient, this is very brut force but ok for now
      // ~20ms for 100 clients
      // ~40ms for 200 clients
      const numPlayersPerFile = {};

      filenames.forEach(filename => {
        const url = soundBank.files[filename].url;
        numPlayersPerFile[url] = 0;
      });

      for (let peerState of this.players.values()) {
        if (peerState !== playerState) {
          const url = peerState.get(synthFileKey);

          if (url in numPlayersPerFile) {
            numPlayersPerFile[url] += 1;
          }
        }
      }

      const numPlayersAsArray = Object.values(numPlayersPerFile);
      const min = Math.min.apply(null, numPlayersAsArray);
      const index = numPlayersAsArray.indexOf(min);

      filename = filenames[index];
    } else {
      // defaults to random strategy
      // cf. https://github.com/ircam-ismm/playground/issues/3
      filename = filenames[Math.floor(Math.random() * filenames.length)];
    }

    const synthConfig = soundBank.files[filename];

    await playerState.set({
      [synthConfigKey]: synthConfig,
      [synthFileKey]: synthConfig.url,
    });
  }
}

export default PlayerExperience;
