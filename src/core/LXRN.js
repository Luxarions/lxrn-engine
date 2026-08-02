// src/core/LXRN.js
// Main LXRN Engine Class

const ClassDB = require('./ClassDB.js');
const Object = require('./Object.js');

class LXRN {
  static #instance = null;
  static #initialized = false;

  constructor() {
    if (LXRN.#instance) {
      return LXRN.#instance;
    }
    LXRN.#instance = this;
    this.__init();
  }

  __init() {
    this._engine = new Engine();
    this._classDB = ClassDB;
    console.log('🚀 LXRN Engine v1.0.0 initialized');
  }

  static getInstance() {
    if (!LXRN.#instance) {
      LXRN.#instance = new LXRN();
    }
    return LXRN.#instance;
  }

  static get ClassDB() {
    return ClassDB;
  }

  start() {
    this._engine.start();
    return this;
  }

  stop() {
    this._engine.stop();
    return this;
  }
}

class Engine {
  #started = false;

  start() {
    if (this.#started) return;
    console.log('✅ LXRN Engine started successfully');
    this.#started = true;
  }

  stop() {
    if (!this.#started) return;
    console.log('⏹️ LXRN Engine stopped');
    this.#started = false;
  }
}

// Ekspor ke global
global.LXRN = LXRN;

module.exports = LXRN;
