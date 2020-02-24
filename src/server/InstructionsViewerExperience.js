import { Experience } from '@soundworks/core/server';

class InstructionViewerExperience extends Experience {
  constructor(soundworks, clientTypes) {
    super(soundworks, clientTypes);
  }

  start() {}

  enter(client) {}

  exit(client) {}
}

export default InstructionViewerExperience;
