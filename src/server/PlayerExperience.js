import { Experience } from '@soundworks/core/server';

function getNormalizedDistance(center, target, radius) {
  const dx = target.x - center.x;
  const dy = target.y - center.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const normDistance = distance / radius;

  return normDistance;
}

class PlayerExperience extends Experience {
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

    this.controllerStates = controllerStates;

    this.soundBankManager = soundBankManager;

    this.playerStates = new Map();
  }

  start() {
    super.start();

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

      for (let [nodeId, playerState] of this.playerStates) {
        const state = playerState.getValues();

        ['triggerSynthConfig', 'soloistSynthConfig', 'granularSynthConfig'].forEach(configName => {
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
    this.server.stateManager.observe(async (schemaName, nodeId) => {
      if (schemaName === 'player') {
        const playerState = await this.server.stateManager.attach(schemaName, nodeId);
        playerState.onDetach(() => this.playerStates.delete(nodeId));

        // add new player to current synth preset
        ['soloist', 'trigger', 'granular'].forEach(type => {
          const currentSoundBank = this.controllerStates[type].getValues()['currentSoundBank'];

          if (currentSoundBank !== null) {
            const soundBank = this.soundBankManager.getValues()[currentSoundBank];
            this.assignRandomFile(type, soundBank, playerState);
          }
        });

        this.playerStates.set(nodeId, playerState);
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
          case 'triggerPlayerEvent': {
            const playerId = updates[name];
            const playerState = this.playerStates.get(playerId);
            playerState.set({ triggerSynthEvent: true });
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
            for (let [id, playerState] of this.playerStates.entries()) {
              playerState.set({ granularSynthState: 'stop' });
            }

            this.assignSoundBank('granular', updates['currentSoundBank']);
            break;
          }
          case 'toggleSynthEvent': {
            const { action, filename } = updates[name];

            for (let [id, playerState] of this.playerStates.entries()) {
              const playerFile = playerState.get('granularSynthFile');

              if (playerFile === filename) {
                playerState.set({ granularSynthState: action });
              }
            }

            break;
          }
        }
      }
    });

    // ------------------------------------------------------------
    // soloist controller state
    // ------------------------------------------------------------
    let radius = this.controllerStates['soloist'].getValues()['radius'];
    let soloistStartTime = null;
    let triggers = null;
    const soloistActivePlayers = new Set();

    const soloistTrigger = () => {
      if (triggers.length === 0) {
        soloistActivePlayers.forEach(playerState => {
          playerState.set({ soloistSynthDistance: 1 });
        });

        soloistStartTime = null;
        soloistActivePlayers.clear();
      } else {
        if (soloistStartTime === null) {
          soloistStartTime = this.sync.getSyncTime();
        }

        for (let [id, playerState] of this.playerStates.entries()) {
          let normDistance = +Infinity;
          // we only consider the closer trigger
          triggers.forEach(trigger => {
            const playerPosition = this.position.states.get(id).getValues();
            const triggerNormDistance = getNormalizedDistance(trigger, playerPosition, radius);
            normDistance = Math.min(normDistance, triggerNormDistance);
          });

          const isActive = soloistActivePlayers.has(playerState);
          const inRadius = (normDistance <= 1);

          if (isActive && !inRadius) {
            playerState.set({ soloistSynthDistance: 1 });
            soloistActivePlayers.delete(playerState);
          }

          if (inRadius) {
            if (!isActive) {
              soloistActivePlayers.add(playerState);

              playerState.set({
                soloistSynthDistance: normDistance,
                soloistSynthStartTime: soloistStartTime,
              });
            } else {
              playerState.set({
                soloistSynthDistance: normDistance,
              });
            }
          }

        }
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

  // assign sound files from sound bank
  assignSoundBank(type, soundBankName) {
    if (soundBankName === null) {
      for (let playerState of this.playerStates.values()) {
        const playerSynthConfigKey = `${type}SynthConfig`;
        const playerSynthFileKey = `${type}SynthFile`;

        playerState.set({
          [playerSynthConfigKey]: null,
          [playerSynthFileKey]: null,
        });
      }
    } else {
      const soundBank = this.soundBankManager.getValues()[soundBankName];

      for (let playerState of this.playerStates.values()) {
        this.assignRandomFile(type, soundBank, playerState);
      }
    }
  }

  assignRandomFile(type, soundBank, playerState) {
    const synthConfigKey = `${type}SynthConfig`;
    const synthFileKey = `${type}SynthFile`;

    const filenames = Object.keys(soundBank.files);
    const rand = Math.floor(Math.random() * filenames.length);
    const filename = filenames[rand];

    const synthConfig = soundBank.files[filename];
    playerState.set({
      [synthConfigKey]: synthConfig,
      [synthFileKey]: synthConfig.url,
    });
  }
}

export default PlayerExperience;
