import { LitElement, html, css, nothing } from 'lit';

import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-toggle.js';
import '@ircam/sc-components/sc-dots.js';

import '../../../lib/views/playground-header.js';
import '../../../lib/views/playground-loading-players.js';
import '../../../lib/views/playground-preset.js';
import { btn, btnActive } from '../../../lib/views/defaultStyles.js';

class AlAutoplayController extends LitElement {
  static styles = css`
    .wrapper {
      width: 100vw;
      height: calc(100wh - 100px);
      display: flex;
      flex-direction: row;
    }

    .wrapper section {
      position: relative;
      flex-grow: 1;
      box-sizing: border-box;
      padding: 0 0 10px 10px;
    }

    .controls {
      position: absolute;
      top: 6px;
      right: 10px;
      z-index: 10;
    }

    .map {
      position: relative;
      height: 100%;
    }

    .map sc-dots {
      position: absolute;
      top: 0;
      left: 0;
      height: 100%;
      width: 100%;
    }

    .map sc-dots:nth-child(1) {
      z-index: 1;
      background: none;
    }

    .map sc-dots:nth-child(2) {
      z-index: 2;
      background: none;
      --sc-dots-color: #AA3456;
      --sc-dots-opacity: 0.2;
    }

    /* .map sc-dots:nth-child(3) {
      z-index: 3;
      background: none;
      --sc-dots-color: #AA3456;
      --sc-dots-opacity: 0.2;
    } */
  `;

  constructor() {
    super();

    this.module = null;

    this.unsubscribeGlobal = null;
    this.unsubscribeRenderers = null;
  }

  render() {
    return html`
      <playground-header .controller=${this.module.global}></playground-header>
      <div class="wrapper">
        <section>
          <!-- controls -->
          <div class="controls">
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

          <div class="map">
            <!-- display map of players -->
            <sc-dots
              style="z-index: 0;"
              color="white"
              .value=${this.module.renderers.getUnsafe('position')}
            ></sc-dots>
            <!-- display pointer feedback (define if we keep it or not...) -->
            <!-- <sc-dots
              .value=${this.module.global.get('triggers')}
              radius-relative=${this.module.global.get('radius')}
            ></sc-dots> -->
            <!-- pointer input -->
            <sc-dots
              .value=${this.module.global.get('triggers')}
              radius-relative=${this.module.global.get('radius')}
              capture-events
              @input=${e => {
                console.log(e.detail.value);
                this.module.global.set('triggers', e.detail.value)
              }}
            ></sc-dots>
          </div>

        </section>
        <playground-loading-players .renderers=${this.module.renderers}></playground-loading-players>
      </div>

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

  #toggleSynth = (e) => {
    e.preventDefault();
    const enabled = !this.module.global.get('enabled');
    this.module.global.set('enabled', enabled);
  }
}

if (!customElements.get('al-soloist-controller')) {
  customElements.define('al-soloist-controller', AlAutoplayController);
}
