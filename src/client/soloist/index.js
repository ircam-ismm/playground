// import soundworks (client side) and Soundfield experience
import * as soundworks from 'soundworks/client';
import SoloistExperience from './SoloistExperience';
import serviceViews from '../shared/serviceViews';


function bootstrap () {
  // configuration received from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const config = Object.assign({ appContainer: '#container' }, window.soundworksConfig);
  soundworks.client.init(config.clientType, config);

  // register hook that populate service's views
  soundworks.client.setServiceInstanciationHook((id, instance) => {
    if (serviceViews.has(id))
      instance.view = serviceViews.get(id, config);
  });

  // instanciate the experience of the `soloist`
  const soloistExperience = new SoloistExperience();
  // start the application
  soundworks.client.start();
}

window.addEventListener('load', bootstrap);
