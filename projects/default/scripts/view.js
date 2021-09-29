function view(render, html, $container) {
  // this is called at initialization and on script update
  //
  // for example to do 2d animations:
  // - we could  create a canvas and launch a requestAnimationFrame loop)
  // - update state from data in update
  // - clear the requestAnimationFrame in destroy

  return {
    // this is called each time an updates in states are made
    update(data) {
      const {
        globals,
        player,
        config,
        showConnectedScreen,
        flashScreen,
      } = data;

      // const color = flashScreen ? '#ffffff' : player.color;
      const color = flashScreen ? '#ffffff' : '#000000';
      const opacity = 1 - player.soloistDistance;

      const template = html`
        <div class="screen"
          style="
            background-color: ${color};
            position: relative;
            overflow-y: auto;
            min-height: 100%;
            width: 100%;
          "
        >
          ${globals.instructionsState === 'thanks' ?
            // final screen
            html`
              <div
            style="
              position: absolute;
              top: 0;
              height: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.9);
              "
            >
              <p
                style="
                  padding-top: 120px;
                  text-align: center;
                  font-size: 14px;
                  line-height: 20px;
                "
              >
                ${config.project.thanksMessage}
              </p>
            </div>
            `
          : showConnectedScreen ?
            html`
              <div
              style="
                position: absolute;
                top: 0;
                height: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.9);
                "
              >
                <p
                  style="
                    padding-top: 120px;
                    text-align: center;
                    font-size: 14px;
                    line-height: 20px;
                  "
                >
                  ${config.project.connectionMessage}
                </p>
            </div>
            `
          : ''}

          <div
            style="
              position: absolute;
              top: 0;
              height: 0;
              width: 100%;
              height: 100%;
              background-color: white;
              opacity: ${opacity};
            "
          ></div>


          <pre><code style="font-size: 7px; padding: 4px; display: block;">
  master: ${globals.master}
  mute: ${globals.mute}
  cutoffFrequency: ${globals.cutoffFrequency}
  ${JSON.stringify(player, null, 2)}
          </code></pre>
        </div>
      `;

      render(template, $container);
    },
    // this is called when the script is updated
    destroy() {

    },
  }
}