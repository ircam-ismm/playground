import merge from 'lodash.merge';
import * as soundworks from 'soundworks/client';
import FadeSyncSynth from './FadeSyncSynth';
import TriggerSynth from './TriggerSynth';
import GranularSynth from './GranularSynth';
// import { centToLinear } from 'soundworks/utils/math';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

const template = `
  <div class="foreground" style="background-color: <%= player ? player.color : '#000000' %>">
    <div class="section-top flex-middle"></div>
    <div class="section-center">
    <% if (player) { %>
      <p class="big align-center"><%= player.index %></p>
      <% for (let key in player.currentFile) { %>
        <p class="soundfile-details">
          <span><%= key %>:</span> <%= player.currentFile[key].filenameDisplay %>
        </p>
      <% } %>
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
    this.sharedConfig = this.require('shared-config');

    this.globals = null;
    this.currentFile = {};
    this.soloistSynth = null;
    this.granularSynth = null;

    this._updateFile = this._updateFile.bind(this);
    this._updateFileAttributes = this._updateFileAttributes.bind(this);
    this._triggerFile = this._triggerFile.bind(this);

    // control from soloist
    this._soloistStart = this._soloistStart.bind(this);
    this._updateSoloistDistance = this._updateSoloistDistance.bind(this);
    this._soloistRelease = this._soloistRelease.bind(this);
  }

  start() {
    super.start(); // don't forget this
    // from GLOBALS.json
    this.globals = this.sharedConfig.get('globals');
    // initialize the view
    this.view = new soundworks.SegmentedView(template, { player: null }, {}, {
      id: 'player',
      preservePixelRatio: true,
    });

    this.receive('setup', player => {
      this.view.model.player = player;
      this.view.render();
    });

    this.receive('update-file', this._updateFile);
    this.receive('update-file-attributes', this._updateFileAttributes);
    this.receive('trigger-file', this._triggerFile);

    // play from soloist
    this.receive('soloist:start', this._soloistStart);
    this.receive('soloist:distance', this._updateSoloistDistance);
    this.receive('soloist:release', this._soloistRelease);

    this.sharedParams.addParamListener('fadeOutDuration', value => {
      if (this.soloistSynth) {
        this.soloistSynth.fadeOutDuration = value;
      }
    });

    this.audioFileStack = [];
    this.audioFileStackMaxLength = 3;

    this.show();
  }

  _updateFile(player, type) {
    const audioFile = player.currentFile[type];

    if (audioFile) {
      const storedFile = this.audioFileStack.find(a => a.filename === audioFile.filename);

      // if already loaded
      if (storedFile !== undefined) {
        this.currentFile[type] = storedFile;

        this.send('file-loaded', client.uuid, type);
        this.view.model.player = player;
        this.view.render();
      } else {
        if (this.audioFileStack.length >= this.audioFileStackMaxLength) {
          const deleted = this.audioFileStack.shift(); // remove oldest elements
        }

        this.audioBufferManager
          .load({ [audioFile.filename]: audioFile.filename })
          .then(data => {
            audioFile.buffer = this.audioBufferManager.data[audioFile.filename];
            this.audioFileStack.push(audioFile);

            // delete reference from audioBufferManager
            delete this.audioBufferManager.data[audioFile.filename];

            this.currentFile[type] = audioFile;

            this.send('file-loaded', client.uuid, type);
            this.view.model.player = player;
            this.view.render();
          });
      }
    }
  }

  _updateFileAttributes(type, filename, defs) {
    if (this.currentFile[type] &&  this.currentFile[type].filename === filename) {
      merge(this.currentFile[type], defs);

      if (type === 'granular') {
        const file = this.currentFile[type];

        if (this.granularSynth === null && file.granularPlay) {
          this.granularSynth = new GranularSynth(file);
          this.granularSynth.start();
        } else if (this.granularSynth && !file.granularPlay) {
          this.granularSynth.stop();
          this.granularSynth = null;
        } else if (this.granularSynth && file.granularPlay) {
          this.granularSynth.updateParams(defs);
        }
      }
    }
  }

  _triggerFile() {
    if (this.currentFile['trigger']) {
      const synth = new TriggerSynth(this.currentFile['trigger']);
      synth.trigger();
    }
  }

  // control from soloist
  _soloistStart(syncTime) {
    if (this.currentFile['trigger']) {
      const startTime = this.sync.getAudioTime(syncTime);
      const buffer = this.currentFile['trigger'].buffer;
      this.soloistSynth = new FadeSyncSynth(startTime, buffer);
      this.soloistSynth.fadeOutDuration = this.sharedParams.getValue('fadeOutDuration');
    }
  }

  _updateSoloistDistance(normDistance, triggerFadeOut) {
    if (this.soloistSynth) {
      if (!triggerFadeOut) {
        const decayExponent = this.globals.soloist.decayExponent;
        const gain = Math.pow(1 - normDistance, decayExponent);
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
