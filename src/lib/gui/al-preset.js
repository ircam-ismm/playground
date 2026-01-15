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
      alignOverlay: {
        attribute: 'align-overlay',
        type: String,
      },
      targetType: {
        attribute: 'target-type',
        type: String,
      },
    }
  }

  static get styles() {
    return css`
      :host {
        display: inline-block;
        box-sizing: border-box;
        position: relative;
        /* min-width: 100px; */
        min-height: 30px;
        margin-bottom: 200px;
      }

      sc-text {
        width: 140px;
      }

      .open-button {
        z-index: 2;
        display: flex;
        cursor: pointer;
      }

      .open-button sc-icon {
        position: relative;
      }

      .overlay {
        position: absolute;
        top: 30px;
        z-index: 10;
        padding: 4px;
        background-color: #161616;
        border-radius: 1px;
        border: 1px solid #454545;
      }

      .overlay.right {
        right: 0;
      }

      .overlay.left {
        left: 0;
      }

      .overlay > div {
        display: flex;
        flex-direction: row;
      }
    `;
  }

  constructor() {
    super();

    this.label = '';
    this.expanded = false;
    this.unsubscribeSoundbank = null;
    this.alignOverlay = 'right'; // 'left'
    this.targetType = 'file'; // '

    this.$paddingDiv = null;
  }

  render() {
    const header = html`
      <div class="open-button" @input=${() => this.toggle()}>
        ${this.label ? html`<sc-text>${this.label}</sc-text>` : nothing}
        <sc-icon type="${this.expanded ? 'close' : 'gear'}"></sc-icon>
      </div>
    `;

    let content = nothing;

    if (this.expanded) {
      const soundbank = this.state.getUnsafe('soundBanks')[this.soundbank];
      let definitions;
      let values;

      if (this.targetType === 'file') {
        const file = soundbank.files[this.filename];
        definitions = this.state.getUnsafe('soundFileDefaultPresets')[this.presetKey];
        values = file.presets[this.presetKey];
      } else if (this.targetType === 'soundbank') {
        definitions = this.state.getUnsafe('soundBankDefaultPresets')[this.presetKey]
        values = soundbank.presets[this.presetKey];
      }

      content = html`
        <div class="overlay ${this.alignOverlay}">
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
      `
    }

    return [header, content]
  }

  updated() {
    // make sure the overlay is not cut by the end of the screen
    if (this.expanded && !this.$paddingDiv) {
      const $overlay = this.shadowRoot.querySelector('.overlay');
      const { top, height } = this.getBoundingClientRect();
      const { height: overlayHeight } = $overlay.getBoundingClientRect();
      const innerHeight = window.innerHeight;

      if (top + height + overlayHeight > innerHeight) {
        this.$paddingDiv = document.createElement('div');
        const padHeight = (top + height + overlayHeight) - innerHeight;
        this.$paddingDiv.style.height = `${padHeight + 10}px`;
        // This is arbitrary to work with trigger controller
        this.parentElement.parentElement.appendChild(this.$paddingDiv);
      }
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
    if (this.targetType === 'file') {
      this.state.set('updateSoundFilePreset', {
        soundbank: this.soundbank,
        filename: this.filename,
        presetKey: this.presetKey,
        updates: { [name]: value },
      });
    } else {
      this.state.set('updateSoundBankPreset', {
        soundbank: this.soundbank,
        presetKey: this.presetKey,
        updates: { [name]: value },
      });
    }
  }

  toggle() {
    this.expanded = !this.expanded;
    this.requestUpdate();
  }
}

if (!customElements.get('al-preset')) {
  customElements.define('al-preset', AlPreset);
}
