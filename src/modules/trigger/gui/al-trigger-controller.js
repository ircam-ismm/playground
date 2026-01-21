import { LitElement, html, css, nothing } from 'lit';
import { repeat } from 'lit-html/directives/repeat.js';

import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-text.js';

import '../../../lib/gui/al-controller.js';
import '../../../lib/gui/al-preset.js';

class AlTriggerController extends LitElement {
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
      padding: 10px;
      box-sizing: border-box;
      overflow: auto;
    }

    div[slot="main"] .trigger-all {
      height: 64px;
      min-height: 64px;
      margin-top: 4px;
      display: block;
      width: auto;
      font-size: 1.6rem;
      position: sticky;
      top: 0;
      z-index: 2;
      --sc-button-background-color: rgb(220, 53, 69);
    }

    div[slot="main"] .soundfile {
      margin-top: 10px;
      position: relative;
    }

    div[slot="main"] h2 {
      margin-top: 0;
    }

    div[slot="main"] .soundfile al-preset {
      position: absolute;
      top: 0;
      right: 0;
    }

    div[slot="main"] .soundfile .pad {
      margin: 4px;
      border: none;
    }
  `;

  constructor() {
    super();

    this.module = null;
    this.unsubscribeGlobal = null;
    this.unsubscribeRenderers = null;
  }

  render() {
    const currentSoundBank = this.module.global.get('currentSoundBank');
    const presetKey = this.module.global.get('presetKey');

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
          <div>
            <sc-text>threshold</sc-text>
            <sc-slider
              number-box
              min=${this.module.global.getDescription('triggerAllFilterThreshold').min}
              max=${this.module.global.getDescription('triggerAllFilterThreshold').max}
              value="${this.module.global.get('triggerAllFilterThreshold')}"
              @input="${e => this.module.global.set('triggerAllFilterThreshold', e.detail.value)}"
            ></sc-slider>
          </div>
          <div>
            <sc-text>pad size</sc-text>
            <sc-slider
              number-box
              min=${this.module.global.getDescription('padSize').min}
              max=${this.module.global.getDescription('padSize').max}
              step="1"
              value="${this.module.global.get('padSize')}"
              @input="${e => this.module.global.set('padSize', e.detail.value)}"
            ></sc-slider>
          </div>
        </div>
        <div slot="main">
          ${currentSoundBank ?
            html`
              <sc-button
                class="trigger-all"
                @release=${e => {
                  const triggerAllFilterThreshold = this.module.global.get('triggerAllFilterThreshold');
                  const filteredRenderers = this.module.renderers.filter(r => Math.random() <= triggerAllFilterThreshold);
                  filteredRenderers.forEach(renderer => renderer.set('trigger', true));
                }}
              >trigger all</sc-button>

              ${Object.keys(this.module.soundbank.getUnsafe('soundBanks')[currentSoundBank].files).map(filename => {
                return html`
                  <div class="soundfile">
                    <header>
                      <h2 style="height: 30px; line-height: 30px; font-size: 14px;">
                        > ${filename}
                      </h2>
                      <al-preset
                        width="500"
                        .state=${this.module.soundbank}
                        soundbank=${currentSoundBank}
                        filename=${filename}
                        presetKey=${presetKey}
                      ></al-preset>
                    </header>
                    <div class="pads">
                      ${repeat(
                        this.module.renderers.filter(renderer => !renderer.get('loading') && renderer.get('filename') === filename),
                        renderer => renderer.get('clientIndex'),
                        renderer => {
                          return html`
                            <sc-button
                              class="pad"
                              style="
                                --sc-button-background-color: ${renderer.get('clientColor')};
                                width: ${this.module.global.get('padSize')}px;
                                height: ${this.module.global.get('padSize')}px;
                                line-height: ${this.module.global.get('padSize')}px;
                              "
                              @input=${e => renderer.set('trigger', true)}
                            >${renderer.get('clientIndex')}</sc-button>
                          `;
                        },
                      )}
                    </div>
                  </div>
                `
              })}
              `
            : nothing}
        </div>
      </al-controller>
    `
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

if (!customElements.get('al-trigger-controller')) {
  customElements.define('al-trigger-controller', AlTriggerController);
}
