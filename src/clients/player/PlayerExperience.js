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
          case 'triggerSynthFile': {
            this.loadFile('trigger', updates[name]);
            break;
          }
          case 'triggerSynthConfig': {
            const config = updates[name];

            break;
          }
          case 'triggerSynthEvent': {
            const buffer = this.bufferCache.get('trigger');
            if (buffer) {
              const triggerSynthConfig = this.playerState.get('triggerSynthConfig');
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
          case 'soloistSynthFile': {
            this.loadFile('soloist', updates[name]);
            break;
          }
          case 'soloistSynthConfig': {
            if (this.soloistSynth) {
              const params = updates[name].presets['soloistSynth'];
              this.soloistSynth.updateParams(params);
            }
            break;
          }
          case 'soloistSynthDistance': {
            // const buffer = this.bufferCache.get('soloist');
            const distance = updates[name];

            if (distance < 1) {
              if (this.soloistSynth === null) {
                const buffer = this.bufferCache.get('soloist');

                if (buffer) {
                  const syncStartTime = updates['soloistSynthStartTime'];
                  const locaStartTime = this.sync.getLocalTime(syncStartTime);
                  const soloistSynthConfig = this.playerState.get('soloistSynthConfig');
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
          case 'granularSynthFile': {
            this.loadFile('granular', updates[name]);
            break;
          }
          case 'granularSynthConfig': {
            if (this.granularSynth) {
              const params = updates[name].presets['granularSynth'];
              this.granularSynth.updateParams(params);
            }
            break;
          }
          case 'granularSynthState': {
            const buffer = this.bufferCache.get('granular');
            const action = updates[name];

            if (buffer) {
              const granularSynthConfig = this.playerState.get('granularSynthConfig');
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
    const loadingKey = `${type}SynthLoading`;

    this.bufferCache.delete(type);

    if (url !== null) {
      this.playerState.set({ [loadingKey]: true });
      const result = await this.audioBufferLoader.load({ [type]: url });
      this.playerState.set({ [loadingKey]: false });
      this.bufferCache.set(type, result[type]);
    } else {
      this.playerState.set({ [loadingKey]: false });
    }
  }

  renderApp() {
    const playerState = this.playerState.getValues();
    const color = this.flashScreen ? '#ffffff' : playerState.color;
    const opacity = 1 - playerState.soloistSynthDistance;

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
        <pre><code>${JSON.stringify(this.playerState.getValues(), null, 2)}</code></pre>
      </div>
    `, this.$container);
  }
}

export default PlayerExperience;
