/**
 * PerspectiveCamera.js - Perspective camera for LXRN Engine.
 * 3D perspective projection with field of view.
 * 
 * @module PerspectiveCamera
 * @author LXRN
 * @version 1.0.0
 */

import Camera from './Camera.js';
import { Vector3 } from '../math/Vector3.js';
import { Logger } from '../utils/Logger.js';

class PerspectiveCamera extends Camera {
    #fov = 60;

    constructor(options = {}) {
        super({
            name: options.name || 'PerspectiveCamera',
            position: options.position || { x: 0, y: 0, z: 10 },
            aspect: options.aspect || 1,
            near: options.near || 0.1,
            far: options.far || 1000
        });

        this.#fov = options.fov || 60;
        this.#isPerspective = true;
        this.type = 'PerspectiveCamera';

        this.update();
        Logger.log(`PerspectiveCamera created: ${this.name} (fov=${this.#fov})`);
    }

    get fov() { return this.#fov; }

    set fov(value) {
        this.#fov = Math.max(1, Math.min(179, value));
        this.#isDirty = true;
    }

    updateProjectionMatrix() {
        if (!this.#isDirty) return;

        const fovRad = this.#fov * Math.PI / 180;
        const aspect = this.#aspect;
        const near = this.#near;
        const far = this.#far;

        this.projectionMatrix.perspective(fovRad, aspect, near, far);
        this.projectionMatrixInverse.copy(this.projectionMatrix).invert();

        this.#isDirty = false;
    }

    updateViewMatrix() {
        if (!this.#isDirty) return;

        const position = this.position;
        const target = new Vector3(0, 0, 0);
        const up = this.up || new Vector3(0, 1, 0);

        this.viewMatrix.lookAt(position, target, up);
        this.#isDirty = false;
    }

    clone() {
        const clone = new PerspectiveCamera({
            name: `${this.name}_clone`,
            position: this.position.clone(),
            rotation: this.rotation.clone(),
            aspect: this.aspect,
            near: this.near,
            far: this.far,
            fov: this.#fov,
            viewport: { ...this.viewport }
        });
        return clone;
    }

    toString() {
        return `PerspectiveCamera(name=${this.name}, fov=${this.#fov}, near=${this.near}, far=${this.far})`;
    }
}

export default PerspectiveCamera;
