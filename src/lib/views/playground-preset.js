import { LitElement, html, css } from 'lit';

import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-toggle.js';
import '@ircam/sc-components/sc-slider.js';

class PlaygroundPreset extends LitElement {
  static get properties() {
    return {
      width: {
        type: Number,
      },
      label: {
        type: String,
      },
      soundbank: {
        type: String,
      },
      filename: {
        type: String,
      },
      presetKey: {
        type: String,
      },
      expanded: {
        type: Boolean,
      },
    }
  }

  static get styles() {
    return css`
      :host {
        display: block;
        box-sizing: border-box;
        width: 450px;
      }

      sc-text {
        width: 140px;
      }

      button {
        color: #ffffff;
        font-family: Consolas, monaco, monospace;
        background-color: #454545;
        border: none;
        height: 30px;
        min-width: 100px;
        font-size: 12px;
      }

      button:active {
        outline: 1px solid #ababab;
      }

      .overlay {
        position: relative;
        z-index: 10;
        padding: 4px;
        background-color: #161616;
        border-radius: 1px;
        border: 1px solid #454545;
        padding-top: 40px;
      }

      .overlay p {
        position: absolute;
        top: 0;
        left: 0;
        height: 30px;
        line-height: 30px;
        margin: 0;
        text-indent: 10px;
        font-style: italic;
      }

      .overlay button {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 2;
      }
    `;
  }

  constructor() {
    super();

    this.label = '';
    this.expanded = false;
    this.unsubscribeSoundbank = null;
  }

  render() {
    if (this.expanded) {
      const file = this.state.getUnsafe('soundBanks')[this.soundbank].files[this.filename];
      const definitions = this.state.getUnsafe('soundFileDefaultPresets')[this.presetKey];
      const values = file.presets[this.presetKey];

      return html`
        <div class="overlay">
          <button @click=${e => this.toggle()}>close</button>
          ${this.label ? html`<p>${this.label}</p>` : ''}

          <div>
            ${Object.keys(definitions).map(name => {
              const def = definitions[name];
              const value = values[name];

              if (def.type === 'integer' || def.type === 'float') {
                return html`
                  <div style="margin-bottom: 4px">
                    <sc-text>${name}</sc-text>
                    <sc-slider
                      number-box
                      min=${def.min}
                      max=${def.max}
                      step=${def.step}
                      .value=${value}
                      @change=${e => this.updatePreset(name, e.detail.value)}
                    ></sc-slider>
                  </div>
                `;
              } else if (def.type === 'boolean') {
                return html`
                  <div style="margin-bottom: 4px">
                    <sc-text>${name}</sc-text>
                    <sc-toggle
                      ?active=${value}
                      @change=${e => this.updatePreset(name, e.detail.value)}
                    ></sc-toggle>
                  </div>
                `;
              } else {
                console.error(`playground-preset: ${def.type} not implemented`);
              }
            })}
          </div>
        </div>
      `;
    } else {
      return html`
        <button @click=${e => this.toggle()}>
          ${this.label ? html`${this.label}` : 'open'}
        </button>
      `;
    }
  }

  connectedCallback() {
    this.unsubscribeSoundbank = this.state.onUpdate(() => this.requestUpdate());
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.unsubscribeSoundbank();
    super.disconnectedCallback();
  }

  updatePreset(name, value) {
    this.state.set('updateSoundFilePreset', {
      soundbank: this.soundbank,
      filename: this.filename,
      presetKey: this.presetKey,
      updates: { [name]: value },
    });
  }

  toggle() {
    console.log('hooo');
    this.expanded = !this.expanded;
    this.requestUpdate();
  }
}

if (!customElements.get('playground-preset')) {
  customElements.define('playground-preset', PlaygroundPreset);
}
