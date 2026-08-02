/**
 * UniformGroup.js - Uniform grouping system for LXRN Engine.
 * Organizes uniforms into logical groups for batch updates and sharing.
 * Supports group binding, inheritance, and optimization.
 * 
 * @module UniformGroup
 * @author LXRN
 * @version 1.0.0
 */

import { Uniform, UniformManager, UNIFORM_TYPES } from './Uniform.js';
import { Vector3 } from '../math/Vector3.js';
import { Vector4 } from '../math/Vector4.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Color } from '../math/Color.js';
import { Logger } from '../utils/Logger.js';

/**
 * Predefined uniform group types.
 */
export const UNIFORM_GROUP_TYPES = {
    TRANSFORM: 'transform',
    CAMERA: 'camera',
    LIGHT: 'light',
    MATERIAL: 'material',
    FOG: 'fog',
    TIME: 'time',
    POST_PROCESS: 'postprocess',
    CUSTOM: 'custom'
};

/**
 * UniformGroup class - Manages a collection of related uniforms.
 */
class UniformGroup {
    #id = null;
    #name = '';
    #type = UNIFORM_GROUP_TYPES.CUSTOM;
    #uniforms = new Map();
    #dirty = false;
    #isBound = false;
    #isEnabled = true;
    #priority = 0;
    #parentGroup = null;
    #childGroups = [];
    #bindingPoint = -1;
    #stage = 'all'; // 'vertex', 'fragment', 'all'
    #onUpdate = null;
    #isDestroyed = false;
    #shared = false;
    
    __cache = {};
    __lastUpdate = 0;

    constructor(name, type = UNIFORM_GROUP_TYPES.CUSTOM, options = {}) {
        this.#id = this.#generateId();
        this.#name = name;
        this.#type = type;
        this.#priority = options.priority || 0;
        this.#stage = options.stage || 'all';
        this.#shared = options.shared || false;
        this.#bindingPoint = options.bindingPoint || -1;
        this.#onUpdate = options.onUpdate || null;
        
        if (options.parent) {
            this.#parentGroup = options.parent;
            options.parent.addChildGroup(this);
        }
        
        Logger.log(`UniformGroup created: ${name} (${type})`);
    }

    get id() { return this.#id; }
    get name() { return this.#name; }
    get type() { return this.#type; }
    get isDirty() { return this.#dirty; }
    get isBound() { return this.#isBound; }
    get isEnabled() { return this.#isEnabled; }
    get priority() { return this.#priority; }
    get parentGroup() { return this.#parentGroup; }
    get childGroups() { return this.#childGroups; }
    get bindingPoint() { return this.#bindingPoint; }
    get stage() { return this.#stage; }
    get isShared() { return this.#shared; }
    get uniformCount() { return this.#uniforms.size; }

    set priority(value) {
        this.#priority = value;
        this.#sortChildren();
    }

    set isEnabled(value) {
        this.#isEnabled = value;
        this.#dirty = true;
    }

    set bindingPoint(value) {
        this.#bindingPoint = value;
        this.#dirty = true;
    }

    set onUpdate(callback) {
        this.#onUpdate = callback;
    }

    /**
     * Adds a uniform to the group.
     * 
     * @param {string} name - Uniform name
     * @param {*} value - Uniform value
     * @param {string} type - Uniform type
     * @returns {Uniform} Created uniform
     */
    add(name, value, type = UNIFORM_TYPES.FLOAT) {
        if (this.#isDestroyed) return null;
        
        const uniform = new Uniform(name, value, type);
        this.#uniforms.set(name, uniform);
        this.#dirty = true;
        
        return uniform;
    }

    /**
     * Adds a matrix uniform.
     * 
     * @param {string} name - Uniform name
     * @param {Matrix4} value - Matrix value
     * @returns {Uniform} Created uniform
     */
    addMatrix(name, value) {
        return this.add(name, value, UNIFORM_TYPES.MATRIX4);
    }

    /**
     * Adds a vector uniform.
     * 
     * @param {string} name - Uniform name
     * @param {Vector2|Vector3|Vector4} value - Vector value
     * @param {string} type - Vector type
     * @returns {Uniform} Created uniform
     */
    addVector(name, value, type = UNIFORM_TYPES.FLOAT3) {
        return this.add(name, value, type);
    }

    /**
     * Adds a float uniform.
     * 
     * @param {string} name - Uniform name
     * @param {number} value - Float value
     * @returns {Uniform} Created uniform
     */
    addFloat(name, value) {
        return this.add(name, value, UNIFORM_TYPES.FLOAT);
    }

    /**
     * Adds a color uniform.
     * 
     * @param {string} name - Uniform name
     * @param {Color|string|number} value - Color value
     * @returns {Uniform} Created uniform
     */
    addColor(name, value) {
        const color = value instanceof Color ? value : new Color(value);
        return this.add(name, color, UNIFORM_TYPES.FLOAT3);
    }

    /**
     * Adds a texture uniform.
     * 
     * @param {string} name - Uniform name
     * @param {*} texture - Texture object
     * @param {string} type - Sampler type
     * @returns {Uniform} Created uniform
     */
    addTexture(name, texture, type = UNIFORM_TYPES.SAMPLER2D) {
        return this.add(name, texture, type);
    }

    /**
     * Adds an int uniform.
     * 
     * @param {string} name - Uniform name
     * @param {number} value - Int value
     * @returns {Uniform} Created uniform
     */
    addInt(name, value) {
        return this.add(name, value, UNIFORM_TYPES.INT);
    }

    /**
     * Adds a boolean uniform.
     * 
     * @param {string} name - Uniform name
     * @param {boolean} value - Boolean value
     * @returns {Uniform} Created uniform
     */
    addBool(name, value) {
        return this.add(name, value, UNIFORM_TYPES.BOOL);
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
        const deleted = this.#uniforms.delete(name);
        if (deleted) {
            this.#dirty = true;
        }
        return deleted;
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
        this.#dirty = true;
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
     * Gets all uniform names.
     * 
     * @returns {string[]} Array of names
     */
    getNames() {
        return Array.from(this.#uniforms.keys());
    }

    /**
     * Gets all uniforms.
     * 
     * @returns {Uniform[]} Array of uniforms
     */
    getAllUniforms() {
        return Array.from(this.#uniforms.values());
    }

    /**
     * Gets dirty uniforms.
     * 
     * @returns {Uniform[]} Array of dirty uniforms
     */
    getDirtyUniforms() {
        const dirty = [];
        for (const uniform of this.#uniforms.values()) {
            if (uniform.isDirty) {
                dirty.push(uniform);
            }
        }
        return dirty;
    }

    /**
     * Checks if the group has any dirty uniforms.
     * 
     * @returns {boolean} True if dirty
     */
    hasDirty() {
        for (const uniform of this.#uniforms.values()) {
            if (uniform.isDirty) {
                return true;
            }
        }
        return false;
    }

    /**
     * Cleans all uniforms in the group.
     */
    clean() {
        for (const uniform of this.#uniforms.values()) {
            uniform.clean();
        }
        this.#dirty = false;
    }

    /**
     * Resets all uniforms to default.
     */
    reset() {
        for (const uniform of this.#uniforms.values()) {
            uniform.reset();
        }
        this.#dirty = true;
    }

    /**
     * Updates the group.
     * 
     * @param {number} deltaTime - Delta time
     * @returns {boolean} True if updated
     */
    update(deltaTime) {
        if (this.#isDestroyed || !this.#isEnabled) return false;
        
        if (this.#onUpdate) {
            this.#onUpdate(this, deltaTime);
        }
        
        // Update child groups
        for (const child of this.#childGroups) {
            child.update(deltaTime);
        }
        
        const dirty = this.hasDirty();
        if (dirty) {
            this.#lastUpdate = performance.now();
        }
        
        return dirty;
    }

    /**
     * Binds the uniform group.
     * 
     * @param {*} context - Rendering context
     * @returns {boolean} True if bound
     */
    bind(context) {
        if (this.#isDestroyed || !this.#isEnabled) return false;
        
        this.#isBound = true;
        
        // Update child groups
        for (const child of this.#childGroups) {
            child.bind(context);
        }
        
        // Here you would upload uniforms to GPU
        // Implementation depends on rendering API
        
        this.#dirty = false;
        return true;
    }

    /**
     * Unbinds the uniform group.
     */
    unbind() {
        this.#isBound = false;
        
        for (const child of this.#childGroups) {
            child.unbind();
        }
    }

    /**
     * Adds a child group.
     * 
     * @param {UniformGroup} group - Child group
     * @returns {UniformGroup} This
     */
    addChildGroup(group) {
        if (this.#isDestroyed) return this;
        if (group === this) return this;
        if (this.#childGroups.includes(group)) return this;
        
        this.#childGroups.push(group);
        group.#parentGroup = this;
        this.#sortChildren();
        return this;
    }

    /**
     * Removes a child group.
     * 
     * @param {UniformGroup} group - Child group
     * @returns {boolean} True if removed
     */
    removeChildGroup(group) {
        const index = this.#childGroups.indexOf(group);
        if (index === -1) return false;
        
        this.#childGroups.splice(index, 1);
        group.#parentGroup = null;
        return true;
    }

    /**
     * Sorts child groups by priority.
     * 
     * @private
     */
    #sortChildren() {
        this.#childGroups.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Gets all uniforms including from child groups.
     * 
     * @returns {Uniform[]} Array of all uniforms
     */
    getAllUniformsRecursive() {
        const uniforms = this.getAllUniforms();
        for (const child of this.#childGroups) {
            uniforms.push(...child.getAllUniformsRecursive());
        }
        return uniforms;
    }

    /**
     * Gets all dirty uniforms recursively.
     * 
     * @returns {Uniform[]} Array of dirty uniforms
     */
    getDirtyUniformsRecursive() {
        const dirty = this.getDirtyUniforms();
        for (const child of this.#childGroups) {
            dirty.push(...child.getDirtyUniformsRecursive());
        }
        return dirty;
    }

    /**
     * Cleans recursively.
     */
    cleanRecursive() {
        this.clean();
        for (const child of this.#childGroups) {
            child.cleanRecursive();
        }
    }

    /**
     * Checks if the group contains a uniform.
     * 
     * @param {string} name - Uniform name
     * @returns {boolean} True if contains
     */
    has(name) {
        return this.#uniforms.has(name);
    }

    /**
     * Checks if the group contains a uniform recursively.
     * 
     * @param {string} name - Uniform name
     * @returns {boolean} True if contains
     */
    hasRecursive(name) {
        if (this.has(name)) return true;
        for (const child of this.#childGroups) {
            if (child.hasRecursive(name)) return true;
        }
        return false;
    }

    /**
     * Gets a uniform recursively.
     * 
     * @param {string} name - Uniform name
     * @returns {Uniform|null} Uniform or null
     */
    getRecursive(name) {
        const uniform = this.get(name);
        if (uniform) return uniform;
        for (const child of this.#childGroups) {
            const result = child.getRecursive(name);
            if (result) return result;
        }
        return null;
    }

    /**
     * Generates a unique ID.
     * 
     * @private
     * @returns {string} Unique ID
     */
    #generateId() {
        return `uniform_group_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    /**
     * Creates a clone of this group.
     * 
     * @param {boolean} recursive - Clone child groups
     * @param {string} newName - New name (optional)
     * @returns {UniformGroup} Cloned group
     */
    clone(recursive = false, newName = null) {
        const name = newName || `${this.#name}_clone`;
        const clone = new UniformGroup(name, this.#type, {
            priority: this.#priority,
            stage: this.#stage,
            shared: this.#shared,
            bindingPoint: this.#bindingPoint
        });
        
        // Clone uniforms
        for (const [name, uniform] of this.#uniforms) {
            clone.add(name, uniform.value, uniform.type);
        }
        
        // Clone child groups
        if (recursive) {
            for (const child of this.#childGroups) {
                const childClone = child.clone(true);
                clone.addChildGroup(childClone);
            }
        }
        
        return clone;
    }

    /**
     * Destroys the group.
     */
    destroy() {
        if (this.#isDestroyed) return;
        
        this.#isDestroyed = true;
        this.#uniforms.clear();
        
        for (const child of this.#childGroups) {
            child.destroy();
        }
        this.#childGroups = [];
        
        if (this.#parentGroup) {
            this.#parentGroup.removeChildGroup(this);
        }
        
        Logger.log(`UniformGroup destroyed: ${this.#name}`);
    }

    toString() {
        return `UniformGroup(name=${this.#name}, type=${this.#type}, uniforms=${this.#uniforms.size}, children=${this.#childGroups.length}, enabled=${this.#isEnabled})`;
    }
}

/**
 * Predefined uniform groups for common use cases.
 */
export const UniformGroups = {
    /**
     * Creates a transform group.
     * 
     * @param {string} name - Group name
     * @param {Object} options - Options
     * @returns {UniformGroup} Transform group
     */
    transform(name = 'TransformGroup', options = {}) {
        const group = new UniformGroup(name, UNIFORM_GROUP_TYPES.TRANSFORM, {
            priority: 0,
            ...options
        });
        
        group.addMatrix('modelMatrix', new Matrix4());
        group.addMatrix('viewMatrix', new Matrix4());
        group.addMatrix('projectionMatrix', new Matrix4());
        group.addMatrix('modelViewMatrix', new Matrix4());
        group.addMatrix('normalMatrix', new Matrix4());
        
        return group;
    },

    /**
     * Creates a camera group.
     * 
     * @param {string} name - Group name
     * @param {Object} options - Options
     * @returns {UniformGroup} Camera group
     */
    camera(name = 'CameraGroup', options = {}) {
        const group = new UniformGroup(name, UNIFORM_GROUP_TYPES.CAMERA, {
            priority: 10,
            ...options
        });
        
        group.addVector('cameraPosition', new Vector3(0, 0, 0), UNIFORM_TYPES.FLOAT3);
        group.addVector('cameraDirection', new Vector3(0, 0, -1), UNIFORM_TYPES.FLOAT3);
        group.addFloat('uFov', 60);
        group.addFloat('uNear', 0.1);
        group.addFloat('uFar', 1000);
        group.addFloat('uAspect', 1);
        
        return group;
    },

    /**
     * Creates a light group.
     * 
     * @param {string} name - Group name
     * @param {number} maxLights - Maximum number of lights
     * @param {Object} options - Options
     * @returns {UniformGroup} Light group
     */
    light(name = 'LightGroup', maxLights = 8, options = {}) {
        const group = new UniformGroup(name, UNIFORM_GROUP_TYPES.LIGHT, {
            priority: 20,
            ...options
        });
        
        group.addInt('uNumLights', 0);
        group.addVector('uLightPositions', new Float32Array(maxLights * 3), UNIFORM_TYPES.FLOAT3);
        group.addVector('uLightColors', new Float32Array(maxLights * 3), UNIFORM_TYPES.FLOAT3);
        group.addFloat('uLightIntensities', new Float32Array(maxLights), UNIFORM_TYPES.FLOAT);
        
        return group;
    },

    /**
     * Creates a material group.
     * 
     * @param {string} name - Group name
     * @param {Object} options - Options
     * @returns {UniformGroup} Material group
     */
    material(name = 'MaterialGroup', options = {}) {
        const group = new UniformGroup(name, UNIFORM_GROUP_TYPES.MATERIAL, {
            priority: 30,
            ...options
        });
        
        group.addColor('uColor', '#ffffff');
        group.addFloat('uRoughness', 0.5);
        group.addFloat('uMetallic', 0);
        group.addFloat('uOpacity', 1);
        group.addFloat('uEmissiveIntensity', 0);
        group.addColor('uEmissiveColor', '#000000');
        group.addFloat('uNormalScale', 1);
        group.addFloat('uAOStrength', 1);
        
        return group;
    },

    /**
     * Creates a fog group.
     * 
     * @param {string} name - Group name
     * @param {Object} options - Options
     * @returns {UniformGroup} Fog group
     */
    fog(name = 'FogGroup', options = {}) {
        const group = new UniformGroup(name, UNIFORM_GROUP_TYPES.FOG, {
            priority: 40,
            ...options
        });
        
        group.addColor('fogColor', '#000000');
        group.addFloat('fogDensity', 0.01);
        group.addFloat('fogNear', 0.1);
        group.addFloat('fogFar', 100);
        group.addFloat('fogEnabled', 1);
        group.addInt('fogType', 0);
        
        return group;
    },

    /**
     * Creates a time group.
     * 
     * @param {string} name - Group name
     * @param {Object} options - Options
     * @returns {UniformGroup} Time group
     */
    time(name = 'TimeGroup', options = {}) {
        const group = new UniformGroup(name, UNIFORM_GROUP_TYPES.TIME, {
            priority: 50,
            ...options
        });
        
        group.addFloat('uTime', 0);
        group.addFloat('uDeltaTime', 0);
        group.addInt('uFrameCount', 0);
        group.addFloat('uSpeed', 1);
        
        return group;
    },

    /**
     * Creates a post-process group.
     * 
     * @param {string} name - Group name
     * @param {Object} options - Options
     * @returns {UniformGroup} Post-process group
     */
    postProcess(name = 'PostProcessGroup', options = {}) {
        const group = new UniformGroup(name, UNIFORM_GROUP_TYPES.POST_PROCESS, {
            priority: 60,
            ...options
        });
        
        group.addFloat('uIntensity', 1);
        group.addFloat('uExposure', 1);
        group.addFloat('uContrast', 1);
        group.addFloat('uBrightness', 0);
        group.addFloat('uGamma', 2.2);
        group.addFloat('uBloomIntensity', 0);
        group.addFloat('uBloomThreshold', 0.5);
        group.addFloat('uVignetteIntensity', 0);
        
        return group;
    }
};

export default UniformGroup;
