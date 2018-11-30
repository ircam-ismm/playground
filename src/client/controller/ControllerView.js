import { View } from 'soundworks/client';

const template = `
<% if (store) { %>

  <!-- CONTROLLER COMMON -->
  <div class="presets-container">
    <button id="save-state" class="btn">Save Params</button>

    <h6>Allocate Presets Files</h6>
    <% var activeClass = store.globals.currentPreset.trigger === 'all' ? ' active' : ''; %>
    <button class="select-preset btn<%= activeClass %>" data-target="all">all</button>

    <% var presets = store.fileCollection.reduce(function(a, file) {
         a[file.preset] = file.presetDisplay
         return a;
       }, {});
    %>
    <% for (let preset in presets) { %>
      <% var activeClass = store.globals.currentPreset.trigger === preset ? ' active' : ''; %>
      <button class="select-preset btn<%= activeClass %>" data-target="<%= preset %>"><%= presets[preset] %></button>
    <% } %>
  </div>

  <div class="client-list">
    <p># players: <%= store.players.length %></p>
    <ul>
      <% store.players.forEach(function(player) { %>
        <!-- display only players that have not loaded their file -->
        <% if (!player.fileLoaded.trigger) { %>
        <li class="errored-client" style="background-color: <%= player.color %>" data-target="<%= player.uuid %>">
          <%= player.index %>
          <div class="file-loaded">&nbsp;</div>
        </li>
        <% } %>
      <% }); %>
    </ul>
  </div>

  <!-- CONTROLLER SPECIFIC -->
  <div class="main">

    <h6>Triggers</h6>

    <button class="btn trigger-all">Trigger All</button>

    <label class="pad-size">
      <span>PAD SIZE:</span>
      <input id="trigger-size" type="range" min="20" max="80" value="<%= triggerSize %>" />
    </label>

    <% if (store.globals.currentPresetFileCollection.trigger) { %>
      <% store.globals.currentPresetFileCollection['trigger'].forEach((file, index) => { %>

        <p class="filename">
          <span>&gt; <%= file.filenameDisplay %></span>
          <button class="btn edit-file-params" data-target="<%= file.filename %>">trigger params</button>
        </p>

        <ul class="triggers">
          <% store.players.forEach(function(player) { %>
            <% if (player.currentFile && player.currentFile.trigger && file.filename === player.currentFile['trigger'].filename && player.fileLoaded.trigger) { %>
            <li class="trigger-file" data-target="<%= player.uuid %>"style="background-color: <%= player.color %>; width: <%= triggerSize %>px; height: <%= triggerSize %>px; line-height: <%= triggerSize %>px">
              <%= player.index %>

              <div class="file-loaded done">&nbsp;</div>
            </li>
            <% } %>
          <% }); %>
        </ul>

      <% }); %>
    <% } %>

    <% if (editedFile !== null) { %>
      <% var _editedFile = store.fileCollection.find(f => f.filename === editedFile) %>
      <!-- <div class="overlay"></div> -->
      <div class="overlay-content">
        <button class="close-edit-file-params">X</button>

        <p>&gt; <%= _editedFile.filenameDisplay %></p>

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

        this.experience.send('errored-client', uuid);
      },
      'click .select-preset': e => {
        e.preventDefault();

        this.model.editedFile = null;

        const $el = e.target;
        const preset = $el.dataset.target;
        this.experience.send('select-preset', preset);
      },
      'touchstart .trigger-file': e => {
        e.preventDefault();

        const $el = e.target;
        const uuid = $el.dataset.target;

        this.experience.send('trigger-file', uuid);
      },
      'touchstart .trigger-all': e => {
        e.preventDefault();

        this.experience.send('trigger-all');
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
        e.preventDefault();

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

      // save state
      'click #save-state': e => {
        e.preventDefault();

        this.experience.send('save-state');
      }
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
