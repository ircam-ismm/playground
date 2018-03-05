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
      <p class="align-center"><%= player.currentFile ? player.currentFile : '' %></p>
      <% } %>
    </div>
    <div class="section-bottom flex-middle"></div>
  </div>
`;

class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin', { showDialog: false });
    this.audioBufferManager = this.require('audio-buffer-manager', {
      assetsDomain: assetsDomain,
    });

    this.currentBuffer = null;
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
        if (this.audioBufferManager.data[audioFile]) {
          const buffer = this.audioBufferManager.data[audioFile];
          this.currentBuffer = buffer;
          this.send('file-loaded', client.uuid);
          this.view.model.player = player;
          this.view.render();
        } else  {
          this.audioBufferManager
            .load({ [audioFile]: audioFile })
            .then(data => {
              this.currentBuffer = data[audioFile];
              this.send('file-loaded', client.uuid);
              this.view.model.player = player;
              this.view.render();
            });
        }
      }
    });

    this.receive('trigger', () => {
      if (this.currentBuffer !== null) {
        const src = audioContext.createBufferSource();
        src.connect(audioContext.destination);
        src.buffer = this.currentBuffer;
        src.start();
      }
    });

    // as show can be async, we make sure that the view is actually rendered
    this.show();
  }
}

export default PlayerExperience;
