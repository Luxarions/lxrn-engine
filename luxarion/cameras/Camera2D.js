/**
 * Camera2D.js - 2D camera for LXRN Engine.
 * Handles 2D rendering with zoom, pan, shake, and follow.
 * Includes comprehensive flags and boolean state management.
 * 
 * @module Camera2D
 * @author LXRN
 * @version 2.0.0
 */

import Camera from './Camera.js';
import { Vector2 } from '../math/Vector2.js';
import { Logger } from '../utils/Logger.js';

class Camera2D extends Camera {
    #bounds = null;
    #smoothing = 0.1;
    #target = null;
    #shakeIntensity = 0;
    #shakeDuration = 0;
    #shakeTimer = 0;
    #offset = new Vector2(0, 0);
    #flags = 0;
    
    // State flags
    #isFollowing = false;
    #isShaking = false;
    #isSmoothingEnabled = true;
    #isBoundsEnabled = true;
    #isPanning = false;
    #isZooming = false;
    #isCentered = false;
    #isLocked = false;
    #isFrozen = false;
    #isPaused = false;
    #isSelected = false;
    #isHovered = false;
    #isDragging = false;
    #isMoving = false;
    #isStatic = false;
    
    // Lifecycle flags
    #isSpawned = false;
    #isLoaded = false;
    #isInitialized = false;
    #isUpdated = false;
    #isRendered = false;
    #isCulled = false;

    static FLAGS = {
        ACTIVE: 1 << 0,
        VISIBLE: 1 << 1,
        STATIC: 1 << 2,
        DIRTY: 1 << 3,
        DESTROYED: 1 << 4,
        LOCKED: 1 << 5,
        FROZEN: 1 << 6,
        PAUSED: 1 << 7,
        SELECTED: 1 << 8,
        HOVERED: 1 << 9,
        DRAGGING: 1 << 10,
        MOVING: 1 << 11,
        CENTERED: 1 << 12,
        FOLLOWING: 1 << 13,
        SHAKING: 1 << 14,
        SMOOTHING_ENABLED: 1 << 15,
        BOUNDS_ENABLED: 1 << 16,
        PANNING: 1 << 17,
        ZOOMING: 1 << 18,
        SPAWNED: 1 << 19,
        LOADED: 1 << 20,
        INITIALIZED: 1 << 21,
        UPDATED: 1 << 22,
        RENDERED: 1 << 23,
        CULLED: 1 << 24
    };

    constructor(options = {}) {
        super({
            name: options.name || 'Camera2D',
            position: options.position || { x: 0, y: 0, z: 0 },
            is3D: false,
            aspect: options.aspect || 1
        });

        this.#smoothing = options.smoothing || 0.1;
        this.#bounds = options.bounds || null;
        this.type = 'Camera2D';
        this.#isOrthographic = true;

        if (options.flags !== undefined) {
            this.#flags = options.flags;
        }
        
        if (options.isCentered !== undefined) {
            this.#isCentered = options.isCentered;
            this.#updateFlag(Camera2D.FLAGS.CENTERED, this.#isCentered);
        }
        
        if (options.isFollowing !== undefined) {
            this.#isFollowing = options.isFollowing;
            this.#updateFlag(Camera2D.FLAGS.FOLLOWING, this.#isFollowing);
        }
        
        if (options.isShaking !== undefined) {
            this.#isShaking = options.isShaking;
            this.#updateFlag(Camera2D.FLAGS.SHAKING, this.#isShaking);
        }
        
        if (options.isSmoothingEnabled !== undefined) {
            this.#isSmoothingEnabled = options.isSmoothingEnabled;
            this.#updateFlag(Camera2D.FLAGS.SMOOTHING_ENABLED, this.#isSmoothingEnabled);
        }
        
        if (options.isBoundsEnabled !== undefined) {
            this.#isBoundsEnabled = options.isBoundsEnabled;
            this.#updateFlag(Camera2D.FLAGS.BOUNDS_ENABLED, this.#isBoundsEnabled);
        }
        
        if (options.isPanning !== undefined) {
            this.#isPanning = options.isPanning;
            this.#updateFlag(Camera2D.FLAGS.PANNING, this.#isPanning);
        }
        
        if (options.isZooming !== undefined) {
            this.#isZooming = options.isZooming;
            this.#updateFlag(Camera2D.FLAGS.ZOOMING, this.#isZooming);
        }
        
        if (options.isStatic !== undefined) {
            this.#isStatic = options.isStatic;
            this.#updateFlag(Camera2D.FLAGS.STATIC, this.#isStatic);
        }
        
        if (options.isLocked !== undefined) {
            this.#isLocked = options.isLocked;
            this.#updateFlag(Camera2D.FLAGS.LOCKED, this.#isLocked);
        }
        
        if (options.isFrozen !== undefined) {
            this.#isFrozen = options.isFrozen;
            this.#updateFlag(Camera2D.FLAGS.FROZEN, this.#isFrozen);
        }
        
        if (options.isPaused !== undefined) {
            this.#isPaused = options.isPaused;
            this.#updateFlag(Camera2D.FLAGS.PAUSED, this.#isPaused);
        }
        
        if (options.isSelected !== undefined) {
            this.#isSelected = options.isSelected;
            this.#updateFlag(Camera2D.FLAGS.SELECTED, this.#isSelected);
        }
        
        if (options.isHovered !== undefined) {
            this.#isHovered = options.isHovered;
            this.#updateFlag(Camera2D.FLAGS.HOVERED, this.#isHovered);
        }
        
        if (options.isDragging !== undefined) {
            this.#isDragging = options.isDragging;
            this.#updateFlag(Camera2D.FLAGS.DRAGGING, this.#isDragging);
        }
        
        if (options.isMoving !== undefined) {
            this.#isMoving = options.isMoving;
            this.#updateFlag(Camera2D.FLAGS.MOVING, this.#isMoving);
        }
        
        if (options.isSpawned !== undefined) {
            this.#isSpawned = options.isSpawned;
            this.#updateFlag(Camera2D.FLAGS.SPAWNED, this.#isSpawned);
        }
        
        if (options.isLoaded !== undefined) {
            this.#isLoaded = options.isLoaded;
            this.#updateFlag(Camera2D.FLAGS.LOADED, this.#isLoaded);
        }
        
        if (options.isInitialized !== undefined) {
            this.#isInitialized = options.isInitialized;
            this.#updateFlag(Camera2D.FLAGS.INITIALIZED, this.#isInitialized);
        }

        if (options.target) {
            this.setTarget(options.target);
        }

        this.#updateFlag(Camera2D.FLAGS.ACTIVE, this.active);
        this.#updateFlag(Camera2D.FLAGS.VISIBLE, this.visible);
        this.#updateFlag(Camera2D.FLAGS.DIRTY, true);

        Logger.log(`Camera2D created: ${this.name}`);
    }

    get smoothing() { return this.#smoothing; }
    get bounds() { return this.#bounds; }
    get target() { return this.#target; }
    get offset() { return this.#offset; }
    get isFollowing() { return this.#isFollowing; }
    get isShaking() { return this.#isShaking; }
    get isSmoothingEnabled() { return this.#isSmoothingEnabled; }
    get isBoundsEnabled() { return this.#isBoundsEnabled; }
    get isPanning() { return this.#isPanning; }
    get isZooming() { return this.#isZooming; }
    get isCentered() { return this.#isCentered; }
    get isLocked() { return this.#isLocked; }
    get isFrozen() { return this.#isFrozen; }
    get isPaused() { return this.#isPaused; }
    get isSelected() { return this.#isSelected; }
    get isHovered() { return this.#isHovered; }
    get isDragging() { return this.#isDragging; }
    get isMoving() { return this.#isMoving; }
    get isStatic() { return this.#isStatic; }
    get isSpawned() { return this.#isSpawned; }
    get isLoaded() { return this.#isLoaded; }
    get isInitialized() { return this.#isInitialized; }
    get isUpdated() { return this.#isUpdated; }
    get isRendered() { return this.#isRendered; }
    get isCulled() { return this.#isCulled; }

    set smoothing(value) {
        this.#smoothing = Math.max(0, Math.min(1, value));
    }

    set bounds(value) {
        this.#bounds = value;
        this.#isBoundsEnabled = true;
        this.#updateFlag(Camera2D.FLAGS.BOUNDS_ENABLED, true);
    }

    set offset(value) {
        this.#offset.copy(value);
    }

    set isFollowing(value) {
        this.#isFollowing = value;
        this.#updateFlag(Camera2D.FLAGS.FOLLOWING, value);
    }

    set isShaking(value) {
        this.#isShaking = value;
        this.#updateFlag(Camera2D.FLAGS.SHAKING, value);
    }

    set isSmoothingEnabled(value) {
        this.#isSmoothingEnabled = value;
        this.#updateFlag(Camera2D.FLAGS.SMOOTHING_ENABLED, value);
    }

    set isBoundsEnabled(value) {
        this.#isBoundsEnabled = value;
        this.#updateFlag(Camera2D.FLAGS.BOUNDS_ENABLED, value);
    }

    set isPanning(value) {
        this.#isPanning = value;
        this.#updateFlag(Camera2D.FLAGS.PANNING, value);
    }

    set isZooming(value) {
        this.#isZooming = value;
        this.#updateFlag(Camera2D.FLAGS.ZOOMING, value);
    }

    set isCentered(value) {
        this.#isCentered = value;
        this.#updateFlag(Camera2D.FLAGS.CENTERED, value);
        if (value) {
            this.centerOnScreen();
        }
    }

    set isLocked(value) {
        this.#isLocked = value;
        this.#updateFlag(Camera2D.FLAGS.LOCKED, value);
    }

    set isFrozen(value) {
        this.#isFrozen = value;
        this.#updateFlag(Camera2D.FLAGS.FROZEN, value);
    }

    set isPaused(value) {
        this.#isPaused = value;
        this.#updateFlag(Camera2D.FLAGS.PAUSED, value);
    }

    set isSelected(value) {
        this.#isSelected = value;
        this.#updateFlag(Camera2D.FLAGS.SELECTED, value);
    }

    set isHovered(value) {
        this.#isHovered = value;
        this.#updateFlag(Camera2D.FLAGS.HOVERED, value);
    }

    set isDragging(value) {
        this.#isDragging = value;
        this.#updateFlag(Camera2D.FLAGS.DRAGGING, value);
    }

    set isMoving(value) {
        this.#isMoving = value;
        this.#updateFlag(Camera2D.FLAGS.MOVING, value);
    }

    set isStatic(value) {
        this.#isStatic = value;
        this.#updateFlag(Camera2D.FLAGS.STATIC, value);
    }

    setFlag(flag) {
        this.#flags |= flag;
        return this;
    }

    clearFlag(flag) {
        this.#flags &= ~flag;
        return this;
    }

    toggleFlag(flag) {
        this.#flags ^= flag;
        return this;
    }

    hasFlag(flag) {
        return (this.#flags & flag) !== 0;
    }

    getFlags() {
        return this.#flags;
    }

    setFlags(flags) {
        this.#flags = flags;
        return this;
    }

    #updateFlag(flag, value) {
        if (value) {
            this.#flags |= flag;
        } else {
            this.#flags &= ~flag;
        }
    }

    setTarget(target) {
        this.#target = target;
        this.#isFollowing = true;
        this.#updateFlag(Camera2D.FLAGS.FOLLOWING, true);
    }

    follow(deltaTime) {
        if (!this.#target || !this.#isFollowing) return;
        if (this.#isFrozen || this.#isLocked) return;

        const targetX = this.#target.position.x + this.#offset.x;
        const targetY = this.#target.position.y + this.#offset.y;

        if (this.#isSmoothingEnabled && this.#smoothing > 0) {
            this.position.x += (targetX - this.position.x) * this.#smoothing;
            this.position.y += (targetY - this.position.y) * this.#smoothing;
        } else {
            this.position.x = targetX;
            this.position.y = targetY;
        }

        if (this.#isBoundsEnabled && this.#bounds) {
            this.position.x = Math.max(this.#bounds.x, Math.min(this.#bounds.x + this.#bounds.width, this.position.x));
            this.position.y = Math.max(this.#bounds.y, Math.min(this.#bounds.y + this.#bounds.height, this.position.y));
        }

        if (this.#isShaking && this.#shakeTimer > 0) {
            const intensity = this.#shakeIntensity * (this.#shakeTimer / this.#shakeDuration);
            const shakeX = (Math.random() - 0.5) * intensity * 2;
            const shakeY = (Math.random() - 0.5) * intensity * 2;
            this.position.x += shakeX;
            this.position.y += shakeY;
            this.#shakeTimer -= deltaTime;
            if (this.#shakeTimer <= 0) {
                this.#isShaking = false;
                this.#updateFlag(Camera2D.FLAGS.SHAKING, false);
            }
        }

        this.#isDirty = true;
        this.#updateFlag(Camera2D.FLAGS.DIRTY, true);
        this.#updateFlag(Camera2D.FLAGS.UPDATED, true);
    }

    shake(intensity, duration) {
        this.#shakeIntensity = intensity;
        this.#shakeDuration = duration;
        this.#shakeTimer = duration;
        this.#isShaking = true;
        this.#updateFlag(Camera2D.FLAGS.SHAKING, true);
    }

    stopShake() {
        this.#shakeTimer = 0;
        this.#shakeIntensity = 0;
        this.#isShaking = false;
        this.#updateFlag(Camera2D.FLAGS.SHAKING, false);
    }

    centerOnScreen(viewport = null) {
        if (viewport) {
            this.viewport = { ...this.viewport, ...viewport };
        }
        this.position.x = this.viewport.width / 2;
        this.position.y = this.viewport.height / 2;
        this.#isCentered = true;
        this.#updateFlag(Camera2D.FLAGS.CENTERED, true);
        this.#updateFlag(Camera2D.FLAGS.DIRTY, true);
        this.emit('centered', { camera: this });
        return this;
    }

    pan(deltaX, deltaY) {
        if (this.#isLocked || this.#isFrozen) return;
        this.position.x += deltaX;
        this.position.y += deltaY;
        this.#isPanning = true;
        this.#updateFlag(Camera2D.FLAGS.PANNING, true);
        this.#updateFlag(Camera2D.FLAGS.DIRTY, true);
        this.emit('panned', { camera: this, deltaX, deltaY });
    }

    stopPanning() {
        this.#isPanning = false;
        this.#updateFlag(Camera2D.FLAGS.PANNING, false);
    }

    zoomIn(amount) {
        this.zoom *= (1 + amount);
        this.#isZooming = true;
        this.#updateFlag(Camera2D.FLAGS.ZOOMING, true);
        this.#updateFlag(Camera2D.FLAGS.DIRTY, true);
        this.emit('zoomed', { camera: this, amount });
    }

    zoomOut(amount) {
        this.zoom *= (1 - amount);
        this.#isZooming = true;
        this.#updateFlag(Camera2D.FLAGS.ZOOMING, true);
        this.#updateFlag(Camera2D.FLAGS.DIRTY, true);
        this.emit('zoomed', { camera: this, amount });
    }

    stopZooming() {
        this.#isZooming = false;
        this.#updateFlag(Camera2D.FLAGS.ZOOMING, false);
    }

    enableSmoothing() {
        this.#isSmoothingEnabled = true;
        this.#updateFlag(Camera2D.FLAGS.SMOOTHING_ENABLED, true);
    }

    disableSmoothing() {
        this.#isSmoothingEnabled = false;
        this.#updateFlag(Camera2D.FLAGS.SMOOTHING_ENABLED, false);
    }

    enableBounds() {
        this.#isBoundsEnabled = true;
        this.#updateFlag(Camera2D.FLAGS.BOUNDS_ENABLED, true);
    }

    disableBounds() {
        this.#isBoundsEnabled = false;
        this.#updateFlag(Camera2D.FLAGS.BOUNDS_ENABLED, false);
    }

    enableFollow() {
        this.#isFollowing = true;
        this.#updateFlag(Camera2D.FLAGS.FOLLOWING, true);
    }

    disableFollow() {
        this.#isFollowing = false;
        this.#updateFlag(Camera2D.FLAGS.FOLLOWING, false);
    }

    updateProjectionMatrix() {
        if (!this.#isDirty) return;

        const w = this.viewport.width / 2 / this.zoom;
        const h = this.viewport.height / 2 / this.zoom;

        this.projectionMatrix.orthographic(
            -w + this.position.x,
            w + this.position.x,
            h + this.position.y,
            -h + this.position.y,
            this.near,
            this.far
        );
        this.projectionMatrixInverse.copy(this.projectionMatrix).invert();

        this.#isDirty = false;
        this.#updateFlag(Camera2D.FLAGS.DIRTY, false);
        this.#updateFlag(Camera2D.FLAGS.RENDERED, true);
    }

    updateViewMatrix() {
        if (!this.#isDirty) return;
        this.viewMatrix.identity();
        this.#isDirty = false;
    }

    getWorldMouse(mouseX, mouseY) {
        const x = (mouseX / this.viewport.width) * 2 - 1;
        const y = -((mouseY / this.viewport.height) * 2 - 1);

        const vec = new Vector2(x, y);
        const invProj = this.projectionMatrixInverse;
        const invView = this.viewMatrix.clone().invert();

        const result = new Vector2(
            vec.x * invProj[0] + invProj[12],
            vec.y * invProj[5] + invProj[13]
        );

        return result;
    }

    lock() {
        this.#isLocked = true;
        this.#updateFlag(Camera2D.FLAGS.LOCKED, true);
        this.emit('locked', { camera: this });
    }

    unlock() {
        this.#isLocked = false;
        this.#updateFlag(Camera2D.FLAGS.LOCKED, false);
        this.emit('unlocked', { camera: this });
    }

    freeze() {
        this.#isFrozen = true;
        this.#updateFlag(Camera2D.FLAGS.FROZEN, true);
        this.emit('frozen', { camera: this });
    }

    unfreeze() {
        this.#isFrozen = false;
        this.#updateFlag(Camera2D.FLAGS.FROZEN, false);
        this.emit('unfrozen', { camera: this });
    }

    pause() {
        this.#isPaused = true;
        this.#updateFlag(Camera2D.FLAGS.PAUSED, true);
        this.emit('paused', { camera: this });
    }

    resume() {
        this.#isPaused = false;
        this.#updateFlag(Camera2D.FLAGS.PAUSED, false);
        this.emit('resumed', { camera: this });
    }

    clone() {
        const clone = new Camera2D({
            name: `${this.name}_clone`,
            position: this.position.clone(),
            smoothing: this.#smoothing,
            bounds: this.#bounds ? { ...this.#bounds } : null,
            viewport: { ...this.viewport },
            zoom: this.zoom,
            isCentered: this.#isCentered,
            isFollowing: this.#isFollowing,
            isShaking: this.#isShaking,
            isSmoothingEnabled: this.#isSmoothingEnabled,
            isBoundsEnabled: this.#isBoundsEnabled,
            isStatic: this.#isStatic,
            isLocked: this.#isLocked,
            isFrozen: this.#isFrozen,
            isPaused: this.#isPaused,
            isSelected: this.#isSelected,
            isHovered: this.#isHovered,
            isDragging: this.#isDragging,
            isMoving: this.#isMoving,
            flags: this.#flags
        });
        return clone;
    }

    toString() {
        return `Camera2D(name=${this.name}, zoom=${this.zoom}, following=${this.#isFollowing}, shaking=${this.#isShaking}, centered=${this.#isCentered}, flags=${this.#flags})`;
    }
}

export default Camera2D;
