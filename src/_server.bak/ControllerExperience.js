import { AbstractExperience } from '@soundworks/core/server';

class ControllerExperience extends AbstractExperience {
  constructor(soundworks, clientTypes, soundBankManager) {
    super(soundworks, clientTypes);
  }

  start() {}

  enter(client) {}

  exit(client) {}
}

export default ControllerExperience;
