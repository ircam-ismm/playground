import 'regenerator-runtime/runtime';
import { Client } from '@soundworks/core/client.js';
import initQoS from '@soundworks/template-helpers/client/init-qos.js';

import InstructionsViewerExperience from './InstructionsViewerExperience.js';

const config = window.soundworksConfig;

(async function launch() {
  try {
    const client = new Client();

    // -------------------------------------------------------------------
    // register plugins
    // -------------------------------------------------------------------

    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------

    await client.init(config);
    initQoS(client);

    const $container = document.querySelector('#__soundworks-container');
    const experience = new InstructionsViewerExperience(client, config, $container);

    document.body.classList.remove('loading');
    // start everything
    await client.start();
    experience.start();

    return Promise.resolve();
  } catch(err) {
    console.error(err);
  }
}());

