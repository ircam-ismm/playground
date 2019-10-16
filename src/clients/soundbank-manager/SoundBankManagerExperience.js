import { Experience } from '@soundworks/core/client';
import { html, render } from 'lit-html';
import '../views/elements/sw-preset';
import '../views/elements/sw-toggle';
import throttle from 'lodash.throttle';

class SoundBankManagerExperience extends Experience {
  constructor(client, config, $container) {
    super(client, config);

    this.$container = $container;
  }

  start() {
    super.start();

    this.eventListeners = {
      updateSoundBankPreset: throttle((...args) => {
        this.client.socket.send('soundBanks:updateSoundBankPreset', ...args);
      }, 50),
      updateSoundFilePreset: throttle((...args) => {
        this.client.socket.send('soundBanks:updateSoundFilePreset', ...args);
      }, 50),
    };

    this.client.socket.addListener('soundBanks', (values, soundBankDefaultPresets, soundFileDefaultPresets) => {
      this.renderApp(values, soundBankDefaultPresets, soundFileDefaultPresets);
    });
  }

  renderApp(values, soundBankDefaultPresets, soundFileDefaultPresets) {
    render(Object.keys(values).sort().map(soundBankName => {
      const soundBankValues = values[soundBankName];

      return html`
        <section class="soundbank ${soundBankName}"
          style="padding: 10px; border-bottom: 1px solid #232332;">

          <h1 style="
            height: 30px;
            line-height: 30px;
            /*margin-bottom: px;*/
            font-size: 15px;
          ">> ${soundBankName}</h1>

          <ul
            style="
              font-size: 10px;
              padding-left: 17px;
              color: #ababab;
              font-style: italic;
              margin-bottom: 10px;
            ">
            <li>url: ${soundBankValues.url}</li>
            <li>path: ${soundBankValues.path}</li>
          </ul>

          <div style="
            margin-bottom: 10px;
            position: relative;
            height: 30px;
          ">
            ${Object.keys(soundBankValues.presets).sort().map(presetName => {
              const definitions = soundBankDefaultPresets[presetName];
              const presetValues = soundBankValues.presets[presetName];

              return html`
                <sw-preset
                  style="
                    width: 408px;
                    display: inline-block;
                    vertical-align: top;
                    position: absolute;
                  "
                  width="400"
                  label="preset ${presetName}"
                  definitions="${JSON.stringify(definitions)}"
                  values="${JSON.stringify(presetValues)}"
                  @update="${(e) => {
                    const updates = { [e.detail.name]: e.detail.value };
                    this.eventListeners.updateSoundBankPreset(soundBankName, presetName, updates);
                  }}">
                </sw-preset>
              `;
            })}
          </div>

          <div>
            ${Object.keys(soundBankValues.files).sort().map(filename => {
              return html`
                <div style="
                  margin-bottom: 2px;
                  position: relative;
                ">
                  <p style="
                    width: 300px;
                    font-size: 12px;
                    overflow: hidden;
                    height: 30px;
                    line-height: 30px;
                    display: inline-block;
                  ">${filename}</p>

                  ${Object.keys(soundBankValues.files[filename].presets).map((presetName, index) => {
                    const definitions = soundFileDefaultPresets[presetName];
                    const presetValues = soundBankValues.files[filename].presets[presetName];

                    return html`<sw-preset
                      style="
                        display: inline-block;
                        vertical-align: top;
                        position: absolute;
                        left: ${300 + (120 * index)}px;
                      "
                      width="400"
                      label="${presetName}"
                      definitions="${JSON.stringify(definitions)}"
                      values="${JSON.stringify(presetValues)}"
                      @update="${(e) => {
                        const updates = { [e.detail.name]: e.detail.value };
                        this.eventListeners.updateSoundFilePreset(soundBankName, filename, presetName, updates);
                      }}">
                    </sw-preset>`;
                  })}
                </div>
              `
            })}
          </div>
        </section>
      `;
    }), this.$container);
  }
}

export default SoundBankManagerExperience;
