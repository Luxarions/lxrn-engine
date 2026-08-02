/**
 * CameraController.js - Camera controller for LXRN Engine.
 * Handles camera input and updates.
 * 
 * @module CameraController
 * @author LXRN
 * @version 1.0.0
 */

import { Logger } from '../utils/Logger.js';

class CameraController {
    #camera = null;
    #enabled = true;

    constructor(camera) {
        this.#camera = camera;
        Logger.log(`CameraController created for ${camera.name}`);
    }

    get camera() { return this.#camera; }
    get enabled() { return this.#enabled; }

    set enabled(value) {
        this.#enabled = value;
    }

    update(deltaTime) {
        if (!this.#enabled || !this.#camera) return;

        if (this.#camera.follow && typeof this.#camera.follow === 'function') {
            this.#camera.follow(deltaTime);
        } else if (this.#camera.update && typeof this.#camera.update === 'function') {
            this.#camera.update(deltaTime);
        }
    }

    destroy() {
        this.#camera = null;
    }
}

export default CameraController;
