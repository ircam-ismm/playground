import { Experience, View } from 'soundworks/client';

const template = `
<% if (store) { %>

  <h6>Select File</h6>

  <button id="allocate-randomly" class="btn">Allocate Randomly</button>
  <ul id="file-chooser">
  <% store.players.forEach(function(player) { %>

    <li>
      <div class="color" style="background-color: <%= player.color %>">
        <%= player.index %>
      </div>

      <select class="sound-file" data-target="<%= player.uuid %>">
        <option value="">Select audio file</option>

        <% store.fileList.forEach(function(file) { %>
          <% if (file === player.currentFile) { %>
          <option value="<%= file %>" selected>
          <% } else { %>
          <option value="<%= file %>">
          <% } %>
            <%= file %>
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

  <h6>Triggers</h6>
  <ul id="trigger">
    <% store.players.forEach(function(player) { %>
      <li class="trigger" data-target="<%= player.uuid %>" style="background-color: <%= player.color %>">
        <%= player.index %>
      </li>
    <% }); %>
  </ul>

<% } %>
`;

class ControllerExperience extends Experience {
  constructor() {
    super();
  }

  start() {
    super.start();

    this.view = new View(template, { store: null }, {
      'change .sound-file': e => {
        const $select = e.target;
        const file = $select.value || null;
        const uuid = $select.dataset.target;

        this.send('update-player-file', uuid, file);
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
    }, {
      id: 'controller',
    });

    this.receive('update-store', store => {
      this.view.model.store = store;
      this.view.render();
    });

    this.show().then(() => {

    });
  }

  stop() {
    super.stop();
  }
}

export default ControllerExperience;
