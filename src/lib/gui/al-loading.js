import { LitElement, html, css } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat.js';

class AlLoading extends LitElement {
  static get properties() {
    return {
      list: {
        type: Array,
      },
      infos: {
        type: Object,
      },
    }
  }

  static get styles() {
    return css`
      :host {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        background-color: #181818;
        padding: 4px;
        width: 120px;
        /* height: calc(100vh - 75px); // dirty... */
      }

      p {
        margin: 6px 0;
      }

      div {
        width: 100%;
        height: 15px;
        margin-top: 1px;
        line-height: 15px;
        text-align: center;
      }
    `;
  }

  constructor() {
    super();

    this.renderers;
    this.unsubscribeRenderers;
  }

  render() {
    return html`
      <p># connected: ${this.renderers.length}</p>

      ${repeat(this.renderers.filter(s => s.get('loading')), state => state.get('clientIndex'), state => {
        return html`
          <div style="background-color: ${state.get('clientColor')};">
            ${state.get('clientIndex')}
          </div>
        `;
      })}
    `;
  }

  connectedCallback() {
    super.connectedCallback();
    this.unsubscribeRenderers = this.renderers.onChange(() => this.requestUpdate());
  }

  disconnectedCallback() {
    this.unsubscribeRenderers();
    super.disconnectedCallback();

  }
}

if (!customElements.get('al-loading')) {
  customElements.define('al-loading', AlLoading);
}
