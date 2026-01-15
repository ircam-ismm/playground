import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { LitElement, html, render, css } from 'lit';

import '@ircam/sc-components/sc-text.js';
import '../lib/gui/al-preset.js';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

class AlSoundBankManager extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .soundbank {
      padding: 10px;
      border-bottom: 1px solid #232332;
      /* display: flex; */
      flex-grow: 1;
    }

    .soundbank h1 {
      height: 30px;
      line-height: 30px;
      font-size: 15px;
    }

    .soundbank ul {
      font-size: 10px;
      padding-left: 17px;
      color: #ababab;
      font-style: italic;
      margin-bottom: 10px;
    }

    .soundbank .soundbank-preset {
      margin-bottom: 10px;
      position: relative;
      height: 30px;
    }

    .soundbank .file-preset {
      margin-bottom: 2px;
      position: relative;
    }
  `;

  render() {
    const soundBanks = this.soundbank.getUnsafe('soundBanks');

    return html`
      ${Object.keys(soundBanks).sort().map(soundBankName => {
        const soundBankValues = soundBanks[soundBankName];

        return html`
          <section class="soundbank ${soundBankName}">
            <h1>> ${soundBankName}</h1>

            <ul>
              <li>url: ${soundBankValues.url}</li>
              <li>path: ${soundBankValues.path}</li>
            </ul>

            <div class="soundbank-preset">
              ${Object.keys(soundBankValues.presets).sort().map(presetKey => {
                return html`
                  <al-preset
                    align-overlay="left"
                    target-type="soundbank"
                    label="${presetKey}"
                    .state=${this.soundbank}
                    soundbank=${soundBankName}
                    presetKey=${presetKey}
                  ></al-preset>
                `;
              })}
            </div>

            <div>
              ${Object.keys(soundBankValues.files).sort().map(filename => {
                return html`
                  <div class="file-preset">
                    <sc-text>${filename}</sc-text>

                    ${Object.keys(soundBankValues.files[filename].presets).map((presetKey) => {
                      return html`
                        <al-preset
                          align-overlay="left"
                          label=${presetKey}
                          .state=${this.soundbank}
                          soundbank=${soundBankName}
                          filename=${filename}
                          presetKey=${presetKey}
                        ></al-preset>
                      `;
                    })}
                  </div>
                `
              })}
            </div>
          </section>
        `;
      })}
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = this.soundbank.onUpdate(() => this.requestUpdate());
  }

  disconnectedCallback() {
    this.unsubscribe();
    super.disconnectedCallback();
  }
}

if (!customElements.get('al-soundbank-manager')) {
  customElements.define('al-soundbank-manager', AlSoundBankManager);
}

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  // Eventually register plugins
  // client.pluginManager.register('my-plugin', plugin);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await client.start();

  const soundbank = await client.stateManager.attach('soundbank');

  function renderApp() {
    render(html`
      <div class="controller-layout">
        <header>
          <h1>${client.config.app.name} | ${client.role}</h1>
          <sw-audit .client="${client}"></sw-audit>
        </header>
        <section>
          <al-soundbank-manager .soundbank=${soundbank}></al-soundbank-manager>
        </section>
      </div>
    `, $container);
  }

  renderApp();
}

// The launcher allows to launch multiple clients in the same browser window
// e.g. `http://127.0.0.1:8000?emulate=10` to run 10 clients side-by-side
launcher.execute(main, {
  numClients: parseInt(new URLSearchParams(window.location.search).get('emulate') || '') || 1,
});
