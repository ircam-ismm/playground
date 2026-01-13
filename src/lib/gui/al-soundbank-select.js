import { LitElement, html, css } from 'lit';
import { classMap } from 'lit-html/directives/class-map.js';

class AlSoundBankSelect extends LitElement {
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
        font-family: var(--sc-font-family);
        display: flex;
        box-sizing: border-box;
        background-color: #181818;
        padding: 16px 10px;
      }

      sc-button {
        height: 36px;
        font-size: 1.3rem;
        background-color: #121212;
        display: flex;
        width: auto;
        flex-grow: 1;
      }

      button {
        font-family: var(--sc-font-family);
        color: white;
        font-size: 1.3rem;
        width: 100%;
        border: 1px solid #676767;
        border-radius: 2px;
        background-color: #121212;
        height: 36px;
        line-height: 36px;
        padding: 0;
        outline: none;
        user-select: none;
        width: 150px;
        font-size: 15px;
        margin: 0px 4px;
      }

      button.active {
        background-color: #dc3545;
        border-color: #dc3545;
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
      <sc-button
        @input="${e => this.#updateSoundbank(e, null)}"
        ?selected="${currentSoundBank === null}"
      >none</sc-button>

      ${activeSoundbanks.map(value => {
        return html`
          <sc-button
            @input="${e => this.#updateSoundbank(e, value)}"
            ?selected=${currentSoundBank === value}
          >${value}</sc-button>
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

if (!customElements.get('al-soundbank-select')) {
  customElements.define('al-soundbank-select', AlSoundBankSelect);
}
