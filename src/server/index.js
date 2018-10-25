import 'source-map-support/register'; // enable sourcemaps in node
import path from 'path';
import fs from 'fs';
import * as soundworks from 'soundworks/server';

// @todo - rename to WatchFolder
import DirectoryWatcher from './shared/services/DirectoryWatcher';

import PlayerExperience from './PlayerExperience';
import ControllerExperience from './ControllerExperience';
import SoloistExperience from './SoloistExperience';
import store from './shared/store';
import { EventEmitter } from 'events';

const configName = process.env.ENV || 'default';
const configPath = path.join(__dirname, 'config', configName);
let config = null;

// rely on node `require` for synchronicity
try {
  config = require(configPath).default;
} catch(err) {
  console.error(`Invalid ENV "${configName}", file "${configPath}.js" not found`);
  process.exit(1);
}

// configure express environment ('production' enables express cache for static files)
process.env.NODE_ENV = config.env;
// override config if port has been defined from the command line
if (process.env.PORT) {
  config.port = process.env.PORT;
}

// initialize application with configuration options
soundworks.server.init(config);

// define the configuration object to be passed to the `.ejs` template
soundworks.server.setClientConfigDefinition((clientType, config, httpRequest) => {
  return {
    clientType: clientType,
    env: config.env,
    appName: config.appName,
    websockets: config.websockets,
    version: config.version,
    defaultType: config.defaultClient,
    assetsDomain: config.assetsDomain,
  };
});


const comm = new EventEmitter();
store.init();

// apply user defined globals to the whole application
const globals = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'GLOBALS.json')));

if (globals.areaBackground) {
  config.setup.area.background = globals.areaBackground;
}

const sharedParams = soundworks.server.require('shared-params');
const { min, max, step, defaultValue } = globals.soloist.fadeOutDuration;
sharedParams.addNumber('fadeOutDuration', 'fadeOutDuration', min, max, step, defaultValue);

const sharedConfig = soundworks.server.require('shared-config');
config.globals = globals;
sharedConfig.share('globals', 'player');
sharedConfig.share('globals', 'soloist');
sharedConfig.share('globals', 'controller');

const playerExperience = new PlayerExperience('player', store, comm);
const controllerExperience = new ControllerExperience('controller', store, comm);
const soloistExperience = new SoloistExperience('soloist', store, comm);

// start application
soundworks.server.start();
