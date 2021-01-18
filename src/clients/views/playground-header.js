import { LitElement, html, css } from 'lit-element';
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
        const classes = { active: this.value === value };
        return html`
          <button
            @touchstart="${this.updateValue}"
            @mousedown="${this.updateValue}"
            value="${value}"
            class="${classMap(classes)}"
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

customElements.define('playground-header', PlaygroundHeader);
