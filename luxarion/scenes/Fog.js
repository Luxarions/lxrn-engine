/**
 * Fog.js - Base fog class for LXRN Engine.
 * Extends EventEmitter for event-driven communication.
 * Provides fog effects for 3D scenes with enable/disable control.
 * 
 * @module Fog
 * @author LXRN
 * @version 1.0.0
 */

import { Color } from '../math/Color.js';
import { Logger } from '../utils/Logger.js';
import EventEmitter from '../core/EventEmitter.js';
import Scene from './Scene.js';

class Fog extends EventEmitter {  
    #type = 'none';
    #enabled = true;
    #density = 0.01;
    #color = new Color(0x000000);
    #scene = null;
    #autoUpdate = true;
    #isDestroyed = false;
    
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
        super();  // ← PANGGIL EVENTEMITTER!
        
        this.#type = options.type || 'none';
        this.#density = options.density || 0.01;
        this.#color = options.color instanceof Color ? options.color : new Color(options.color || 0x000000);
        this._near = options.near !== undefined ? options.near : 0.1;
        this._far = options.far !== undefined ? options.far : 1000;
        this.name = options.name || 'Fog';
        
        if (options.enabled !== undefined) {
            this.#enabled = options.enabled;
            this.active = options.enabled;
        }
        
        if (options.autoUpdate !== undefined) {
            this.#autoUpdate = options.autoUpdate;
        }
        
        if (options.scene instanceof Scene) {
            this.#scene = options.scene;
        }
        
        this.__uniforms = this.#generateUniforms();
        
        // EMIT EVENT!
        this.emit('created', { fog: this, type: this.#type });
        Logger.log(`Fog created: ${this.name} (${this.#type})`);
    }

    get scene() { return this.#scene; }
    get type() { return this.#type; }
    get color() { return this.#color; }
    get density() { return this.#density; }
    get near() { return this._near; }
    get far() { return this._far; }
    get isEnabled() { return this.#enabled; }
    get autoUpdate() { return this.#autoUpdate; }
    get isDestroyed() { return this.#isDestroyed; }

    set scene(scene) {
        if (this.#isDestroyed) return;
        if (scene instanceof Scene) {
            this.#scene = scene;
            this.emit('sceneAttached', { fog: this, scene });
            Logger.log(`Fog "${this.name}" attached to scene: ${scene.name}`);
        }
    }

    set type(type) {
        if (this.#isDestroyed) return;
        this.#type = type;
        if (this.#autoUpdate) {
            this.__uniforms = this.#generateUniforms();
        }
        this.emit('typeChanged', { fog: this, type });
    }

    set color(color) {
        if (this.#isDestroyed) return;
        this.#color = color instanceof Color ? color : new Color(color);
        if (this.#autoUpdate) {
            this.__uniforms.fogColor = this.#color.toArray();
        }
        this.emit('colorChanged', { fog: this, color: this.#color });
    }

    set density(density) {
        if (this.#isDestroyed) return;
        this.#density = density;
        if (this.#autoUpdate) {
            this.__uniforms.fogDensity = density;
        }
        this.emit('densityChanged', { fog: this, density });
    }

    set near(near) {
        if (this.#isDestroyed) return;
        this._near = near;
        if (this.#autoUpdate) {
            this.__uniforms.fogNear = near;
        }
        this.emit('nearChanged', { fog: this, near });
    }

    set far(far) {
        if (this.#isDestroyed) return;
        this._far = far;
        if (this.#autoUpdate) {
            this.__uniforms.fogFar = far;
        }
        this.emit('farChanged', { fog: this, far });
    }

    set autoUpdate(value) {
        if (this.#isDestroyed) return;
        this.#autoUpdate = value;
        this.emit('autoUpdateChanged', { fog: this, autoUpdate: value });
    }

    enable() {
        if (this.#isDestroyed) return;
        this.#enabled = true;
        this.active = true;
        if (this.#autoUpdate) {
            this.__uniforms.fogEnabled = 1;
        }
        this.emit('enabled', { fog: this });
        this.emit('fogEnabled', { fog: this });
        Logger.log(`Fog enabled: ${this.name}`);
    }

    disable() {
        if (this.#isDestroyed) return;
        this.#enabled = false;
        this.active = false;
        if (this.#autoUpdate) {
            this.__uniforms.fogEnabled = 0;
        }
        this.emit('disabled', { fog: this });
        this.emit('fogDisabled', { fog: this });
        Logger.log(`Fog disabled: ${this.name}`);
    }

    toggle() {
        if (this.#isDestroyed) return false;
        this.#enabled ? this.disable() : this.enable();
        this.emit('toggled', { fog: this, enabled: this.#enabled });
        return this.#enabled;
    }

    destroy() {
        if (this.#isDestroyed) return;
        this.#isDestroyed = true;
        this.#enabled = false;
        this.active = false;
        this.#scene = null;
        this.emit('destroyed', { fog: this });
        this.removeAllListeners();
        Logger.log(`Fog destroyed: ${this.name}`);
    }

    getCamera() {
        return this.#scene ? this.#scene._camera : null;
    }

    getViewport() {
        return this.#scene ? this.#scene._viewport : { x: 0, y: 0, width: 800, height: 600 };
    }

    getContext() {
        return this.#scene ? this.#scene.__webglContext : null;
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

    calculateFactor(distance, position = null) {
        if (!this.#enabled || this.#isDestroyed) return 0;
        
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

    getShaderCode() {
        const viewport = this.getViewport();
        
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
                
                if (fogType == 1.0) {
                    factor = (depth - fogNear) / (fogFar - fogNear);
                } else if (fogType == 2.0) {
                    factor = 1.0 - exp(-fogDensity * depth);
                } else if (fogType == 3.0) {
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

    updateUniforms() {
        if (this.#isDestroyed) return this.__uniforms;
        if (this.#autoUpdate) {
            this.__uniforms = this.#generateUniforms();
        }
        this.emit('uniformsUpdated', { fog: this, uniforms: this.__uniforms });
        return this.__uniforms;
    }

    isCompatibleWith(scene) {
        return scene instanceof Scene && scene.mode === '3D';
    }

    clone() {
        const clone = new Fog({
            type: this.#type,
            color: this.#color.clone(),
            density: this.#density,
            near: this._near,
            far: this._far,
            start: this._start,
            end: this._end,
            exponent: this._exponent,
            name: `${this.name}_clone`,
            scene: this.#scene,
            enabled: this.#enabled,
            autoUpdate: this.#autoUpdate
        });
        
        this.emit('cloned', { fog: this, clone });
        return clone;
    }

    toString() {
        return `Fog(name=${this.name}, type=${this.#type}, enabled=${this.#enabled}, autoUpdate=${this.#autoUpdate}, destroyed=${this.#isDestroyed}, scene=${this.#scene ? this.#scene.name : 'none'})`;
    }
}

export default Fog;
