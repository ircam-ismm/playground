import {
  counter,
  isFunction,
  isString,
} from '@ircam/sc-utils';
import {
  serializeError,
  deserializeError,
} from 'serialize-error';


const rfcDescription = {
  name: {
    type: 'string',
    event: true,
  },
  sourceNodeId: {
    type: 'integer',
    event: true,
  },
  executorNodeId: {
    type: 'integer',
    event: true,
  },
  commandId: {
    type: 'integer',
    event: true,
  },
  payload: {
    type: 'any',
    event: true,
  },
  settled: {
    type: 'boolean',
    event: true,
  },
  responseAck: {
    type: 'any',
    event: true,
  },
  responseErr: {
    type: 'any',
    event: true,
  },
};


export default class ModuleHost {
  #node; // soundworks node
  #modules = new Map();

  #rfcMessageBus;
  #rfcIdGenerator = counter();
  #rfcPendingStore = new Map();
  #rfcHandlers = new Map();
  #rfcResolverHooks = new Map();xz

  /**
   *
   * @param {Client|Server} node - Instance of soundworks client or server
   */
  constructor(node) {
    this.#node = node;

    if (this.#node.id === this.constants.SERVER_ID) {
      this.#node.stateManager.defineClass('module-host:rfc', rfcDescription);
    }
  }

  get node() {
    return this.#node;
  }

  get nodeId() {
    return this.#node.id;
  }

  get modules() {
    return this.#modules;
  }

  get stateManager() {
    return this.#node.stateManager;
  }

  get pluginManager() {
    return this.#node.pluginManager;
  }

  get constants() {
    return {
      SERVER_ID: -1,
    };
  }

  async init() {
    if (this.node.status === 'idle') {
      await this.node.init();

      // for (let component of this.#modules.values()) {
      //   await component.init();
      // }
    }
  }

  async start() {
    await this.init();
    await this.node.start();

    // create / attach to global shared states
    if (this.nodeId === this.constants.SERVER_ID) {
      // global command mechanism: send a command and await for its execution
      this.#rfcMessageBus = await this.stateManager.create('module-host:rfc');
      this.#rfcMessageBus.onUpdate(this.#handleRfc);
    } else {
      // global command mechanism: send a command and await for its execution
      this.#rfcMessageBus = await this.stateManager.attach('module-host:rfc');
      this.#rfcMessageBus.onUpdate(this.#handleRfc);
    }

    for (let component of this.#modules.values()) {
      await component.start();
    }
  }

  async stop() {
    for (let component of this.#modules.values()) {
      await component.stop();
    }

    await this.node.stop();
  }

  /**
   * Request a remote function call
   *
   * @todo
   * - We could just lazily attach to a per node owned state to minimize network load
   * - This could be integrated into soundworks
   *
   * @param {*} executorNodeId
   * @param {*} name
   * @param {*} [payload={}]
   * @returns
   */
  async requestRfc(executorNodeId, name, payload = {}) {
    if (!Number.isInteger(executorNodeId)) {
      throw new Error('Cannot execute "requestRfc" on ComoNode: argument 1 is not a valid node id');
    }

    if (!isString(name)) {
      throw new Error('Cannot execute "requestRfc" on ComoNode: argument 2 is not a valid remote function call name, must be a string');
    }

    try {
      JSON.stringify(payload);
    } catch(err) {
      throw new Error('Cannot execute "requestRfc" on ComoNode: argument 3 cannot be stringified to JSON');
    }

    const commandId = this.#rfcIdGenerator();

    this.#rfcMessageBus.set({
      name,
      sourceNodeId: this.nodeId,
      executorNodeId,
      commandId,
      payload,
    });

    return new Promise((resolve, reject) => {
      this.#rfcPendingStore.set(commandId, { resolve, reject });
    });
  }

  /**
   * Function to execute when a remote function call is requested on this node
   *
   * @todo
   * - We could just lazily attach to a per node owned state to minimize network load
   * - This could be integrated into soundworks
   *
   * @param {*} executorNodeId
   * @param {*} name
   * @param {*} payload
   * @returns
   */
  setRfcHandler(name, callback) {
    if (!isString(name)) {
      throw new Error('Cannot execute "setRfcHandler" on ComoNode: argument 1 is not a string');
    }

    if (!isFunction(callback)) {
      throw new Error('Cannot execute "setRfcHandler" on ComoNode: argument 2 is not a function');
    }

    this.#rfcHandlers.set(name, callback);
  }

  /**
   * Function executed by the requesting node when the rfc is settled to perform
   * additional logic before fulfilling the promise
   *
   * @param {*} name
   * @param {*} callback
   */
  setRfcResolverHook(name, callback) {
    if (!isString(name)) {
      throw new Error('Cannot execute "setRfcHandler" on ComoNode: argument 1 is not a string');
    }

    if (!isFunction(callback)) {
      throw new Error('Cannot execute "setRfcHandler" on ComoNode: argument 2 is not a function');
    }

    this.#rfcResolverHooks.set(name, callback);

  }

  #handleRfc = async infos => {
    if (infos.settled === true) {
      // check if node is initiator of command
      const { sourceNodeId, commandId, name } = infos;

      if (sourceNodeId === this.nodeId) {
        if (this.#rfcPendingStore.has(commandId)) {
          const { resolve, reject } = this.#rfcPendingStore.get(commandId);
          this.#rfcPendingStore.delete(commandId);

          // @note - maybe we would also like to override the return value
          if (this.#rfcResolverHooks.has(name)) {
            const hook = this.#rfcResolverHooks.get(name);
            await hook(infos.responseErr, infos.responseAck);
          }

          // this will resolve even if responseAck is undefined
          if ('responseErr' in infos) {
            reject(deserializeError(infos.responseErr));
          } else {
            resolve(infos.responseAck);
          }
        } else {
          throw new Error(`Cannot retrieve command resolvers from this.#rfcPendingStore for command id: ${commandId}`)
        }
      }
    } else {
      // check if this node should execute the command
      const { executorNodeId, name, payload } = infos;

      if (executorNodeId === this.nodeId) {
        try {
          if (!this.#rfcHandlers.has(name)) {
            throw new Error(`Cannot execute Rfc, no handler set for command ${name} (cf. ModuleHost#setRfcHandler)`);
          }

          const handler = this.#rfcHandlers.get(name);
          const responseAck = await handler(payload);
          const response = {
            settled: true,
            ...infos,
          }

          if (responseAck !== undefined || responseAck !== null) {
            response.responseAck = responseAck;
          }

          this.#rfcMessageBus.set(response);
        } catch (err) {
          this.#rfcMessageBus.set({
            settled: true,
            responseErr: serializeError(err),
            ...infos
          });
        }
      }
    }
  }
}
