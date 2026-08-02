/**
 * Camera.js - Base camera class for LXRN Engine.
 * Provides view and projection matrix management.
 * Supports frustum culling, layers, and post-processing.
 * 
 * @module Camera
 * @author LXRN
 * @version 2.0.0
 */

import Object from './Object.js';
import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Logger } from '../utils/Logger.js';

class Camera extends Object {
    #viewMatrix = new Matrix4();
    #projectionMatrix = new Matrix4();
    #projectionMatrixInverse = new Matrix4();
    #frustum = null;
    #isDirty = true;
    #viewport = { x: 0, y: 0, width: 800, height: 600 };
    #aspect = 1;
    #near = 0.1;
    #far = 1000;
    #zoom = 1;
    #isOrthographic = false;
    #isPerspective = false;
    #layers = 1;
    #cullingEnabled = true;
    #postProcessing = null;
    #depthOfField = null;
    #motionBlur = null;
    #vignette = null;
    #clearColor = '#000000';
    #clearDepth = 1;
    #renderOrder = 0;
    #isMain = false;

    constructor(options = {}) {
        super({
            name: options.name || 'Camera',
            type: 'Camera',
            is3D: true,
            position: options.position || { x: 0, y: 0, z: 10 },
            rotation: options.rotation || { x: 0, y: 0, z: 0 }
        });

        this.#aspect = options.aspect || 1;
        this.#near = options.near || 0.1;
        this.#far = options.far || 1000;
        this.#zoom = options.zoom || 1;
        this.#layers = options.layers || 1;
        this.#cullingEnabled = options.cullingEnabled !== undefined ? options.cullingEnabled : true;
        this.#clearColor = options.clearColor || '#000000';
        this.#renderOrder = options.renderOrder || 0;
        this.#isMain = options.isMain || false;

        if (options.viewport) {
            this.#viewport = { ...this.#viewport, ...options.viewport };
        }

        if (options.postProcessing) {
            this.#postProcessing = options.postProcessing;
        }

        this.#updateFrustum();
        Logger.log(`Camera created: ${this.name}`);
    }

    get viewMatrix() { return this.#viewMatrix; }
    get projectionMatrix() { return this.#projectionMatrix; }
    get projectionMatrixInverse() { return this.#projectionMatrixInverse; }
    get viewport() { return this.#viewport; }
    get aspect() { return this.#aspect; }
    get near() { return this.#near; }
    get far() { return this.#far; }
    get zoom() { return this.#zoom; }
    get isOrthographic() { return this.#isOrthographic; }
    get isPerspective() { return this.#isPerspective; }
    get layers() { return this.#layers; }
    get cullingEnabled() { return this.#cullingEnabled; }
    get postProcessing() { return this.#postProcessing; }
    get depthOfField() { return this.#depthOfField; }
    get motionBlur() { return this.#motionBlur; }
    get vignette() { return this.#vignette; }
    get clearColor() { return this.#clearColor; }
    get clearDepth() { return this.#clearDepth; }
    get renderOrder() { return this.#renderOrder; }
    get isMain() { return this.#isMain; }
    get frustum() { return this.#frustum; }

    set viewport(value) {
        this.#viewport = { ...this.#viewport, ...value };
        this.#aspect = this.#viewport.width / this.#viewport.height;
        this.#isDirty = true;
    }

    set aspect(value) {
        this.#aspect = value;
        this.#isDirty = true;
    }

    set near(value) {
        this.#near = Math.max(0, value);
        this.#isDirty = true;
    }

    set far(value) {
        this.#far = Math.max(this.#near, value);
        this.#isDirty = true;
    }

    set zoom(value) {
        this.#zoom = Math.max(0.01, value);
        this.#isDirty = true;
    }

    set layers(value) {
        this.#layers = value;
    }

    set cullingEnabled(value) {
        this.#cullingEnabled = value;
    }

    set postProcessing(value) {
        this.#postProcessing = value;
    }

    set depthOfField(value) {
        this.#depthOfField = value;
    }

    set motionBlur(value) {
        this.#motionBlur = value;
    }

    set vignette(value) {
        this.#vignette = value;
    }

    set clearColor(value) {
        this.#clearColor = value;
    }

    set clearDepth(value) {
        this.#clearDepth = Math.max(0, Math.min(1, value));
    }

    set renderOrder(value) {
        this.#renderOrder = value;
    }

    set isMain(value) {
        this.#isMain = value;
    }

    updateMatrix() {
        super.updateMatrix();
        this.#isDirty = true;
    }

    updateProjectionMatrix() {
        this.#isDirty = false;
    }

    updateViewMatrix() {
        this.#isDirty = false;
    }

    update() {
        this.updateViewMatrix();
        this.updateProjectionMatrix();
        this.#updateFrustum();
        this.#isDirty = false;
    }

    #updateFrustum() {
        if (!this.#cullingEnabled) return;
        // Update frustum planes from projection * view matrix
        const mvp = new Matrix4();
        mvp.multiplyMatrices(this.#projectionMatrix, this.#viewMatrix);
        this.#frustum = new Frustum(mvp);
    }

    lookAt(target) {
        super.lookAt(target);
        this.#isDirty = true;
        return this;
    }

    getWorldPosition() {
        return this.position;
    }

    getWorldDirection(target = null) {
        const dir = target || new Vector3(0, 0, -1);
        const quat = this.quaternion;
        dir.applyQuaternion(quat);
        return dir;
    }

    isDirty() {
        return this.#isDirty;
    }

    isObjectVisible(object) {
        if (!this.#cullingEnabled) return true;
        if (!this.#frustum) return true;
        if (!object) return true;

        // Check layers
        if (object.layers) {
            if ((this.#layers & object.layers) === 0) return false;
        }

        // Check frustum
        const bounds = object.boundingBox || object.getBoundingBox?.();
        if (bounds) {
            return this.#frustum.intersectsBox(bounds);
        }

        // Check sphere
        const sphere = object.boundingSphere || object.getBoundingSphere?.();
        if (sphere) {
            return this.#frustum.intersectsSphere(sphere);
        }

        return true;
    }

    isPointVisible(point) {
        if (!this.#cullingEnabled) return true;
        if (!this.#frustum) return true;
        return this.#frustum.containsPoint(point);
    }

    isSphereVisible(sphere) {
        if (!this.#cullingEnabled) return true;
        if (!this.#frustum) return true;
        return this.#frustum.intersectsSphere(sphere);
    }

    isBoxVisible(box) {
        if (!this.#cullingEnabled) return true;
        if (!this.#frustum) return true;
        return this.#frustum.intersectsBox(box);
    }

    addLayer(layer) {
        this.#layers |= (1 << layer);
        return this;
    }

    removeLayer(layer) {
        this.#layers &= ~(1 << layer);
        return this;
    }

    toggleLayer(layer) {
        this.#layers ^= (1 << layer);
        return this;
    }

    isOnLayer(layer) {
        return (this.#layers & (1 << layer)) !== 0;
    }

    setPostProcessing(pp) {
        this.#postProcessing = pp;
        return this;
    }

    setDepthOfField(focusDistance, aperture) {
        this.#depthOfField = { focusDistance, aperture };
        return this;
    }

    setMotionBlur(intensity) {
        this.#motionBlur = { intensity };
        return this;
    }

    setVignette(intensity, radius) {
        this.#vignette = { intensity, radius };
        return this;
    }

    clone() {
        const clone = new Camera({
            name: `${this.name}_clone`,
            position: this.position.clone(),
            rotation: this.rotation.clone(),
            aspect: this.#aspect,
            near: this.#near,
            far: this.#far,
            zoom: this.#zoom,
            layers: this.#layers,
            cullingEnabled: this.#cullingEnabled,
            clearColor: this.#clearColor,
            renderOrder: this.#renderOrder,
            isMain: this.#isMain,
            viewport: { ...this.#viewport }
        });
        return clone;
    }

    toString() {
        return `Camera(name=${this.name}, type=${this.constructor.name}, near=${this.#near}, far=${this.#far}, layers=${this.#layers}, culling=${this.#cullingEnabled})`;
    }
}

export default Camera;
