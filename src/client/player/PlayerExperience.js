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
    this.env.gain.linearRampToValueAtTime(value, now + 0.005);
  }

  release() {
    const releaseDuration = 1; // 1 sec
    const now = audioContext.currentTime;
    this.env.gain.exponentialRampToValueAtTime(0.0001, now + releaseDuration);
    this.src.stop(now + releaseDuration);
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
    });

    this.receive('soloist:distance', normDistance => {
      if (!this.soloistSynth)
        return;

      const gain = Math.cos(normDistance * Math.PI / 2);
      this.soloistSynth.gain = gain;
    });

    this.receive('soloist:release', () => {
      if (!this.soloistSynth)
        return;

      this.soloistSynth.release();
      this.soloistSynth = null;
    });

    this.show();
  }
}

export default PlayerExperience;
