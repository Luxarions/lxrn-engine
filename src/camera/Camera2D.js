const Object = require('./core/Object.js');


class Camera2D extends Object {
  #_id = null;
  #_name = "";
  #_meta = {};

  constructor(options = {}) {
    super(options);
    this.__init(options);
    // registrasi otomatis
    if (typeof LXRN !== 'undefined' && LXRN.ClassDB) {
      LXRN.ClassDB.register(this.constructor.name, this.constructor);
    }
  }


  /**
   * Private method (double underscore) untuk inisialisasi internal.
   * @param {Object} options
   */
  __init(options = {}) {
    this.#_id = options.id || LXRN.Utils.generateUUID();
    this.#_name = options.name || this.constructor.name;
    this.#_meta = options.meta || {};
  }

  // Getter / Setter publik
  get id() { return this.#_id; }
  get name() { return this.#_name; }
  set name(val) { this.#_name = val; }
  get meta() { return this.#_meta; }

  toJSON() {
    return {
      id: this.#_id,
      name: this.#_name,
      meta: this.#_meta
    };
  }

  toString() {
    return `[${this.constructor.name} id=${this.#_id} name="${this.#_name}"]`;
  }
}


// Registrasi namespace
if (typeof LXRN === 'undefined') {
  global.LXRN = {};
}
if (!LXRN.Camera) {
  LXRN.Camera = {};
}
LXRN.Camera.Camera2D = Camera2D;

module.exports = Camera2D;
