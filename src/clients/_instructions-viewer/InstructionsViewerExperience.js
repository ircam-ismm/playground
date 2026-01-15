import { AbstractExperience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import '@ircam/simple-components/sc-dot-map.js';

class InstructionsViewerExperience extends AbstractExperience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    this.playerStates = new Map();

    renderInitializationScreens(client, config, $container);
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
          <sc-dot-map
            style="
              position: absolute;
              top: 0;
              left: 0;
              z-index: 0;
            "
            width="${areaWidth}"
            height="${areaHeight}"
            color="white"
            background-color="#000000"
            x-range="${JSON.stringify(soloistState.xRange)}"
            y-range="${JSON.stringify(soloistState.yRange)}"
            value="${JSON.stringify(positions)}"
          ></sc-dot-map>
           <!-- display pointer feedback -->
          <sc-dot-map
            style="
              position: absolute;
              top: 0;
              left: 0;
              z-index: 1;
            "
            width="${areaWidth}"
            height="${areaHeight}"
            x-range="${JSON.stringify(soloistState.xRange)}"
            y-range="${JSON.stringify(soloistState.yRange)}"
            value="${JSON.stringify(soloistState.triggers)}"
            radius-rel="${soloistState.radius}"
            color="#AA3456"
            opacity="0.2"
            background-opacity="0"
          ></sc-dot-map>
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
            html`<div
              style="
                position: absolute;
                top: 0;
                left: 0;
                width: ${areaWidth}px;
                height: ${areaHeight}px;
                background: url(./images/instructions.png) 50% 50% no-repeat;
                background-size: contain;
              "
            ></div>`: ``}
        </div>
        `
      , this.$container
    );
  }
}

export default InstructionsViewerExperience;
