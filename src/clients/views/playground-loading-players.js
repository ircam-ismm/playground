import { LitElement, html, css } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';

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
      }

      div {
        width: 100%;
        height: 30px;
        margin-top: 4px;
        line-height: 30px;
        text-align: center;
      }

      p {
        margin: 0 0 4px 0;
      }
    `;
  }

  render() {
    return html`
      ${this.infos
        ? Object.keys(this.infos).map(name => {
            return html`<p>${name}: ${this.infos[name]}</p>`
          })
        : ''
      }
      ${repeat(this.list, player => player.id, player => {
        return html`
          <div style="background-color: ${player.color};">
            ${player.index}
          </div>
        `;
      })}
    `;
  }
}

customElements.define('playground-loading-players', PlaygroundLoadingPlayers);
