import { Experience, client} from 'soundworks/client';
import ControllerView from './ControllerView';

class ControllerExperience extends Experience {
  constructor() {
    super();

    this.platform = this.require('platform', { features: ['wake-lock'] });
  }

  start() {
    super.start();

    this.view = new ControllerView(this, { id: 'controller' });

    this.receive('update-store', store => {
      this.view.model.store = store;
      this.view.render();
    });

    this.show();
  }
}

export default ControllerExperience;
