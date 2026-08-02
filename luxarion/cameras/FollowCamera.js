/**
 * FollowCamera.js - Follow camera for LXRN Engine.
 * Camera that smoothly follows a target.
 * 
 * @module FollowCamera
 * @author LXRN
 * @version 1.0.0
 */

import Camera from './Camera.js';
import { Vector3 } from '../math/Vector3.js';
import { Euler } from '../math/Euler.js';
import { Logger } from '../utils/Logger.js';

class FollowCamera extends Camera {
    #target = null;
    #offset = new Vector3(0, 0, 0);
    #smoothing = 0.1;
    #lookAhead = 0;
    #rotationSmoothing = 0.1;

    constructor(options = {}) {
        super({
            name: options.name || 'FollowCamera',
            position: options.position || { x: 0, y: 0, z: 10 },
            aspect: options.aspect || 1,
            near: options.near || 0.1,
            far: options.far || 1000
        });

        this.#smoothing = options.smoothing || 0.1;
        this.#rotationSmoothing = options.rotationSmoothing || 0.1;
        this.#lookAhead = options.lookAhead || 0;

        if (options.offset) {
            this.#offset.copy(options.offset);
        }

        if (options.target) {
            this.setTarget(options.target);
        }

        this.type = 'FollowCamera';
        this.#isPerspective = true;

        Logger.log(`FollowCamera created: ${this.name}`);
    }

    get target() { return this.#target; }
    get offset() { return this.#offset; }
    get smoothing() { return this.#smoothing; }
    get lookAhead() { return this.#lookAhead; }

    set offset(value) {
        this.#offset.copy(value);
    }

    set smoothing(value) {
        this.#smoothing = Math.max(0, Math.min(1, value));
    }

    set lookAhead(value) {
        this.#lookAhead = value;
    }

    setTarget(target) {
        this.#target = target;
    }

    follow(deltaTime) {
        if (!this.#target) return;

        const targetPos = this.#target.position.clone();
        targetPos.add(this.#offset);

        if (this.#lookAhead > 0 && this.#target.velocity) {
            const vel = this.#target.velocity.clone().normalize().multiplyScalar(this.#lookAhead);
            targetPos.add(vel);
        }

        if (this.#smoothing > 0) {
            this.position.x += (targetPos.x - this.position.x) * this.#smoothing;
            this.position.y += (targetPos.y - this.position.y) * this.#smoothing;
            this.position.z += (targetPos.z - this.position.z) * this.#smoothing;
        } else {
            this.position.copy(targetPos);
        }

        if (this.#rotationSmoothing > 0) {
            const lookTarget = this.#target.position.clone();
            const direction = lookTarget.sub(this.position);
            const targetRotation = new Euler().setFromDirection(direction);

            this.rotation.x += (targetRotation.x - this.rotation.x) * this.#rotationSmoothing;
            this.rotation.y += (targetRotation.y - this.rotation.y) * this.#rotationSmoothing;
            this.rotation.z += (targetRotation.z - this.rotation.z) * this.#rotationSmoothing;
        }

        this.#isDirty = true;
    }

    updateViewMatrix() {
        if (!this.#isDirty) return;

        const position = this.position;
        const target = this.#target ? this.#target.position.clone() : new Vector3(0, 0, 0);
        const up = this.up || new Vector3(0, 1, 0);

        this.viewMatrix.lookAt(position, target, up);
        this.#isDirty = false;
    }

    updateProjectionMatrix() {
        if (!this.#isDirty) return;

        const fovRad = 60 * Math.PI / 180;
        this.projectionMatrix.perspective(fovRad, this.aspect, this.near, this.far);
        this.projectionMatrixInverse.copy(this.projectionMatrix).invert();

        this.#isDirty = false;
    }

    clone() {
        const clone = new FollowCamera({
            name: `${this.name}_clone`,
            position: this.position.clone(),
            offset: this.#offset.clone(),
            smoothing: this.#smoothing,
            rotationSmoothing: this.#rotationSmoothing,
            lookAhead: this.#lookAhead,
            near: this.near,
            far: this.far,
            viewport: { ...this.viewport }
        });
        return clone;
    }

    toString() {
        return `FollowCamera(name=${this.name}, smoothing=${this.#smoothing})`;
    }
}

export default FollowCamera;
