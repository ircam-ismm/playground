import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderAppInitialization from '../views/renderAppInitialization';
import AudioBus from './synths/AudioBus';
import AutoPlaySynth from './synths/AutoPlaySynth';
import TriggerSynth from './synths/TriggerSynth';
import GranularSynth from './synths/GranularSynth';
import SoloistSynth from './synths/SoloistSynth';

class PlayerExperience extends Experience {
  constructor(client, config = {}, $container, audioContext, index) {
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
    this.autoPlaySynth = null;
    this.showConnectedScreen = true;

    renderAppInitialization(client, config, $container);

    //
    if (config.app.randomlyAssignPosition) {
      const unsubscribe = this.client.serviceManager.observe((state) => {
        if (state.position === 'started') {
          // const angle = 2 * Math.PI / 42 * index;
          // const x = (Math.cos(angle) + 1) / 2;
          // const y = (Math.sin(angle) + 1) / 2;
          // this.position.setNormalizedPosition(x, y);
          this.position.setNormalizedPosition(Math.random(), Math.random());
          unsubscribe();
        }
      });
    }
  }

  async start() {
    super.start();

    this.playerState = await this.client.stateManager.create('player');
    this.globalsState = await this.client.stateManager.attach('globals');

    this.master = new AudioBus(this.audioContext);
    this.master.connect(this.audioContext.destination);
    this.master.volume = this.globalsState.get('masterVolume');

    this.masterBus = this.master.input;

    this.flashScreen = false;

    this.globalsState.subscribe(async updates => {
      for (let [name, value] of Object.entries(updates)) {
        switch (name) {
          case 'instructionsState':
            if (value === 'thanks') {
              setTimeout(() => {
                const now = this.audioContext.currentTime;
                this.master.muteNode.gain.linearRampToValueAtTime(0, now + 10);
                this.showConnectedScreen = false;
                this.renderApp();
              }, Math.random() * 5000);
            } else {
              // back to full
              const now = this.audioContext.currentTime;
              this.master.muteNode.gain.cancelScheduledValues(now);
              this.master.muteNode.gain.setValueAtTime(1, now);

              this.renderApp();
            }
            break;
          case 'masterVolume':
            this.master.volume = value;
            this.renderApp();
            break;
        }
      }
    });

    this.playerState.subscribe(async updates => {

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

              synth.connect(this.masterBus);
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
                  this.soloistSynth.connect(this.masterBus);
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
            const action = updates[name];
            this.handleGranularSynth(action);
            break;
          }
          // auto synth
          case 'autoPlayFile': {
            await this.loadFile('autoPlay', updates[name]);
            // if the synth is enabled we only change the buffer
            if (this.autoPlaySynth !== null) {
              const buffer = this.bufferCache.get('autoPlay');
              this.autoPlaySynth.buffer = buffer;
            }
            break;
          }
          case 'autoPlayConfig': {
            if (this.autoPlaySynth) {
              const params = updates[name].presets['autoPlaySynth'];
              this.autoPlaySynth.updateParams(params);
            }
            break;
          }
          case 'autoPlayEnabled': {
            const enabled = updates[name];
            this.handleAutoPlaySynth(enabled);
            break;
          }
        }
      }

      this.renderApp();
    });

    this.handleAutoPlaySynth(this.playerState.get('autoPlayEnabled'));
    this.handleGranularSynth(this.playerState.get('granularState'));

    const id = this.client.id;
    const position = this.position.state.getValues();
    const index = this.checkin.state.getValues()['index'];
    const color = this.config.app.colors[index % this.config.app.colors.length];

    await this.playerState.set({ id, position, index, color });

    // remove connected screen
    setTimeout(() => {
      this.showConnectedScreen = false;
      this.renderApp();
    }, 8 * 1000);

    this.renderApp();
  }

  async handleGranularSynth(action) {
    if (this.granularSynth !== null && action == 'stop') {
      this.granularSynth.stop();
      this.granularSynth = null;
    } else if (this.granularSynth === null && action === 'start') {
      if (!this.bufferCache.get('granular')) {
        await this.loadFile('granular', this.playerState.get('granularFile'));
      }

      const buffer = this.bufferCache.get('granular');

      if (buffer) {
        const granularSynthConfig = this.playerState.get('granularConfig');
        const params = granularSynthConfig.presets['granularSynth'];

        this.granularSynth = new GranularSynth(this.audioContext, buffer);
        this.granularSynth.updateParams(params);
        this.granularSynth.connect(this.masterBus);
        this.granularSynth.start();
      }
    }
  }

  async handleAutoPlaySynth(enabled) {
    if (this.autoPlaySynth !== null && !enabled) {
      this.autoPlaySynth.stop();
      this.autoPlaySynth = null;
    } else if (this.autoPlaySynth === null && enabled) {
      if (!this.bufferCache.get('autoPlay')) {
        await this.loadFile('autoPlay', this.playerState.get('autoPlayFile'));
      }

      const buffer = this.bufferCache.get('autoPlay');

      if (buffer) {
        const autoPlaySynthConfig = this.playerState.get('autoPlayConfig');
        const params = autoPlaySynthConfig.presets['autoPlaySynth'];

        this.autoPlaySynth = new AutoPlaySynth(this.audioContext, buffer);
        this.autoPlaySynth.updateParams(params);
        this.autoPlaySynth.connect(this.masterBus);
        this.autoPlaySynth.start();
      }
    }
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
    const globalsState = this.globalsState.getValues();
    const color = this.flashScreen ? '#ffffff' : playerState.color;
    const opacity = 1 - playerState.soloistDistance;

    render(html`
      <div class="screen"
        style="
          background-color: ${color};
          position: relative;
          overflow-y: auto;
        "
      >
        ${globalsState.instructionsState === 'thanks' ?
          // final screen
          html`
            <div
          style="
            position: fixed;
            top: 0;
            height: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            "
          >
            <p
              style="
                padding-top: 120px;
                text-align: center;
                font-size: 14px;
                line-height: 20px;
              "
            >
              Merci, <br />vous pouvez ranger votre téléphone
              <br />
              <br />
              <br />
              Thanks, <br />you can put away you phone
            </p>
          </div>
          `
        : ''}

        ${this.showConnectedScreen ?
          html`
            <div
          style="
            position: fixed;
            top: 0;
            height: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.9);
            "
          >
            <p
              style="
                padding-top: 120px;
                text-align: center;
                font-size: 14px;
                line-height: 20px;
              "
            >
              (vous êtes bien connectés...)
              <br />
              <br />
              <br />
              (you are connected...)
            </p>
          </div>
          `
        : ''}

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
        <pre><code style="font-size: 7px; padding: 4px; display: block;">
masterVolume: ${globalsState.masterVolume}
${JSON.stringify(playerState, null, 2)}
        </code></pre>
      </div>
    `, this.$container);
  }
}

export default PlayerExperience;
