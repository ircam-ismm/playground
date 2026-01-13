import { LitElement, html, css, nothing } from 'lit';

import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-toggle.js';
import '@ircam/sc-components/sc-dots.js';

import '../../../lib/gui/al-controller.js';

class AlAutoplayController extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: row;
      flex-grow: 1;
    }

    div[slot="controls"] {
      display: flex;
      flex-direction: column;
    }

    div[slot="controls"] > div {
      display: flex;
      flex-direction: row;
    }

    div[slot="controls"] sc-text {
      width: 120px;
    }

    div[slot="main"] {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
      position: relative;
    }

    div[slot="main"] sc-dots {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
    }

    div[slot="main"] sc-dots.dots {
      z-index: 1;
      background: none;
      --sc-dots-area-background-color: #121212;
    }

    div[slot="main"] sc-dots.pointers {
      z-index: 2;
      background: none;
      --sc-dots-color: #AA3456;
      --sc-dots-opacity: 0.3;
    }
  `;

  constructor() {
    super();

    this.module = null;

    this.unsubscribeGlobal = null;
    this.unsubscribeRenderers = null;
  }

  render() {
    return html`
      <al-controller .module=${this.module}>
        <div slot="controls">
          <div>
            <sc-text>volume</sc-text>
            <sc-slider
              number-box
              value="${this.module.global.get('volume')}"
              min=${this.module.global.getDescription('volume').min}
              max=${this.module.global.getDescription('volume').max}
              @input=${e => this.module.global.set('volume', e.detail.value )}
            ></sc-slider>
          </div>
          <div style="margin-top: 4px">
            <sc-text>radius</sc-text>
            <sc-slider
              number-box
              value="${this.module.global.get('radius')}"
              min=${this.module.global.getDescription('radius').min}
              max=${this.module.global.getDescription('radius').max}
              @input=${e => this.module.global.set('radius', e.detail.value )}
            ></sc-slider>
          </div>
          <div style="margin-top: 4px">
            <sc-text>fadeout time</sc-text>
            <sc-slider
              number-box
              value="${this.module.global.get('globalFadeOutDuration')}"
              min=${this.module.global.getDescription('globalFadeOutDuration').min}
              max=${this.module.global.getDescription('globalFadeOutDuration').max}
              @input=${e => this.module.global.set('globalFadeOutDuration', e.detail.value )}
            ></sc-slider>
            <sc-toggle
              ?active=${this.module.global.get('globalFadeOutDurationActive')}
              @change=${e => this.module.global.set('globalFadeOutDurationActive', e.detail.value)}
            ></sc-toggle>
          </div>
          <div style="margin-top: 4px">
            <sc-text
              value="rotate map"
              width="100"
              readonly
            ></sc-text>
            <sc-toggle
              ?active=${this.module.global.get('rotateMap')}
              @change=${e => this.module.global.set('rotateMap', e.detail.value)}
            ></sc-toggle>
          </div>
        </div>
        <div slot="main">
          <!-- display map of players -->
          <sc-dots
            class="dots"
            style="z-index: 0;"
            color="white"
            .value=${this.module.global.get('rotateMap')
              ? this.module.renderers.getUnsafe('positionInverse')
              : this.module.renderers.getUnsafe('position')}
          ></sc-dots>
          <!-- display pointer feedback (define if we keep it or not...) -->
          <!-- <sc-dots
            .value=${this.module.global.get('triggers')}
            radius-relative=${this.module.global.get('radius')}
          ></sc-dots> -->
          <!-- pointer input -->
          <sc-dots
            class="pointers"
            .value=${this.module.global.getUnsafe('triggers')}
            radius-relative=${this.module.global.get('radius')}
            capture-events
            @input=${e => {
              this.module.global.set('triggers', e.detail.value)
            }}
          ></sc-dots>
        </div>
      </al-controller>
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    this.unsubscribeGlobal = this.module.global.onUpdate(() => this.requestUpdate());
    this.unsubscribeRenderers = this.module.renderers.onChange(() => this.requestUpdate());
  }

  disconnectedCallback() {
    this.unsubscribeGlobal();
    this.unsubscribeRenderers();

    super.disconnectedCallback();
  }
}

if (!customElements.get('al-soloist-controller')) {
  customElements.define('al-soloist-controller', AlAutoplayController);
}
