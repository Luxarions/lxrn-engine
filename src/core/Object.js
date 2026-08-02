// src/core/Object.js
// Base Object class - All classes inherit from this

const ClassDB = require('./ClassDB.js');

class Object {
  #_id = null;
  #_name = '';
  #_meta = {};
  #_signals = new Map();
  #_isDestroyed = false;

  constructor(options = {}) {
    this.__init(options);
    
    // Auto-register with ClassDB
    if (ClassDB) {
      ClassDB.register(this.constructor.name, this.constructor, {
        category: this.__getCategory(),
        description: options.description || '',
      });
    }
  }

  /**
   * Private initialization method
   */
  __init(options = {}) {
    this.#_id = options.id || this.__generateUUID();
    this.#_name = options.name || this.constructor.name;
    this.#_meta = options.meta || {};
  }

  /**
   * Private method to get class category
   */
  __getCategory() {
    const name = this.constructor.name;
    const categories = {
      'Node': 'Scene',
      'Resource': 'Resource',
      'NetworkManager': 'Network',
      'GameServer': 'Server',
      'GameClient': 'Client',
    };
    return categories[name] || 'Core';
  }

  /**
   * Private method to generate UUID
   */
  __generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Private method to emit signal
   */
  __emitSignal(signal, ...args) {
    if (this.#_signals.has(signal)) {
      const handlers = this.#_signals.get(signal);
      for (const handler of handlers) {
        handler(...args);
      }
    }
  }

  // Public getters/setters
  get id() { return this.#_id; }
  get name() { return this.#_name; }
  set name(val) { this.#_name = val; }
  get meta() { return this.#_meta; }
  get isDestroyed() { return this.#_isDestroyed; }

  /**
   * Connect to a signal
   * @param {string} signal - Signal name
   * @param {Function} callback - Callback function
   */
  connect(signal, callback) {
    if (!this.#_signals.has(signal)) {
      this.#_signals.set(signal, []);
    }
    this.#_signals.get(signal).push(callback);
    return this;
  }

  /**
   * Disconnect from a signal
   * @param {string} signal - Signal name
   * @param {Function} callback - Callback function
   */
  disconnect(signal, callback) {
    if (this.#_signals.has(signal)) {
      const handlers = this.#_signals.get(signal);
      const index = handlers.indexOf(callback);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }

  /**
   * Emit a signal
   * @param {string} signal - Signal name
   * @param {...any} args - Arguments
   */
  emit(signal, ...args) {
    this.__emitSignal(signal, ...args);
    return this;
  }

  /**
   * Destroy this object
   */
  destroy() {
    if (this.#_isDestroyed) return;
    this.#_isDestroyed = true;
    this.#_signals.clear();
    console.log(`🗑️ ${this.constructor.name} destroyed (${this.#_id})`);
  }

  /**
   * Convert to JSON
   */
  toJSON() {
    return {
      id: this.#_id,
      name: this.#_name,
      meta: this.#_meta,
      type: this.constructor.name,
    };
  }

  /**
   * String representation
   */
  toString() {
    return `[${this.constructor.name} id=${this.#_id} name="${this.#_name}"]`;
  }
}

module.exports = Object;
