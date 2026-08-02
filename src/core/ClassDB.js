// src/core/ClassDB.js
// Class Database - Like Godot's ClassDB system

class ClassDB {
  static #classes = new Map();
  static #singletons = new Map();
  static #initialized = false;

  static __init() {
    if (this.#initialized) return;
    this.#initialized = true;
    console.log('📚 ClassDB initialized');
  }

  /**
   * Register a class with the database
   * @param {string} name - Class name
   * @param {Function} constructor - Class constructor
   * @param {Object} options - Registration options
   */
  static register(name, constructor, options = {}) {
    this.__init();
    
    if (this.#classes.has(name)) {
      console.warn(`⚠️ Class "${name}" already registered, overwriting...`);
    }

    this.#classes.set(name, {
      constructor,
      isSingleton: options.isSingleton || false,
      inherits: options.inherits || null,
      category: options.category || 'Core',
      description: options.description || '',
    });

    console.log(`📦 Registered class: ${name}`);
  }

  /**
   * Get a registered class
   * @param {string} name - Class name
   * @returns {Function|null} - Class constructor or null
   */
  static get(name) {
    const entry = this.#classes.get(name);
    return entry ? entry.constructor : null;
  }

  /**
   * Get class metadata
   * @param {string} name - Class name
   * @returns {Object|null} - Class metadata
   */
  static getClassInfo(name) {
    return this.#classes.get(name) || null;
  }

  /**
   * Instantiate a class by name
   * @param {string} name - Class name
   * @param {...any} args - Constructor arguments
   * @returns {Object|null} - New instance or null
   */
  static instantiate(name, ...args) {
    const cls = this.get(name);
    if (!cls) {
      console.error(`❌ Class "${name}" not found in ClassDB`);
      return null;
    }
    return new cls(...args);
  }

  /**
   * Check if a class exists
   * @param {string} name - Class name
   * @returns {boolean}
   */
  static has(name) {
    return this.#classes.has(name);
  }

  /**
   * Get all registered class names
   * @returns {string[]} - List of class names
   */
  static getClassList() {
    return Array.from(this.#classes.keys());
  }

  /**
   * Get classes by category
   * @param {string} category - Category name
   * @returns {string[]} - List of class names
   */
  static getClassesByCategory(category) {
    const result = [];
    for (const [name, info] of this.#classes) {
      if (info.category === category) {
        result.push(name);
      }
    }
    return result;
  }

  /**
   * Register a singleton instance
   * @param {string} name - Singleton name
   * @param {Object} instance - Singleton instance
   */
  static registerSingleton(name, instance) {
    this.#singletons.set(name, instance);
    console.log(`🔒 Registered singleton: ${name}`);
  }

  /**
   * Get a singleton instance
   * @param {string} name - Singleton name
   * @returns {Object|null} - Singleton instance or null
   */
  static getSingleton(name) {
    return this.#singletons.get(name) || null;
  }
}

// Auto-initialize
ClassDB.__init();

module.exports = ClassDB;
