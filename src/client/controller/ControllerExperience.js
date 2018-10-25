import { Experience, View, client} from 'soundworks/client';

const template = `
<% if (store) { %>

  <div class="allocate-randomly-container">
    <% var activeClass = store.globals.currentPreset === 'all' ? ' active' : ''; %>
    <button class="allocate-randomly btn<%= activeClass %>" data-target="all">Allocate all</button>

    <% var presets = store.fileCollection.reduce(function(a, file) { return a.add(file.preset); }, new Set()); %>
    <% presets.forEach(function(preset) { %>
      <% var activeClass = store.globals.currentPreset === preset ? ' active' : ''; %>
      <button class="allocate-randomly btn<%= activeClass %>" data-target="<%= preset %>">Allocate <%= preset %></button>
    <% }); %>

  </div>

  <div class="main">
    <div id="soundfile-attributes">
      <button class="close btn">Trigger config - open / close</button>

      <ul id="files-controls" data-model-attr="soundFileOpened"<%= soundFileOpened === false ? ' class="hidden"' : '' %>>

      <% var fileCollection = store.globals.currentPresetFileCollection ? store.globals.currentPresetFileCollection : store.fileCollection; %>
      <% fileCollection.forEach(function(file) { %>
        <li>
          <p><%= file.displayName %></p>
          <label>Repeat: <input class="file-attr" data-attr="repeat" data-target="<%= file.filename %>" type="number" value="<%= file.repeat %>" /></label>
          <label>Period: <input class="file-attr" data-attr="period" data-target="<%= file.filename %>" type="number" value="<%= file.period %>" /></label>
          <label>Jitter: <input class="file-attr" data-attr="jitter" data-target="<%= file.filename %>" type="number" value="<%= file.jitter %>" /></label>
          <label>Release duration: <input class="file-attr" data-attr="releaseDuration" data-target="<%= file.filename %>" type="number" value="<%= file.releaseDuration %>" /></label>
        </li>
      <% }); %>
      </ul>
    </div>

    <div id="client-list">
      <button class="close btn">Client Select File - open / close</button>

      <ul id="file-chooser" data-model-attr="clientListOpened"<%= clientListOpened === false ? ' class="hidden"' : '' %>>
      <% store.players.forEach(function(player) { %>
        <li>
          <div class="color" style="background-color: <%= player.color %>">
            <%= player.index %>
          </div>

          <select class="sound-file" data-target="<%= player.uuid %>">
            <option value="">Select audio file</option>

            <% store.fileCollection.forEach(function(file) { %>
              <% if (player.currentFile && file.filename === player.currentFile.filename) { %>
              <option value="<%= file.filename %>" selected>
              <% } else { %>
              <option value="<%= file.filename %>">
              <% } %>
                <%= file.displayName %>
              </option>
            <% }); %>

          </select>

          <% if (player.fileLoaded) { %>
            <div class="file-loaded done">&nbsp;</div>
          <% } else { %>
            <div class="file-loaded">&nbsp;</div>
          <% } %>
        </li>

      <% }); %>
      </ul>
    </div>


    <h6>Triggers</h6>

    <label>
      PAD SIZE:
      <input id="trigger-size" type="range" min="20" max="80" value="<%= triggerSize %>" />
    </label>

    <% var fileCollection = store.globals.currentPresetFileCollection ? store.globals.currentPresetFileCollection : store.fileCollection; %>
    <% fileCollection.forEach((file, index) => { %>
      <p class="filename"><%= file.displayName %></p>
      <% var rgb = 255 - Math.ceil(index / store.fileCollection.length * 255); %>

      <ul class="triggers">
        <% store.players.forEach(function(player) { %>
          <% if (player.currentFile && file.filename === player.currentFile.filename) { %>
          <li class="trigger-file" data-target="<%= player.uuid %>"style="background-color: <%= player.color %>; width: <%= triggerSize %>px; height: <%= triggerSize %>px; line-height: <%= triggerSize %>px">
            <%= player.index %>

            <% if (player.fileLoaded) { %>
              <div class="file-loaded done">&nbsp;</div>
            <% } else { %>
              <div class="file-loaded">&nbsp;</div>
            <% } %>
          </li>
          <% } %>
        <% }); %>
      </ul>
    <% }); %>
  </div> <!-- end .main -->

<% } %>
`;

class ControllerView extends View {
  // onResize(width, height, orientation) {
  //   // console.log(width, height, orientation);
  // }
}

class ControllerExperience extends Experience {
  constructor() {
    super();

    this.platform = this.require('platform', { features: ['wake-lock'] });
  }

  start() {
    super.start();

    this.view = new ControllerView(template, {
      store: null,
      triggerSize: 80,
      soundFileOpened: false,
      clientListOpened: false,
    }, {
      'change .sound-file': e => {
        const $select = e.target;
        const filename = $select.value || null;
        const uuid = $select.dataset.target;

        this.send('update-player-file', uuid, filename);
      },
      'touchstart .trigger-file': e => {
        e.preventDefault();

        const $el = e.target;
        const uuid = $el.dataset.target;

        this.send('trigger-file', uuid);
      },
      'click .allocate-randomly': e => {
        e.preventDefault();

        const $el = e.target;
        const preset = $el.dataset.target;
        this.send('allocate-randomly', preset);
      },
      'click .close': e => {
        e.preventDefault();

        const $target = e.target.nextElementSibling;
        const modelAttr = $target.dataset.modelAttr;
        this.view.model[modelAttr] = !this.view.model[modelAttr];

        if (this.view.model[modelAttr] === true) {
          $target.classList.remove('hidden');
        } else {
          $target.classList.add('hidden');
        }
      },
      'input #trigger-size': e => {
        const value = parseInt(e.target.value);
        const $triggers = document.querySelectorAll('.trigger-file');
        $triggers.forEach($trigger => {
          $trigger.style.width = `${value}px`;
          $trigger.style.height = `${value}px`;
          $trigger.style.lineHeight = `${value}px`;
          this.view.model.triggerSize = value;
        });
      },
      'change .file-attr': e => {
        const $el = e.target;
        const file = $el.dataset.target;
        const attr = $el.dataset.attr;
        const value = parseFloat($el.value);

        this.send('update-file-attributes', file, { [attr]: value });
      }
    }, {
      id: 'controller',
    });

    this.receive('update-store', store => {
      this.view.model.store = store;
      this.view.render();
    });

    this.show().then(() => {});
  }

  stop() {
    super.stop();
  }
}

export default ControllerExperience;
