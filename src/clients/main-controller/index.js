import '@babel/polyfill';
import "@wessberg/pointer-events";
import { Client } from '@soundworks/core/client';
import MainControllerExperience from './MainControllerExperience';
import initQoS from '../utils/qos';

const config = window.soundworksConfig;

async function init() {
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
    const experience = new MainControllerExperience(client, config, $container);

    document.body.classList.remove('loading');
    // start everything
    await client.start();
    experience.start();

  } catch(err) {
    console.error(err);
  }
}

window.addEventListener('load', init);
