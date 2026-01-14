import { LitElement, html, css, nothing } from 'lit';

import '@ircam/sc-components/sc-text.js';
import '@ircam/sc-components/sc-toggle.js';
import '@ircam/sc-components/sc-slider.js';
import '@ircam/sc-components/sc-icon.js';

class AlPreset extends LitElement {
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
        width: auto;
        /* width: 450px; */
      }

      sc-text {
        width: 140px;
      }

      sc-icon {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 2;
      }

      .open-button {
        position: absolute;
        top: 0;
        right: 0;
        z-index: 2;
        display: flex;
        cursor: pointer;
      }

      .open-button sc-icon {
        position: relative;
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
          <sc-icon
            type="close"
            @input=${() => this.toggle()}
          ></sc-icon>
          ${this.label ? html`<p>${this.label}</p>` : nothing}

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
        <div class="open-button"
          @input=${() => this.toggle()}
        >
          ${this.label ? html`<sc-text>${this.label}</sc-text>` : nothing}
          <sc-icon type="gear"></sc-icon>
        </div>

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
    this.expanded = !this.expanded;
    this.requestUpdate();
  }
}

if (!customElements.get('al-preset')) {
  customElements.define('al-preset', AlPreset);
}
