import * as soundworks from 'soundworks/client';
import FadeSyncSynth from './FadeSyncSynth';
import TriggerSynth from './TriggerSynth';
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

    this._updateFile = this._updateFile.bind(this);
    this._triggerFile = this._triggerFile.bind(this);

    // control from soloist
    this._soloistStart = this._soloistStart.bind(this);
    this._updateSoloistDistance = this._updateSoloistDistance.bind(this);
    this._soloistRelease = this._soloistRelease.bind(this);
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

    this.receive('update-file', this._updateFile);
    this.receive('trigger', this._triggerFile);

    // play from soloist
    this.receive('soloist:start', this._soloistStart);
    this.receive('soloist:distance', this._updateSoloistDistance);
    this.receive('soloist:release', this._soloistRelease);

    this.sharedParams.addParamListener('fadeOutDuration', value => {
      if (this.soloistSynth) {
        this.soloistSynth.fadeOutDuration = value;
      }
    });

    this.show();
  }

  _updateFile(player) {
    const audioFile = player.currentFile;

    if (audioFile !== null) {
      if (this.audioBufferManager.data[audioFile.filename]) {
        this.currentFile = this.audioBufferManager.data[audioFile.filename];
        this.send('file-loaded', client.uuid);
        this.view.model.player = player;
        this.view.render();
      } else {
        this.audioBufferManager
          .load({ [audioFile.filename]: audioFile })
          .then(data => {
            this.currentFile = data[audioFile.filename];
            this.send('file-loaded', client.uuid);
            this.view.model.player = player;
            this.view.render();
          });
      }
    }
  }

  _triggerFile() {
    if (this.currentFile !== null) {
      const synth = new TriggerSynth(this.currentFile);
      synth.trigger();
    }
  }

  // control from soloist
  _soloistStart(syncTime) {
    if (this.currentFile !== null) {
      const startTime = this.sync.getAudioTime(syncTime);
      const buffer = this.currentFile.filename;
      this.soloistSynth = new FadeSyncSynth(startTime, buffer);
      this.soloistSynth.fadeOutDuration = this.sharedParams.getValue('fadeOutDuration');
    }
  }

  _updateSoloistDistance(normDistance, triggerFadeOut) {
    if (this.soloistSynth) {
      if (!triggerFadeOut) {
        const gain = Math.cos(normDistance * Math.PI / 2);
        this.soloistSynth.gain = gain;
      } else {
        this.soloistSynth.fadeOut();
      }
    }
  }

  _soloistRelease() {
    if (this.soloistSynth) {
      this.soloistSynth.release();
      this.soloistSynth = null;
    }
  }
}

export default PlayerExperience;
