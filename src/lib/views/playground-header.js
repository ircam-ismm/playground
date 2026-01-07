import { LitElement, html, css } from 'lit';
import { classMap } from 'lit-html/directives/class-map.js';
import { btn, btnActive } from './defaultStyles.js';

class PlaygroundHeader extends LitElement {
  static get properties() {
    return {
      list: {
        type: Array,
      },
      value: {
        type: String,
        reflect: true,
      },
    }
  }

  static get styles() {
    return css`
      :host {
        font-family: Consolas, monaco, monospace;
        display: block;
        box-sizing: border-box;
        background-color: #121212;
        padding: 20px 10px;
      }

      button {
        ${btn}
        width: 150px;
        font-size: 15px;
        margin: 4px 0;
      }

      button.active {
        ${btnActive}
      }
    `;
  }

  constructor() {
    super();

    this.controller = null;
    this.unsubscribe = null;
  }

  render() {
    const activeSoundbanks = this.controller.get('activeSoundbanks');
    const currentSoundBank = this.controller.get('currentSoundBank');

    return html`
      <button
        @touchstart="${e => this.#updateSoundbank(e, null)}"
        @mousedown="${e => this.#updateSoundbank(e, null)}"
        class="${!currentSoundBank ? 'active' : ''}"
      >none</button>

      ${activeSoundbanks.map(value => {
        const classes = { active: currentSoundBank === value };

        return html`
          <button
            @touchstart="${e => this.#updateSoundbank(e, value)}"
            @mousedown="${e => this.#updateSoundbank(e, value)}"
            value="${value}"
            class="${classMap(classes)}"
          >${value}</button>
        `;
      })}
    `;
  }

  connectedCallback() {
    super.connectedCallback();

    this.unsubscribe = this.controller.onUpdate(updates => {
      if ('activeSoundbanks' in updates || 'currentSoundBank' in updates) {
        this.requestUpdate();
      }
    });
  }

  disconnectedCallback() {
    this.unsubscribe();
    super.disconnectedCallback();
  }

  #updateSoundbank = (e, value) => {
    e.preventDefault();
    this.controller.set('currentSoundBank', value);
  }
}

if (!customElements.get('playground-header')) {
  customElements.define('playground-header', PlaygroundHeader);
}
