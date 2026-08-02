/**
 * ExponentialFog.js - Exponential fog implementation for LXRN Engine.
 * Requires Scene for rendering data.
 * 
 * @module ExponentialFog
 * @author LXRN
 */

import Fog from './Fog.js';
import Scene from '../core/Scene.js';  
import { Logger } from '../utils/Logger.js';

class ExponentialFog extends Fog {
    _density = 0.01;

    constructor(options = {}) {
        super({
            ...options,
            type: 'exponential'
        });
        this.name = options.name || 'ExponentialFog';
        this._density = options.density || 0.01;
        
        if (options.scene && !(options.scene instanceof Scene)) {
            Logger.warn('Scene must be instance of Scene class');
        }
        
        Logger.log(`ExponentialFog created: ${this.name} (density=${this._density})`);
    }

    get density() { return this._density; }

    set density(value) {
        this._density = value;
        this.__uniforms.fogDensity = value;
    }

    /**
     * Calculates exponential fog factor using scene camera.
     * 
     * @override
     * @param {number} distance - Distance from camera
     * @param {Object} position - Object position (optional)
     * @returns {number} Fog factor (0-1)
     */
    calculateFactor(distance, position = null) {
        if (!this.active) return 0;
        
        let dist = distance;
        if (position && this.scene && this.scene._camera) {
            const cam = this.scene._camera;
            const dx = position.x - cam.position.x;
            const dy = position.y - cam.position.y;
            const dz = position.z - cam.position.z;
            dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
        
        const factor = 1 - Math.exp(-this._density * dist);
        return Math.max(0, Math.min(1, factor));
    }

    getShaderCode() {
        return `
            uniform vec3 fogColor;
            uniform float fogDensity;
            uniform float fogEnabled;
            
            float getFogFactor(float depth) {
                if (fogEnabled < 0.5) return 0.0;
                float factor = 1.0 - exp(-fogDensity * depth);
                return clamp(factor, 0.0, 1.0);
            }
            
            vec3 applyFog(vec3 color, float depth) {
                float factor = getFogFactor(depth);
                return mix(color, fogColor, factor);
            }
        `;
    }

    clone() {
        return new ExponentialFog({
            color: this.color.clone(),
            density: this._density,
            name: `${this.name}_clone`,
            scene: this.scene
        });
    }

    toString() {
        return `ExponentialFog(name=${this.name}, density=${this._density}, scene=${this.scene ? this.scene.name : 'none'})`;
    }
}

export default ExponentialFog;
