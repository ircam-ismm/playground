import { Experience, View, client} from 'soundworks/client';

const template = `
<% if (store) { %>

  <h6>Select File</h6>

  <button id="allocate-randomly" class="btn">Allocate<br />Randomly</button>

  <div id="soundfile-attributes">
    <button class="close btn">open / close</button>

    <ul id="files-controls">
    <% store.fileCollection.forEach(function(file) { %>
      <li>
        <p><%= file.filename %></p>
        <label>Repeat: <input class="file-attr" data-attr="repeat" data-target="<%= file.filename %>" type="number" value="<%= file.repeat %>" /></label>
        <label>Period: <input class="file-attr" data-attr="period" data-target="<%= file.filename %>" type="number" value="<%= file.period %>" /></label>
        <label>Jitter: <input class="file-attr" data-attr="jitter" data-target="<%= file.filename %>" type="number" value="<%= file.jitter %>" /></label>
      </li>
    <% }); %>
    </ul>
  </div>

  <div id="client-list">
    <button class="close btn">open / close</button>

    <ul id="file-chooser">
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
              <%= file.filename %>
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

  <input id="trigger-size" type="range" min="20" max="80" value="<%= triggerSize %>" />

  <h6>Triggers</h6>

  <% store.fileCollection.forEach((file, index) => { %>
    <p class="filename"><%= file.filename %></p>
    <% var rgb = 255 - Math.ceil(index / store.fileCollection.length * 255); %>

    <ul class="triggers">
      <% store.players.forEach(function(player) { %>
        <% if (player.currentFile && file.filename === player.currentFile.filename) { %>
        <li class="trigger" data-target="<%= player.uuid %>"style="background-color: <%= player.color %>; width: <%= triggerSize %>px; height: <%= triggerSize %>px; line-height: <%= triggerSize %>px">
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

<% } %>
`;

class ControllerView extends View {
  onResize(width, height, orientation) {
    // console.log(width, height, orientation);
  }
}

class ControllerExperience extends Experience {
  constructor() {
    super();
  }

  start() {
    super.start();

    this.view = new ControllerView(template, {
      store: null,
      triggerSize: 80,

    }, {
      'change .sound-file': e => {
        const $select = e.target;
        const filename = $select.value || null;
        const uuid = $select.dataset.target;

        this.send('update-player-file', uuid, filename);
      },
      'touchstart .trigger': e => {
        e.preventDefault();

        const $el = e.target;
        const uuid = $el.dataset.target;

        this.send('trigger', uuid);
      },
      'click #allocate-randomly': e => {
        e.preventDefault();

        this.send('allocate-randomly');
      },
      'click .close': e => {
        e.preventDefault();

        const $target = e.target.nextElementSibling;

        if ($target.classList.contains('hidden'))
          $target.classList.remove('hidden');
        else
          $target.classList.add('hidden');
      },
      'input #trigger-size': e => {
        const value = parseInt(e.target.value);
        const $triggers = document.querySelectorAll('.trigger');
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

        this.send('update-file-attr', file, attr, value);
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
