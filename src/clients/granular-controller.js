import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';

import ModuleHost from '../lib/modules/ModuleHost.js';
import GranularController from '../modules/granular/GranularController.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);
  const host = new ModuleHost(client);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, {
    initScreensContainer: $container,
    reloadOnVisibilityChange: false,
  });

  await host.init();

  const app = {
    soundbank: await host.stateManager.attach('soundbank'),
  };

  const controller = new GranularController(host, 'granular', app);

  await host.start();

  function renderApp() {
    render(html`
      <div class="controller-layout">
        <header>
          <h1>${client.config.app.name} | ${client.role}</h1>
          <sw-audit .client="${client}"></sw-audit>
        </header>
        <section>
          <al-granular-controller
            .module=${controller}
          ></al-granular-controller>
        </section>
      </div>
    `, $container);
  }

  renderApp();
}

launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
  width: '50%',
});
