import { LitElement, html, css } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat.js';

class PlaygroundLoadingPlayers extends LitElement {
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
        display: block;
        box-sizing: border-box;
        background-color: #181818;
        padding: 4px;
        width: 120px;
        height: calc(100vh - 75px); // dirty...
      }

      div {
        width: 100%;
        height: 15px;
        margin-top: 4px;
        line-height: 15px;
        text-align: center;
      }

      p {
        margin: 0 0 4px 0;
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

if (!customElements.get('playground-loading-players')) {
  customElements.define('playground-loading-players', PlaygroundLoadingPlayers);
}
