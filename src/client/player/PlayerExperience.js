import * as soundworks from 'soundworks/client';
// import { centToLinear } from 'soundworks/utils/math';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

const template = `
  <div class="foreground" style="background-color: <%= player ? player.color : '#000000' %>">
    <div class="section-top flex-middle"></div>
    <div class="section-center">
      <% if (player) { %>
      <p class="big align-center"><%= player.index %></p>
      <p class="align-center"><%= player.currentFile ? player.currentFile.filename : '' %></p>
      <% } %>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

class FadeSyncSynth {
  constructor(startTime, buffer) {
    this.fadeOutDuration = 1;

    const now = audioContext.currentTime;

    this.env = audioContext.createGain();
    this.env.connect(audioContext.destination);
    this.env.gain.value = 0;
    this.env.gain.setValueAtTime(0, now);

    this.src = audioContext.createBufferSource();
    this.src.connect(this.env);
    this.src.buffer = buffer;
    this.src.loop = true;

    const offset = Math.max(0, (now - startTime) % buffer.duration);

    this.src.start(now, offset);
  }

  set gain(value) {
    const now = audioContext.currentTime;

    this.env.gain.cancelScheduledValues(now);
    this.env.gain.setValueAtTime(this.env.gain.value, now);
    this.env.gain.linearRampToValueAtTime(value, now + 0.005);
  }

  fadeOut() {
    const now = audioContext.currentTime;

    this.env.gain.cancelScheduledValues(now);
    this.env.gain.setValueAtTime(this.env.gain.value, now);
    this.env.gain.exponentialRampToValueAtTime(0.0001, now + this.fadeOutDuration);
  }

  release() {
    this.fadeOut();

    const now = audioContext.currentTime;
    this.src.stop(now + this.fadeOutDuration);
  }
}

class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio', 'wake-lock'] });
    this.checkin = this.require('checkin', { showDialog: false });
    this.locator = this.require('locator');
    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
    });

    this.sync = this.require('sync');
    this.sharedParams = this.require('shared-params');

    this.currentFile = null;
    this.soloistSynth = null;
  }

  start() {
    super.start(); // don't forget this

    // initialize the view
    this.view = new soundworks.SegmentedView(template, { player: null }, {}, {
      id: this.id,
      preservePixelRatio: true,
    });

    this.receive('setup', player => {
      this.view.model.player = player;
      this.view.render();
    });

    this.receive('update-file', player => {
      const audioFile = player.currentFile;

      if (audioFile !== null) {
        this.audioBufferManager
          .load({ [audioFile.filename]: audioFile })
          .then(data => {
            this.currentFile = data[audioFile.filename];
            this.send('file-loaded', client.uuid);
            this.view.model.player = player;
            this.view.render();
          });
      }
    });

    this.receive('trigger', () => {
      if (this.currentFile === null)
        return;

      const now = audioContext.currentTime;
      const buffer = this.currentFile.filename;
      const repeat = this.currentFile.repeat;
      const period = this.currentFile.period === 0 ? buffer.duration : this.currentFile.period;
      const jitter = this.currentFile.jitter;

      for (let i = 0; i < repeat + 1; i++) {
        const src = audioContext.createBufferSource();
        src.connect(audioContext.destination);
        src.buffer = buffer;

        let startTime = now;

        if (i > 0)
          startTime = now + (i * period) + ((Math.random() * 2 - 1)  * jitter);

        src.start(startTime);
      }
    });

    // play from soloist
    this.receive('soloist:start', (syncTime) => {
      if (this.currentFile === null)
        return;

      const startTime = this.sync.getAudioTime(syncTime);
      const buffer = this.currentFile.filename;
      this.soloistSynth = new FadeSyncSynth(startTime, buffer);
      this.soloistSynth.fadeOutDuration = this.sharedParams.getValue('fadeOutDuration');
    });

    this.receive('soloist:distance', (normDistance, triggerFadeOut) => {
      if (this.soloistSynth) {
        if (!triggerFadeOut) {
          const gain = Math.cos(normDistance * Math.PI / 2);
          this.soloistSynth.gain = gain;
        } else {
          this.soloistSynth.fadeOut();
        }
      }
    });

    this.receive('soloist:release', () => {
      if (this.soloistSynth) {
        this.soloistSynth.release();
        this.soloistSynth = null;
      }
    });

    this.sharedParams.addParamListener('fadeOutDuration', value => {
      if (this.soloistSynth)
        this.soloistSynth.fadeOutDuration = value;
    });

    this.show();
  }
}

export default PlayerExperience;
