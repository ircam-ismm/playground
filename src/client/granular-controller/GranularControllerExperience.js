import { Experience } from 'soundworks/client';
import GranularControllerView from './GranularControllerView';

class GranularControllerExperience extends Experience {
  constructor(options) {
    super(options);

    this.platform = this.require('platform', { features: ['wake-lock'] });
  }

  start() {
    super.start();

    this.view = new GranularControllerView(this, { id: 'controller' });

    this.receive('update-store', store => {
      this.view.model.store = store;
      this.view.render();
    });

    this.show();
  }
}

export default GranularControllerExperience;
