import { LitElement, html, css, nothing } from 'lit';

import '@ircam/sc-components/sc-text.js';
import './al-preset.js';

class AlSoundBankManager extends LitElement {

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
    }

    .soundbank {
      padding: 10px;
      border-bottom: 1px solid #232332;
      /* display: flex; */
      flex-grow: 1;
    }

    .soundbank h1 {
      height: 30px;
      line-height: 30px;
      font-size: 15px;
    }

    .soundbank ul {
      font-size: 10px;
      padding-left: 17px;
      color: #ababab;
      font-style: italic;
      margin-bottom: 10px;
    }

    .soundbank .soundbank-preset {
      margin-bottom: 10px;
      position: relative;
      height: 30px;
    }

    .soundbank .file-preset {
      margin-bottom: 2px;
      position: relative;
    }
  `;

  render() {
    const soundBanks = this.soundbank.getUnsafe('soundBanks');

    return html`
      ${Object.keys(soundBanks).sort().map(soundBankName => {
        const soundBankValues = soundBanks[soundBankName];

        return html`
          <section class="soundbank ${soundBankName}">
            <h1>> ${soundBankName}</h1>

            <ul>
              <li>url: ${soundBankValues.url}</li>
              <li>path: ${soundBankValues.path}</li>
            </ul>

            <div class="soundbank-preset">
              ${Object.keys(soundBankValues.presets).sort().map(presetKey => {
                return html`
                  <al-preset
                    align-overlay="left"
                    target-type="soundbank"
                    label="${presetKey}"
                    .state=${this.soundbank}
                    soundbank=${soundBankName}
                    presetKey=${presetKey}
                  ></al-preset>
                `;
              })}
            </div>

            <div>
              ${Object.keys(soundBankValues.files).sort().map(filename => {
                return html`
                  <div class="file-preset">
                    <sc-text>${filename}</sc-text>

                    ${Object.keys(soundBankValues.files[filename].presets).map((presetKey) => {
                      return html`
                        <al-preset
                          align-overlay="left"
                          label=${presetKey}
                          .state=${this.soundbank}
                          soundbank=${soundBankName}
                          filename=${filename}
                          presetKey=${presetKey}
                        ></al-preset>
                      `;
                    })}
                  </div>
                `
              })}
            </div>
          </section>
        `;
      })}
    `;
  }
}

if (!customElements.get('al-soundbank-manager')) {
  customElements.define('al-soundbank-manager', AlSoundBankManager);
}
