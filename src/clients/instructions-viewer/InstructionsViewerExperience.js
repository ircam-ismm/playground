import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import '../views/elements/sw-dot-map.js';
import '../views/elements/sw-slider-enhanced.js';
import '../views/controller-components/fp-header.js';
import '../views/controller-components/fp-loading-players';
import throttle from 'lodash.throttle';

class InstructionsViewerExperience extends Experience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    this.playerStates = new Map();
  }

  async start() {
    this.eventListeners = {};

    this.globalsState = await this.client.stateManager.attach('globals');
    this.globalsState.subscribe(updates => this.renderApp());

    this.soloistState = await this.client.stateManager.attach('soloist-controller');
    this.soloistState.subscribe(updates => this.renderApp());

    this.client.stateManager.observe(async (schemaName, stateId, nodeId) => {
      if (schemaName === 'player') {
        const state = await this.client.stateManager.attach(schemaName, stateId);

        state.subscribe(updates => this.renderApp());

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
    const soloistState = this.soloistState.getValues();
    const playerStates = Array.from(this.playerStates.values()).map(s => s.getValues());

    const positions = playerStates.filter(p => p.position !== null).map(p => p.position);

    const { width, height } = this.$container.getBoundingClientRect();
    const areaHeight = height;
    const areaWidth = width;

    const instructionsState = this.globalsState.get('instructionsState');

    render(
      html`
        <div style="position: relative; float: left;">
          <sw-dot-map
            class="players"
            width="${areaWidth}"
            height="${areaHeight}"
            x-range="${JSON.stringify(soloistState.xRange)}"
            y-range="${JSON.stringify(soloistState.yRange)}"
            dots-color="#ffffff"
            background-color="#000000"
            dots="${JSON.stringify(positions)}"
          ></sw-dot-map>
          <sw-dot-map
            class="feedback"
            style="position: absolute; top: 0; left: 0; z-index: 1"
            width="${areaWidth}"
            height="${areaHeight}"
            x-range="${JSON.stringify(soloistState.xRange)}"
            y-range="${JSON.stringify(soloistState.yRange)}"
            dots-color="#aa3456"
            dots-radius-rel="${soloistState.radius}"
            dots-opacity="0.2"
            background-opacity="0"
            dots="${JSON.stringify(soloistState.triggers)}"
          ></sw-dot-map>
        </div>
        <div
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: ${areaWidth}px;
            height: ${areaHeight}px;
            background-color: rgba(0, 0, 0, 0.6);
          "
        >
          ${instructionsState === 'welcome' ?
            html`<div
              style="
                position: absolute;
                top: 0;
                left: 0;
                width: ${areaWidth}px;
                height: ${areaHeight}px;
                background: url(./images/welcome.png) 50% 50% no-repeat;
                background-size: contain;
              "
            ></div>`: ``}

          ${instructionsState === 'instructions' ?
            html`<h1
              style="
                width: ${areaWidth}px;
                position: absolute;
                top: ${areaHeight / 2 - 60}px;
                font-size: 40px;
                text-align: center;
              "
            >
              WiFi: CoSiMa<br>
              url: http://apps.cosima.ircam.fr
            </h1>`: ``}
        </div>
        `
      , this.$container
    );
  }
}

export default InstructionsViewerExperience;
