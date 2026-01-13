import { LitElement, html, css, nothing } from 'lit';

import '@ircam/sc-components/sc-icon.js';
import '@ircam/sc-components/sc-fullscreen.js';

import './al-soundbank-select.js';
import './al-loading.js';

class AlController extends LitElement {
  static get properties() {
    return {
      controlsExpanded: {
        type: Boolean,
      },
    }
  }

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
    }

    header al-soundbank-select {
      flex-grow: 1;
    }

    header .controls-wrapper {
      position: relative;
      width: 120px;
      display: flex;
    }

    header .controls-wrapper sc-icon, .controls-wrapper sc-fullscreen {
      height: 100%;
      flex-grow: 1;
    }

    header .controls-wrapper slot[name="controls"] {
      position: absolute;
      right: 0;
      top: 100%;
      z-index: 100;
      display: flex;
      padding: 4px;
      background-color: var(--sc-color-primary-3);
    }

    section {
      width: 100vw;
      display: flex;
      flex-direction: row;
      flex-grow: 1;
      overflow: hidden;
    }

    section slot[name="main"] {
      display: flex;
      flex-grow: 1;
    }

    section .al-loading {
      width: 120px;
    }
  `;

  constructor() {
    super();

    this.controlsExpanded = false;
  }

  render() {
    return html`
      <header>
        <al-soundbank-select .controller=${this.module.global}></al-soundbank-select>
        <div class="controls-wrapper">
          <sc-icon
            type="slider"
            ?active=${this.controlsExpanded}
            @input=${e => this.controlsExpanded = !this.controlsExpanded}
          ></sc-icon>
          <sc-fullscreen .element=${this}></sc-fullscreen>
          ${this.controlsExpanded
            ? html`<slot name="controls"></slot>`
            : nothing
          }
        </div>
      </header>
      <section>
        <slot name="main"></slot>
        <al-loading .renderers=${this.module.renderers}></al-loading>
      </section>
    `
  }
}

if (!customElements.get('al-controller')) {
  customElements.define('al-controller', AlController);
}
