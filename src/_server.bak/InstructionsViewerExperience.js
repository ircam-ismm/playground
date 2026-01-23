import { AbstractExperience } from '@soundworks/core/server';

class InstructionViewerExperience extends AbstractExperience {
  constructor(soundworks, clientTypes) {
    super(soundworks, clientTypes);
  }

  start() {}

  enter(client) {}

  exit(client) {}
}

export default InstructionViewerExperience;
