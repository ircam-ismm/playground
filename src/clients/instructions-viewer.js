import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { LitElement, html, render, css, nothing } from 'lit';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

import '@ircam/sc-components/sc-dots.js';
import '@ircam/sc-components/sc-fullscreen.js';
import '@ircam/sc-components/sc-qrcode.js';

class AlInstructionsViewer extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-grow: 1;
    }

    sc-fullscreen {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 20;
      opacity: 0.3;
    }

    .welcome, .end {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      justify-content: center;
      align-content: space-around;
    }

    .welcome h1, .end h1 {
      text-align: center;
      font-size: 4rem;
    }

    .welcome h2, .end h2 {
      text-align: center;
      font-style: italic;
      font-size: 3rem;
      opacity: 0.6;
    }

    .welcome h2 {
      text-align: center;
    }

    .instructions {
      display: flex;
      flex-direction: row;
      flex-grow: 1;
    }

    .instructions h1 {
      font-size: 2.6rem;
    }

    .instructions li {
      font-size: 2rem;
      padding: 10px 0;
    }

    .instructions p {
      font-size: 1.8rem;
      text-indent: 12px;
      font-style: italic;
    }

    .instructions .background {
      position: absolute;
      width: 100%;
      height: 100%;
      background: none;
    }

    .instructions .background-overlay {
      position: absolute;
      width: 100%;
      height: 100%;
      background: #000000;
      opacity: 0.7;
    }

    .instructions .wifi {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      justify-content: space-between;
      z-index: 1;
      padding: 50px 20px;
      border-right: 1px dashed rgba(255, 255, 255, 0.2);
    }

    .instructions .website {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      justify-content: space-between;
      z-index: 1;
      padding: 50px 20px;
    }

    .instructions header {
      display: flex;
      height: 50%;
      flex-direction: column;
    }

    .instructions sc-qrcode {
      flex-grow: 1;
      width: 100%;
      background: none;
    }
  `;

  constructor() {
    super();

    this.global = null;
    this.renderers = null;
  }

  render() {
    const config = this.global.getUnsafe('projectConfig');
    const state = this.global.get('state');
    let content;

    switch (state) {
      case 'welcome': {
        content = html`
          <div class="welcome">
            <h1>${config.name}</h1>
            <h2>${config.author}</h2>
          </div>
        `;
        break;
      }
      case 'instructions': {
        const positions = this.renderers.getUnsafe('position');
        const colors = this.renderers.getUnsafe('clientColor');
        const dots = positions.map((pos, index) => ({ ...pos, color: colors[index]}));

        content = html`
          <div class="instructions">
            <sc-dots class="background" .value=${dots}></sc-dots>
            <div class="background-overlay"></div>

            <div class="wifi">
              <header>
                <h1>1. Join <b>${config.instructionsSSID}</b> WiFi network</h1>
                <sc-qrcode value=${`WIFI:S:${config.instructionsSSID};H:true;T:WPA;P:${config.instructionsPassword}`}></sc-qrcode>
              </header>

              <ol>
                <li>Put your phone on airplane mode</li>
                <li>Turn on WIFI</li>
                <li>Open camera mode</li>
                <li>Scan QR code on left</li>
                <li>Check that you are now on the WIFI <b>${config.instructionsSSID}</b></li>
                <li>If it says no internet its OK (we don't need internet.).</li>
              </ol>

              <div class="raw-infos">
                <p>SSID: <b>${config.instructionsSSID}</b></p>
                <p>password: <b>${config.instructionsPassword}</b></p>
              </div>
            </div>
            <div class="website">
              <header>
                <h1>2. Connect to <i>${config.name}</i></h1>
                <sc-qrcode value=${config.instructionsHostname}></sc-qrcode>
              </header>

              <ol>
                <li>Open a web browser</li>
                <li>Type <i>${config.instructionsHostname}</i> + Enter</li>
                <li>Click to Start</li>
                <li>Click on your screen to select your location in the audience</li>
                <li>Click OK</li>
                <li>Turn up your volume</li>
              </ol>

            </div>
          </div>
        `;
        break;
      }
      case 'start': {
        content = nothing;
        break;
      }
      case 'end': {
        content = html`
          <div class="end">
            <h2>${config.thanksMessage}</h2>
          </div>
        `;
        break;
      }
    }

    return [html`<sc-fullscreen></sc-fullscreen>`, content];
  }

  connectedCallback() {
    super.connectedCallback();

    this.unsubscribeGlobal = this.global.onUpdate(() => this.requestUpdate());
    this.unsubscribeRenderers = this.renderers.onChange(() => this.requestUpdate());
  }

  disconnectedCallback() {
    this.unsubscribeGlobal();
    this.unsubscribeRenderers();

    super.disconnectedCallback();
  }
}

customElements.define('al-instructions-viewer', AlInstructionsViewer);

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);
  console.log(client.config);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, { initScreensContainer: $container });

  await client.start();

  const global = await client.stateManager.attach('global');
  const renderers = await client.stateManager.getCollection('soloist:renderer', ['position', 'clientColor']);

  function renderApp() {
    render(html`
      <div class="simple-layout">
        <al-instructions-viewer
          .global=${global}
          .renderers=${renderers}
        ></al-instructions-viewer>
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
