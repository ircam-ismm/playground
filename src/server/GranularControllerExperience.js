import { Experience } from '@soundworks/core/server';

class GranularControllerExperience extends Experience {
  constructor(server, clientTypes, soundBankManager) {
    super(server, clientTypes);

    this.soundBankManager = soundBankManager;
  }

  start() {
    this.soundBankManager.subscribe((oldValues, newValues) => {
      const { soundBankDefaultPresets, soundFileDefaultPresets } = this.soundBankManager;

      this.server.sockets.broadcast('granular-controller', null, 'soundBanks',
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

export default GranularControllerExperience;
