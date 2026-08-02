/**
 * ExponentialFog.js - Exponential fog implementation for LXRN Engine.
 * Provides natural, infinite fog with exponential falloff.
 * Supports density control, height fog, animated fog, and noise.
 * 
 * @module ExponentialFog
 * @author LXRN
 * @version 1.0.0
 */

import Fog from './Fog.js';
import { Color } from '../math/Color.js';
import { Logger } from '../utils/Logger.js';
import { lerp, clamp } from '../utils/Helpers.js';

class ExponentialFog extends Fog {
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
    #type = 'exponential';
    #exponent = 1;
    
    __uniforms = {};
    __shaderCache = null;
    __noiseTexture = null;
    
    _name = 'ExponentialFog';
    _active = true;

    constructor(options = {}) {
        super(options);
        
        this.#density = options.density !== undefined ? options.density : 0.01;
        this.#color = options.color instanceof Color ? options.color : new Color(options.color || 0x000000);
        this.#height = options.height || 0;
        this.#heightFalloff = options.heightFalloff || 1;
        this.#noiseScale = options.noiseScale || 1;
        this.#noiseSpeed = options.noiseSpeed || 0.1;
        this.#noiseIntensity = options.noiseIntensity || 0;
        this.#animated = options.animated || false;
        this.#animationSpeed = options.animationSpeed || 0.5;
        this.#exponent = options.exponent || 1;
        
        if (options.gradient) {
            this.#gradient = options.gradient;
        }
        
        if (options.scene) {
            this.#scene = options.scene;
        }
        
        this._name = options.name || 'ExponentialFog';
        
        this.#generateUniforms();
        Logger.log(`ExponentialFog created: ${this._name} (density=${this.#density})`);
    }

    get type() { return this.#type; }
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
    get exponent() { return this.#exponent; }

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

    set exponent(value) {
        this.#exponent = Math.max(1, value);
        this.#generateUniforms();
        this.emit('exponentChanged', { fog: this, exponent: value });
    }

    enable() {
        this.#isEnabled = true;
        this._active = true;
        this.#generateUniforms();
        this.emit('enabled', { fog: this });
        Logger.log(`ExponentialFog enabled: ${this._name}`);
    }

    disable() {
        this.#isEnabled = false;
        this._active = false;
        this.#generateUniforms();
        this.emit('disabled', { fog: this });
        Logger.log(`ExponentialFog disabled: ${this._name}`);
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
        
        let finalDistance = distance;
        
        // Height fog
        if (height !== null && this.#height > 0) {
            const heightFactor = Math.max(0, 1 - Math.abs(height) / this.#height);
            finalDistance = distance * (1 + (1 - heightFactor) * this.#heightFalloff);
        }
        
        // Exponential calculation
        const d = this.#density * finalDistance;
        let factor = 1 - Math.exp(-Math.pow(d, this.#exponent));
        
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
            const t = clamp(1 - Math.exp(-this.#density * distance), 0, 1);
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
            fogType: 1, // Exponential
            fogColor: this.#color.toArray(),
            fogDensity: this.#density,
            fogHeight: this.#height,
            fogHeightFalloff: this.#heightFalloff,
            fogNoiseScale: this.#noiseScale,
            fogNoiseSpeed: this.#noiseSpeed,
            fogNoiseIntensity: this.#noiseIntensity,
            fogEnabled: this.#isEnabled ? 1 : 0,
            fogTime: this.#animated ? this.#time : 0,
            fogGradient: this.#gradient ? 1 : 0,
            fogExponent: this.#exponent
        };
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
            uniform float fogDensity;
            uniform float fogHeight;
            uniform float fogHeightFalloff;
            uniform float fogNoiseScale;
            uniform float fogNoiseSpeed;
            uniform float fogNoiseIntensity;
            uniform float fogEnabled;
            uniform float fogTime;
            uniform float fogGradient;
            uniform float fogExponent;
            
            float getFogFactor(float depth, float height) {
                if (fogEnabled < 0.5) return 0.0;
                
                float d = depth;
                
                // Height fog
                if (fogHeight > 0.0) {
                    float hf = max(0.0, 1.0 - abs(height) / fogHeight);
                    d = depth * (1.0 + (1.0 - hf) * fogHeightFalloff);
                }
                
                // Exponential fog
                float dd = fogDensity * d;
                float factor = 1.0 - exp(-pow(dd, fogExponent));
                
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
     * Gets the fog density at a specific distance.
     * 
     * @param {number} distance - Distance
     * @returns {number} Fog density value
     */
    getDensityAtDistance(distance) {
        if (!this.#isEnabled) return 0;
        const d = this.#density * distance;
        return 1 - Math.exp(-Math.pow(d, this.#exponent));
    }

    /**
     * Gets the distance where fog reaches a certain density.
     * 
     * @param {number} density - Target density (0-1)
     * @returns {number} Distance
     */
    getDistanceForDensity(density) {
        if (!this.#isEnabled || density <= 0) return 0;
        if (density >= 1) return Infinity;
        
        const target = 1 - density;
        const d = Math.pow(-Math.log(target), 1 / this.#exponent);
        return d / this.#density;
    }

    /**
     * Clones this fog instance.
     * 
     * @returns {ExponentialFog} Cloned fog
     */
    clone() {
        const clone = new ExponentialFog({
            density: this.#density,
            color: this.#color.clone(),
            height: this.#height,
            heightFalloff: this.#heightFalloff,
            noiseScale: this.#noiseScale,
            noiseSpeed: this.#noiseSpeed,
            noiseIntensity: this.#noiseIntensity,
            animated: this.#animated,
            animationSpeed: this.#animationSpeed,
            exponent: this.#exponent,
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
        Logger.log(`ExponentialFog destroyed: ${this._name}`);
    }

    toString() {
        return `ExponentialFog(name=${this._name}, density=${this.#density}, exponent=${this.#exponent}, enabled=${this.#isEnabled})`;
    }
}

export default ExponentialFog;
