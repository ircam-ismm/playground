import { LitElement, html, css } from 'lit-element';

import '@ircam/simple-components/sc-text.js';
import '@ircam/simple-components/sc-toggle.js';
import '@ircam/simple-components/sc-slider.js';

class PlaygroundPreset extends LitElement {
  static get properties() {
    return {
      width: {
        type: Number,
      },
      label: {
        type: String,
      },
      definitions: {
        type: Object,
      },
      values: {
        type: Object,
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

    this.width = 600;
    this.label = '';
    this.definitions = {};
    this.values = {};
    this.expanded = false;
  }

  render() {
    if (this.expanded) {
      return html`
        <div class="overlay">
          <button @click="${this.close}">close</button>

          ${this.label ? html`<p>${this.label}</p>` : ''}

          <div style="width: ${this.width}px;">

            ${Object.keys(this.definitions).map((name) => {
              const def = this.definitions[name];
              const value = this.values[name];

              if (def.type === 'integer' || def.type === 'float') {
                return html`
                  <div style="margin-bottom: 4px">
                    <sc-text
                      value="${name}"
                      width="140"
                      readonly
                    ></sc-text>
                    <sc-slider
                      width="${this.width - 150}"
                      display-number
                      min="${def.min}"
                      max="${def.max}"
                      step="${def.step}"
                      .value="${value}"
                      @change="${(e) => this.propagateValue(name, e.detail.value)}"
                    ></sc-slider>
                  </div>
                `;
              } else if (def.type === 'boolean') {
                return html`
                  <div style="margin-bottom: 4px">
                    <sc-text
                      value="${name}"
                      width="140"
                      readonly
                    ></sc-text>
                    <sc-toggle
                      ?active="${value}"
                      @change="${(e) => this.propagateValue(name, e.detail.value)}"
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
        <button @click="${this.open}">
          ${this.label ? html`${this.label}` : 'open'}
        </button>
      `;
    }
  }

  propagateValue(name, value) {
    const event = new CustomEvent('update', {
      detail: { name, value },
    });

    this.dispatchEvent(event);
  }

  open() {
    const event = new CustomEvent('open');
    this.expanded = true;
    this.requestUpdate();

    this.dispatchEvent(event);
  }

  close() {
    const event = new CustomEvent('close');
    this.expanded = false;
    this.requestUpdate();

    this.dispatchEvent(event);
  }
}

customElements.define('playground-preset', PlaygroundPreset);
