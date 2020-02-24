import '@babel/polyfill';
import '@wessberg/pointer-events';
import { Client } from '@soundworks/core/client';
import AutoPlayControllerExperience from './AutoPlayControllerExperience';
import initQoS from '../utils/qos';

const config = window.soundworksConfig;

async function init($container, index) {
  try {
    const client = new Client();

    // -------------------------------------------------------------------
    // register services
    // -------------------------------------------------------------------

    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------

    await client.init(config);
    initQoS(client);

    const $container = document.querySelector('#container');
    const experience = new AutoPlayControllerExperience(client, config, $container);
    // store platform service to be able to call all `onUserGesture` at once
    if (experience.platform) {
      platformServices.add(experience.platform);
    }
    // remove loader and init default views for the services
    document.body.classList.remove('loading');

    await client.start();
    experience.start();
  } catch(err) {
    console.error(err);
  }
}

window.addEventListener('load', init);
