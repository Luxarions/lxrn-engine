/**
 * Camera2D.js - 2D camera for LXRN Engine.
 * Handles 2D rendering with zoom, pan, shake, and follow.
 * 
 * @module Camera2D
 * @author LXRN
 * @version 1.0.0
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

        if (options.target) {
            this.setTarget(options.target);
        }

        Logger.log(`Camera2D created: ${this.name}`);
    }

    get smoothing() { return this.#smoothing; }
    get bounds() { return this.#bounds; }
    get target() { return this.#target; }
    get offset() { return this.#offset; }

    set smoothing(value) {
        this.#smoothing = Math.max(0, Math.min(1, value));
    }

    set bounds(value) {
        this.#bounds = value;
    }

    set offset(value) {
        this.#offset.copy(value);
    }

    setTarget(target) {
        this.#target = target;
    }

    follow(deltaTime) {
        if (!this.#target) return;

        const targetX = this.#target.position.x + this.#offset.x;
        const targetY = this.#target.position.y + this.#offset.y;

        if (this.#smoothing > 0) {
            this.position.x += (targetX - this.position.x) * this.#smoothing;
            this.position.y += (targetY - this.position.y) * this.#smoothing;
        } else {
            this.position.x = targetX;
            this.position.y = targetY;
        }

        if (this.#bounds) {
            this.position.x = Math.max(this.#bounds.x, Math.min(this.#bounds.x + this.#bounds.width, this.position.x));
            this.position.y = Math.max(this.#bounds.y, Math.min(this.#bounds.y + this.#bounds.height, this.position.y));
        }

        if (this.#shakeTimer > 0) {
            const intensity = this.#shakeIntensity * (this.#shakeTimer / this.#shakeDuration);
            const shakeX = (Math.random() - 0.5) * intensity * 2;
            const shakeY = (Math.random() - 0.5) * intensity * 2;
            this.position.x += shakeX;
            this.position.y += shakeY;
            this.#shakeTimer -= deltaTime;
        }

        this.#isDirty = true;
    }

    shake(intensity, duration) {
        this.#shakeIntensity = intensity;
        this.#shakeDuration = duration;
        this.#shakeTimer = duration;
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

    clone() {
        const clone = new Camera2D({
            name: `${this.name}_clone`,
            position: this.position.clone(),
            smoothing: this.#smoothing,
            bounds: this.#bounds ? { ...this.#bounds } : null,
            viewport: { ...this.viewport },
            zoom: this.zoom
        });
        return clone;
    }

    toString() {
        return `Camera2D(name=${this.name}, zoom=${this.zoom})`;
    }
}

export default Camera2D;
