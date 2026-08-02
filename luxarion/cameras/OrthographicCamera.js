/**
 * OrthographicCamera.js - Orthographic camera for LXRN Engine.
 * 3D orthographic projection without perspective distortion.
 * 
 * @module OrthographicCamera
 * @author LXRN
 * @version 1.0.0
 */

import Camera from './Camera.js';
import { Vector3 } from '../math/Vector3.js';
import { Logger } from '../utils/Logger.js';

class OrthographicCamera extends Camera {
    #left = -10;
    #right = 10;
    #top = 10;
    #bottom = -10;

    constructor(options = {}) {
        super({
            name: options.name || 'OrthographicCamera',
            position: options.position || { x: 0, y: 0, z: 10 },
            near: options.near || 0.1,
            far: options.far || 1000
        });

        this.#left = options.left || -10;
        this.#right = options.right || 10;
        this.#top = options.top || 10;
        this.#bottom = options.bottom || -10;
        this.#isOrthographic = true;
        this.type = 'OrthographicCamera';

        this.update();
        Logger.log(`OrthographicCamera created: ${this.name}`);
    }

    get left() { return this.#left; }
    get right() { return this.#right; }
    get top() { return this.#top; }
    get bottom() { return this.#bottom; }

    set left(value) {
        this.#left = value;
        this.#isDirty = true;
    }

    set right(value) {
        this.#right = value;
        this.#isDirty = true;
    }

    set top(value) {
        this.#top = value;
        this.#isDirty = true;
    }

    set bottom(value) {
        this.#bottom = value;
        this.#isDirty = true;
    }

    updateProjectionMatrix() {
        if (!this.#isDirty) return;

        const left = this.#left * this.zoom;
        const right = this.#right * this.zoom;
        const top = this.#top * this.zoom;
        const bottom = this.#bottom * this.zoom;
        const near = this.near;
        const far = this.far;

        this.projectionMatrix.orthographic(left, right, top, bottom, near, far);
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
        const clone = new OrthographicCamera({
            name: `${this.name}_clone`,
            position: this.position.clone(),
            rotation: this.rotation.clone(),
            left: this.#left,
            right: this.#right,
            top: this.#top,
            bottom: this.#bottom,
            near: this.near,
            far: this.far,
            zoom: this.zoom,
            viewport: { ...this.viewport }
        });
        return clone;
    }

    toString() {
        return `OrthographicCamera(name=${this.name}, left=${this.#left}, right=${this.#right}, top=${this.#top}, bottom=${this.#bottom})`;
    }
}

export default OrthographicCamera;
