import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import '../views/elements/sw-dot-map.js';
import '../views/elements/sw-slider-enhanced.js';
import '../views/elements/sw-button.js';
import '../views/controller-components/fp-header.js';
import '../views/controller-components/fp-loading-players';
import throttle from 'lodash.throttle';

class MainControllerExperience extends Experience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    this.playerStates = new Map();
  }

  async start() {
    this.localState = {
      soundBankValues: {},
      // soundBankDefaultPresets: null,
      // soundFileDefaultPresets: null,
    };

    this.eventListeners = {

    };

    this.globalsState = await this.client.stateManager.attach('globals');
    this.globalsState.subscribe(updates => this.renderApp());

    this.client.stateManager.observe(async (schemaName, stateId, nodeId) => {
      if (schemaName === 'player') {
        const state = await this.client.stateManager.attach(schemaName, stateId);

        state.onDetach(() => {
          this.playerStates.delete(nodeId);
          this.renderApp();
        });

        this.playerStates.set(nodeId, state);
        this.renderApp();
      }
    });

    window.addEventListener('resize', () => this.renderApp());

    this.renderApp();

    super.start();
  }

  renderApp() {
    const playerStates = Array.from(this.playerStates.values()).map(s => s.getValues());
    const globalsState = this.globalsState.getValues();
    const globalsSchema = this.globalsState.getSchema();

    render(
      html`
        <section style="padding: 10px">
          <h1
            style="
              font-size: 20px;
              margin: 20px 0;
            "
          >#players: ${playerStates.length}</h1>

          <sw-slider-enhanced
            width="500"
            label="master"
            min="-80"
            max="6"
            step="1"
            .value="${globalsState.masterVolume}"
            @change="${e => this.globalsState.set({ masterVolume: e.detail.value })}"
          ></sw-slider-enhanced>

          <p
            style="
              font-size: 13px;
              margin: 20px 0;
            "
          >current instructions state: ${globalsState.instructionsState}</p>
          ${['welcome', 'instructions', 'none', 'thanks'].map(value => {
            return html`
              <sw-button
                text="${value}"
                value="${value}"
                @click=${e => this.globalsState.set({ instructionsState: value })}
              ></sw-button>
            `;
          })}
        </section>
        `
      , this.$container
    );
  }
}

export default MainControllerExperience;
