import { AbstractExperience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import AudioBus from './synths/AudioBus.js';
import AutoPlaySynth from './synths/AutoPlaySynth.js';
import TriggerSynth from './synths/TriggerSynth.js';
import GranularSynth from './synths/GranularSynth.js';
import SoloistSynth from './synths/SoloistSynth.js';

class PlayerExperience extends AbstractExperience {
  constructor(client, config, $container, audioContext, index) {
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
    this.scripting = this.require('scripting');

    this.bufferCache = new Map();

    this.granularSynth = null;
    this.soloistSynth = null;
    this.autoPlaySynth = null;
    this.showConnectedScreen = true;

    this.rafId = null;

    // assign random position
    // @todo - add something in url
    if (config.app.randomlyAssignPosition) {
      const unsubscribe = this.client.pluginManager.observe(pluginsState => {
        if (pluginsState.position === 'started') {
          this.position.setNormalizedPosition(Math.random(), Math.random());
          unsubscribe();
        }
      });
    }

    renderInitializationScreens(client, config, $container);
  }

  async start() {
    super.start();

    const id = this.client.id;
    const position = this.position.getPosition();
    const index = this.checkin.get('index');
    const color = this.config.app.colors[index % this.config.app.colors.length];

    this.playerState = await this.client.stateManager.create('player', {
      id, position, index, color
    });
    this.globalsState = await this.client.stateManager.attach('globals');

    this.master = new AudioBus(this.audioContext);
    this.master.connect(this.audioContext.destination);
    this.master.volume = this.globalsState.get('master');
    this.master.mute = this.globalsState.get('mute');
    this.master.cutoffFrequency = this.globalsState.get('cutoffFrequency');

    const script = await this.scripting.attach('view');

    script.subscribe(() => {
      if (this.view) {
        this.view.destroy();
      }

      this.view = script.execute(render, html, this.$container);
      this.render();
    });

    this.view = script.execute(render, html, this.$container);

    const updateFromGlobalState = async updates => {
      for (let [name, value] of Object.entries(updates)) {
        switch (name) {
          case 'instructionsState': {
            if (value === 'thanks') {
              this.thanksTimeout = setTimeout(() => {
                this.master.fadeTo(0, 10);
                this.showConnectedScreen = false;
                this.render();
              }, Math.random() * 5000);
            } else {
              clearTimeout(this.thanksTimeout);
              // back to full
              this.master.fadeTo(1);
              this.render();
            }
            break;
          }
          case 'master': {
            this.master.volume = value;
            this.render();
            break;
          }
          case 'mute': {
            this.master.mute = value;
            this.render();
            break;
          }
          case 'cutoffFrequency': {
            this.master.cutoffFrequency = value;
            this.render();
            break;
          }
        }
      }
    }

    this.globalsState.subscribe(updateFromGlobalState);
    updateFromGlobalState(this.globalsState.getValues());

    this.flashScreen = false;

    const updateFromPlayerState = async updates => {
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

              synth.connect(this.master.input);
              synth.trigger();
              // flash the screen
              this.flashScreen = true;
              this.render();

              setTimeout(() => {
                this.flashScreen = false;
                this.render();
              }, 100);
            }
            break;
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
                  this.soloistSynth.connect(this.master.input);
                  this.soloistSynth.updateParams(params);
                  this.soloistSynth.start();
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

      this.render();
    }

    this.playerState.subscribe(updateFromPlayerState);
    updateFromPlayerState(this.playerState.getValues());

    // remove connected screen
    setTimeout(() => {
      this.showConnectedScreen = false;
      this.render();
    }, 8 * 1000);

    this.render();
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
        this.granularSynth.connect(this.master.input);
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
        this.autoPlaySynth.connect(this.master.input);
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

  render() {
    window.cancelAnimationFrame(this.rafId);

    this.rafId = window.requestAnimationFrame(() => {
      const data = {
        player: this.playerState.getValues(),
        globals: this.globalsState.getValues(),
        config: this.config,
        flashScreen: this.flashScreen,
      };

      this.view.update(data);
    });
  }
}

export default PlayerExperience;
