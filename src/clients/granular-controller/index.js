import '@babel/polyfill';
import '@wessberg/pointer-events';
import { Client } from '@soundworks/core/client';
import GranularControllerExperience from './GranularControllerExperience';
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
    const experience = new GranularControllerExperience(client, config, $container);

    document.body.classList.remove('loading');

    await client.start();
    experience.start();

  } catch(err) {
    console.error(err);
  }
}

window.addEventListener('load', init);
