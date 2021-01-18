import 'regenerator-runtime/runtime';
import { Client } from '@soundworks/core/client';
import initQoS from '@soundworks/template-helpers/client/init-qos.js';

import AutoPlayControllerExperience from './AutoPlayControllerExperience.js';

const config = window.soundworksConfig;

(async function init($container, index) {
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

    const $container = document.querySelector('#__soundworks-container');
    const experience = new AutoPlayControllerExperience(client, config, $container);

    // remove loader and init default views for the services
    document.body.classList.remove('loading');

    await client.start();
    experience.start();

    return Promise.resolve();
  } catch(err) {
    console.error(err);
  }
}());
