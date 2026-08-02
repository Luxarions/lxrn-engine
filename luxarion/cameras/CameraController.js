/**
 * CameraController.js - Camera controller for LXRN Engine.
 * Handles camera input, updates, and state management.
 * Includes comprehensive flags and boolean state management.
 * 
 * @module CameraController
 * @author LXRN
 * @version 2.0.0
 */

import { Logger } from '../utils/Logger.js';

class CameraController {
    #camera = null;
    #enabled = true;
    #flags = 0;
    
    // State flags
    #isActive = true;
    #isPaused = false;
    #isLocked = false;
    #isFrozen = false;
    #isDragging = false;
    #isPanning = false;
    #isZooming = false;
    #isRotating = false;
    #isFollowing = false;
    #isOrbiting = false;
    #isTilting = false;
    #isDolly = false;
    #isTracking = false;
    #isSmoothingEnabled = true;
    #isInertiaEnabled = false;
    #isClampEnabled = true;
    #isAutoUpdate = true;
    #isUpdated = false;
    #isDestroyed = false;
    
    // Input state
    #inputEnabled = true;
    #keyboardEnabled = true;
    #mouseEnabled = true;
    #touchEnabled = true;
    #gamepadEnabled = true;
    
    // Input flags
    #isKeyDown = false;
    #isMouseDown = false;
    #isTouchDown = false;
    #isGamepadConnected = false;
    
    // Sensitivity
    #mouseSensitivity = 1;
    #touchSensitivity = 1;
    #keyboardSensitivity = 1;
    #gamepadSensitivity = 1;
    #scrollSensitivity = 1;
    
    // Inertia
    #inertia = 0;
    #inertiaDamping = 0.9;
    #velocityX = 0;
    #velocityY = 0;
    #velocityZ = 0;
    
    // Clamp
    #minX = -Infinity;
    #maxX = Infinity;
    #minY = -Infinity;
    #maxY = Infinity;
    #minZ = -Infinity;
    #maxZ = Infinity;
    
    // Rotation limits
    #minTheta = -Infinity;
    #maxTheta = Infinity;
    #minPhi = -Infinity;
    #maxPhi = Infinity;
    
    // Zoom limits
    #minZoom = 0.1;
    #maxZoom = 100;
    
    // Input buffer
    #inputBuffer = [];
    #bufferSize = 10;
    
    __lastInputTime = 0;
    __inputCount = 0;

    static FLAGS = {
        ENABLED: 1 << 0,
        ACTIVE: 1 << 1,
        PAUSED: 1 << 2,
        LOCKED: 1 << 3,
        FROZEN: 1 << 4,
        DRAGGING: 1 << 5,
        PANNING: 1 << 6,
        ZOOMING: 1 << 7,
        ROTATING: 1 << 8,
        FOLLOWING: 1 << 9,
        ORBITING: 1 << 10,
        TILTING: 1 << 11,
        DOLLY: 1 << 12,
        TRACKING: 1 << 13,
        SMOOTHING_ENABLED: 1 << 14,
        INERTIA_ENABLED: 1 << 15,
        CLAMP_ENABLED: 1 << 16,
        AUTO_UPDATE: 1 << 17,
        UPDATED: 1 << 18,
        DESTROYED: 1 << 19,
        INPUT_ENABLED: 1 << 20,
        KEYBOARD_ENABLED: 1 << 21,
        MOUSE_ENABLED: 1 << 22,
        TOUCH_ENABLED: 1 << 23,
        GAMEPAD_ENABLED: 1 << 24,
        KEY_DOWN: 1 << 25,
        MOUSE_DOWN: 1 << 26,
        TOUCH_DOWN: 1 << 27,
        GAMEPAD_CONNECTED: 1 << 28
    };

    constructor(camera, options = {}) {
        this.#camera = camera;
        
        if (options.flags !== undefined) {
            this.#flags = options.flags;
        }
        
        if (options.isActive !== undefined) {
            this.#isActive = options.isActive;
            this.#updateFlag(CameraController.FLAGS.ACTIVE, this.#isActive);
        }
        
        if (options.isPaused !== undefined) {
            this.#isPaused = options.isPaused;
            this.#updateFlag(CameraController.FLAGS.PAUSED, this.#isPaused);
        }
        
        if (options.isLocked !== undefined) {
            this.#isLocked = options.isLocked;
            this.#updateFlag(CameraController.FLAGS.LOCKED, this.#isLocked);
        }
        
        if (options.isFrozen !== undefined) {
            this.#isFrozen = options.isFrozen;
            this.#updateFlag(CameraController.FLAGS.FROZEN, this.#isFrozen);
        }
        
        if (options.isSmoothingEnabled !== undefined) {
            this.#isSmoothingEnabled = options.isSmoothingEnabled;
            this.#updateFlag(CameraController.FLAGS.SMOOTHING_ENABLED, this.#isSmoothingEnabled);
        }
        
        if (options.isInertiaEnabled !== undefined) {
            this.#isInertiaEnabled = options.isInertiaEnabled;
            this.#updateFlag(CameraController.FLAGS.INERTIA_ENABLED, this.#isInertiaEnabled);
        }
        
        if (options.isClampEnabled !== undefined) {
            this.#isClampEnabled = options.isClampEnabled;
            this.#updateFlag(CameraController.FLAGS.CLAMP_ENABLED, this.#isClampEnabled);
        }
        
        if (options.isAutoUpdate !== undefined) {
            this.#isAutoUpdate = options.isAutoUpdate;
            this.#updateFlag(CameraController.FLAGS.AUTO_UPDATE, this.#isAutoUpdate);
        }
        
        if (options.isInputEnabled !== undefined) {
            this.#inputEnabled = options.isInputEnabled;
            this.#updateFlag(CameraController.FLAGS.INPUT_ENABLED, this.#inputEnabled);
        }
        
        if (options.isKeyboardEnabled !== undefined) {
            this.#keyboardEnabled = options.isKeyboardEnabled;
            this.#updateFlag(CameraController.FLAGS.KEYBOARD_ENABLED, this.#keyboardEnabled);
        }
        
        if (options.isMouseEnabled !== undefined) {
            this.#mouseEnabled = options.isMouseEnabled;
            this.#updateFlag(CameraController.FLAGS.MOUSE_ENABLED, this.#mouseEnabled);
        }
        
        if (options.isTouchEnabled !== undefined) {
            this.#touchEnabled = options.isTouchEnabled;
            this.#updateFlag(CameraController.FLAGS.TOUCH_ENABLED, this.#touchEnabled);
        }
        
        if (options.isGamepadEnabled !== undefined) {
            this.#gamepadEnabled = options.isGamepadEnabled;
            this.#updateFlag(CameraController.FLAGS.GAMEPAD_ENABLED, this.#gamepadEnabled);
        }
        
        if (options.mouseSensitivity !== undefined) {
            this.#mouseSensitivity = options.mouseSensitivity;
        }
        
        if (options.touchSensitivity !== undefined) {
            this.#touchSensitivity = options.touchSensitivity;
        }
        
        if (options.keyboardSensitivity !== undefined) {
            this.#keyboardSensitivity = options.keyboardSensitivity;
        }
        
        if (options.gamepadSensitivity !== undefined) {
            this.#gamepadSensitivity = options.gamepadSensitivity;
        }
        
        if (options.scrollSensitivity !== undefined) {
            this.#scrollSensitivity = options.scrollSensitivity;
        }
        
        if (options.minZoom !== undefined) {
            this.#minZoom = options.minZoom;
        }
        
        if (options.maxZoom !== undefined) {
            this.#maxZoom = options.maxZoom;
        }
        
        if (options.inertiaDamping !== undefined) {
            this.#inertiaDamping = options.inertiaDamping;
        }
        
        if (options.bufferSize !== undefined) {
            this.#bufferSize = options.bufferSize;
        }

        this.#updateFlag(CameraController.FLAGS.ENABLED, this.#enabled);
        this.#updateFlag(CameraController.FLAGS.ACTIVE, this.#isActive);

        Logger.log(`CameraController created for ${camera.name}`);
    }

    get camera() { return this.#camera; }
    get enabled() { return this.#enabled; }
    get isActive() { return this.#isActive; }
    get isPaused() { return this.#isPaused; }
    get isLocked() { return this.#isLocked; }
    get isFrozen() { return this.#isFrozen; }
    get isDragging() { return this.#isDragging; }
    get isPanning() { return this.#isPanning; }
    get isZooming() { return this.#isZooming; }
    get isRotating() { return this.#isRotating; }
    get isFollowing() { return this.#isFollowing; }
    get isOrbiting() { return this.#isOrbiting; }
    get isSmoothingEnabled() { return this.#isSmoothingEnabled; }
    get isInertiaEnabled() { return this.#isInertiaEnabled; }
    get isClampEnabled() { return this.#isClampEnabled; }
    get isAutoUpdate() { return this.#isAutoUpdate; }
    get isInputEnabled() { return this.#inputEnabled; }
    get isKeyboardEnabled() { return this.#keyboardEnabled; }
    get isMouseEnabled() { return this.#mouseEnabled; }
    get isTouchEnabled() { return this.#touchEnabled; }
    get isGamepadEnabled() { return this.#gamepadEnabled; }
    get mouseSensitivity() { return this.#mouseSensitivity; }
    get touchSensitivity() { return this.#touchSensitivity; }
    get keyboardSensitivity() { return this.#keyboardSensitivity; }
    get gamepadSensitivity() { return this.#gamepadSensitivity; }
    get scrollSensitivity() { return this.#scrollSensitivity; }
    get inertia() { return this.#inertia; }
    get inertiaDamping() { return this.#inertiaDamping; }
    get minZoom() { return this.#minZoom; }
    get maxZoom() { return this.#maxZoom; }
    get isDestroyed() { return this.#isDestroyed; }

    set enabled(value) {
        this.#enabled = value;
        this.#updateFlag(CameraController.FLAGS.ENABLED, value);
    }

    set isActive(value) {
        this.#isActive = value;
        this.#updateFlag(CameraController.FLAGS.ACTIVE, value);
    }

    set isPaused(value) {
        this.#isPaused = value;
        this.#updateFlag(CameraController.FLAGS.PAUSED, value);
    }

    set isLocked(value) {
        this.#isLocked = value;
        this.#updateFlag(CameraController.FLAGS.LOCKED, value);
    }

    set isFrozen(value) {
        this.#isFrozen = value;
        this.#updateFlag(CameraController.FLAGS.FROZEN, value);
    }

    set isSmoothingEnabled(value) {
        this.#isSmoothingEnabled = value;
        this.#updateFlag(CameraController.FLAGS.SMOOTHING_ENABLED, value);
    }

    set isInertiaEnabled(value) {
        this.#isInertiaEnabled = value;
        this.#updateFlag(CameraController.FLAGS.INERTIA_ENABLED, value);
    }

    set isClampEnabled(value) {
        this.#isClampEnabled = value;
        this.#updateFlag(CameraController.FLAGS.CLAMP_ENABLED, value);
    }

    set isAutoUpdate(value) {
        this.#isAutoUpdate = value;
        this.#updateFlag(CameraController.FLAGS.AUTO_UPDATE, value);
    }

    set isInputEnabled(value) {
        this.#inputEnabled = value;
        this.#updateFlag(CameraController.FLAGS.INPUT_ENABLED, value);
    }

    set isKeyboardEnabled(value) {
        this.#keyboardEnabled = value;
        this.#updateFlag(CameraController.FLAGS.KEYBOARD_ENABLED, value);
    }

    set isMouseEnabled(value) {
        this.#mouseEnabled = value;
        this.#updateFlag(CameraController.FLAGS.MOUSE_ENABLED, value);
    }

    set isTouchEnabled(value) {
        this.#touchEnabled = value;
        this.#updateFlag(CameraController.FLAGS.TOUCH_ENABLED, value);
    }

    set isGamepadEnabled(value) {
        this.#gamepadEnabled = value;
        this.#updateFlag(CameraController.FLAGS.GAMEPAD_ENABLED, value);
    }

    set mouseSensitivity(value) {
        this.#mouseSensitivity = Math.max(0, value);
    }

    set touchSensitivity(value) {
        this.#touchSensitivity = Math.max(0, value);
    }

    set keyboardSensitivity(value) {
        this.#keyboardSensitivity = Math.max(0, value);
    }

    set gamepadSensitivity(value) {
        this.#gamepadSensitivity = Math.max(0, value);
    }

    set scrollSensitivity(value) {
        this.#scrollSensitivity = Math.max(0, value);
    }

    set inertiaDamping(value) {
        this.#inertiaDamping = Math.max(0, Math.min(1, value));
    }

    set minZoom(value) {
        this.#minZoom = Math.max(0.01, value);
    }

    set maxZoom(value) {
        this.#maxZoom = Math.max(this.#minZoom, value);
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

    update(deltaTime) {
        if (this.#isDestroyed || !this.#enabled || !this.#isActive) return;
        if (this.#isPaused || this.#isFrozen || this.#isLocked) return;
        if (!this.#camera) return;

        this.#updateInertia(deltaTime);

        if (this.#camera.follow && typeof this.#camera.follow === 'function') {
            this.#isFollowing = true;
            this.#updateFlag(CameraController.FLAGS.FOLLOWING, true);
            this.#camera.follow(deltaTime);
        } else if (this.#camera.update && typeof this.#camera.update === 'function') {
            this.#camera.update(deltaTime);
        }

        this.#isUpdated = true;
        this.#updateFlag(CameraController.FLAGS.UPDATED, true);
        this.#updateFlag(CameraController.FLAGS.FOLLOWING, this.#isFollowing);
    }

    #updateInertia(deltaTime) {
        if (!this.#isInertiaEnabled) return;
        
        if (Math.abs(this.#velocityX) > 0.001 || Math.abs(this.#velocityY) > 0.001 || Math.abs(this.#velocityZ) > 0.001) {
            this.position.x += this.#velocityX * deltaTime;
            this.position.y += this.#velocityY * deltaTime;
            this.position.z += this.#velocityZ * deltaTime;
            
            this.#velocityX *= this.#inertiaDamping;
            this.#velocityY *= this.#inertiaDamping;
            this.#velocityZ *= this.#inertiaDamping;
            
            if (Math.abs(this.#velocityX) < 0.001) this.#velocityX = 0;
            if (Math.abs(this.#velocityY) < 0.001) this.#velocityY = 0;
            if (Math.abs(this.#velocityZ) < 0.001) this.#velocityZ = 0;
        }
    }

    addVelocity(x, y, z = 0) {
        if (!this.#isInertiaEnabled) return;
        this.#velocityX += x;
        this.#velocityY += y;
        this.#velocityZ += z;
    }

    setVelocity(x, y, z = 0) {
        if (!this.#isInertiaEnabled) return;
        this.#velocityX = x;
        this.#velocityY = y;
        this.#velocityZ = z;
    }

    resetVelocity() {
        this.#velocityX = 0;
        this.#velocityY = 0;
        this.#velocityZ = 0;
    }

    processInput(input) {
        if (this.#isDestroyed || !this.#enabled || !this.#isActive) return;
        if (this.#isPaused || this.#isFrozen || this.#isLocked) return;
        if (!this.#inputEnabled) return;

        this.#inputBuffer.push(input);
        if (this.#inputBuffer.length > this.#bufferSize) {
            this.#inputBuffer.shift();
        }

        this.__lastInputTime = performance.now();
        this.__inputCount++;

        if (input.type === 'mouse') {
            this.#processMouseInput(input);
        } else if (input.type === 'keyboard') {
            this.#processKeyboardInput(input);
        } else if (input.type === 'touch') {
            this.#processTouchInput(input);
        } else if (input.type === 'gamepad') {
            this.#processGamepadInput(input);
        } else if (input.type === 'scroll') {
            this.#processScrollInput(input);
        }
    }

    #processMouseInput(input) {
        if (!this.#mouseEnabled) return;
        
        const sensitivity = this.#mouseSensitivity;
        
        if (input.button === 'left' && input.dragging) {
            this.#isDragging = true;
            this.#updateFlag(CameraController.FLAGS.DRAGGING, true);
            if (input.mode === 'pan') {
                this.#isPanning = true;
                this.#updateFlag(CameraController.FLAGS.PANNING, true);
                this.pan(input.deltaX * sensitivity, input.deltaY * sensitivity);
            } else if (input.mode === 'orbit') {
                this.#isOrbiting = true;
                this.#updateFlag(CameraController.FLAGS.ORBITING, true);
                this.orbit(input.deltaX * sensitivity, input.deltaY * sensitivity);
            } else if (input.mode === 'rotate') {
                this.#isRotating = true;
                this.#updateFlag(CameraController.FLAGS.ROTATING, true);
                this.rotate(input.deltaX * sensitivity, input.deltaY * sensitivity);
            }
        } else if (input.button === 'right' && input.dragging) {
            this.#isDragging = true;
            this.#updateFlag(CameraController.FLAGS.DRAGGING, true);
            this.#isPanning = true;
            this.#updateFlag(CameraController.FLAGS.PANNING, true);
            this.pan(input.deltaX * sensitivity, input.deltaY * sensitivity);
        } else if (input.button === 'middle' && input.dragging) {
            this.#isDragging = true;
            this.#updateFlag(CameraController.FLAGS.DRAGGING, true);
            this.#isOrbiting = true;
            this.#updateFlag(CameraController.FLAGS.ORBITING, true);
            this.orbit(input.deltaX * sensitivity, input.deltaY * sensitivity);
        } else {
            this.#isDragging = false;
            this.#updateFlag(CameraController.FLAGS.DRAGGING, false);
            if (this.#isPanning) {
                this.#isPanning = false;
                this.#updateFlag(CameraController.FLAGS.PANNING, false);
            }
            if (this.#isOrbiting) {
                this.#isOrbiting = false;
                this.#updateFlag(CameraController.FLAGS.ORBITING, false);
            }
            if (this.#isRotating) {
                this.#isRotating = false;
                this.#updateFlag(CameraController.FLAGS.ROTATING, false);
            }
        }
    }

    #processKeyboardInput(input) {
        if (!this.#keyboardEnabled) return;
        
        this.#isKeyDown = input.pressed;
        this.#updateFlag(CameraController.FLAGS.KEY_DOWN, input.pressed);
        
        const sensitivity = this.#keyboardSensitivity;
        
        if (input.key === 'w' || input.key === 'arrowup') {
            this.pan(0, -sensitivity);
        } else if (input.key === 's' || input.key === 'arrowdown') {
            this.pan(0, sensitivity);
        } else if (input.key === 'a' || input.key === 'arrowleft') {
            this.pan(-sensitivity, 0);
        } else if (input.key === 'd' || input.key === 'arrowright') {
            this.pan(sensitivity, 0);
        } else if (input.key === 'q') {
            this.rotate(-sensitivity, 0);
        } else if (input.key === 'e') {
            this.rotate(sensitivity, 0);
        } else if (input.key === 'r') {
            this.resetCamera();
        }
    }

    #processTouchInput(input) {
        if (!this.#touchEnabled) return;
        
        this.#isTouchDown = input.pressed;
        this.#updateFlag(CameraController.FLAGS.TOUCH_DOWN, input.pressed);
        
        const sensitivity = this.#touchSensitivity;
        
        if (input.pressed && input.touches === 1) {
            this.#isDragging = true;
            this.#updateFlag(CameraController.FLAGS.DRAGGING, true);
            this.#isPanning = true;
            this.#updateFlag(CameraController.FLAGS.PANNING, true);
            this.pan(input.deltaX * sensitivity, input.deltaY * sensitivity);
        } else if (input.pressed && input.touches === 2) {
            this.#isZooming = true;
            this.#updateFlag(CameraController.FLAGS.ZOOMING, true);
            this.zoom(input.delta * sensitivity);
        } else {
            this.#isDragging = false;
            this.#updateFlag(CameraController.FLAGS.DRAGGING, false);
            this.#isPanning = false;
            this.#updateFlag(CameraController.FLAGS.PANNING, false);
            this.#isZooming = false;
            this.#updateFlag(CameraController.FLAGS.ZOOMING, false);
        }
    }

    #processGamepadInput(input) {
        if (!this.#gamepadEnabled) return;
        
        this.#isGamepadConnected = input.connected;
        this.#updateFlag(CameraController.FLAGS.GAMEPAD_CONNECTED, input.connected);
        
        const sensitivity = this.#gamepadSensitivity;
        
        if (input.leftStick) {
            this.pan(input.leftStick.x * sensitivity, input.leftStick.y * sensitivity);
        }
        if (input.rightStick) {
            this.orbit(input.rightStick.x * sensitivity, input.rightStick.y * sensitivity);
        }
        if (input.triggers) {
            this.zoom(input.triggers * sensitivity);
        }
    }

    #processScrollInput(input) {
        const sensitivity = this.#scrollSensitivity;
        this.#isZooming = true;
        this.#updateFlag(CameraController.FLAGS.ZOOMING, true);
        this.zoom(input.delta * sensitivity);
        setTimeout(() => {
            this.#isZooming = false;
            this.#updateFlag(CameraController.FLAGS.ZOOMING, false);
        }, 100);
    }

    pan(deltaX, deltaY) {
        if (this.#isLocked || this.#isFrozen) return;
        if (this.#camera) {
            if (this.#camera.pan && typeof this.#camera.pan === 'function') {
                this.#camera.pan(deltaX, deltaY);
            } else {
                this.#camera.position.x += deltaX;
                this.#camera.position.y += deltaY;
            }
            if (this.#isInertiaEnabled) {
                this.addVelocity(deltaX, deltaY, 0);
            }
        }
    }

    orbit(deltaTheta, deltaPhi) {
        if (this.#isLocked || this.#isFrozen) return;
        if (this.#camera && this.#camera.rotate && typeof this.#camera.rotate === 'function') {
            this.#camera.rotate(deltaTheta, deltaPhi);
        }
    }

    rotate(deltaX, deltaY) {
        if (this.#isLocked || this.#isFrozen) return;
        if (this.#camera) {
            this.#camera.rotation.x += deltaX;
            this.#camera.rotation.y += deltaY;
        }
    }

    zoom(delta) {
        if (this.#isLocked || this.#isFrozen) return;
        if (this.#camera) {
            let newZoom = this.#camera.zoom + delta;
            newZoom = Math.max(this.#minZoom, Math.min(this.#maxZoom, newZoom));
            this.#camera.zoom = newZoom;
        }
    }

    resetCamera() {
        if (this.#isLocked) return;
        if (this.#camera) {
            this.#camera.position.set(0, 0, 10);
            this.#camera.rotation.set(0, 0, 0);
            this.#camera.zoom = 1;
            this.resetVelocity();
            this.#isPanning = false;
            this.#isOrbiting = false;
            this.#isRotating = false;
            this.#updateFlag(CameraController.FLAGS.PANNING, false);
            this.#updateFlag(CameraController.FLAGS.ORBITING, false);
            this.#updateFlag(CameraController.FLAGS.ROTATING, false);
        }
    }

    lock() {
        this.#isLocked = true;
        this.#updateFlag(CameraController.FLAGS.LOCKED, true);
        this.emit('locked', { controller: this });
    }

    unlock() {
        this.#isLocked = false;
        this.#updateFlag(CameraController.FLAGS.LOCKED, false);
        this.emit('unlocked', { controller: this });
    }

    pause() {
        this.#isPaused = true;
        this.#updateFlag(CameraController.FLAGS.PAUSED, true);
        this.emit('paused', { controller: this });
    }

    resume() {
        this.#isPaused = false;
        this.#updateFlag(CameraController.FLAGS.PAUSED, false);
        this.emit('resumed', { controller: this });
    }

    freeze() {
        this.#isFrozen = true;
        this.#updateFlag(CameraController.FLAGS.FROZEN, true);
        this.emit('frozen', { controller: this });
    }

    unfreeze() {
        this.#isFrozen = false;
        this.#updateFlag(CameraController.FLAGS.FROZEN, false);
        this.emit('unfrozen', { controller: this });
    }

    enable() {
        this.#enabled = true;
        this.#isActive = true;
        this.#updateFlag(CameraController.FLAGS.ENABLED, true);
        this.#updateFlag(CameraController.FLAGS.ACTIVE, true);
        this.emit('enabled', { controller: this });
    }

    disable() {
        this.#enabled = false;
        this.#isActive = false;
        this.#updateFlag(CameraController.FLAGS.ENABLED, false);
        this.#updateFlag(CameraController.FLAGS.ACTIVE, false);
        this.emit('disabled', { controller: this });
    }

    enableInput() {
        this.#inputEnabled = true;
        this.#updateFlag(CameraController.FLAGS.INPUT_ENABLED, true);
    }

    disableInput() {
        this.#inputEnabled = false;
        this.#updateFlag(CameraController.FLAGS.INPUT_ENABLED, false);
    }

    getInputBuffer() {
        return [...this.#inputBuffer];
    }

    clearInputBuffer() {
        this.#inputBuffer = [];
    }

    getStats() {
        return {
            inputCount: this.__inputCount,
            lastInputTime: this.__lastInputTime,
            bufferSize: this.#inputBuffer.length,
            velocity: { x: this.#velocityX, y: this.#velocityY, z: this.#velocityZ }
        };
    }

    destroy() {
        if (this.#isDestroyed) return;
        this.#isDestroyed = true;
        this.#camera = null;
        this.#inputBuffer = [];
        this.#updateFlag(CameraController.FLAGS.DESTROYED, true);
        Logger.log('CameraController destroyed');
    }

    toString() {
        return `CameraController(camera=${this.#camera?.name || 'null'}, enabled=${this.#enabled}, active=${this.#isActive}, paused=${this.#isPaused}, locked=${this.#isLocked}, flags=${this.#flags})`;
    }
}

export default CameraController;
