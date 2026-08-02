/**
 * CameraStack.js - Camera stack system for LXRN Engine.
 * Manages multiple cameras for layered rendering.
 * 
 * @module CameraStack
 * @author LXRN
 * @version 1.0.0
 */

import { Logger } from '../utils/Logger.js';

class CameraStack {
    #cameras = [];
    #activeCamera = null;
    #isDestroyed = false;

    constructor() {
        Logger.log('CameraStack created');
    }

    addCamera(camera, active = false) {
        if (this.#cameras.includes(camera)) return;
        
        this.#cameras.push(camera);
        camera.renderOrder = this.#cameras.length;
        
        if (active) {
            this.setActive(camera);
        }
        Logger.log(`Camera added to stack: ${camera.name}`);
    }

    removeCamera(camera) {
        const index = this.#cameras.indexOf(camera);
        if (index === -1) return false;
        
        this.#cameras.splice(index, 1);
        if (this.#activeCamera === camera) {
            this.#activeCamera = this.#cameras.length > 0 ? this.#cameras[0] : null;
        }
        return true;
    }

    setActive(camera) {
        if (!this.#cameras.includes(camera)) {
            this.addCamera(camera);
        }
        this.#activeCamera = camera;
        Logger.log(`Active camera: ${camera.name}`);
    }

    getActive() {
        return this.#activeCamera || this.#cameras[0] || null;
    }

    getCameras() {
        return [...this.#cameras];
    }

    getSortedCameras() {
        return [...this.#cameras].sort((a, b) => a.renderOrder - b.renderOrder);
    }

    getCamerasForLayer(layer) {
        return this.#cameras.filter(cam => cam.isOnLayer(layer));
    }

    update(deltaTime) {
        for (const camera of this.#cameras) {
            if (camera.update) {
                camera.update(deltaTime);
            }
        }
    }

    destroy() {
        if (this.#isDestroyed) return;
        this.#isDestroyed = true;
        this.#cameras = [];
        this.#activeCamera = null;
        Logger.log('CameraStack destroyed');
    }
}

export default CameraStack;
