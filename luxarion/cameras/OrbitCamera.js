/**
 * OrbitCamera.js - Orbit camera for LXRN Engine.
 * Camera that orbits around a target point.
 * 
 * @module OrbitCamera
 * @author LXRN
 * @version 1.0.0
 */

import Camera from './Camera.js';
import { Vector3 } from '../math/Vector3.js';
import { Logger } from '../utils/Logger.js';

class OrbitCamera extends Camera {
    #target = new Vector3(0, 0, 0);
    #distance = 10;
    #minDistance = 1;
    #maxDistance = 100;
    #theta = 0;
    #phi = 45;
    #minPhi = 5;
    #maxPhi = 85;
    #autoRotate = false;
    #autoRotateSpeed = 1;

    constructor(options = {}) {
        super({
            name: options.name || 'OrbitCamera',
            position: options.position || { x: 0, y: 0, z: 10 },
            aspect: options.aspect || 1,
            near: options.near || 0.1,
            far: options.far || 1000
        });

        if (options.target) {
            this.#target.copy(options.target);
        }

        this.#distance = options.distance || 10;
        this.#minDistance = options.minDistance || 1;
        this.#maxDistance = options.maxDistance || 100;
        this.#theta = options.theta || 0;
        this.#phi = options.phi || 45;
        this.#minPhi = options.minPhi || 5;
        this.#maxPhi = options.maxPhi || 85;
        this.#autoRotate = options.autoRotate || false;
        this.#autoRotateSpeed = options.autoRotateSpeed || 1;

        this.type = 'OrbitCamera';
        this.#isPerspective = true;

        this.updatePosition();
        Logger.log(`OrbitCamera created: ${this.name}`);
    }

    get target() { return this.#target; }
    get distance() { return this.#distance; }
    get theta() { return this.#theta; }
    get phi() { return this.#phi; }
    get autoRotate() { return this.#autoRotate; }
    get autoRotateSpeed() { return this.#autoRotateSpeed; }

    set target(value) {
        this.#target.copy(value);
        this.#isDirty = true;
    }

    set distance(value) {
        this.#distance = Math.max(this.#minDistance, Math.min(this.#maxDistance, value));
        this.#isDirty = true;
    }

    set theta(value) {
        this.#theta = value % 360;
        this.#isDirty = true;
    }

    set phi(value) {
        this.#phi = Math.max(this.#minPhi, Math.min(this.#maxPhi, value));
        this.#isDirty = true;
    }

    set autoRotate(value) {
        this.#autoRotate = value;
    }

    set autoRotateSpeed(value) {
        this.#autoRotateSpeed = value;
    }

    updatePosition() {
        const thetaRad = this.#theta * Math.PI / 180;
        const phiRad = this.#phi * Math.PI / 180;

        const x = this.#distance * Math.sin(phiRad) * Math.cos(thetaRad);
        const y = this.#distance * Math.cos(phiRad);
        const z = this.#distance * Math.sin(phiRad) * Math.sin(thetaRad);

        this.position.set(x, y, z);
        this.position.add(this.#target);
        this.#isDirty = true;
    }

    update(deltaTime) {
        if (this.#autoRotate) {
            this.#theta += deltaTime * this.#autoRotateSpeed * 10;
            this.updatePosition();
        }

        this.updateViewMatrix();
        this.updateProjectionMatrix();
        this.#isDirty = false;
    }

    updateViewMatrix() {
        if (!this.#isDirty) return;

        const position = this.position;
        const target = this.#target;
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

    zoom(delta) {
        this.distance += delta;
        this.updatePosition();
    }

    rotate(deltaTheta, deltaPhi) {
        this.theta += deltaTheta;
        this.phi += deltaPhi;
        this.updatePosition();
    }

    pan(deltaX, deltaY) {
        const right = new Vector3(1, 0, 0);
        const up = new Vector3(0, 1, 0);

        const panX = right.clone().multiplyScalar(deltaX * 0.1);
        const panY = up.clone().multiplyScalar(deltaY * 0.1);

        this.#target.add(panX);
        this.#target.add(panY);
        this.updatePosition();
    }

    clone() {
        const clone = new OrbitCamera({
            name: `${this.name}_clone`,
            target: this.#target.clone(),
            distance: this.#distance,
            theta: this.#theta,
            phi: this.#phi,
            minDistance: this.#minDistance,
            maxDistance: this.#maxDistance,
            minPhi: this.#minPhi,
            maxPhi: this.#maxPhi,
            autoRotate: this.#autoRotate,
            autoRotateSpeed: this.#autoRotateSpeed,
            near: this.near,
            far: this.far,
            viewport: { ...this.viewport }
        });
        return clone;
    }

    toString() {
        return `OrbitCamera(name=${this.name}, distance=${this.#distance}, theta=${this.#theta}, phi=${this.#phi})`;
    }
}

export default OrbitCamera;
