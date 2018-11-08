// Import Soundworks modules (client side)
import { SpaceView, View, viewport, TouchSurface, Experience } from 'soundworks/client';
import * as controllers from '@ircam/basic-controllers';

// define the template of the view used by the experience
// the template uses some of the helper classes defined in `sass/_02-commons.scss`
class SoloistView extends View {
  constructor(background, foreground, events) {
    super('', {}, events, { id: 'soloist' });

    this.template = `
      <div class="background fit-container"></div>
      <div class="foreground fit-container">
        <div id="controllers"></div>
      </div>
    `;

    this.background = background;
    this.foreground = foreground;
  }

  render(sel) {
    const $el = super.render(sel);

    const $background = this.background.render();
    const $foreground = this.foreground.render();

    this.$el.querySelector('.background').appendChild($background);
    this.$el.querySelector('.foreground').appendChild($foreground);

    return $el;
  }

  onRender() {
    super.onRender();
  }

  show() {
    super.show();

    this.background.show();
    this.foreground.show();
  }
}


/**
 * The `SoloistPerformance` class is responsible for:
 * - displaying the positions of the player` client in the given `area`
 * - tracking the soloist's touche(s) on screen and sending their
 *   coordinates to the server.
 */
class SoloistExperience extends Experience {
  constructor() {
    super();

    this.platform = this.require('platform', { features: ['wake-lock'] });
    this.sharedConfig = this.require('shared-config');
    this.sharedParams = this.require('shared-params');

    /**
     * Area of the scenario.
     * @type {Object}
     */
    this.area = null;

    /**
     * Radius of the excited zone relative to the setup area definition.
     * @type {Number}
     */
    this.radius = 0.1;

    /**
     * Object containing the current touch coordinates, ids of the
     * touch events are used as keys.
     * @type {Object<String, Array<Number>>}
     */
    this.touches = {};

    /**
     * Object containing the object used to render the feedback of the touches,
     * ids of the touch events are used as keys.
     * @type {Object<String, Array<Number>>}
     */
    this.renderedTouches = {};

    /**
     * List of the timeout ids for each touch events, ids of the touch events
     * are used as keys.
     * @type {Object<String, Number>}
     */
    this.timeouts = {};

    /**
     * The delay in which a touch event is cancelled of no touch move or touch
     * end occured since its start.
     * @type {Numeber}
     */
    this.timeoutDelay = 6000;

    // bind methods to the instance to keep a safe `this` in callbacks
    this.updateRadius = this.updateRadius.bind(this);

    this.onTouchStart = this.onTouchStart.bind(this);
    this.onTouchMove = this.onTouchMove.bind(this);
    this.onTouchEnd = this.onTouchEnd.bind(this);

    this.onPlayerList = this.onPlayerList.bind(this);
    this.onPlayerAdd = this.onPlayerAdd.bind(this);
    this.onPlayerRemove = this.onPlayerRemove.bind(this);
  }

  /**
   * Start the experience when all services are ready.
   */
  start() {
    super.start();

    this.area = this.sharedConfig.get('setup.area');
    // we don't wnt the backgroud image on soloists
    this.area.background = null;

    // create a background `SpaceView` to display players positions
    this.playersSpace = new SpaceView();
    this.playersSpace.setArea(this.area);
    // create a foreground `SpaceView` for interactions feedback
    this.interactionsSpace = new SpaceView();
    this.interactionsSpace.setArea(this.area);

    this.view = new SoloistView(this.playersSpace, this.interactionsSpace, {});

    this.receive('player:list', this.onPlayerList);
    this.receive('player:add', this.onPlayerAdd);
    this.receive('player:remove', this.onPlayerRemove);

    this.show().then(() => {
      const surface = new TouchSurface(this.interactionsSpace.$svg);
      // setup listeners to the `TouchSurface` events
      surface.addListener('touchstart', this.onTouchStart);
      surface.addListener('touchmove', this.onTouchMove);
      surface.addListener('touchend', this.onTouchEnd);

      const $controllers = this.view.$el.querySelector('#controllers');

      const globals = this.sharedConfig.get('globals');
      const fadeOutDurationParams = globals.soloist.fadeOutDuration;

      const $fadeOut = new controllers.Slider({
        container: $controllers,
        min: fadeOutDurationParams.min,
        max: fadeOutDurationParams.max,
        step: fadeOutDurationParams.step,
        default: fadeOutDurationParams.defaultValue,
        label: 'fade-out duration',
        size: 'large',
        callback: value => this.sharedParams.update('fadeOutDuration', value),
      });

      const radiusParams = globals.soloist.radius;

      const $radius = new controllers.Slider({
        container: $controllers,
        min: radiusParams.min,
        max: radiusParams.max,
        step: radiusParams.step,
        default: radiusParams.defaultValue,
        label: 'radius',
        size: 'large',
        callback: this.updateRadius,
      });

      this.radius = radiusParams.defaultValue;
    });
  }

  /**
   * Display all the players from a list in the space visualization.
   * @param {Object[]} playerList List of players.
   */
  onPlayerList(playerList) {
    this.playersSpace.addPoints(playerList);
  }

  /**
   * Add a player to the space visualization.
   * @param {Object} player Player.
   */
  onPlayerAdd(playerInfos) {
    this.playersSpace.addPoint(playerInfos);
  }

  /**
   * Remove a player from the space visualization.
   * @param {Object} player Player.
   */
  onPlayerRemove(playerInfos) {
    this.playersSpace.deletePoint(playerInfos.id);
  }

  updateRadius(value) {
    this.radius = value;

    // update touches sent to the server
    for (let id in this.touches) {
      this.touches[id].radius = value;
    }

    this.sendCoordinates();

    const radiusPixels = (this.radius / this.area.width) * this.interactionsSpace.areaWidth;
    // update rendering
    for (let id in this.renderedTouches) {
      const point = this.renderedTouches[id];
      point.radius = radiusPixels;
      this.interactionsSpace.updatePoint(point);
    }
  }

  /**
   * Callback for the `touchstart` event.
   * @param {Number} id - The id of the touch event as given by the browser.
   * @param {Number} x - The normalized x coordinate of the touch according to the
   *  listened `DOMElement`.
   * @param {Number} y - The normalized y coordinate of the touch according to the
   *  listened `DOMElement`.
   */
  onTouchStart(id, x, y) {
    // define the position according to the area (`x` and `y` are normalized values)
    const area = this.area;
    x = x * area.width;
    y = y * area.height;

    // add the coordinates to the ones sended to the server
    this.touches[id] = { x, y, radius: this.radius };
    this.sendCoordinates();

    // defines the radius of excitation in pixels according to the rendered area.
    const radius = (this.radius / area.width) * this.interactionsSpace.areaWidth;
    // create an object to be rendered by the `interactionsSpace`
    const point = { id, x, y, radius };
    // keep a reference to the rendered point for update
    this.renderedTouches[id] = point;
    // render the point
    this.interactionsSpace.addPoint(point);

    // timeout if the `touchend` does not trigger
    clearTimeout(this.timeouts[id]);
    this.timeouts[id] = setTimeout(() => this.onTouchEnd(id), this.timeoutDelay);
  }

  /**
   * Callback for the `touchmove` event.
   * @param {Number} id - The id of the touch event as given by the browser.
   * @param {Number} x - The normalized x coordinate of the touch according to the
   *  listened `DOMElement`.
   * @param {Number} y - The normalized y coordinate of the touch according to the
   *  listened `DOMElement`.
   */
  onTouchMove(id, x, y) {
    const area = this.area;
    x = x * area.width;
    y = y * area.height;

    // update values sended to the server
    const touch = this.touches[id];
    touch.x = x;
    touch.y = y;

    this.sendCoordinates();

    // update the feedback point
    const point = this.renderedTouches[id];
    point.x = x;
    point.y = y;

    this.interactionsSpace.updatePoint(point);

    // set a new timeout if the `touchend` does not trigger
    clearTimeout(this.timeouts[id]);
    this.timeouts[id] = setTimeout(() => this.onTouchEnd(id), this.timeoutDelay);
  }

  /**
   * Callback for the `touchend` and `touchcancel` events.
   * @param {Number} id - The id of the touch event as given by the browser.
   * @param {Number} x - The normalized x coordinate of the touch according to the
   *  listened `DOMElement`.
   * @param {Number} y - The normalized y coordinate of the touch according to the
   *  listened `DOMElement`.
   */
  onTouchEnd(id) {
    // cancel preventive timeout for this id
    clearTimeout(this.timeouts[id]);

    // remove feedback point
    const point = this.renderedTouches[id];
    this.interactionsSpace.deletePoint(point.id);
    // destroy references to this particular touch event
    delete this.touches[id];
    delete this.renderedTouches[id];

    this.sendCoordinates();
  }

  /**
   * Send the current state of the touche coordinates to the server.
   */
  sendCoordinates() {
    this.send('input:change', this.touches);
  }
}

export default SoloistExperience;
