import { View } from 'soundworks/client';

const template = `
<% if (store) { %>

  <div class="presets-container">
    <h6>Allocate Presets Files</h6>
    <% var activeClass = store.globals.currentPreset === 'all' ? ' active' : ''; %>
    <button class="select-preset btn<%= activeClass %>" data-target="all">all</button>

    <% var presets = store.fileCollection.reduce(function(a, file) { return a.add(file.preset); }, new Set()); %>
    <% presets.forEach(function(preset) { %>
      <% var activeClass = store.globals.currentPreset === preset ? ' active' : ''; %>
      <button class="select-preset btn<%= activeClass %>" data-target="<%= preset %>"><%= preset %></button>
    <% }); %>
  </div>

  <div class="client-list">
    <ul>
      <% store.players.forEach(function(player) { %>
        <!-- display noly not loaded players -->
         <% if (!player.fileLoaded) { %>
        <li class="errored-client" style="background-color: <%= player.color %>" data-target="<%= player.uuid %>">
          <%= player.index %>
          <div class="file-loaded">&nbsp;</div>
        </li>
        <% } %>
      <% }); %>
    </ul>
  </div>

  <div class="main">
    <!--
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
    -->


    <h6>Triggers</h6>

    <label class="pad-size">
      <span>PAD SIZE:</span>
      <input id="trigger-size" type="range" min="20" max="80" value="<%= triggerSize %>" />
    </label>

    <% var fileCollection = store.globals.currentPresetFileCollection ? store.globals.currentPresetFileCollection : store.fileCollection; %>
    <% fileCollection.forEach((file, index) => { %>

      <p class="filename">
        <span><%= file.displayName %></span>
        <button class="btn edit-file-params" data-target="<%= file.filename %>">trigger file params</button>
      </p>

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

    <% if (editedFile !== null) { %>
      <% var _editedFile = store.fileCollection.find(f => f.filename === editedFile) %>
      <!-- <div class="overlay"></div> -->
      <div class="overlay-content">
        <button class="close-edit-file-params">X</button>

        <p>&gt; <%= _editedFile.displayName %></p>

        <label>
          <span>Repeat: </span>
          <input class="file-attr" data-attr="repeat" data-target="<%= _editedFile.filename %>" type="number" value="<%= _editedFile.repeat %>" />
        </label>
        <label>
          <span>Period: </span>
          <input class="file-attr" data-attr="period" data-target="<%= _editedFile.filename %>" type="number" value="<%= _editedFile.period %>" />
        </label>
        <label>
          <span>Jitter: </span>
          <input class="file-attr" data-attr="jitter" data-target="<%= _editedFile.filename %>" type="number" value="<%= _editedFile.jitter %>" />
        </label>
        <label>
          <span>Release duration: </span>
          <input class="file-attr" data-attr="releaseDuration" data-target="<%= _editedFile.filename %>" type="number" value="<%= _editedFile.releaseDuration %>" />
        </label>
      </div>
    <% } %>

  </div> <!-- end .main -->

<% } %>
`;

const model = {
  store: null,
  triggerSize: 80,
  editedFile: null, // open modal if set to filename, close if null

  // @to be removed
  soundFileOpened: false,
  clientListOpened: false,
};

class ControllerView extends View {
  constructor(experience, options) {
    super(template, model, {}, options);

    this.experience = experience;

    this.installEvents({
      // retrigger file change for errored clients
      'click .errored-client': e => {
        const $client = e.target;
        const uuid = $client.dataset.target;

        this.experience.send('update-player-file', uuid);
      },
      'touchstart .trigger-file': e => {
        e.preventDefault();

        const $el = e.target;
        const uuid = $el.dataset.target;

        this.experience.send('trigger-file', uuid);
      },
      'click .select-preset': e => {
        e.preventDefault();

        this.model.editedFile = null;

        const $el = e.target;
        const preset = $el.dataset.target;
        this.experience.send('select-preset', preset);
      },

      'input #trigger-size': e => {
        const value = parseInt(e.target.value);
        const $triggers = document.querySelectorAll('.trigger-file');
        $triggers.forEach($trigger => {
          $trigger.style.width = `${value}px`;
          $trigger.style.height = `${value}px`;
          $trigger.style.lineHeight = `${value}px`;
          this.model.triggerSize = value;
        });
      },
      // open / close modal
      'click .edit-file-params': e => {
        e.preventDefault();

        const $btn = e.target;
        const filename = $btn.dataset.target;

        this.model.editedFile = filename;
        this.render();
      },
      'click .close-edit-file-params': e => {
        console.log('???');
        this.model.editedFile = null;
        this.render();
      },

      'change .file-attr': e => {
        const $el = e.target;
        const file = $el.dataset.target;
        const attr = $el.dataset.attr;
        const value = parseFloat($el.value);

        this.experience.send('update-file-attributes', file, { [attr]: value });
      },

      // 'click .overlay': e => {
      //   console.log('???');
      //   this.model.editedFile = null;
      //   this.render();
      // },
    });
  }

  onRender() {
    super.onRender();
  }

  onResize(width, height, orientation) {
    super.onResize(width, height, orientation);

    if (this.model.store) {
      this.$presetContainer = this.$el.querySelector('.presets-container');
      const presetContainerHeight = this.$presetContainer.getBoundingClientRect().height;

      this.$clientList = this.$el.querySelector('.client-list');
      this.$clientList.style.top = `${presetContainerHeight}px`;
      this.$clientList.style.height = `${height - presetContainerHeight}px`;

      this.$main = this.$el.querySelector('.main');
      this.$main.style.top = `${presetContainerHeight}px`;
      this.$main.style.height = `${height - presetContainerHeight}px`;
    }
  }
}

export default ControllerView;
