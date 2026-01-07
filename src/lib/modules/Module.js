import ModuleHost from './ModuleHost.js';
import { isString } from '@ircam/sc-utils';

export default class Module {
  #host;
  #name;

  constructor(host, name) {
    if (!(host instanceof ModuleHost)) {
      throw new Error('Cannot construct Component: argument 1 is not an instance of ComponentHost');
    }

    if (!isString(name)) {
      throw new Error('Cannot construct Component: argument 2 is not a valid component name (string)');
    }

    if (host.modules.has(name)) {
      throw new Error(`Cannot construct Component with name ${name}: a component with same name already exists`);
    }

    this.#host = host;
    this.#name = name;

    this.#host.modules.set(name, this);
    // create a getter dynamically for convenience
    Object.defineProperty(this.#host, name, {
      get: () => this,
    });
  }

  get name() {
    return this.#name;
  }

  get host() {
    return this.#host;
  }

  get stateManager() {
    return this.#host.stateManager;
  }

  get pluginManager() {
    return this.#host.pluginManager;
  }

  // lifecycle method - binded to soundworks lifecycle
  // async init() {}
  async start() {}
  async stop() {}
  // async setProject(projectDirname) {}

}

