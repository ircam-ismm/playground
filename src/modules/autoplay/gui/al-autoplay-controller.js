import { LitElement, html, css, nothing } from 'lit';

import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-text.js';

import '../../../lib/gui/al-controller.js';
import '../../../lib/gui/al-preset.js';

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
      padding: 10px;
      box-sizing: border-box;
    }

    div[slot="main"] .start {
      height: 64px;
      margin-top: 4px;
      display: block;
      width: auto;
      font-size: 1.6rem;
    }
  `;

  constructor() {
    super();

    this.module = null;

    this.unsubscribeGlobal = null;
    this.unsubscribeRenderers = null;
  }

  render() {
    const enabled = this.module.global.get('enabled');
    const currentSoundBank = this.module.global.get('currentSoundBank');
    const presetKey = this.module.global.get('presetKey');

    return html`
      <al-controller .module=${this.module}>
        <div slot="controls">
          <div>
            <sc-text>Volume</sc-text>
            <sc-slider
              number-box
              min=${this.module.global.getDescription('volume').min}
              max=${this.module.global.getDescription('volume').max}
              value=${this.module.global.get('volume')}
              @input=${e => this.module.global.set('volume', e.detail.value)}
            ></sc-slider>
          </div>
        </div>
        <div slot="main">
          <sc-button
            class="start"
            ?selected=${enabled}
            @input=${this.#toggleSynth}
           >${enabled ? 'stop' : 'start'}</sc-button>
          ${currentSoundBank
            ? Object.keys(this.module.soundbank.getUnsafe('soundBanks')[currentSoundBank].files)
                .map((filename) => {
                  const numPlayers = this.module.renderers.filter(state => {
                    return state.get('loading') === false && state.get('filename') === filename;
                  }).length;

                  return html`
                    <div style="position: relative; margin-top: 20px;">
                      <h2 style="height: 30px; line-height: 30px; font-size: 14px;">
                        > ${filename} - (# players: ${numPlayers})
                      </h2>
                      <al-preset
                        style="position: absolute; top: 0; right: 0"
                        width="500"
                        .state=${this.module.soundbank}
                        soundbank=${currentSoundBank}
                        filename=${filename}
                        presetKey=${presetKey}
                      ></al-preset>
                    </div>
                  `;
                })
            : nothing
          }
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

  #toggleSynth = (e) => {
    e.preventDefault();
    const enabled = !this.module.global.get('enabled');
    this.module.global.set('enabled', enabled);
  }
}

if (!customElements.get('al-autoplay-controller')) {
  customElements.define('al-autoplay-controller', AlAutoplayController);
}
