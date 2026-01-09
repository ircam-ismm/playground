import Module from '../../lib/modules/Module.js';

import './gui/al-soloist-controller.js';

export default class AutoPlayController extends Module {
  constructor(host, name, {
    soundbank
  } = {}) {
    super(host, name);

    this.soundbank = soundbank;
  }

  async start() {
    this.global = await this.host.stateManager.attach(`${this.name}:global`);
    this.renderers = await this.host.stateManager.getCollection(`${this.name}:renderer`, [
      'clientIndex',
      'clientColor',
      'filename',
      'loading',
      'position',
    ]);
  }
}
