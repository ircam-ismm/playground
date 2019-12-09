import { LitElement, html, css } from 'lit-element';

class FpHeader extends LitElement {
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
        padding: 20px;
      }

      button {
        font-family: Consolas, monaco, monospace;
        padding: 6px 20px;
        margin: 4px;
        font-size: 16px;
        background-color: #232323;
        color: white;
        border-radius: 1px;
        border: 1px solid #686868;
        user-select: none;
      }

      button.active {
        background-color: #dc3545;
        border-color: #dc3545;
      }
    `;
  }

  constructor() {
    super();

    this.list = [];
    this.value = null;
  }

  render() {
    return html`
      <button
        @touchstart="${this.updateValue}"
        @mousedown="${this.updateValue}"
        class="${!this.value ? 'active' : ''}"
      >none</button>

      ${this.list.map(value => {
        return html`
          <button
            @touchstart="${this.updateValue}"
            @mousedown="${this.updateValue}"
            value="${value}"
            class="${value === this.value ? 'active' : ''}"
          >${value}</button>
        `;
      })}
    `;
  }

  updateValue(e) {
    e.preventDefault();

    this.value = e.target.value ? e.target.value : null;
    const event = new CustomEvent('change', {
      detail: { value: this.value },
    });

    this.requestUpdate();
    this.dispatchEvent(event);
  }
}

customElements.define('fp-header', FpHeader);
