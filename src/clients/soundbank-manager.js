import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { html, render } from 'lit';

import '../lib/gui/al-preset.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  // Eventually register plugins
  // client.pluginManager.register('my-plugin', plugin);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await client.start();

  const soundbank = await client.stateManager.attach('soundbank');
  soundbank.onUpdate(renderApp, true);

  function renderApp() {
    const soundBanks = soundbank.getUnsafe('soundBanks');
    const soundBankDefaultPresets = soundbank.getUnsafe('soundBankDefaultPresets');
    const soundFileDefaultPresets = soundbank.getUnsafe('soundFileDefaultPresets');



    render(html`
      <div class="controller-layout">
        <header>
          <h1>${client.config.app.name} | ${client.role}</h1>
          <sw-audit .client="${client}"></sw-audit>
        </header>
        <section>
          ${Object.keys(soundBanks).sort().map(soundBankName => {
            const soundBankValues = soundBanks[soundBankName];

            return html`
              <section class="soundbank ${soundBankName}"
                style="padding: 10px; border-bottom: 1px solid #232332;">

                <h1 style="
                  height: 30px;
                  line-height: 30px;
                  font-size: 15px;
                ">> ${soundBankName}</h1>

                <ul
                  style="
                    font-size: 10px;
                    padding-left: 17px;
                    color: #ababab;
                    font-style: italic;
                    margin-bottom: 10px;
                  ">
                  <li>url: ${soundBankValues.url}</li>
                  <li>path: ${soundBankValues.path}</li>
                </ul>

                <div style="
                  margin-bottom: 10px;
                  position: relative;
                  height: 30px;
                ">
                  ${Object.keys(soundBankValues.presets).sort().map(presetKey => {
                    return html`
                      <al-preset
                        label="preset ${presetKey}"
                        .state=${soundbank}
                        soundbank=${soundBankName}
                        presetKey=${presetKey}
                      >
                      </al-preset>
                    `;
                  })}
                </div>

                <div>
                  ${Object.keys(soundBankValues.files).sort().map(filename => {
                    return html`
                      <div style="
                        margin-bottom: 2px;
                        position: relative;
                      ">
                        <p style="
                          width: 300px;
                          font-size: 12px;
                          overflow: hidden;
                          height: 30px;
                          line-height: 30px;
                          display: inline-block;
                        ">${filename}</p>

                        ${Object.keys(soundBankValues.files[filename].presets).map((presetKey) => {
                          return html`<al-preset
                            label=${presetKey}
                            .state=${soundbank}
                            soundbank=${soundBankName}
                            filename=${filename}
                            presetKey=${presetKey}
                          >
                          </al-preset>`;
                        })}
                      </div>
                    `
                  })}
                </div>
              </section>
            `;
          })}
        </section>
      </div>
    `, $container);
  }
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
});
