/**
 * Object.js - Base object class for LXRN Engine.
 * Provides transform hierarchy, layer management, and event system.
 * Supports both 2D and 3D objects with unified API.
 * 
 * @module Object
 * @author LXRN
 * @version 1.0.0
 */

import { Vector2 } from '../math/Vector2.js';
import { Vector3 } from '../math/Vector3.js';
import { Euler } from '../math/Euler.js';
import { Quaternion } from '../math/Quaternion.js';
import { Matrix4 } from '../math/Matrix4.js';
import EventEmitter from './EventEmitter.js';
import { Logger } from '../utils/Logger.js';

class Object extends EventEmitter {
    #id = null;
    #children = [];
    #parent = null;
    #matrix = new Matrix4();
    #matrixWorld = new Matrix4();
    #visible = true;
    #layers = 1;
    #renderOrder = 0;
    #is3D = false;
    #isDestroyed = false;
    
    __renderCache = null;
    __dirty = true;
    
    _position = null;
    _rotation = null;
    _scale = null;
    _quaternion = null;
    _up = null;
    
    name = 'Object';
    type = 'Object';
    userData = {};
    active = true;
    matrixAutoUpdate = true;

    constructor(options = {}) {
        super();
        
        this.#id = options.id || this.#generateId();
        this.name = options.name || 'Object';
        this.type = options.type || 'Object';
        this.#is3D = options.is3D !== undefined ? options.is3D : false;
        
        if (options.layer !== undefined) {
            this.setLayer(options.layer);
        }
        
        if (options.matrixAutoUpdate !== undefined) {
            this.matrixAutoUpdate = options.matrixAutoUpdate;
        }
        
        if (options.active !== undefined) {
            this.active = options.active;
        }
        
        if (this.#is3D) {
            this._position = new Vector3(0, 0, 0);
            this._rotation = new Euler(0, 0, 0);
            this._scale = new Vector3(1, 1, 1);
            this._quaternion = new Quaternion();
            this._up = new Vector3(0, 1, 0);
        } else {
            this._position = new Vector2(0, 0);
            this._rotation = 0;
            this._scale = new Vector2(1, 1);
        }
        
        if (options.position) {
            this.position.set(options.position.x || 0, options.position.y || 0, options.position.z || 0);
        }
        if (options.rotation) {
            if (this.#is3D) {
                this.rotation.set(options.rotation.x || 0, options.rotation.y || 0, options.rotation.z || 0);
            } else {
                this.rotation = options.rotation;
            }
        }
        if (options.scale) {
            this.scale.set(options.scale.x || 1, options.scale.y || 1, options.scale.z || 1);
        }
        
        if (options.userData) {
            this.userData = { ...this.userData, ...options.userData };
        }
        
        if (options.visible !== undefined) {
            this.#visible = options.visible;
        }
        
        this.emit('created', { object: this });
        Logger.log(`Object created: ${this.name} (${this.type})`);
    }

    enable() {
        if (this.#isDestroyed) return this;
        this.active = true;
        this.#visible = true;
        this.emit('enabled', { object: this });
        return this;
    }

    disable() {
        if (this.#isDestroyed) return this;
        this.active = false;
        this.#visible = false;
        this.emit('disabled', { object: this });
        return this;
    }

    setVisible(visible) {
        if (this.#isDestroyed) return this;
        this.#visible = visible;
        this.__dirty = true;
        this.emit('visibilityChanged', { object: this, visible });
        return this;
    }

    setActive(active) {
        if (this.#isDestroyed) return this;
        this.active = active;
        this.emit('activeChanged', { object: this, active });
        return this;
    }

    destroy() {
        if (this.#isDestroyed) return;
        
        this.#isDestroyed = true;
        this.active = false;
        this.#visible = false;
        
        for (const child of this.#children) {
            child.destroy();
        }
        
        this.removeFromParent();
        this.#children = [];
        
        this.emit('destroyed', { object: this });
        Logger.log(`Object destroyed: ${this.name}`);
    }

    isDestroyed() {
        return this.#isDestroyed;
    }

    setLayer(layer) {
        if (this.#isDestroyed) return this;
        this.#layers = 1 << layer;
        this.emit('layerChanged', { object: this, layer });
        return this;
    }

    addLayer(layer) {
        if (this.#isDestroyed) return this;
        this.#layers |= 1 << layer;
        this.emit('layerAdded', { object: this, layer });
        return this;
    }

    removeLayer(layer) {
        if (this.#isDestroyed) return this;
        this.#layers &= ~(1 << layer);
        this.emit('layerRemoved', { object: this, layer });
        return this;
    }

    toggleLayer(layer) {
        if (this.#isDestroyed) return this;
        this.#layers ^= 1 << layer;
        this.emit('layerToggled', { object: this, layer });
        return this;
    }

    isOnLayer(layer) {
        return (this.#layers & (1 << layer)) !== 0;
    }

    testLayer(layerMask) {
        return (this.#layers & layerMask) !== 0;
    }

    getLayerMask() {
        return this.#layers;
    }

    setLayerMask(mask) {
        if (this.#isDestroyed) return this;
        this.#layers = mask;
        this.emit('layerMaskChanged', { object: this, mask });
        return this;
    }

    add(child) {
        if (this.#isDestroyed) return this;
        
        if (!(child instanceof Object)) {
            Logger.warn('Child must be an instance of Object');
            return this;
        }
        
        if (child === this) {
            Logger.warn('Cannot add object to itself');
            return this;
        }
        
        if (this.#children.includes(child)) {
            Logger.warn('Child already added');
            return this;
        }
        
        if (child.#parent) {
            child.#parent.remove(child);
        }
        
        this.#children.push(child);
        child.#parent = this;
        child.__dirty = true;
        
        this.emit('childAdded', { parent: this, child });
        child.emit('parentChanged', { parent: this });
        
        return this;
    }

    remove(child) {
        if (this.#isDestroyed) return this;
        
        const index = this.#children.indexOf(child);
        if (index === -1) {
            Logger.warn('Child not found');
            return this;
        }
        
        this.#children.splice(index, 1);
        child.#parent = null;
        child.__dirty = true;
        
        this.emit('childRemoved', { parent: this, child });
        child.emit('parentChanged', { parent: null });
        
        return this;
    }

    removeFromParent() {
        if (this.#isDestroyed) return this;
        if (this.#parent) {
            this.#parent.remove(this);
        }
        return this;
    }

    getAncestors() {
        const ancestors = [];
        let current = this.#parent;
        while (current) {
            ancestors.push(current);
            current = current.#parent;
        }
        return ancestors;
    }

    getDescendants() {
        const descendants = [];
        for (const child of this.#children) {
            descendants.push(child);
            descendants.push(...child.getDescendants());
        }
        return descendants;
    }

    updateMatrix() {
        if (this.#isDestroyed) return;
        if (!this.matrixAutoUpdate) return;
        
        if (this.#is3D) {
            this.#matrix.compose(this._position, this._quaternion, this._scale);
        } else {
            this.#matrix.identity();
            this.#matrix.translate(this._position.x, this._position.y);
            this.#matrix.rotate(this._rotation);
            this.#matrix.scale(this._scale.x, this._scale.y);
        }
        
        this.__dirty = false;
        this.emit('matrixUpdated', { object: this });
    }

    updateWorldMatrix() {
        if (this.#isDestroyed) return;
        this.updateMatrix();
        
        if (this.#parent) {
            this.#matrixWorld.copy(this.#parent.matrixWorld).multiply(this.#matrix);
        } else {
            this.#matrixWorld.copy(this.#matrix);
        }
        
        for (const child of this.#children) {
            child.updateWorldMatrix();
        }
    }

    lookAt(target) {
        if (this.#isDestroyed) return this;
        
        if (!this.#is3D) {
            Logger.warn('lookAt is only available for 3D objects');
            return this;
        }
        
        const direction = new Vector3().copy(target).sub(this._position);
        direction.normalize();
        
        const up = this._up || new Vector3(0, 1, 0);
        this._quaternion.lookAt(direction, up);
        
        this.emit('lookAtChanged', { object: this, target });
        return this;
    }

    getWorldPosition(target = null) {
        const pos = target || new Vector3(0, 0, 0);
        pos.copy(this._position);
        pos.applyMatrix4(this.#matrixWorld);
        return pos;
    }

    getWorldQuaternion(target = null) {
        const quat = target || new Quaternion();
        quat.copy(this._quaternion);
        quat.multiply(this.#parent ? this.#parent.getWorldQuaternion() : new Quaternion());
        return quat;
    }

    getWorldScale(target = null) {
        const scale = target || new Vector3(1, 1, 1);
        scale.copy(this._scale);
        if (this.#parent) {
            const parentScale = this.#parent.getWorldScale();
            scale.multiply(parentScale);
        }
        return scale;
    }

    clone(recursive = false) {
        const clone = new Object({
            name: `${this.name}_clone`,
            type: this.type,
            is3D: this.#is3D,
            position: this._position.clone ? this._position.clone() : { ...this._position },
            rotation: this._rotation.clone ? this._rotation.clone() : this._rotation,
            scale: this._scale.clone ? this._scale.clone() : { ...this._scale },
            userData: { ...this.userData },
            visible: this.#visible,
            active: this.active,
            matrixAutoUpdate: this.matrixAutoUpdate
        });
        
        clone.#layers = this.#layers;
        clone.#renderOrder = this.#renderOrder;
        
        if (recursive) {
            for (const child of this.#children) {
                clone.add(child.clone(true));
            }
        }
        
        return clone;
    }

    #generateId() {
        return `object_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    get id() { return this.#id; }
    get children() { return this.#children; }
    get parent() { return this.#parent; }
    get matrix() { return this.#matrix; }
    get matrixWorld() { return this.#matrixWorld; }
    get visible() { return this.#visible; }
    get renderOrder() { return this.#renderOrder; }
    get is3D() { return this.#is3D; }
    get is2D() { return !this.#is3D; }
    get isDestroyed() { return this.#isDestroyed; }

    get position() { return this._position; }
    get rotation() { return this._rotation; }
    get scale() { return this._scale; }
    get quaternion() { return this._quaternion; }
    get up() { return this._up; }

    set visible(value) {
        if (this.#isDestroyed) return;
        this.#visible = value;
        this.__dirty = true;
        this.emit('visibilityChanged', { object: this, visible: value });
    }

    set renderOrder(value) {
        if (this.#isDestroyed) return;
        this.#renderOrder = value;
        this.emit('renderOrderChanged', { object: this, order: value });
    }

    toString() {
        return `Object(name=${this.name}, type=${this.type}, active=${this.active}, visible=${this.#visible}, destroyed=${this.#isDestroyed}, layerMask=${this.#layers}, children=${this.#children.length})`;
    }
}

export default Object;
