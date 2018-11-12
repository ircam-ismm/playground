import { View } from 'soundworks/client';

const template = `
<% if (store) { %>

  <!-- CONTROLLER COMMON -->
  <div class="presets-container">
    <button id="save-state" class="btn">Save Params</button>

    <h6>Allocate Presets Files</h6>
    <% var activeClass = store.globals.currentPreset['granular'] === 'all' ? ' active' : ''; %>
    <button class="select-preset btn<%= activeClass %>" data-target="all">all</button>

    <% var presets = store.fileCollection.reduce(function(a, file) {
         a[file.preset] = file.presetDisplay
         return a;
       }, {});
    %>
    <% for (let preset in presets) { %>
      <% var activeClass = store.globals.currentPreset['granular'] === preset ? ' active' : ''; %>
      <button class="select-preset btn<%= activeClass %>" data-target="<%= preset %>"><%= presets[preset] %></button>
    <% } %>
  </div>

  <div class="client-list">
    <p># players: <%= store.players.length %></p>
    <ul>
      <% store.players.forEach(function(player) { %>
        <!-- display only not loaded players -->
         <% if (!player.fileLoaded.granular) { %>
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

    <h6>Granular Engines</h6>

    <% if (store.globals.currentPresetFileCollection['granular']) { %>
      <% store.globals.currentPresetFileCollection['granular'].forEach(file => { %>
        <%
          let numPlayers = 0;
          store.players.forEach(player => {
            if (player.currentFile['granular'].filename === file.filename) {
              numPlayers += 1;
            }
          });
        %>
        <% if (numPlayers > 0) { %>
        <div class="granular-controller">
          <p class="filename">
            <span>&gt; <%= file.filenameDisplay %> - # players: <%= numPlayers %></span>
          </p>

          <div class="granular-attr">
            <span>start / stop</span>

            <% var className = file.granularPlay ? ' active' : ''; %>
            <% var text = file.granularPlay ? 'stop' : 'start'; %>
            <% var value = new Number(!file.granularPlay); %>

            <button class="btn file-play<%= className %>" data-target="<%= file.filename %>" data-attr="granularPlay" data-value="<%= value %>">
              <%= text %>
            </button>
          </div>

          <button class="granular-attr-container-toggle">open / close attributes</button>

          <div class="granular-attr-container hidden">
          <% for (let attr in granularAttrs) { %>
            <% var attrs = granularAttrs[attr]; %>
            <div class="granular-attr">
              <span><%= attrs.label %></span>
              <input class="file-attr" data-target="<%= file.filename %>" data-attr="<%= attr %>" type="range" min="<%= attrs.min %>" max="<%= attrs.max %>" step="<%= attrs.step %>" value="<%= file[attr] %>" />
              <input class="file-attr" data-target="<%= file.filename %>" data-attr="<%= attr %>" type="number" value="<%= file[attr] %>" />
            </div>
          <% } %>
          </div>

        </div>
        <% } %>
      <% }); %>
    <% } %>

  </div> <!-- end .main -->

<% } %>
`;

const model = {
  store: null,
  triggerSize: 80,
  editedFile: null, // open modal if set to filename, close if null

  granularAttrs: {
    granularVolume: {
      label: 'volume',
      min: 0,
      max: 1,
      step: 0.001,
    },
    granularReleaseDuration: {
      label: 'release duration',
      min: 0,
      max: 10,
      step: 0.1,
    },
    speed: {
      label: 'speed',
      min: -2,
      max: 2,
      step: 0.01,
    },
    positionVar: {
      label: 'positionVar',
      min: 0,
      max: 0.200,
      step: 0.001,
    },
    periodAbs: {
      label: 'period',
      min: 0.001,
      max: 0.300,
      step: 0.001,
    },
    durationAbs: {
      label: 'duration',
      min: 0.010,
      max: 0.300,
      step: 0.001,
    },
    resampling: {
      label: 'resampling',
      min: -1200,
      max: 1200,
      step: 1,
    },
    resamplingVar: {
      label: 'resamplingVar',
      min: 0,
      max: 1200,
      step: 1,
    },
  }
};

class ControllerView extends View {
  constructor(experience, options) {
    super(template, model, {}, options);

    this.experience = experience;

    this.installEvents({
      // common preset logic
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

      // granular controllers
      'input input[type=range].file-attr': e => {
        const $el = e.target;
        const file = $el.dataset.target;
        const attr = $el.dataset.attr;
        const value = parseFloat($el.value);
        // update number box
        const $number = $el.nextElementSibling;
        $number.value = value;

        this.experience.send('update-file-attributes', file, { [attr]: value }, true);
      },

      'change .file-attr': e => {
        const $el = e.target;
        const file = $el.dataset.target;
        const attr = $el.dataset.attr;
        const value = parseFloat($el.value);

        this.experience.send('update-file-attributes', file, { [attr]: value }, false);
      },

      'touchstart .file-play': e => {
        const $el = e.target;
        const file = $el.dataset.target;
        const value = !!parseInt($el.dataset.value);

        this.experience.send('update-file-attributes', file, { granularPlay: value }, false);
      },

      // save state
      'click #save-state': e => {
        e.preventDefault();

        this.experience.send('save-state');
      },

      // open close attributes
      'click .granular-attr-container-toggle': e => {
        e.preventDefault();

        const $container = e.target.nextElementSibling;
        $container.classList.toggle('hidden');
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
