import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderAppInitialization from '../views/renderAppInitialization';
import TriggerSynth from './synths/TriggerSynth';
import GranularSynth from './synths/GranularSynth';
import SoloistSynth from './synths/SoloistSynth';

class PlayerExperience extends Experience {
  constructor(client, config = {}, $container, audioContext) {
    super(client);

    this.config = config;
    this.$container = $container;
    this.audioContext = audioContext;

    // require services
    this.platform = this.require('platform');
    this.sync = this.require('sync');
    this.checkin = this.require('checkin');
    this.position = this.require('position');
    this.audioBufferLoader = this.require('audio-buffer-loader');
    this.bufferCache = new Map();

    this.granularSynth = null;
    this.soloistSynth = null;

    renderAppInitialization(client, config, $container);

    setTimeout(() => {
      this.position.setNormalizedPosition(Math.random(), Math.random());
    }, 1000);
  }

  async start() {
    super.start();

    this.playerState = await this.client.stateManager.create('player');
    this.master = this.audioContext.destination;

    this.flashScreen = false;

    this.playerState.subscribe((updates) => {
      for (let name in updates) {
        switch (name) {
          case 'triggerFile': {
            this.loadFile('trigger', updates[name]);
            break;
          }
          case 'triggerConfig': {
            const config = updates[name];

            break;
          }
          case 'triggerEvent': {
            const buffer = this.bufferCache.get('trigger');
            if (buffer) {
              const triggerSynthConfig = this.playerState.get('triggerConfig');
              const config = triggerSynthConfig.presets['triggerSynth'];
              const synth = new TriggerSynth(this.audioContext, buffer, config);

              synth.connect(this.master);
              synth.trigger();
              // flash the screen
              this.flashScreen = true;
              this.renderApp();

              setTimeout(() => {
                this.flashScreen = false;
                this.renderApp();
              }, 100);
            }
          }

          // soloist
          case 'soloistFile': {
            this.loadFile('soloist', updates[name]);
            break;
          }
          case 'soloistConfig': {
            if (this.soloistSynth) {
              const params = updates[name].presets['soloistSynth'];
              this.soloistSynth.updateParams(params);
            }
            break;
          }
          case 'soloistDistance': {
            const distance = updates[name];

            if (distance < 1) {
              if (this.soloistSynth === null) {
                const buffer = this.bufferCache.get('soloist');

                if (buffer) {
                  const syncStartTime = updates['soloistStartTime'];
                  const locaStartTime = this.sync.getLocalTime(syncStartTime);
                  const soloistSynthConfig = this.playerState.get('soloistConfig');
                  const params = soloistSynthConfig.presets['soloistSynth'];

                  this.soloistSynth = new SoloistSynth(this.audioContext, buffer, locaStartTime);
                  this.soloistSynth.connect(this.master);
                  this.soloistSynth.updateParams(params);
                }
              }

              if (this.soloistSynth) {
                this.soloistSynth.updateDistance(distance);
              }
            } else {
              if (this.soloistSynth !== null) {
                this.soloistSynth.release();
                this.soloistSynth = null;
              }
            }
            break;
          }

          // granular
          case 'granularFile': {
            this.loadFile('granular', updates[name]);
            break;
          }
          case 'granularConfig': {
            if (this.granularSynth) {
              const params = updates[name].presets['granularSynth'];
              this.granularSynth.updateParams(params);
            }
            break;
          }
          case 'granularState': {
            const buffer = this.bufferCache.get('granular');
            const action = updates[name];

            if (buffer) {
              const granularSynthConfig = this.playerState.get('granularConfig');
              const params = granularSynthConfig.presets['granularSynth'];

              if (this.granularSynth === null && action === 'start') {
                this.granularSynth = new GranularSynth(this.audioContext, buffer);
                this.granularSynth.updateParams(params);
                this.granularSynth.connect(this.master);
                this.granularSynth.start();
              } else if (this.granularSynth !== null && action == 'stop') {
                this.granularSynth.stop();
                this.granularSynth = null;
              }
            }
            break;
          }

        }
      }

      this.renderApp();
    });

    const id = this.client.id;
    const position = this.position.state.getValues();
    const index = this.checkin.state.getValues()['index'];
    const color = this.config.app.colors[index % this.config.app.colors.length];

    await this.playerState.set({ id, position, index, color });

    this.renderApp();
  }

  async loadFile(type, url) {
    const loadingKey = `${type}Loading`;

    this.bufferCache.delete(type);

    if (url !== null) {
      this.playerState.set({ [loadingKey]: true });
      const result = await this.audioBufferLoader.load({ [type]: url });
      this.bufferCache.set(type, result[type]);
      this.playerState.set({ [loadingKey]: false });
    } else {
      this.playerState.set({ [loadingKey]: false });
    }
  }

  renderApp() {
    const playerState = this.playerState.getValues();
    const color = this.flashScreen ? '#ffffff' : playerState.color;
    const opacity = 1 - playerState.soloistDistance;

    render(html`
      <div class="screen"
        style="
          background-color: ${color};
          position: relative
        "
      >
        <div
          style="
            position: absolute;
            top: 0;
            height: 0;
            width: 100%;
            height: 100%;
            background-color: white;
            opacity: ${opacity};
          "
        ></div>
        <pre><code>${JSON.stringify(playerState, null, 2)}</code></pre>
      </div>
    `, this.$container);
  }
}

export default PlayerExperience;
