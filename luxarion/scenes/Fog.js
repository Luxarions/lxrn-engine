/**
 * Fog.js - Base fog class for LXRN Engine.
 * Requires Scene for rendering and camera data.
 * 
 * @module Fog
 * @author LXRN
 * @version 1.0.0
 */

import { Color } from '../math/Color.js';
import { Logger } from '../utils/Logger.js';
import Scene from './Scene.js'; 

class Fog {
    #type = 'none';
    #enabled = true;
    #density = 0.01;
    #color = new Color(0x000000);
    #scene = null;  
    
    __uniforms = {};
    __shaderCache = null;
    
    _near = 0.1;
    _far = 1000;
    _start = 0;
    _end = 100;
    _exponent = 1;
    
    name = 'Fog';
    active = true;

    constructor(options = {}) {
        this.#type = options.type || 'none';
        this.#density = options.density || 0.01;
        this.#color = options.color instanceof Color ? options.color : new Color(options.color || 0x000000);
        this._near = options.near !== undefined ? options.near : 0.1;
        this._far = options.far !== undefined ? options.far : 1000;
        this.name = options.name || 'Fog';
        
        // SET SCENE REFERENCE!
        if (options.scene instanceof Scene) {
            this.#scene = options.scene;
        }
        
        this.__uniforms = this.#generateUniforms();
        Logger.log(`Fog created: ${this.name} (${this.#type})`);
    }

    /**
     * Gets the scene this fog belongs to.
     * 
     * @returns {Scene|null} Scene instance
     */
    get scene() {
        return this.#scene;
    }

    /**
     * Sets the scene this fog belongs to.
     * 
     * @param {Scene} scene - Scene instance
     */
    set scene(scene) {
        if (scene instanceof Scene) {
            this.#scene = scene;
            Logger.log(`Fog "${this.name}" attached to scene: ${scene.name}`);
        }
    }

    /**
     * Gets camera from scene.
     * 
     * @returns {Camera|null} Camera instance
     */
    getCamera() {
        return this.#scene ? this.#scene._camera : null;
    }

    /**
     * Gets viewport from scene.
     * 
     * @returns {Object} Viewport data
     */
    getViewport() {
        return this.#scene ? this.#scene._viewport : { x: 0, y: 0, width: 800, height: 600 };
    }

    /**
     * Gets WebGL context from scene.
     * 
     * @returns {WebGLRenderingContext|null} WebGL context
     */
    getContext() {
        return this.#scene ? this.#scene.__webglContext : null;
    }

    get type() { return this.#type; }
    get color() { return this.#color; }
    get density() { return this.#density; }
    get near() { return this._near; }
    get far() { return this._far; }
    get isEnabled() { return this.#enabled; }

    set type(type) {
        this.#type = type;
        this.__uniforms = this.#generateUniforms();
    }

    set color(color) {
        this.#color = color instanceof Color ? color : new Color(color);
        this.__uniforms.fogColor = this.#color.toArray();
    }

    set density(density) {
        this.#density = density;
        this.__uniforms.fogDensity = density;
    }

    set near(near) {
        this._near = near;
        this.__uniforms.fogNear = near;
    }

    set far(far) {
        this._far = far;
        this.__uniforms.fogFar = far;
    }

    enable() {
        this.#enabled = true;
        this.active = true;
        this.__uniforms.fogEnabled = 1;
        Logger.log(`Fog enabled: ${this.name}`);
    }

    disable() {
        this.#enabled = false;
        this.active = false;
        this.__uniforms.fogEnabled = 0;
        Logger.log(`Fog disabled: ${this.name}`);
    }

    toggle() {
        this.#enabled ? this.disable() : this.enable();
        return this.#enabled;
    }

    #generateUniforms() {
        const viewport = this.getViewport();
        const camera = this.getCamera();
        
        return {
            fogColor: this.#color.toArray(),
            fogDensity: this.#density,
            fogNear: this._near,
            fogFar: this._far,
            fogStart: this._start,
            fogEnd: this._end,
            fogExponent: this._exponent,
            fogEnabled: this.#enabled ? 1 : 0,
            fogType: this.#getFogTypeIndex(),
            viewportWidth: viewport.width,
            viewportHeight: viewport.height,
            cameraPosition: camera ? [camera.position.x, camera.position.y, camera.position.z] : [0, 0, 0]
        };
    }

    #getFogTypeIndex() {
        const types = { 'none': 0, 'linear': 1, 'exponential': 2, 'exponential2': 3, 'volumetric': 4 };
        return types[this.#type] || 0;
    }

    /**
     * Calculates fog factor for a given distance.
     * Uses scene camera data if available.
     * 
     * @param {number} distance - Distance from camera
     * @param {Object} position - Object position (optional)
     * @returns {number} Fog factor (0-1)
     */
    calculateFactor(distance, position = null) {
        if (!this.#enabled) return 0;
        
        let factor = 0;
        
        switch (this.#type) {
            case 'linear':
                factor = (distance - this._near) / (this._far - this._near);
                break;
            case 'exponential':
                factor = 1 - Math.exp(-this.#density * distance);
                break;
            case 'exponential2':
                const d = this.#density * distance;
                factor = 1 - Math.exp(-d * d);
                break;
            default:
                factor = 0;
        }
        
        return Math.max(0, Math.min(1, factor));
    }

    /**
     * Gets fog shader code with scene data.
     * 
     * @returns {string} GLSL shader code
     */
    getShaderCode() {
        const viewport = this.getViewport();
        const camera = this.getCamera();
        
        return `
            uniform vec3 fogColor;
            uniform float fogDensity;
            uniform float fogNear;
            uniform float fogFar;
            uniform float fogEnabled;
            uniform float fogType;
            uniform float viewportWidth;
            uniform float viewportHeight;
            
            float getFogFactor(float depth) {
                if (fogEnabled < 0.5) return 0.0;
                
                float factor = 0.0;
                
                if (fogType == 1.0) { // Linear
                    factor = (depth - fogNear) / (fogFar - fogNear);
                } else if (fogType == 2.0) { // Exponential
                    factor = 1.0 - exp(-fogDensity * depth);
                } else if (fogType == 3.0) { // Exponential2
                    float d = fogDensity * depth;
                    factor = 1.0 - exp(-d * d);
                }
                
                return clamp(factor, 0.0, 1.0);
            }
            
            vec3 applyFog(vec3 color, float depth) {
                float factor = getFogFactor(depth);
                return mix(color, fogColor, factor);
            }
        `;
    }

    /**
     * Updates fog uniforms using scene data.
     * 
     * @returns {Object} Updated uniform values
     */
    updateUniforms() {
        this.__uniforms = this.#generateUniforms();
        return this.__uniforms;
    }

    /**
     * Checks if fog is compatible with scene.
     * 
     * @param {Scene} scene - Scene to check
     * @returns {boolean} True if compatible
     */
    isCompatibleWith(scene) {
        return scene instanceof Scene && scene.mode === '3D';
    }

    /**
     * Clones the fog instance.
     * 
     * @returns {Fog} Cloned fog
     */
    clone() {
        return new Fog({
            type: this.#type,
            color: this.#color.clone(),
            density: this.#density,
            near: this._near,
            far: this._far,
            start: this._start,
            end: this._end,
            exponent: this._exponent,
            name: `${this.name}_clone`,
            scene: this.#scene
        });
    }

    toString() {
        return `Fog(name=${this.name}, type=${this.#type}, enabled=${this.#enabled}, scene=${this.#scene ? this.#scene.name : 'none'})`;
    }
}

export default Fog;
