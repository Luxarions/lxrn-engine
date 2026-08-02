/**
 * Scene.js - Core scene management system for LXRN Engine.
 * Supports both 2D and 3D rendering with hierarchical object management.
 * 
 * @module Scene
 * @author LXRN
 * @version 1.0.0
 */

import { Object3D } from '../core/Object3D.js';
import { Euler } from '../math/Euler.js';
import { Entity } from '../entities/Entity.js';
import { generateId, clamp, lerp } from '../utils/Helpers.js';
import { Logger } from '../utils/Logger.js';
import { SCENE_CONFIG } from '../config/SceneConfig.js';

/**
 * Scene class - Container and manager for all game entities.
 * Extends Object3D for hierarchical 3D object management.
 * Handles entity lifecycle, rendering pipeline, update loop,
 * and scene state management for both 2D and 3D contexts.
 * 
 * @class Scene
 * @extends {Object3D}
 */
class Scene extends Object3D {
    /**
     * Private fields - True JavaScript private members.
     * These cannot be accessed from outside the class.
     */
    #entities = new Map();
    #nextId = 0;
    #hooks = {
        onEnter: null,
        onExit: null,
        onUpdate: null,
        onRender: null,
        onRender3D: null,
        onGameOver: null,
    };
    #isPaused = false;
    #time = 0;
    #isGameOver = false;
    #debugMode = SCENE_CONFIG.debugMode;
    #is3D = false;

    /**
     * Internal fields - Double underscore convention.
     * These are "do not touch" internal properties.
     */
    __renderCache = null;
    __eventBuffer = [];
    __frameData = {};
    __internalState = {};
    __webglContext = null;
    __renderer = null;

    /**
     * Protected fields - Single underscore convention.
     * Accessible by child classes (extension).
     */
    _background = null;
    _backgroundBlurriness = 0;
    _backgroundIntensity = 1;
    _backgroundRotation = new Euler();
    
    _environment = null;
    _environmentIntensity = 1;
    _environmentRotation = new Euler();
    
    _fog = null;
    _overrideMaterial = null;
    
    _camera = null;
    _viewport = { x: 0, y: 0, width: 800, height: 600 };
    _gravity = SCENE_CONFIG.physics.gravity;
    _physics = null;
    
    _is2D = true;
    _projectionMatrix = null;

    /**
     * Public fields - Fully accessible API.
     */
    name = 'UnnamedScene';
    active = true;
    score = 0;
    lives = 3;
    level = 1;
    mode = '2D'; // '2D' or '3D'

    /**
     * Creates a new Scene instance.
     * 
     * @param {Object} options - Scene configuration options
     * @param {string} options.name - Scene name
     * @param {boolean} options.active - Whether scene starts active
     * @param {string|Color} options.background - Background color
     * @param {Camera} options.camera - Camera instance
     * @param {string} options.mode - '2D' or '3D' rendering mode
     * @param {Array} options.entities - Initial entities
     */
    constructor(options = {}) {
        super();
        
        this.name = options.name || SCENE_CONFIG.defaultName;
        this.active = options.active !== undefined ? options.active : true;
        this.mode = options.mode || '2D';
        this.#is3D = this.mode === '3D';
        this._is2D = !this.#is3D;
        
        this._background = options.background || null;
        this._camera = options.camera || null;
        
        if (this.#is3D) {
            this._viewport = options.viewport || { x: 0, y: 0, width: 800, height: 600 };
            this._setup3D();
        }
        
        Logger.log(`Scene "${this.name}" created in ${this.mode} mode`);
        this.#initializeScene(options);
    }

    /**
     * Sets up 3D specific properties.
     * 
     * @private
     */
    _setup3D() {
        this._projectionMatrix = {
            fov: 75,
            aspect: this._viewport.width / this._viewport.height,
            near: 0.1,
            far: 1000
        };
        this.position.set(0, 0, 0);
        this.rotation.set(0, 0, 0);
        this.scale.set(1, 1, 1);
    }

    /**
     * Adds an entity to the scene.
     * Also adds to Object3D children if entity extends Object3D.
     * 
     * @param {Entity|Object3D} entity - Entity to add
     * @returns {string} Entity ID
     * @throws {Error} If entity is null or ID already exists
     */
    addEntity(entity) {
        if (!entity) {
            Logger.error('Entity cannot be null');
            throw new Error('Entity cannot be null');
        }

        if (!(entity instanceof Entity) && !(entity instanceof Object3D)) {
            Logger.warn('Entity should be instance of Entity or Object3D class');
        }

        let id = entity.id || generateId();
        entity.id = id;

        if (this.#entities.has(id)) {
            Logger.error(`Entity ${id} already exists`);
            throw new Error(`Entity ${id} already exists`);
        }

        this.#entities.set(id, entity);

        // Add to Object3D hierarchy if applicable
        if (entity instanceof Object3D) {
            this.add(entity);
        }

        if (typeof entity.onAdd === 'function') {
            entity.onAdd(this);
        }

        this.#logEntityAction('add', id);
        this.#checkEntityCount();
        this._onEntityAdded(entity);

        return id;
    }

    /**
     * Removes an entity from the scene by ID.
     * Also removes from Object3D children.
     * 
     * @param {string} id - Entity ID to remove
     * @returns {boolean} True if entity was removed
     */
    removeEntity(id) {
        const entity = this.#entities.get(id);
        if (!entity) {
            Logger.warn(`Entity ${id} not found`);
            return false;
        }

        if (typeof entity.onRemove === 'function') {
            entity.onRemove(this);
        }

        // Remove from Object3D hierarchy if applicable
        if (entity instanceof Object3D) {
            this.remove(entity);
        }

        const deleted = this.#entities.delete(id);
        
        if (deleted) {
            this.#logEntityAction('remove', id);
            this._onEntityRemoved(entity);
        }
        
        return deleted;
    }

    /**
     * Gets an entity by ID.
     * 
     * @param {string} id - Entity ID
     * @returns {Entity|Object3D|undefined} The entity or undefined
     */
    getEntity(id) {
        return this.#entities.get(id);
    }

    /**
     * Gets all entities in the scene.
     * 
     * @returns {Array} Array of entities
     */
    getEntities() {
        return Array.from(this.#entities.values());
    }

    /**
     * Gets the number of entities in the scene.
     * 
     * @returns {number} Entity count
     */
    getEntityCount() {
        return this.#entities.size;
    }

    /**
     * Removes all entities from the scene.
     */
    clearEntities() {
        for (const [id, entity] of this.#entities) {
            if (typeof entity.onRemove === 'function') {
                entity.onRemove(this);
            }
            if (entity instanceof Object3D) {
                this.remove(entity);
            }
        }
        this.#entities.clear();
        Logger.log('All entities cleared');
    }

    /**
     * Finds the first entity matching a predicate.
     * 
     * @param {Function} predicate - Filter function
     * @returns {Entity|Object3D|undefined} Matching entity
     */
    findEntity(predicate) {
        for (const [id, entity] of this.#entities) {
            if (predicate(entity)) return entity;
        }
        return undefined;
    }

    /**
     * Filters entities by a predicate.
     * 
     * @param {Function} predicate - Filter function
     * @returns {Array} Array of matching entities
     */
    filterEntities(predicate) {
        const result = [];
        for (const [id, entity] of this.#entities) {
            if (predicate(entity)) result.push(entity);
        }
        return result;
    }

    /**
     * Sets a lifecycle hook callback.
     * 
     * @param {string} hookName - Hook name (onEnter, onExit, onUpdate, onRender, onRender3D, onGameOver)
     * @param {Function} callback - Callback function
     * @throws {Error} If hook name is invalid
     */
    setHook(hookName, callback) {
        if (!this.#hooks.hasOwnProperty(hookName)) {
            Logger.error(`Invalid hook: ${hookName}`);
            throw new Error(`Invalid hook: ${hookName}`);
        }
        if (typeof callback !== 'function') {
            Logger.error('Hook callback must be a function');
            throw new Error('Hook callback must be a function');
        }
        this.#hooks[hookName] = callback;
        Logger.log(`Hook "${hookName}" set`);
    }

    /**
     * Activates the scene.
     * Calls onEnter hook if set.
     */
    activate() {
        if (!this.active) {
            this.active = true;
            if (this.#hooks.onEnter) {
                this.#hooks.onEnter(this);
            }
            Logger.log(`Scene "${this.name}" activated`);
            this.#onActivate();
        }
    }

    /**
     * Deactivates the scene.
     * Calls onExit hook if set.
     */
    deactivate() {
        if (this.active) {
            this.active = false;
            if (this.#hooks.onExit) {
                this.#hooks.onExit(this);
            }
            Logger.log(`Scene "${this.name}" deactivated`);
            this.#onDeactivate();
        }
    }

    /**
     * Updates all entities in the scene.
     * Handles both 2D and 3D entity updates.
     * 
     * @param {number} deltaTime - Time step in seconds
     */
    update(deltaTime) {
        const dt = clamp(deltaTime, 0.001, 0.1);
        
        if (!this.active || this.#isPaused) return;

        this.#time += dt;

        // Update Object3D hierarchy (3D)
        if (this.#is3D) {
            this.updateMatrix();
            this.updateWorldMatrix();
        }

        if (this.#hooks.onUpdate) {
            this.#hooks.onUpdate(this, dt);
        }

        // Update all entities
        for (const [id, entity] of this.#entities) {
            if (typeof entity.update === 'function') {
                entity.update(dt);
            }
            // Update Object3D children
            if (entity instanceof Object3D && typeof entity.updateMatrix === 'function') {
                entity.updateMatrix();
            }
        }

        this._applyPhysics(dt);
        this._updateCamera();
        this.#checkGameOver();
    }

    /**
     * Renders all entities in the scene.
     * Supports both 2D canvas rendering and 3D rendering.
     * 
     * @param {CanvasRenderingContext2D|WebGLRenderingContext} ctx - Rendering context
     */
    render(ctx) {
        if (!this.active) return;

        if (this.#is3D) {
            this.#render3D(ctx);
        } else {
            this.#render2D(ctx);
        }

        if (this.#debugMode) {
            this.#renderDebugInfo(ctx);
        }
    }

    /**
     * Renders 2D scene.
     * 
     * @private
     * @param {CanvasRenderingContext2D} ctx - 2D rendering context
     */
    #render2D(ctx) {
        if (this._background) {
            ctx.fillStyle = this._background;
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        }

        for (const [id, entity] of this.#entities) {
            if (typeof entity.render === 'function') {
                entity.render(ctx);
            }
        }

        if (this.#hooks.onRender) {
            this.#hooks.onRender(this, ctx);
        }
    }

    /**
     * Renders 3D scene.
     * 
     * @private
     * @param {WebGLRenderingContext} gl - WebGL rendering context
     */
    #render3D(gl) {
        if (this._background) {
            gl.clearColor(
                this._background.r || 0,
                this._background.g || 0,
                this._background.b || 0,
                1
            );
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        }

        // Traverse Object3D hierarchy for 3D rendering
        if (this.children.length > 0) {
            for (const child of this.children) {
                if (typeof child.render3D === 'function') {
                    child.render3D(gl, this._camera);
                }
            }
        }

        // Also render entities that have render3D method
        for (const [id, entity] of this.#entities) {
            if (typeof entity.render3D === 'function') {
                entity.render3D(gl, this._camera);
            }
        }

        if (this.#hooks.onRender3D) {
            this.#hooks.onRender3D(this, gl);
        }
    }

    /**
     * Pauses the scene updates.
     */
    pause() {
        this.#isPaused = true;
        Logger.log(`Scene "${this.name}" paused`);
        this.#onPause();
    }

    /**
     * Resumes the scene updates.
     */
    resume() {
        this.#isPaused = false;
        Logger.log(`Scene "${this.name}" resumed`);
        this.#onResume();
    }

    /**
     * Resets the scene state.
     */
    reset() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.#time = 0;
        this.#isGameOver = false;
        this.clearEntities();
        Logger.log(`Scene "${this.name}" reset`);
        this.#onReset();
    }

    /**
     * Gets whether the scene is paused.
     * 
     * @returns {boolean} True if paused
     */
    get isPaused() {
        return this.#isPaused;
    }

    /**
     * Gets the scene time.
     * 
     * @returns {number} Time in seconds
     */
    get time() {
        return this.#time;
    }

    /**
     * Gets whether the game is over.
     * 
     * @returns {boolean} True if game over
     */
    get isGameOver() {
        return this.#isGameOver;
    }

    /**
     * Gets the number of entities.
     * 
     * @returns {number} Entity count
     */
    get entityCount() {
        return this.#entities.size;
    }

    /**
     * Gets whether scene is 3D mode.
     * 
     * @returns {boolean} True if 3D mode
     */
    get is3D() {
        return this.#is3D;
    }

    /**
     * Gets whether scene is 2D mode.
     * 
     * @returns {boolean} True if 2D mode
     */
    get is2D() {
        return this._is2D;
    }

    /**
     * Applies physics to the scene.
     * Can be overridden by child classes.
     * 
     * @protected
     * @param {number} deltaTime - Time step
     */
    _applyPhysics(deltaTime) {
        if (this._physics) {
            this._physics.update(deltaTime);
        }
    }

    /**
     * Updates the camera.
     * Can be overridden by child classes.
     * 
     * @protected
     */
    _updateCamera() {
        if (this._camera && typeof this._camera.update === 'function') {
            this._camera.update();
        }
    }

    /**
     * Called when an entity is added.
     * Can be overridden by child classes.
     * 
     * @protected
     * @param {Entity|Object3D} entity - Added entity
     */
    _onEntityAdded(entity) {
        Logger.log(`Entity added: ${entity.id}`);
    }

    /**
     * Called when an entity is removed.
     * Can be overridden by child classes.
     * 
     * @protected
     * @param {Entity|Object3D} entity - Removed entity
     */
    _onEntityRemoved(entity) {
        Logger.log(`Entity removed: ${entity.id}`);
    }

    /**
     * Flushes the render cache.
     * Internal method for render pipeline.
     * 
     * @internal
     */
    __flushRenderCache() {
        this.__renderCache = null;
    }

    /**
     * Processes internal events.
     * Internal method for event system.
     * 
     * @internal
     */
    __processEvents() {
        while (this.__eventBuffer.length > 0) {
            const event = this.__eventBuffer.shift();
        }
    }

    /**
     * Initializes the scene with options.
     * 
     * @private
     * @param {Object} options - Scene options
     */
    #initializeScene(options) {
        Logger.log(`Initializing scene: ${this.name}`);
        
        if (options.entities) {
            for (const entity of options.entities) {
                this.addEntity(entity);
            }
        }
    }

    /**
     * Logs entity actions.
     * 
     * @private
     * @param {string} action - Action name
     * @param {string} id - Entity ID
     */
    #logEntityAction(action, id) {
        Logger.log(`Entity ${action}: ${id}`);
    }

    /**
     * Checks if entity count exceeds maximum.
     * 
     * @private
     */
    #checkEntityCount() {
        const count = this.#entities.size;
        if (count > SCENE_CONFIG.maxEntities) {
            Logger.warn(`Entity count (${count}) exceeds max (${SCENE_CONFIG.maxEntities})`);
        }
    }

    /**
     * Checks game over condition.
     * 
     * @private
     */
    #checkGameOver() {
        if (this.lives <= 0 && !this.#isGameOver) {
            this.#isGameOver = true;
            Logger.warn(`Game Over in scene "${this.name}"`);
            
            if (this.#hooks.onGameOver) {
                this.#hooks.onGameOver(this);
            }
            
            this.#onGameOver();
        }
    }

    /**
     * Renders debug information.
     * 
     * @private
     * @param {CanvasRenderingContext2D|WebGLRenderingContext} ctx - Rendering context
     */
    #renderDebugInfo(ctx) {
        if (this._is2D) {
            ctx.fillStyle = 'white';
            ctx.font = '12px monospace';
            ctx.fillText(`Mode: ${this.mode}`, 10, 20);
            ctx.fillText(`Entities: ${this.#entities.size}`, 10, 35);
            ctx.fillText(`Time: ${this.#time.toFixed(2)}s`, 10, 50);
            ctx.fillText(`Children: ${this.children.length}`, 10, 65);
        }
    }

    /**
     * Called when scene activates.
     * 
     * @private
     */
    #onActivate() {}

    /**
     * Called when scene deactivates.
     * 
     * @private
     */
    #onDeactivate() {}

    /**
     * Called when scene pauses.
     * 
     * @private
     */
    #onPause() {}

    /**
     * Called when scene resumes.
     * 
     * @private
     */
    #onResume() {}

    /**
     * Called when scene resets.
     * 
     * @private
     */
    #onReset() {}

    /**
     * Called when game over.
     * 
     * @private
     */
    #onGameOver() {}

    /**
     * Returns string representation of the scene.
     * 
     * @returns {string} Scene info string
     */
    toString() {
        return `Scene(name=${this.name}, mode=${this.mode}, active=${this.active}, entities=${this.#entities.size}, children=${this.children.length})`;
    }
}

export default Scene;
