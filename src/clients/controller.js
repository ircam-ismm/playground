import '@soundworks/helpers/polyfills.js';
import { Client } from '@soundworks/core/client.js';
import { loadConfig, launcher } from '@soundworks/helpers/browser.js';
import { LitElement, html, render, css, nothing } from 'lit';

// - General documentation: https://soundworks.dev/
// - API documentation:     https://soundworks.dev/api
// - Issue Tracker:         https://github.com/collective-soundworks/soundworks/issues
// - Wizard & Tools:        `npx soundworks`

import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-toggle.js';

class AlController extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-grow: 1;
      flex-direction: column;
      padding: 20px;
    }

    section {
      margin-top: 20px;
    }

    sc-button {
      display: block;
      margin-top: 4px;
    }
  `;

  render() {
    return html`
      <header>
        <h1>"${this.global.get('projectName')}"
          ${this.global.get('projectAuthor') ?
            html`by <i>${this.global.get('projectAuthor')}</i>` : nothing}
        </h1>
        <p>(directory: ${this.global.get('projectId')})</p>
      </header>

      <section>
        <div style="margin-bottom: 4px">
          <sc-text>master</sc-text>
          <sc-slider
            number-box
            min=${this.global.getDescription('master').min}
            max=${this.global.getDescription('master').max}
            value=${this.global.get('master')}
            @input=${e => this.global.set('master', e.detail.value)}
          ></sc-slider>
        </div>
        <div style="margin-bottom: 4px">
          <sc-text>mute</sc-text>
          <sc-toggle
            ?active=${this.global.get('mute')}
            @change=${e => this.global.set('mute', e.detail.value)}
          ></sc-toggle>
        </div>
        <div style="margin-bottom: 4px">
          <sc-text>cutoffFrequency</sc-text>
          <sc-slider
            number-box
            min=${this.global.getDescription('cutoffFrequency').min}
            max=${this.global.getDescription('cutoffFrequency').max}
            value=${this.global.get('cutoffFrequency')}
            @input=${e => this.global.set('cutoffFrequency', e.detail.value)}
          ></sc-slider>
        </div>
      </section>

      <section>
        <sc-text>> select application state:</sc-text>
        ${this.global.getDescription('state').list.map(value => {
          return html`
            <sc-button
              ?selected=${this.global.get('state') === value}
              @release=${e => this.global.set('state', value)}
            >${value}</sc-button>
          `;
        })}
      </section>

      <section>
        <sc-text>> open controllers:</sc-text>
        ${[
          'trigger-controller',
          'soloist-controller',
          'granular-controller',
          'autoplay-controller',
          'soundbank-manager',
          'instructions-viewer',
        ].map(name => {
          return html`
            <sc-button
              @release="${e => window.open(`./${name}`, name, 'width=1000,height=700')}"
            >${name}</sc-button>
          `;
        })}
      </section>
    `
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribe = this.global.onUpdate(() => this.requestUpdate());
  }

  disconnectedCallback() {
    this.unsubscribe();
    super.disconnectedCallback();
  }
}

if (!customElements.get('al-controller')) {
  customElements.define('al-controller', AlController);
}

async function main($container) {
  const config = loadConfig();
  const client = new Client(config);

  // cf. https://soundworks.dev/tools/helpers.html#browserlauncher
  launcher.register(client, {
    initScreensContainer: $container,
    reloadOnVisibilityChange: false,
  });

  await client.start();

  const global = await client.stateManager.attach('global');

  function renderApp() {
    render(html`
      <div class="controller-layout">
        <header>
          <h1>${client.config.app.name} | ${client.role}</h1>
          <sw-audit .client="${client}"></sw-audit>
        </header>
        <section>
          <al-controller .global=${global}></al-controller>
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
