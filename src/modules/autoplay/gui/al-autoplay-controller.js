import { LitElement, html, css, nothing } from 'lit';

import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-text.js';

import '../../../lib/views/playground-header.js';
import '../../../lib/views/playground-loading-players.js';
import '../../../lib/views/playground-preset.js';
import { btn, btnActive } from '../../../lib/views/defaultStyles.js';

class AlAutoplayController extends LitElement {
  static styles = css`
    .wrapper {
      width: 100vw;
      /* height: calc(100wh - var(--)) */
      display: flex;
      flex-direction: row;
    }

    section {
      flex-grow: 1;
      box-sizing: border-box;
      padding: 0 0 10px 10px;
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

    const width = window.innerWidth;

    return html`
      <playground-header .controller=${this.module.global}></playground-header>
      <div class="wrapper">
        <section>
          <button
            style="
              ${btn}
              ${enabled ? btnActive : ''}
              margin-top: 20px;
              width: 50%;
            "
            @touchstart="${this.#toggleSynth}"
            @mousedown="${this.#toggleSynth}"
          >${enabled ? 'stop' : 'start'}</button>

          <div style="padding-top:20px;">
            <sc-text>Volume</sc-text>
            <sc-slider
              number-box
              min=${this.module.global.getDescription('volume').min}
              max=${this.module.global.getDescription('volume').max}
              value=${this.module.global.get('volume')}
              @input=${e => this.module.global.set('volume', e.detail.value)}
            ></sc-slider>
          </div>

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
                      <playground-preset
                        style="position: absolute; top: 0; right: 0"
                        label="edit file params"
                        width="500"
                        .state=${this.module.soundbank}
                        soundbank=${currentSoundBank}
                        filename=${filename}
                        presetKey=${presetKey}
                      ></playground-preset>
                    </div>
                  `;
                })
            : nothing
          }
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

if (!customElements.get('al-autoplay-controller')) {
  customElements.define('al-autoplay-controller', AlAutoplayController);
}
