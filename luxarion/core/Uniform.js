/**
 * Uniform.js - Uniform management system for LXRN Engine.
 * Manages GPU uniform data for shaders and materials.
 * Supports all GLSL uniform types with type checking.
 * 
 * @module Uniform
 * @author LXRN
 * @version 1.0.0
 */

import { Color } from '../math/Color.js';
import { Vector2 } from '../math/Vector2.js';
import { Vector3 } from '../math/Vector3.js';
import { Vector4 } from '../math/Vector4.js';
import { Matrix3 } from '../math/Matrix3.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Logger } from '../utils/Logger.js';

/**
 * Uniform types supported.
 */
export const UNIFORM_TYPES = {
    FLOAT: 'float',
    FLOAT2: 'vec2',
    FLOAT3: 'vec3',
    FLOAT4: 'vec4',
    MATRIX3: 'mat3',
    MATRIX4: 'mat4',
    INT: 'int',
    INT2: 'ivec2',
    INT3: 'ivec3',
    INT4: 'ivec4',
    BOOL: 'bool',
    SAMPLER2D: 'sampler2D',
    SAMPLER3D: 'sampler3D',
    SAMPLER_CUBE: 'samplerCube'
};

/**
 * Uniform class - Represents a single uniform value.
 */
class Uniform {
    #name = '';
    #type = UNIFORM_TYPES.FLOAT;
    #value = null;
    #defaultValue = null;
    #isDirty = true;
    #location = null;
    #size = 1;
    #array = false;
    #arraySize = 0;
    #onChange = null;

    constructor(name, value, type = UNIFORM_TYPES.FLOAT) {
        this.#name = name;
        this.#type = type;
        this.#value = this.#normalizeValue(value, type);
        this.#defaultValue = this.#cloneValue(this.#value);
        
        Logger.log(`Uniform created: ${name} (${type})`);
    }

    get name() { return this.#name; }
    get type() { return this.#type; }
    get value() { return this.#value; }
    get isDirty() { return this.#isDirty; }
    get location() { return this.#location; }
    get size() { return this.#size; }
    get isArray() { return this.#array; }
    get arraySize() { return this.#arraySize; }

    set value(value) {
        const newValue = this.#normalizeValue(value, this.#type);
        if (!this.#valuesEqual(this.#value, newValue)) {
            this.#value = newValue;
            this.#isDirty = true;
            if (this.#onChange) {
                this.#onChange(this);
            }
        }
    }

    set location(location) {
        this.#location = location;
    }

    set onChange(callback) {
        this.#onChange = callback;
    }

    /**
     * Normalizes value based on type.
     * 
     * @private
     * @param {*} value - Raw value
     * @param {string} type - Uniform type
     * @returns {*} Normalized value
     */
    #normalizeValue(value, type) {
        if (value === null || value === undefined) {
            return this.#getDefaultForType(type);
        }

        switch (type) {
            case UNIFORM_TYPES.FLOAT:
                return typeof value === 'number' ? value : parseFloat(value) || 0;
                
            case UNIFORM_TYPES.FLOAT2:
                return this.#toVector2(value);
                
            case UNIFORM_TYPES.FLOAT3:
                return this.#toVector3(value);
                
            case UNIFORM_TYPES.FLOAT4:
                return this.#toVector4(value);
                
            case UNIFORM_TYPES.MATRIX3:
                return this.#toMatrix3(value);
                
            case UNIFORM_TYPES.MATRIX4:
                return this.#toMatrix4(value);
                
            case UNIFORM_TYPES.INT:
                return typeof value === 'number' ? Math.floor(value) : parseInt(value) || 0;
                
            case UNIFORM_TYPES.BOOL:
                return Boolean(value);
                
            case UNIFORM_TYPES.SAMPLER2D:
            case UNIFORM_TYPES.SAMPLER3D:
            case UNIFORM_TYPES.SAMPLER_CUBE:
                return value;
                
            default:
                return value;
        }
    }

    /**
     * Gets default value for type.
     * 
     * @private
     * @param {string} type - Uniform type
     * @returns {*} Default value
     */
    #getDefaultForType(type) {
        switch (type) {
            case UNIFORM_TYPES.FLOAT: return 0;
            case UNIFORM_TYPES.FLOAT2: return new Vector2(0, 0);
            case UNIFORM_TYPES.FLOAT3: return new Vector3(0, 0, 0);
            case UNIFORM_TYPES.FLOAT4: return new Vector4(0, 0, 0, 0);
            case UNIFORM_TYPES.MATRIX3: return new Matrix3();
            case UNIFORM_TYPES.MATRIX4: return new Matrix4();
            case UNIFORM_TYPES.INT: return 0;
            case UNIFORM_TYPES.BOOL: return false;
            default: return null;
        }
    }

    /**
     * Converts value to Vector2.
     * 
     * @private
     * @param {*} value - Raw value
     * @returns {Vector2} Vector2
     */
    #toVector2(value) {
        if (value instanceof Vector2) return value.clone();
        if (Array.isArray(value)) {
            return new Vector2(value[0] || 0, value[1] || 0);
        }
        if (typeof value === 'number') {
            return new Vector2(value, value);
        }
        if (value && typeof value === 'object') {
            return new Vector2(value.x || 0, value.y || 0);
        }
        return new Vector2(0, 0);
    }

    /**
     * Converts value to Vector3.
     * 
     * @private
     * @param {*} value - Raw value
     * @returns {Vector3} Vector3
     */
    #toVector3(value) {
        if (value instanceof Vector3) return value.clone();
        if (value instanceof Color) return new Vector3(value.r, value.g, value.b);
        if (Array.isArray(value)) {
            return new Vector3(value[0] || 0, value[1] || 0, value[2] || 0);
        }
        if (typeof value === 'number') {
            return new Vector3(value, value, value);
        }
        if (value && typeof value === 'object') {
            return new Vector3(value.x || 0, value.y || 0, value.z || 0);
        }
        return new Vector3(0, 0, 0);
    }

    /**
     * Converts value to Vector4.
     * 
     * @private
     * @param {*} value - Raw value
     * @returns {Vector4} Vector4
     */
    #toVector4(value) {
        if (value instanceof Vector4) return value.clone();
        if (Array.isArray(value)) {
            return new Vector4(value[0] || 0, value[1] || 0, value[2] || 0, value[3] || 0);
        }
        if (typeof value === 'number') {
            return new Vector4(value, value, value, value);
        }
        if (value && typeof value === 'object') {
            return new Vector4(value.x || 0, value.y || 0, value.z || 0, value.w || 0);
        }
        return new Vector4(0, 0, 0, 0);
    }

    /**
     * Converts value to Matrix3.
     * 
     * @private
     * @param {*} value - Raw value
     * @returns {Matrix3} Matrix3
     */
    #toMatrix3(value) {
        if (value instanceof Matrix3) return value.clone();
        if (Array.isArray(value) && value.length === 9) {
            const mat = new Matrix3();
            mat.set(...value);
            return mat;
        }
        return new Matrix3();
    }

    /**
     * Converts value to Matrix4.
     * 
     * @private
     * @param {*} value - Raw value
     * @returns {Matrix4} Matrix4
     */
    #toMatrix4(value) {
        if (value instanceof Matrix4) return value.clone();
        if (Array.isArray(value) && value.length === 16) {
            const mat = new Matrix4();
            mat.set(...value);
            return mat;
        }
        return new Matrix4();
    }

    /**
     * Clones a value.
     * 
     * @private
     * @param {*} value - Value to clone
     * @returns {*} Cloned value
     */
    #cloneValue(value) {
        if (value === null || value === undefined) return value;
        if (value.clone) return value.clone();
        if (Array.isArray(value)) return [...value];
        if (typeof value === 'object') return { ...value };
        return value;
    }

    /**
     * Checks if two values are equal.
     * 
     * @private
     * @param {*} a - First value
     * @param {*} b - Second value
     * @returns {boolean} True if equal
     */
    #valuesEqual(a, b) {
        if (a === b) return true;
        if (a === null || b === null) return false;
        if (typeof a !== typeof b) return false;
        
        if (a.equals && b.equals) return a.equals(b);
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            return a.every((v, i) => v === b[i]);
        }
        if (typeof a === 'object') {
            const keysA = Object.keys(a);
            const keysB = Object.keys(b);
            if (keysA.length !== keysB.length) return false;
            return keysA.every(key => a[key] === b[key]);
        }
        return a === b;
    }

    /**
     * Marks uniform as clean.
     */
    clean() {
        this.#isDirty = false;
    }

    /**
     * Resets to default value.
     */
    reset() {
        this.#value = this.#cloneValue(this.#defaultValue);
        this.#isDirty = true;
    }

    /**
     * Gets value as array for GPU upload.
     * 
     * @returns {Float32Array|number[]} Array representation
     */
    toArray() {
        const value = this.#value;
        
        if (value === null || value === undefined) return null;
        
        if (value instanceof Vector2) return [value.x, value.y];
        if (value instanceof Vector3) return [value.x, value.y, value.z];
        if (value instanceof Vector4) return [value.x, value.y, value.z, value.w];
        if (value instanceof Matrix3) return value.toArray();
        if (value instanceof Matrix4) return value.toArray();
        if (value instanceof Color) return [value.r, value.g, value.b, value.a];
        if (Array.isArray(value)) return value;
        if (typeof value === 'number') return [value];
        if (typeof value === 'boolean') return [value ? 1 : 0];
        
        return value;
    }

    /**
     * Gets the GLSL type string.
     * 
     * @returns {string} GLSL type
     */
    getGLSLType() {
        return this.#type;
    }

    /**
     * Clones this uniform.
     * 
     * @param {string} newName - New name (optional)
     * @returns {Uniform} Cloned uniform
     */
    clone(newName = null) {
        const name = newName || this.#name;
        const clone = new Uniform(name, this.#cloneValue(this.#value), this.#type);
        clone.#defaultValue = this.#cloneValue(this.#defaultValue);
        clone.#size = this.#size;
        clone.#array = this.#array;
        clone.#arraySize = this.#arraySize;
        return clone;
    }

    toString() {
        return `Uniform(name=${this.#name}, type=${this.#type}, dirty=${this.#isDirty})`;
    }
}

/**
 * UniformManager - Manages a collection of uniforms.
 */
class UniformManager {
    #uniforms = new Map();
    #groups = new Map();
    #isDestroyed = false;

    constructor() {
        Logger.log('UniformManager created');
    }

    /**
     * Adds a uniform.
     * 
     * @param {string} name - Uniform name
     * @param {*} value - Uniform value
     * @param {string} type - Uniform type
     * @param {string} group - Group name (optional)
     * @returns {Uniform} Created uniform
     */
    add(name, value, type = UNIFORM_TYPES.FLOAT, group = 'default') {
        if (this.#isDestroyed) return null;
        
        const uniform = new Uniform(name, value, type);
        this.#uniforms.set(name, uniform);
        
        if (!this.#groups.has(group)) {
            this.#groups.set(group, []);
        }
        this.#groups.get(group).push(name);
        
        return uniform;
    }

    /**
     * Adds a matrix uniform.
     * 
     * @param {string} name - Uniform name
     * @param {Matrix4} value - Matrix value
     * @param {string} group - Group name
     * @returns {Uniform} Created uniform
     */
    addMatrix(name, value, group = 'matrices') {
        return this.add(name, value, UNIFORM_TYPES.MATRIX4, group);
    }

    /**
     * Adds a vector uniform.
     * 
     * @param {string} name - Uniform name
     * @param {Vector2|Vector3|Vector4} value - Vector value
     * @param {string} type - Vector type
     * @param {string} group - Group name
     * @returns {Uniform} Created uniform
     */
    addVector(name, value, type = UNIFORM_TYPES.FLOAT3, group = 'vectors') {
        return this.add(name, value, type, group);
    }

    /**
     * Adds a float uniform.
     * 
     * @param {string} name - Uniform name
     * @param {number} value - Float value
     * @param {string} group - Group name
     * @returns {Uniform} Created uniform
     */
    addFloat(name, value, group = 'floats') {
        return this.add(name, value, UNIFORM_TYPES.FLOAT, group);
    }

    /**
     * Adds an int uniform.
     * 
     * @param {string} name - Uniform name
     * @param {number} value - Int value
     * @param {string} group - Group name
     * @returns {Uniform} Created uniform
     */
    addInt(name, value, group = 'ints') {
        return this.add(name, value, UNIFORM_TYPES.INT, group);
    }

    /**
     * Adds a boolean uniform.
     * 
     * @param {string} name - Uniform name
     * @param {boolean} value - Boolean value
     * @param {string} group - Group name
     * @returns {Uniform} Created uniform
     */
    addBool(name, value, group = 'bools') {
        return this.add(name, value, UNIFORM_TYPES.BOOL, group);
    }

    /**
     * Adds a texture uniform.
     * 
     * @param {string} name - Uniform name
     * @param {*} texture - Texture object
     * @param {string} type - Sampler type
     * @param {string} group - Group name
     * @returns {Uniform} Created uniform
     */
    addTexture(name, texture, type = UNIFORM_TYPES.SAMPLER2D, group = 'textures') {
        return this.add(name, texture, type, group);
    }

    /**
     * Gets a uniform by name.
     * 
     * @param {string} name - Uniform name
     * @returns {Uniform|null} Uniform or null
     */
    get(name) {
        return this.#uniforms.get(name) || null;
    }

    /**
     * Removes a uniform.
     * 
     * @param {string} name - Uniform name
     * @returns {boolean} True if removed
     */
    remove(name) {
        if (!this.#uniforms.has(name)) return false;
        
        this.#uniforms.delete(name);
        
        for (const [group, names] of this.#groups) {
            const index = names.indexOf(name);
            if (index !== -1) {
                names.splice(index, 1);
                if (names.length === 0) {
                    this.#groups.delete(group);
                }
                break;
            }
        }
        
        return true;
    }

    /**
     * Sets a uniform value.
     * 
     * @param {string} name - Uniform name
     * @param {*} value - New value
     * @returns {boolean} True if set
     */
    set(name, value) {
        const uniform = this.#uniforms.get(name);
        if (!uniform) return false;
        
        uniform.value = value;
        return true;
    }

    /**
     * Sets multiple uniform values.
     * 
     * @param {Object} values - Object with name-value pairs
     */
    setAll(values) {
        for (const [name, value] of Object.entries(values)) {
            this.set(name, value);
        }
    }

    /**
     * Gets all uniforms in a group.
     * 
     * @param {string} group - Group name
     * @returns {Uniform[]} Array of uniforms
     */
    getGroup(group) {
        const names = this.#groups.get(group) || [];
        return names.map(name => this.#uniforms.get(name)).filter(u => u);
    }

    /**
     * Gets all uniform names.
     * 
     * @returns {string[]} Array of names
     */
    getNames() {
        return Array.from(this.#uniforms.keys());
    }

    /**
     * Gets all uniform values.
     * 
     * @returns {Object} Object with name-value pairs
     */
    getAllValues() {
        const result = {};
        for (const [name, uniform] of this.#uniforms) {
            result[name] = uniform.value;
        }
        return result;
    }

    /**
     * Gets dirty uniforms.
     * 
     * @returns {Uniform[]} Array of dirty uniforms
     */
    getDirty() {
        const dirty = [];
        for (const uniform of this.#uniforms.values()) {
            if (uniform.isDirty) {
                dirty.push(uniform);
            }
        }
        return dirty;
    }

    /**
     * Cleans all uniforms.
     */
    cleanAll() {
        for (const uniform of this.#uniforms.values()) {
            uniform.clean();
        }
    }

    /**
     * Resets all uniforms to default.
     */
    resetAll() {
        for (const uniform of this.#uniforms.values()) {
            uniform.reset();
        }
    }

    /**
     * Gets uniform count.
     * 
     * @returns {number} Number of uniforms
     */
    getCount() {
        return this.#uniforms.size;
    }

    /**
     * Gets group names.
     * 
     * @returns {string[]} Array of group names
     */
    getGroupNames() {
        return Array.from(this.#groups.keys());
    }

    /**
     * Checks if a uniform exists.
     * 
     * @param {string} name - Uniform name
     * @returns {boolean} True if exists
     */
    has(name) {
        return this.#uniforms.has(name);
    }

    /**
     * Destroys the manager.
     */
    destroy() {
        if (this.#isDestroyed) return;
        
        this.#isDestroyed = true;
        this.#uniforms.clear();
        this.#groups.clear();
        Logger.log('UniformManager destroyed');
    }

    toString() {
        return `UniformManager(uniforms=${this.#uniforms.size}, groups=${this.#groups.size})`;
    }
}

export { Uniform, UniformManager, UNIFORM_TYPES };
export default ;
