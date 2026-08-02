/**
 * LinearFog.js - Linear fog implementation for LXRN Engine.
 * Provides depth-based fog with near/far distance control.
 * Supports multiple fog types: linear, exponential, exponential2, volumetric, height.
 * 
 * @module LinearFog
 * @author LXRN
 * @version 2.0.0
 */

import Fog from './Fog.js';
import { Color } from '../math/Color.js';
import { Logger } from '../utils/Logger.js';
import { lerp, clamp } from '../utils/Helpers.js';

class LinearFog extends Fog {
    #type = 'linear';
    #near = 0.1;
    #far = 100;
    #density = 0.01;
    #color = new Color(0x000000);
    #height = 0;
    #heightFalloff = 1;
    #noiseScale = 1;
    #noiseSpeed = 0.1;
    #noiseIntensity = 0;
    #animated = false;
    #animationSpeed = 0.5;
    #time = 0;
    #gradient = null;
    #isEnabled = true;
    #scene = null;
    
    __uniforms = {};
    __shaderCache = null;
    __noiseTexture = null;
    
    _name = 'LinearFog';
    _active = true;

    constructor(options = {}) {
        super(options);
        
        this.#type = options.type || 'linear';
        this.#near = options.near !== undefined ? options.near : 0.1;
        this.#far = options.far !== undefined ? options.far : 100;
        this.#density = options.density !== undefined ? options.density : 0.01;
        this.#color = options.color instanceof Color ? options.color : new Color(options.color || 0x000000);
        this.#height = options.height || 0;
        this.#heightFalloff = options.heightFalloff || 1;
        this.#noiseScale = options.noiseScale || 1;
        this.#noiseSpeed = options.noiseSpeed || 0.1;
        this.#noiseIntensity = options.noiseIntensity || 0;
        this.#animated = options.animated || false;
        this.#animationSpeed = options.animationSpeed || 0.5;
        
        if (options.gradient) {
            this.#gradient = options.gradient;
        }
        
        if (options.scene) {
            this.#scene = options.scene;
        }
        
        this.#generateUniforms();
        Logger.log(`LinearFog created: ${this._name} (${this.#type})`);
    }

    get type() { return this.#type; }
    get near() { return this.#near; }
    get far() { return this.#far; }
    get density() { return this.#density; }
    get color() { return this.#color; }
    get height() { return this.#height; }
    get heightFalloff() { return this.#heightFalloff; }
    get noiseScale() { return this.#noiseScale; }
    get noiseSpeed() { return this.#noiseSpeed; }
    get noiseIntensity() { return this.#noiseIntensity; }
    get isAnimated() { return this.#animated; }
    get animationSpeed() { return this.#animationSpeed; }
    get gradient() { return this.#gradient; }
    get isEnabled() { return this.#isEnabled; }
    get scene() { return this.#scene; }

    set type(value) {
        this.#type = value;
        this.#generateUniforms();
        this.emit('typeChanged', { fog: this, type: value });
    }

    set near(value) {
        this.#near = Math.max(0, value);
        this.#generateUniforms();
        this.emit('nearChanged', { fog: this, near: value });
    }

    set far(value) {
        this.#far = Math.max(this.#near, value);
        this.#generateUniforms();
        this.emit('farChanged', { fog: this, far: value });
    }

    set density(value) {
        this.#density = Math.max(0, value);
        this.#generateUniforms();
        this.emit('densityChanged', { fog: this, density: value });
    }

    set color(value) {
        this.#color = value instanceof Color ? value : new Color(value);
        this.#generateUniforms();
        this.emit('colorChanged', { fog: this, color: this.#color });
    }

    set height(value) {
        this.#height = value;
        this.#generateUniforms();
        this.emit('heightChanged', { fog: this, height: value });
    }

    set heightFalloff(value) {
        this.#heightFalloff = Math.max(0, value);
        this.#generateUniforms();
        this.emit('heightFalloffChanged', { fog: this, falloff: value });
    }

    set noiseScale(value) {
        this.#noiseScale = Math.max(0, value);
        this.#generateUniforms();
        this.emit('noiseScaleChanged', { fog: this, scale: value });
    }

    set noiseSpeed(value) {
        this.#noiseSpeed = value;
        this.#generateUniforms();
        this.emit('noiseSpeedChanged', { fog: this, speed: value });
    }

    set noiseIntensity(value) {
        this.#noiseIntensity = Math.max(0, Math.min(1, value));
        this.#generateUniforms();
        this.emit('noiseIntensityChanged', { fog: this, intensity: value });
    }

    set animated(value) {
        this.#animated = value;
        this.#generateUniforms();
        this.emit('animatedChanged', { fog: this, animated: value });
    }

    set animationSpeed(value) {
        this.#animationSpeed = Math.max(0, value);
        this.emit('animationSpeedChanged', { fog: this, speed: value });
    }

    set gradient(value) {
        this.#gradient = value;
        this.#generateUniforms();
        this.emit('gradientChanged', { fog: this, gradient: value });
    }

    set scene(value) {
        this.#scene = value;
        this.emit('sceneAttached', { fog: this, scene: value });
    }

    enable() {
        this.#isEnabled = true;
        this._active = true;
        this.#generateUniforms();
        this.emit('enabled', { fog: this });
        Logger.log(`LinearFog enabled: ${this._name}`);
    }

    disable() {
        this.#isEnabled = false;
        this._active = false;
        this.#generateUniforms();
        this.emit('disabled', { fog: this });
        Logger.log(`LinearFog disabled: ${this._name}`);
    }

    toggle() {
        this.#isEnabled ? this.disable() : this.enable();
        return this.#isEnabled;
    }

    /**
     * Calculates fog factor for a given distance.
     * 
     * @param {number} distance - Distance from camera
     * @param {number} height - Height of object (optional)
     * @returns {number} Fog factor (0-1)
     */
    calculateFactor(distance, height = null) {
        if (!this.#isEnabled) return 0;
        
        let factor = 0;
        let finalDistance = distance;
        
        // Height fog
        if (height !== null && this.#height > 0) {
            const heightFactor = Math.max(0, 1 - Math.abs(height) / this.#height);
            finalDistance = distance * (1 + (1 - heightFactor) * this.#heightFalloff);
        }
        
        switch (this.#type) {
            case 'linear':
                factor = (finalDistance - this.#near) / (this.#far - this.#near);
                break;
            case 'exponential':
                factor = 1 - Math.exp(-this.#density * finalDistance);
                break;
            case 'exponential2':
                const d = this.#density * finalDistance;
                factor = 1 - Math.exp(-d * d);
                break;
            case 'volumetric':
                factor = 1 - Math.exp(-this.#density * finalDistance * finalDistance);
                break;
            case 'height':
                const h = height !== null ? height : 0;
                factor = Math.max(0, 1 - Math.exp(-this.#density * finalDistance * Math.abs(h) / this.#height));
                break;
            default:
                factor = 0;
        }
        
        // Apply noise
        if (this.#noiseIntensity > 0) {
            const noise = this.#calculateNoise(finalDistance, height);
            factor += (noise - 0.5) * this.#noiseIntensity;
        }
        
        return clamp(factor, 0, 1);
    }

    /**
     * Calculates noise value for fog.
     * 
     * @private
     * @param {number} distance - Distance
     * @param {number} height - Height
     * @returns {number} Noise value (0-1)
     */
    #calculateNoise(distance, height = null) {
        // Simple pseudo-random noise
        const seed = distance * this.#noiseScale + (height || 0) * 0.1 + this.#time * this.#noiseSpeed;
        return (Math.sin(seed * 1.3) * Math.cos(seed * 0.7) * 0.5 + 0.5);
    }

    /**
     * Applies fog to a color.
     * 
     * @param {Color|Array} color - Original color
     * @param {number} distance - Distance from camera
     * @param {number} height - Height of object (optional)
     * @returns {Color|Array} Fogged color
     */
    apply(color, distance, height = null) {
        if (!this.#isEnabled) return color;
        
        const factor = this.calculateFactor(distance, height);
        const fogColor = this.#getFogColor(distance, height);
        
        if (color instanceof Color) {
            const result = color.clone();
            result.r = lerp(result.r, fogColor.r, factor);
            result.g = lerp(result.g, fogColor.g, factor);
            result.b = lerp(result.b, fogColor.b, factor);
            return result;
        }
        
        // Array format [r, g, b]
        return [
            lerp(color[0], fogColor.r, factor),
            lerp(color[1], fogColor.g, factor),
            lerp(color[2], fogColor.b, factor)
        ];
    }

    /**
     * Gets fog color (with gradient support).
     * 
     * @private
     * @param {number} distance - Distance
     * @param {number} height - Height
     * @returns {Color} Fog color
     */
    #getFogColor(distance, height = null) {
        if (this.#gradient) {
            const t = clamp((distance - this.#near) / (this.#far - this.#near), 0, 1);
            return this.#gradient.getColor(t);
        }
        return this.#color;
    }

    /**
     * Generates uniform values for shader.
     * 
     * @private
     */
    #generateUniforms() {
        this.__uniforms = {
            fogType: this.#getTypeIndex(),
            fogColor: this.#color.toArray(),
            fogNear: this.#near,
            fogFar: this.#far,
            fogDensity: this.#density,
            fogHeight: this.#height,
            fogHeightFalloff: this.#heightFalloff,
            fogNoiseScale: this.#noiseScale,
            fogNoiseSpeed: this.#noiseSpeed,
            fogNoiseIntensity: this.#noiseIntensity,
            fogEnabled: this.#isEnabled ? 1 : 0,
            fogTime: this.#animated ? this.#time : 0,
            fogGradient: this.#gradient ? 1 : 0
        };
    }

    /**
     * Gets fog type index for shader.
     * 
     * @private
     * @returns {number} Fog type index
     */
    #getTypeIndex() {
        const types = {
            'linear': 0,
            'exponential': 1,
            'exponential2': 2,
            'volumetric': 3,
            'height': 4
        };
        return types[this.#type] || 0;
    }

    /**
     * Updates fog uniforms.
     * 
     * @param {number} deltaTime - Delta time for animation
     * @returns {Object} Updated uniforms
     */
    update(deltaTime) {
        if (!this.#isEnabled) return this.__uniforms;
        
        if (this.#animated) {
            this.#time += deltaTime * this.#animationSpeed;
        }
        
        this.#generateUniforms();
        this.emit('updated', { fog: this, deltaTime });
        return this.__uniforms;
    }

    /**
     * Gets GLSL shader code.
     * 
     * @returns {string} Shader code
     */
    getShaderCode() {
        return `
            uniform vec3 fogColor;
            uniform float fogNear;
            uniform float fogFar;
            uniform float fogDensity;
            uniform float fogHeight;
            uniform float fogHeightFalloff;
            uniform float fogNoiseScale;
            uniform float fogNoiseSpeed;
            uniform float fogNoiseIntensity;
            uniform float fogEnabled;
            uniform float fogTime;
            uniform float fogType;
            uniform float fogGradient;
            
            float getFogFactor(float depth, float height) {
                if (fogEnabled < 0.5) return 0.0;
                
                float factor = 0.0;
                float d = depth;
                
                // Height fog
                if (fogHeight > 0.0) {
                    float hf = max(0.0, 1.0 - abs(height) / fogHeight);
                    d = depth * (1.0 + (1.0 - hf) * fogHeightFalloff);
                }
                
                if (fogType == 0.0) { // Linear
                    factor = (d - fogNear) / (fogFar - fogNear);
                } else if (fogType == 1.0) { // Exponential
                    factor = 1.0 - exp(-fogDensity * d);
                } else if (fogType == 2.0) { // Exponential2
                    float dd = fogDensity * d;
                    factor = 1.0 - exp(-dd * dd);
                } else if (fogType == 3.0) { // Volumetric
                    factor = 1.0 - exp(-fogDensity * d * d);
                } else if (fogType == 4.0) { // Height
                    factor = max(0.0, 1.0 - exp(-fogDensity * d * abs(height) / fogHeight));
                }
                
                // Noise
                if (fogNoiseIntensity > 0.0) {
                    float seed = d * fogNoiseScale + height * 0.1 + fogTime * fogNoiseSpeed;
                    float noise = (sin(seed * 1.3) * cos(seed * 0.7) * 0.5 + 0.5);
                    factor += (noise - 0.5) * fogNoiseIntensity;
                }
                
                return clamp(factor, 0.0, 1.0);
            }
            
            vec3 applyFog(vec3 color, float depth, float height) {
                float factor = getFogFactor(depth, height);
                return mix(color, fogColor, factor);
            }
        `;
    }

    /**
     * Clones this fog instance.
     * 
     * @returns {LinearFog} Cloned fog
     */
    clone() {
        const clone = new LinearFog({
            type: this.#type,
            color: this.#color.clone(),
            near: this.#near,
            far: this.#far,
            density: this.#density,
            height: this.#height,
            heightFalloff: this.#heightFalloff,
            noiseScale: this.#noiseScale,
            noiseSpeed: this.#noiseSpeed,
            noiseIntensity: this.#noiseIntensity,
            animated: this.#animated,
            animationSpeed: this.#animationSpeed,
            gradient: this.#gradient ? this.#gradient.clone() : null,
            scene: this.#scene,
            name: `${this._name}_clone`
        });
        
        return clone;
    }

    /**
     * Destroys the fog.
     */
    destroy() {
        this.#scene = null;
        this.#gradient = null;
        this.removeAllListeners();
        Logger.log(`LinearFog destroyed: ${this._name}`);
    }

    toString() {
        return `LinearFog(name=${this._name}, type=${this.#type}, enabled=${this.#isEnabled}, near=${this.#near}, far=${this.#far}, density=${this.#density})`;
    }
}

export default LinearFog;
