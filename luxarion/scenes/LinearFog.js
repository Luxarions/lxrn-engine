/**
 * LinearFog.js - Linear fog implementation for LXRN Engine.
 * Requires Scene for rendering data.
 * 
 * @module LinearFog
 * @author LXRN
 */

import Fog from './Fog.js';
import Scene from './Scene.js';  
import { Logger } from '../utils/Logger.js';

class LinearFog extends Fog {
    constructor(options = {}) {
        super({
            ...options,
            type: 'linear'
        });
        this.name = options.name || 'LinearFog';
        this._start = options.start || 0;
        this._end = options.end || 100;
        
        // VALIDATE SCENE!
        if (options.scene && !(options.scene instanceof Scene)) {
            Logger.warn('Scene must be instance of Scene class');
        }
        
        Logger.log(`LinearFog created: ${this.name} (near=${this._near}, far=${this._far})`);
    }

    get start() { return this._start; }
    get end() { return this._end; }

    set start(value) {
        this._start = value;
        this.__uniforms.fogStart = value;
    }

    set end(value) {
        this._end = value;
        this.__uniforms.fogEnd = value;
    }

    /**
     * Calculates linear fog factor using scene camera.
     * 
     * @override
     * @param {number} distance - Distance from camera
     * @param {Object} position - Object position (optional)
     * @returns {number} Fog factor (0-1)
     */
    calculateFactor(distance, position = null) {
        if (!this.active) return 0;
        
        // Use scene camera distance if available
        let dist = distance;
        if (position && this.scene && this.scene._camera) {
            const cam = this.scene._camera;
            const dx = position.x - cam.position.x;
            const dy = position.y - cam.position.y;
            const dz = position.z - cam.position.z;
            dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        }
        
        const factor = (dist - this._near) / (this._far - this._near);
        return Math.max(0, Math.min(1, factor));
    }

    getShaderCode() {
        const viewport = this.getViewport();
        
        return `
            uniform vec3 fogColor;
            uniform float fogNear;
            uniform float fogFar;
            uniform float fogEnabled;
            uniform float viewportWidth;
            uniform float viewportHeight;
            
            float getFogFactor(float depth) {
                if (fogEnabled < 0.5) return 0.0;
                float factor = (depth - fogNear) / (fogFar - fogNear);
                return clamp(factor, 0.0, 1.0);
            }
            
            vec3 applyFog(vec3 color, float depth) {
                float factor = getFogFactor(depth);
                return mix(color, fogColor, factor);
            }
        `;
    }

    /**
     * Checks if fog is compatible with scene.
     * Linear fog requires 3D scene.
     * 
     * @override
     * @param {Scene} scene - Scene to check
     * @returns {boolean} True if compatible
     */
    isCompatibleWith(scene) {
        return super.isCompatibleWith(scene) && scene.mode === '3D';
    }

    clone() {
        return new LinearFog({
            color: this.color.clone(),
            near: this._near,
            far: this._far,
            start: this._start,
            end: this._end,
            name: `${this.name}_clone`,
            scene: this.scene
        });
    }

    toString() {
        return `LinearFog(name=${this.name}, near=${this._near}, far=${this._far}, scene=${this.scene ? this.scene.name : 'none'})`;
    }
}

export default LinearFog;
