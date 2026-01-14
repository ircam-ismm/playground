import { LitElement, html, css, nothing } from 'lit';
import { repeat } from 'lit-html/directives/repeat.js';

import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-text.js';

import '../../../lib/gui/al-controller.js';
import '../../../lib/gui/al-preset.js';

class AlGranularController extends LitElement {
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

    div[slot="main"] .all-synths {
      display: flex;
      flex-direction: row;
      margin-bottom: 10px;
    }

    div[slot="main"] .all-synths sc-button {
      height: 64px;
      margin-top: 4px;
      display: block;
      font-size: 1.6rem;
      flex-grow: 1;
      width: auto;
    }

    div[slot="main"] .soundfile {
      margin-top: 10px;
      position: relative;
    }

    div[slot="main"] .soundfile sc-button {
      margin-top: 4px;
      display: block;
      width: 70%;
      font-size: 1.2rem;
      height: 34px;
    }

    div[slot="main"] .soundfile al-preset {
      position: absolute;
      top: 0;
      right: 0;
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
    const startedSynths = this.module.global.getUnsafe('startedSynths');

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
        </div>
        <div slot="main">
          ${currentSoundBank ? html`
            <div class="all-synths">
              <sc-button
                @input=${e => {
                  const filenames = Object.keys(this.module.soundbank.getUnsafe('soundBanks')[currentSoundBank].files);
                  const event = { action: 'start', filename: filenames };
                  this.module.global.set('toggleSynthEvent', event);
                }}
              >START ALL</sc-button>
              <sc-button
                @input=${e => {
                  const filenames = Object.keys(this.module.soundbank.getUnsafe('soundBanks')[currentSoundBank].files);
                  const event = { action: 'stop', filename: filenames };
                  this.module.global.set('toggleSynthEvent', event);
                }}
              >STOP ALL</sc-button>
            </div>
            ${Object.keys(this.module.soundbank.getUnsafe('soundBanks')[currentSoundBank].files).map(filename => {
              const numPlayers = this.module.renderers.filter(renderer => {
                return renderer.get('filename') === filename && renderer.get('loading') === false;
              }).length;
              const started = startedSynths.includes(filename);

              return html`
                <div class="soundfile">
                  <sc-button
                    ?selected=${started}
                    @input="${e => {
                      const event = started ? { action: 'stop', filename } : { action: 'start', filename };
                      this.module.global.set('toggleSynthEvent', event);
                    }}"
                  >
                    ${filename} - #players: ${numPlayers} -------- ${started ? 'STOP' : 'START'}
                  </sc-button>
                  <al-preset
                    width="500"
                    .state=${this.module.soundbank}
                    soundbank=${currentSoundBank}
                    filename=${filename}
                    presetKey=${presetKey}
                  ></al-preset>
                </div>
              `
            })}
          ` : nothing}
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

if (!customElements.get('al-granular-controller')) {
  customElements.define('al-granular-controller', AlGranularController);
}
