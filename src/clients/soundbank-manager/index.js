import '@babel/polyfill';
import '@wessberg/pointer-events';
import { Client } from '@soundworks/core/client';
import SoundBankManagerExperience from './SoundBankManagerExperience';
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
    const soundBankManagerExperience = new SoundBankManagerExperience(client, config, $container);

    document.body.classList.remove('loading');

    await client.start();
    soundBankManagerExperience.start();

  } catch(err) {
    console.error(err);
  }
}

window.addEventListener('load', init);
