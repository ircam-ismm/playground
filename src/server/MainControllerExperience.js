import { Experience } from '@soundworks/core/server';

class MainControllerExperience extends Experience {
  constructor(soundworks, clientTypes, soundBankManager) {
    super(soundworks, clientTypes);
  }

  start() {}

  enter(client) {}

  exit(client) {}
}

export default MainControllerExperience;
