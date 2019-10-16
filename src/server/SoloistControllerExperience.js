import { Experience } from '@soundworks/core/server';

class SoloistExperience extends Experience {
  constructor(soundworks, clientTypes, soundBankManager) {
    super(soundworks, clientTypes);

    this.soundBankManager = soundBankManager;
  }

  start() {
    this.soundBankManager.subscribe((oldValues, newValues) => {
      const { soundBankDefaultPresets, soundFileDefaultPresets } = this.soundBankManager;

      // @note - broadcast is not reliable -> send to everyone...
      // this.server.sockets.broadcast('trigger-controller', null, 'soundBanks',
      //   newValues,
      //   soundBankDefaultPresets,
      //   soundFileDefaultPresets
      // );

    });
  }

  enter(client) {
    const soundBanks = this.soundBankManager.getValues();
    const { soundBankDefaultPresets, soundFileDefaultPresets } = this.soundBankManager;

    client.socket.addListener('soundBanks:updateSoundBankPreset', (...args) => {
      this.soundBankManager.updateSoundBankPreset(...args);
    });

    client.socket.addListener('soundBanks:updateSoundFilePreset', (...args) => {
      this.soundBankManager.updateSoundFilePreset(...args);
    });

    client.socket.send('soundBanks', soundBanks, soundBankDefaultPresets, soundFileDefaultPresets);
  }

  exit(client) {}
}

export default SoloistExperience;
