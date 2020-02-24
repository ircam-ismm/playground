import { Experience } from '@soundworks/core/server';

class AutoPlayControllerExperience extends Experience {
  constructor(soundworks, clientTypes, soundBankManager) {
    super(soundworks, clientTypes);

    this.soundBankManager = soundBankManager;
  }

  start() {
    this.soundBankManager.subscribe((oldValues, newValues) => {
      const { soundBankDefaultPresets, soundFileDefaultPresets } = this.soundBankManager;

      this.server.sockets.broadcast('auto-play-controller', null, 'soundBanks',
        newValues,
        soundBankDefaultPresets,
        soundFileDefaultPresets
      );
    });
  }

  enter(client) {
    client.socket.addListener('soundBanks:updateSoundBankPreset', (...args) => {
      this.soundBankManager.updateSoundBankPreset(...args);
    });

    client.socket.addListener('soundBanks:updateSoundFilePreset', (...args) => {
      this.soundBankManager.updateSoundFilePreset(...args);
    });

    const soundBanks = this.soundBankManager.getValues();
    const { soundBankDefaultPresets, soundFileDefaultPresets } = this.soundBankManager;

    client.socket.send('soundBanks', soundBanks, soundBankDefaultPresets, soundFileDefaultPresets);
  }

  exit(client) {}
}

export default AutoPlayControllerExperience;
