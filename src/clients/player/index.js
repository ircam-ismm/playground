import 'regenerator-runtime/runtime';
import { Client } from '@soundworks/core/client';
import initQoS from '@soundworks/template-helpers/client/init-qos.js';

// import plugins
import pluginPlatformFactory from '@soundworks/plugin-platform/client';
import pluginSyncFactory from '@soundworks/plugin-sync/client';
import pluginFileSystemFactory from '@soundworks/plugin-filesystem/client';
import pluginAudioBufferLoaderFactory from '@soundworks/plugin-audio-buffer-loader/client';
import pluginCheckinFactory from '@soundworks/plugin-checkin/client';
import pluginPositionFactory from '@soundworks/plugin-position/client';
import pluginScriptingFactory from '@soundworks/plugin-scripting/client';

// default views for plugins
import PlayerExperience from './PlayerExperience.js';
import * as audio from 'waves-audio';

const AudioContext = window.AudioContext || window.webkitAudioContext;
const audioContext = new AudioContext;

const config = window.soundworksConfig;
// initalize all clients at once for emulated clients
const experiences = new Set();

let _initQoS = initQoS;

if (window.location.hash === '#debug') {
    // minimalistic, non subtle QoS
  // to be improved little by little...
  _initQoS = function(client, {
    // allow clients to choose which QoS strategy is applied
    visibilityChange = true,
  } = {}) {
    console.log('DEBUG MODE');
    // we don't want to disable this one
    client.socket.addListener('close', () => {
      setTimeout(() => window.location.reload(true), 2000);
    });

    // this is particularly boring with controllers
    if (visibilityChange) {
      let timeoutId = null;

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          // @note - has the tab is in background the timeout will take more
          // time to trigger (e.g. ~1sec on chrome desktop)
          timeoutId = setTimeout(() => {
            window.location.reload(true);
          }, 20);
        } else {
          clearTimeout(timeoutId);
        }
      }, false);
    }
  }
}

async function launch($container, index) {
  try {
    const client = new Client();

    // -------------------------------------------------------------------
    // register plugins
    // -------------------------------------------------------------------

    client.pluginManager.register('platform', pluginPlatformFactory, {
      features: [
        ['web-audio', audioContext],
      ]
    }, []);

    client.pluginManager.register('sync', pluginSyncFactory, {
      getTimeFunction: () => audioContext.currentTime,
    }, ['platform']);

    client.pluginManager.register('checkin', pluginCheckinFactory, {}, []);
    client.pluginManager.register('audio-buffer-loader', pluginAudioBufferLoaderFactory, {}, []);
    client.pluginManager.register('position', pluginPositionFactory, {}, []);
    client.pluginManager.register('scripting', pluginScriptingFactory, {}, []);

    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------
    await client.init(config);
    _initQoS(client);

    const experience = new PlayerExperience(client, config, $container, audioContext, index);
    // store exprience for emulated clients
    experiences.add(experience);

    document.body.classList.remove('loading');

    // start all the things
    await client.start();
    experience.start();

    return Promise.resolve();
  } catch(err) {
    console.error(err);
  }
}

// -------------------------------------------------------------------
// bootstrapping
// -------------------------------------------------------------------
const $container = document.querySelector('#__soundworks-container');
const searchParams = new URLSearchParams(window.location.search);
// enable instanciation of multiple clients in the same page to facilitate
// development and testing (be careful in production...)
const numEmulatedClients = parseInt(searchParams.get('emulate')) || 1;

// special logic for emulated clients (1 click to rule them all)
if (numEmulatedClients > 1) {
  for (let i = 0; i < numEmulatedClients; i++) {
    const $div = document.createElement('div');
    $div.classList.add('emulate');
    $container.appendChild($div);

    launch($div, i);
  }

  const $initPlatformBtn = document.createElement('div');
  $initPlatformBtn.classList.add('init-platform');
  $initPlatformBtn.textContent = 'resume all';

  function initPlatforms(e) {
    experiences.forEach(experience => {
      if (experience.platform) {
        experience.platform.onUserGesture(e)
      }
    });
    $initPlatformBtn.removeEventListener('touchend', initPlatforms);
    $initPlatformBtn.removeEventListener('mouseup', initPlatforms);
    $initPlatformBtn.remove();
  }

  $initPlatformBtn.addEventListener('touchend', initPlatforms);
  $initPlatformBtn.addEventListener('mouseup', initPlatforms);

  $container.appendChild($initPlatformBtn);
} else {
  launch($container, 0);
}
