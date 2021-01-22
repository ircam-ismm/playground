import { AbstractExperience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import '@ircam/simple-components/sc-slider.js';
import '@ircam/simple-components/sc-toggle.js';
import '@ircam/simple-components/sc-text.js';

import { btn, btnActive } from '../views/defaultStyles.js';

class ControllerExperience extends AbstractExperience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;
    this.rafId = null;

    this.players = new Map();

    renderInitializationScreens(client, config, $container);
  }

  async start() {
    super.start();

    this.listeners = {
      updateGlobals: updates => {
        this.globals.set(updates);
      },
    };

    this.globals = await this.client.stateManager.attach('globals');
    this.globals.subscribe(updates => this.render());

    window.addEventListener('resize', () => this.render());
    this.render();
  }

  render() {
    // debounce with requestAnimationFrame
    window.cancelAnimationFrame(this.rafId);

    this.rafId = window.requestAnimationFrame(() => {
      const data = {
        globals: this.globals,
        globalsSchema: this.globals.getSchema(),
      };

      const listeners = this.listeners;

      const template = html`
        <section style="padding: 10px">
          <div>
            <h1>"${data.globals.get('projectName')}" by <i>${data.globals.get('projectAuthor')}</i></h1>
            <p>(directory: ${data.globals.get('projectId')})</p>
            <h2 style="margin: 20px 0;">
              # players: ${data.globals.get('numConnectedPlayers')}
            </h2>
          </div>

          <div>
            <div style="margin-bottom: 4px">
              <sc-text
                value="master"
                readonly
              ></sc-text>
              <sc-slider
                width="400"
                display-number
                min="${data.globalsSchema.master.min}"
                max="${data.globalsSchema.master.max}"
                step="${data.globalsSchema.master.type === 'integer' ? 1 : 0.001}"
                value="${data.globals.get('master')}"
                @input="${e => listeners.updateGlobals({ master: e.detail.value })}"
              ></sc-slider>
            </div>
            <div style="margin-bottom: 4px">
              <sc-text
                value="mute"
                readonly
              ></sc-text>
              <sc-toggle
                value="${data.globals.get('mute')}"
                @change="${e => listeners.updateGlobals({ mute: e.detail.value })}"
              ></sc-toggle>
            </div>
            <div style="margin-bottom: 4px">
              <sc-text
                value="cutoffFrequency"
                readonly
              ></sc-text>
              <sc-slider
                width="400"
                display-number
                min="${data.globalsSchema.cutoffFrequency.min}"
                max="${data.globalsSchema.cutoffFrequency.max}"
                step="${data.globalsSchema.cutoffFrequency.type === 'integer' ? 1 : 0.001}"
                value="${data.globals.get('cutoffFrequency')}"
                @input="${e => listeners.updateGlobals({ cutoffFrequency: e.detail.value })}"
              ></sc-slider>
            </div>

          </div>

          <div>
            <p
              style="
                font-size: 13px;
                margin: 20px 0;
              "
            >> select application state:</p>

            ${['welcome', 'instructions', 'none', 'thanks'].map(value => {
              return html`
                <button
                  style="
                    ${btn}
                    ${data.globals.get('instructionsState') === value ? btnActive : ''}
                    width: 300px;
                    display: block;
                    margin-bottom: 4px;
                  "
                  @click=${e => listeners.updateGlobals({ instructionsState: value })}
                >${value}</button>
              `;
            })}
          </div>

          <div>
            <p
              style="
                font-size: 13px;
                margin: 20px 0;
              "
            >> open controllers:</p>
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
                  value="${name}"
                  width="300"
                  style="display: block; margin-bottom: 4px;"
                  @release="${e => window.open(`./${name}`, name, 'width=1000,height=700')}"
                ></sc-button>
              `;
            })}
          </div>
        </section>
      `;

      render(template, this.$container);
    });
  }
}

export default ControllerExperience;
