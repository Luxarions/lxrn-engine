/**
 * Scene.js - Core scene management system for LXRN Engine.
 * Extends Object for hierarchy, layer management, and event system.
 * Supports both 2D and 3D rendering modes with fog integration.
 * 
 * @module Scene
 * @author LXRN
 * @version 1.0.0
 */

import Object from './Object.js';
import { Euler } from '../math/Euler.js';
import { generateId, clamp } from '../utils/Helpers.js';
import { Logger } from '../utils/Logger.js';
import { SCENE_CONFIG } from '../config/SceneConfig.js';

class Scene extends Object {
    #entities = new Map();
    #nextId = 0;
    #hooks = {
        onEnter: null,
        onExit: null,
        onUpdate: null,
        onRender: null,
        onRender3D: null,
        onGameOver: null,
        onPause: null,
        onResume: null,
        onReset: null,
    };
    #isPaused = false;
    #isGameOver = false;
    #isLoading = false;
    #time = 0;
    #debugMode = SCENE_CONFIG.debugMode;
    #fog = null;
    #loadQueue = [];
    #loadedCount = 0;
    #totalLoadCount = 0;
    
    __renderCache = null;
    __eventBuffer = [];
    __frameData = {};
    
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
    
    name = 'UnnamedScene';
    active = true;
    score = 0;
    lives = 3;
    level = 1;
    mode = '2D';
    autoClear = true;
    autoSort = false;
    autoLoad = false;

    constructor(options = {}) {
        super({ 
            name: options.name || SCENE_CONFIG.defaultName,
            type: 'Scene',
            is3D: options.mode === '3D',
            active: options.active !== undefined ? options.active : true
        });
        
        this.mode = options.mode || '2D';
        
        this._background = options.background || null;
        this._camera = options.camera || null;
        
        if (options.autoClear !== undefined) {
            this.autoClear = options.autoClear;
        }
        
        if (options.autoSort !== undefined) {
            this.autoSort = options.autoSort;
        }
        
        if (options.autoLoad !== undefined) {
            this.autoLoad = options.autoLoad;
        }
        
        if (options.fog) {
            this.fog = options.fog;
        }
        
        this.emit('sceneCreated', { scene: this, mode: this.mode });
        
        if (options.viewport) {
            this._viewport = { ...this._viewport, ...options.viewport };
        }
        
        Logger.log(`Scene "${this.name}" created in ${this.mode} mode`);
        this.#initializeScene(options);
    }

    enable() {
        if (this.isDestroyed) return this;
        super.enable();
        this.activate();
        this.emit('sceneEnabled', { scene: this });
        return this;
    }

    disable() {
        if (this.isDestroyed) return this;
        super.disable();
        this.deactivate();
        this.emit('sceneDisabled', { scene: this });
        return this;
    }

    pause() {
        if (this.#isPaused || this.isDestroyed) return;
        this.#isPaused = true;
        this.emit('scenePaused', { scene: this });
        if (this.#hooks.onPause) {
            this.#hooks.onPause(this);
        }
        this.#onPause();
        Logger.log(`Scene "${this.name}" paused`);
    }

    resume() {
        if (!this.#isPaused || this.isDestroyed) return;
        this.#isPaused = false;
        this.emit('sceneResumed', { scene: this });
        if (this.#hooks.onResume) {
            this.#hooks.onResume(this);
        }
        this.#onResume();
        Logger.log(`Scene "${this.name}" resumed`);
    }

    togglePause() {
        if (this.#isPaused) {
            this.resume();
        } else {
            this.pause();
        }
        return this.#isPaused;
    }

    isPaused() {
        return this.#isPaused;
    }

    get fog() {
        return this.#fog;
    }

    set fog(fog) {
        if (this.isDestroyed) return;
        this.#fog = fog;
        if (fog) {
            fog.scene = this;
        }
        this.emit('fogChanged', { scene: this, fog });
    }

    enableFog() {
        if (this.isDestroyed) return;
        if (this.#fog) {
            this.#fog.enable();
            this.emit('fogEnabled', { scene: this });
        } else {
            Logger.warn('No fog to enable on scene');
        }
    }

    disableFog() {
        if (this.isDestroyed) return;
        if (this.#fog) {
            this.#fog.disable();
            this.emit('fogDisabled', { scene: this });
        } else {
            Logger.warn('No fog to disable on scene');
        }
    }

    toggleFog() {
        if (this.isDestroyed) return false;
        if (this.#fog) {
            const result = this.#fog.toggle();
            this.emit('fogToggled', { scene: this, enabled: result });
            return result;
        }
        Logger.warn('No fog to toggle on scene');
        return false;
    }

    setFogColor(color) {
        if (this.isDestroyed) return;
        if (this.#fog) {
            this.#fog.color = color;
            this.emit('fogColorChanged', { scene: this, color });
        }
    }

    setFogDensity(density) {
        if (this.isDestroyed) return;
        if (this.#fog) {
            this.#fog.density = density;
            this.emit('fogDensityChanged', { scene: this, density });
        }
    }

    getFogUniforms() {
        return this.#fog ? this.#fog.__uniforms : null;
    }

    getFogShaderCode() {
        return this.#fog ? this.#fog.getShaderCode() : '';
    }

    load(assets) {
        if (this.isDestroyed) return Promise.reject('Scene is destroyed');
        
        this.#isLoading = true;
        this.#loadQueue = Array.isArray(assets) ? assets : [assets];
        this.#totalLoadCount = this.#loadQueue.length;
        this.#loadedCount = 0;
        
        this.emit('loadStart', { scene: this, total: this.#totalLoadCount });
        Logger.log(`Scene "${this.name}" loading ${this.#totalLoadCount} assets`);
        
        return new Promise((resolve, reject) => {
            const loadPromises = this.#loadQueue.map((asset) => {
                return this.#loadAsset(asset);
            });
            
            Promise.all(loadPromises)
                .then((results) => {
                    this.#isLoading = false;
                    this.emit('loadComplete', { scene: this, results });
                    Logger.log(`Scene "${this.name}" loaded successfully`);
                    resolve(results);
                })
                .catch((error) => {
                    this.#isLoading = false;
                    this.emit('loadError', { scene: this, error });
                    Logger.error(`Scene "${this.name}" load failed: ${error}`);
                    reject(error);
                });
        });
    }

    #loadAsset(asset) {
        return new Promise((resolve, reject) => {
            if (typeof asset === 'string') {
                const image = new Image();
                image.onload = () => {
                    this.#loadedCount++;
                    const progress = this.#loadedCount / this.#totalLoadCount;
                    this.emit('loadProgress', { scene: this, progress, loaded: this.#loadedCount, total: this.#totalLoadCount });
                    resolve(image);
                };
                image.onerror = () => {
                    reject(new Error(`Failed to load asset: ${asset}`));
                };
                image.src = asset;
            } else if (asset.load) {
                asset.load()
                    .then((result) => {
                        this.#loadedCount++;
                        const progress = this.#loadedCount / this.#totalLoadCount;
                        this.emit('loadProgress', { scene: this, progress, loaded: this.#loadedCount, total: this.#totalLoadCount });
                        resolve(result);
                    })
                    .catch(reject);
            } else {
                this.#loadedCount++;
                resolve(asset);
            }
        });
    }

    isLoading() {
        return this.#isLoading;
    }

    getLoadProgress() {
        return this.#totalLoadCount > 0 ? this.#loadedCount / this.#totalLoadCount : 0;
    }

    addEntity(entity) {
        if (this.isDestroyed) return null;
        
        if (!entity) {
            Logger.error('Entity cannot be null');
            this.emit('error', { error: 'Entity cannot be null' });
            throw new Error('Entity cannot be null');
        }

        let id = entity.id || generateId();
        entity.id = id;

        if (this.#entities.has(id)) {
            Logger.error(`Entity ${id} already exists`);
            this.emit('error', { error: `Entity ${id} already exists` });
            throw new Error(`Entity ${id} already exists`);
        }

        this.#entities.set(id, entity);
        
        if (entity instanceof Object) {
            this.add(entity);
        }

        if (typeof entity.onAdd === 'function') {
            entity.onAdd(this);
        }

        this.#logEntityAction('add', id);
        this.#checkEntityCount();
        this._onEntityAdded(entity);
        
        this.emit('entityAdded', { scene: this, entity });

        return id;
    }

    removeEntity(id) {
        if (this.isDestroyed) return false;
        
        const entity = this.#entities.get(id);
        if (!entity) {
            Logger.warn(`Entity ${id} not found`);
            return false;
        }

        if (typeof entity.onRemove === 'function') {
            entity.onRemove(this);
        }

        if (entity instanceof Object) {
            this.remove(entity);
        }

        const deleted = this.#entities.delete(id);
        
        if (deleted) {
            this.#logEntityAction('remove', id);
            this._onEntityRemoved(entity);
            this.emit('entityRemoved', { scene: this, entityId: id });
        }
        
        return deleted;
    }

    getEntity(id) {
        if (this.isDestroyed) return undefined;
        return this.#entities.get(id);
    }

    getEntities() {
        if (this.isDestroyed) return [];
        return Array.from(this.#entities.values());
    }

    getEntityCount() {
        if (this.isDestroyed) return 0;
        return this.#entities.size;
    }

    clearEntities() {
        if (this.isDestroyed) return;
        
        for (const [id, entity] of this.#entities) {
            if (typeof entity.onRemove === 'function') {
                entity.onRemove(this);
            }
            if (entity instanceof Object) {
                this.remove(entity);
            }
        }
        this.#entities.clear();
        Logger.log('All entities cleared');
        this.emit('entitiesCleared', { scene: this });
    }

    findEntity(predicate) {
        if (this.isDestroyed) return undefined;
        for (const [id, entity] of this.#entities) {
            if (predicate(entity)) return entity;
        }
        return undefined;
    }

    filterEntities(predicate) {
        if (this.isDestroyed) return [];
        const result = [];
        for (const [id, entity] of this.#entities) {
            if (predicate(entity)) result.push(entity);
        }
        return result;
    }

    getEntitiesByLayer(layer) {
        if (this.isDestroyed) return [];
        const result = [];
        for (const [id, entity] of this.#entities) {
            if (entity instanceof Object && entity.isOnLayer(layer)) {
                result.push(entity);
            }
        }
        return result;
    }

    getEntitiesByType(type) {
        if (this.isDestroyed) return [];
        const result = [];
        for (const [id, entity] of this.#entities) {
            if (entity.type === type) {
                result.push(entity);
            }
        }
        return result;
    }

    setHook(hookName, callback) {
        if (this.isDestroyed) return;
        
        if (!this.#hooks.hasOwnProperty(hookName)) {
            Logger.error(`Invalid hook: ${hookName}`);
            this.emit('error', { error: `Invalid hook: ${hookName}` });
            throw new Error(`Invalid hook: ${hookName}`);
        }
        if (typeof callback !== 'function') {
            Logger.error('Hook callback must be a function');
            this.emit('error', { error: 'Hook callback must be a function' });
            throw new Error('Hook callback must be a function');
        }
        this.#hooks[hookName] = callback;
        Logger.log(`Hook "${hookName}" set`);
        this.emit('hookSet', { scene: this, hook: hookName });
    }

    activate() {
        if (this.isDestroyed) return;
        
        if (!this.active) {
            this.active = true;
            if (this.#hooks.onEnter) {
                this.#hooks.onEnter(this);
            }
            Logger.log(`Scene "${this.name}" activated`);
            this.#onActivate();
            this.emit('sceneActivated', { scene: this });
        }
    }

    deactivate() {
        if (this.isDestroyed) return;
        
        if (this.active) {
            this.active = false;
            if (this.#hooks.onExit) {
                this.#hooks.onExit(this);
            }
            Logger.log(`Scene "${this.name}" deactivated`);
            this.#onDeactivate();
            this.emit('sceneDeactivated', { scene: this });
        }
    }

    update(deltaTime) {
        if (this.isDestroyed) return;
        
        const dt = clamp(deltaTime, 0.001, 0.1);
        
        if (!this.active || this.#isPaused) return;

        this.#time += dt;

        if (this.#hooks.onUpdate) {
            this.#hooks.onUpdate(this, dt);
        }

        if (this.is3D) {
            this.updateMatrix();
            this.updateWorldMatrix();
        }

        if (this.autoSort) {
            this.#sortEntities();
        }

        for (const [id, entity] of this.#entities) {
            if (this.#isPaused) break;
            if (typeof entity.update === 'function') {
                entity.update(dt);
            }
            if (entity instanceof Object && typeof entity.updateMatrix === 'function') {
                entity.updateMatrix();
            }
        }

        this._applyPhysics(dt);
        this._updateCamera();
        this.#checkGameOver();
        
        this.emit('sceneUpdated', { scene: this, deltaTime: dt });
    }

    render(ctx) {
        if (this.isDestroyed) return;
        if (!this.active) return;

        if (this.autoClear) {
            this.#clearContext(ctx);
        }

        if (this.is3D) {
            this.#render3D(ctx);
        } else {
            this.#render2D(ctx);
        }

        if (this.#debugMode) {
            this.#renderDebugInfo(ctx);
        }
        
        this.emit('sceneRendered', { scene: this, ctx });
    }

    #clearContext(ctx) {
        if (this.is2D) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        } else {
            ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT);
        }
    }

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

        for (const child of this.children) {
            if (typeof child.render3D === 'function') {
                child.render3D(gl, this._camera);
            }
        }

        for (const [id, entity] of this.#entities) {
            if (typeof entity.render3D === 'function') {
                entity.render3D(gl, this._camera);
            }
        }

        if (this.#hooks.onRender3D) {
            this.#hooks.onRender3D(this, gl);
        }
    }

    #sortEntities() {
        const sorted = Array.from(this.#entities.entries());
        sorted.sort((a, b) => {
            const orderA = a[1].renderOrder !== undefined ? a[1].renderOrder : 0;
            const orderB = b[1].renderOrder !== undefined ? b[1].renderOrder : 0;
            return orderA - orderB;
        });
        this.#entities = new Map(sorted);
    }

    reset() {
        if (this.isDestroyed) return;
        
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.#time = 0;
        this.#isGameOver = false;
        this.clearEntities();
        
        Logger.log(`Scene "${this.name}" reset`);
        if (this.#hooks.onReset) {
            this.#hooks.onReset(this);
        }
        this.#onReset();
        this.emit('sceneReset', { scene: this });
    }

    get isPaused() { return this.#isPaused; }
    get time() { return this.#time; }
    get isGameOver() { return this.#isGameOver; }
    get entityCount() { return this.#entities.size; }
    get is3D() { return this.mode === '3D'; }
    get is2D() { return this.mode === '2D'; }
    get isLoading() { return this.#isLoading; }
    get loadProgress() { return this.getLoadProgress(); }

    _applyPhysics(deltaTime) {
        if (this.isDestroyed) return;
        if (this._physics) {
            this._physics.update(deltaTime);
        }
    }

    _updateCamera() {
        if (this.isDestroyed) return;
        if (this._camera && typeof this._camera.update === 'function') {
            this._camera.update();
        }
    }

    _onEntityAdded(entity) {
        Logger.log(`Entity added: ${entity.id}`);
        this.emit('entityAddedInternal', { scene: this, entity });
    }

    _onEntityRemoved(entity) {
        Logger.log(`Entity removed: ${entity.id}`);
        this.emit('entityRemovedInternal', { scene: this, entity });
    }

    #initializeScene(options) {
        Logger.log(`Initializing scene: ${this.name}`);
        this.emit('sceneInitializing', { scene: this });
        
        if (options.entities) {
            for (const entity of options.entities) {
                this.addEntity(entity);
            }
        }
        
        if (options.autoLoad && options.assets) {
            this.load(options.assets);
        }
    }

    #logEntityAction(action, id) {
        Logger.log(`Entity ${action}: ${id}`);
    }

    #checkEntityCount() {
        const count = this.#entities.size;
        if (count > SCENE_CONFIG.maxEntities) {
            Logger.warn(`Entity count (${count}) exceeds max (${SCENE_CONFIG.maxEntities})`);
            this.emit('entityCountExceeded', { scene: this, count, max: SCENE_CONFIG.maxEntities });
        }
    }

    #checkGameOver() {
        if (this.lives <= 0 && !this.#isGameOver) {
            this.#isGameOver = true;
            Logger.warn(`Game Over in scene "${this.name}"`);
            
            if (this.#hooks.onGameOver) {
                this.#hooks.onGameOver(this);
            }
            
            this.#onGameOver();
            this.emit('gameOver', { scene: this });
        }
    }

    #renderDebugInfo(ctx) {
        if (this.is2D) {
            ctx.fillStyle = 'white';
            ctx.font = '12px monospace';
            const y = 20;
            const lineHeight = 15;
            let i = 0;
            ctx.fillText(`Scene: ${this.name}`, 10, y + i++ * lineHeight);
            ctx.fillText(`Mode: ${this.mode}`, 10, y + i++ * lineHeight);
            ctx.fillText(`Active: ${this.active}`, 10, y + i++ * lineHeight);
            ctx.fillText(`Paused: ${this.#isPaused}`, 10, y + i++ * lineHeight);
            ctx.fillText(`GameOver: ${this.#isGameOver}`, 10, y + i++ * lineHeight);
            ctx.fillText(`Entities: ${this.#entities.size}`, 10, y + i++ * lineHeight);
            ctx.fillText(`Time: ${this.#time.toFixed(2)}s`, 10, y + i++ * lineHeight);
            ctx.fillText(`Children: ${this.children.length}`, 10, y + i++ * lineHeight);
            ctx.fillText(`Layers: ${this.getLayerMask()}`, 10, y + i++ * lineHeight);
            ctx.fillText(`AutoClear: ${this.autoClear}`, 10, y + i++ * lineHeight);
            ctx.fillText(`AutoSort: ${this.autoSort}`, 10, y + i++ * lineHeight);
            ctx.fillText(`Loading: ${this.#isLoading} (${(this.getLoadProgress() * 100).toFixed(0)}%)`, 10, y + i++ * lineHeight);
            ctx.fillText(`Fog: ${this.#fog ? this.#fog.name : 'none'}`, 10, y + i++ * lineHeight);
        }
    }

    #onActivate() {}
    #onDeactivate() {}
    #onPause() {}
    #onResume() {}
    #onReset() {}
    #onGameOver() {}

    destroy() {
        if (this.isDestroyed) return;
        this.clearEntities();
        this.#fog = null;
        this.#hooks = {};
        super.destroy();
        this.emit('sceneDestroyed', { scene: this });
        Logger.log(`Scene "${this.name}" destroyed`);
    }

    toString() {
        return `Scene(name=${this.name}, mode=${this.mode}, active=${this.active}, paused=${this.#isPaused}, gameOver=${this.#isGameOver}, loading=${this.#isLoading}, entities=${this.#entities.size}, children=${this.children.length})`;
    }
}

export default Scene;
