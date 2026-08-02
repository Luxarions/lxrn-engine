/**
 * Object.js - Base object class for LXRN Engine.
 * Provides transform hierarchy, layer management, and event system.
 * Supports both 2D and 3D objects with unified API.
 * Includes comprehensive flags and boolean state management.
 * 
 * @module Object
 * @author LXRN
 * @version 2.0.0
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
    #flags = 0;
    
    // Position flags
    #isCentered = false;
    #isLocked = false;
    #isFrozen = false;
    #isPaused = false;
    
    // State flags
    #isSelected = false;
    #isHovered = false;
    #isDragging = false;
    #isColliding = false;
    #isOnGround = false;
    #isMoving = false;
    #isJumping = false;
    #isFalling = false;
    #isAttacking = false;
    #isDefending = false;
    #isDead = false;
    
    // Lifecycle flags
    #isSpawned = false;
    #isLoaded = false;
    #isInitialized = false;
    #isUpdated = false;
    #isRendered = false;
    #isCulled = false;
    
    // Render flags
    #isFrustumCulled = true;
    #isLayerVisible = true;
    #isParentVisible = true;
    #isChildVisible = true;
    #isCastShadow = false;
    #isReceiveShadow = false;
    #isTransparent = false;
    #isBlending = false;
    #isDepthWrite = true;
    #isDepthTest = true;
    #isStatic = false;
    
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

    static FLAGS = {
        VISIBLE: 1 << 0,
        ACTIVE: 1 << 1,
        STATIC: 1 << 2,
        DIRTY: 1 << 3,
        DESTROYED: 1 << 4,
        LOCKED: 1 << 5,
        FROZEN: 1 << 6,
        PAUSED: 1 << 7,
        SELECTED: 1 << 8,
        HOVERED: 1 << 9,
        DRAGGING: 1 << 10,
        COLLIDING: 1 << 11,
        ON_GROUND: 1 << 12,
        MOVING: 1 << 13,
        JUMPING: 1 << 14,
        FALLING: 1 << 15,
        ATTACKING: 1 << 16,
        DEFENDING: 1 << 17,
        DEAD: 1 << 18,
        SPAWNED: 1 << 19,
        LOADED: 1 << 20,
        INITIALIZED: 1 << 21,
        UPDATED: 1 << 22,
        RENDERED: 1 << 23,
        CULLED: 1 << 24,
        FRUSTUM_CULLED: 1 << 25,
        LAYER_VISIBLE: 1 << 26,
        PARENT_VISIBLE: 1 << 27,
        CHILD_VISIBLE: 1 << 28,
        CAST_SHADOW: 1 << 29,
        RECEIVE_SHADOW: 1 << 30,
        TRANSPARENT: 1 << 31
    };

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
        
        if (options.flags !== undefined) {
            this.#flags = options.flags;
        }
        
        if (options.isCentered !== undefined) {
            this.#isCentered = options.isCentered;
        }
        
        if (options.isStatic !== undefined) {
            this.#isStatic = options.isStatic;
            this.#updateFlag(Object.FLAGS.STATIC, this.#isStatic);
        }
        
        if (options.isLocked !== undefined) {
            this.#isLocked = options.isLocked;
            this.#updateFlag(Object.FLAGS.LOCKED, this.#isLocked);
        }
        
        if (options.isFrozen !== undefined) {
            this.#isFrozen = options.isFrozen;
            this.#updateFlag(Object.FLAGS.FROZEN, this.#isFrozen);
        }
        
        if (options.isSelected !== undefined) {
            this.#isSelected = options.isSelected;
            this.#updateFlag(Object.FLAGS.SELECTED, this.#isSelected);
        }
        
        if (options.isHovered !== undefined) {
            this.#isHovered = options.isHovered;
            this.#updateFlag(Object.FLAGS.HOVERED, this.#isHovered);
        }
        
        if (options.isDragging !== undefined) {
            this.#isDragging = options.isDragging;
            this.#updateFlag(Object.FLAGS.DRAGGING, this.#isDragging);
        }
        
        if (options.isColliding !== undefined) {
            this.#isColliding = options.isColliding;
            this.#updateFlag(Object.FLAGS.COLLIDING, this.#isColliding);
        }
        
        if (options.isOnGround !== undefined) {
            this.#isOnGround = options.isOnGround;
            this.#updateFlag(Object.FLAGS.ON_GROUND, this.#isOnGround);
        }
        
        if (options.isMoving !== undefined) {
            this.#isMoving = options.isMoving;
            this.#updateFlag(Object.FLAGS.MOVING, this.#isMoving);
        }
        
        if (options.isJumping !== undefined) {
            this.#isJumping = options.isJumping;
            this.#updateFlag(Object.FLAGS.JUMPING, this.#isJumping);
        }
        
        if (options.isFalling !== undefined) {
            this.#isFalling = options.isFalling;
            this.#updateFlag(Object.FLAGS.FALLING, this.#isFalling);
        }
        
        if (options.isAttacking !== undefined) {
            this.#isAttacking = options.isAttacking;
            this.#updateFlag(Object.FLAGS.ATTACKING, this.#isAttacking);
        }
        
        if (options.isDefending !== undefined) {
            this.#isDefending = options.isDefending;
            this.#updateFlag(Object.FLAGS.DEFENDING, this.#isDefending);
        }
        
        if (options.isDead !== undefined) {
            this.#isDead = options.isDead;
            this.#updateFlag(Object.FLAGS.DEAD, this.#isDead);
        }
        
        if (options.isSpawned !== undefined) {
            this.#isSpawned = options.isSpawned;
            this.#updateFlag(Object.FLAGS.SPAWNED, this.#isSpawned);
        }
        
        if (options.isLoaded !== undefined) {
            this.#isLoaded = options.isLoaded;
            this.#updateFlag(Object.FLAGS.LOADED, this.#isLoaded);
        }
        
        if (options.isInitialized !== undefined) {
            this.#isInitialized = options.isInitialized;
            this.#updateFlag(Object.FLAGS.INITIALIZED, this.#isInitialized);
        }
        
        if (options.isFrustumCulled !== undefined) {
            this.#isFrustumCulled = options.isFrustumCulled;
            this.#updateFlag(Object.FLAGS.FRUSTUM_CULLED, this.#isFrustumCulled);
        }
        
        if (options.isCastShadow !== undefined) {
            this.#isCastShadow = options.isCastShadow;
            this.#updateFlag(Object.FLAGS.CAST_SHADOW, this.#isCastShadow);
        }
        
        if (options.isReceiveShadow !== undefined) {
            this.#isReceiveShadow = options.isReceiveShadow;
            this.#updateFlag(Object.FLAGS.RECEIVE_SHADOW, this.#isReceiveShadow);
        }
        
        if (options.isTransparent !== undefined) {
            this.#isTransparent = options.isTransparent;
            this.#updateFlag(Object.FLAGS.TRANSPARENT, this.#isTransparent);
        }
        
        if (options.visible !== undefined) {
            this.#visible = options.visible;
            this.#updateFlag(Object.FLAGS.VISIBLE, this.#visible);
        }
        
        this.#updateFlag(Object.FLAGS.ACTIVE, this.active);
        this.#updateFlag(Object.FLAGS.DIRTY, true);
        
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
        
        if (this.#isCentered) {
            this.centerOnScreen();
        }
        
        this.emit('created', { object: this });
        Logger.log(`Object created: ${this.name} (${this.type})`);
    }

    enable() {
        if (this.#isDestroyed) return this;
        this.active = true;
        this.#visible = true;
        this.#updateFlag(Object.FLAGS.ACTIVE, true);
        this.#updateFlag(Object.FLAGS.VISIBLE, true);
        this.emit('enabled', { object: this });
        return this;
    }

    disable() {
        if (this.#isDestroyed) return this;
        this.active = false;
        this.#visible = false;
        this.#updateFlag(Object.FLAGS.ACTIVE, false);
        this.#updateFlag(Object.FLAGS.VISIBLE, false);
        this.emit('disabled', { object: this });
        return this;
    }

    setVisible(visible) {
        if (this.#isDestroyed) return this;
        this.#visible = visible;
        this.#updateFlag(Object.FLAGS.VISIBLE, visible);
        this.__dirty = true;
        this.emit('visibilityChanged', { object: this, visible });
        return this;
    }

    setActive(active) {
        if (this.#isDestroyed) return this;
        this.active = active;
        this.#updateFlag(Object.FLAGS.ACTIVE, active);
        this.emit('activeChanged', { object: this, active });
        return this;
    }

    destroy() {
        if (this.#isDestroyed) return;
        this.#isDestroyed = true;
        this.active = false;
        this.#visible = false;
        this.#updateFlag(Object.FLAGS.DESTROYED, true);
        this.#updateFlag(Object.FLAGS.ACTIVE, false);
        this.#updateFlag(Object.FLAGS.VISIBLE, false);
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
        this.#updateFlag(Object.FLAGS.DIRTY, false);
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

    centerOnScreen(viewport = null, camera = null) {
        if (this.#isDestroyed) return this;
        if (viewport) {
            this._position.x = viewport.width / 2;
            this._position.y = viewport.height / 2;
        } else if (this.#is3D) {
            this._position.x = 0;
            this._position.y = 0;
            this._position.z = 0;
        } else {
            this._position.x = 0;
            this._position.y = 0;
        }
        this.#isCentered = true;
        this.__dirty = true;
        this.#updateFlag(Object.FLAGS.DIRTY, true);
        this.emit('centered', { object: this });
        return this;
    }

    isCentered() {
        return this.#isCentered;
    }

    setFlag(flag) {
        this.#flags |= flag;
        return this;
    }

    clearFlag(flag) {
        this.#flags &= ~flag;
        return this;
    }

    toggleFlag(flag) {
        this.#flags ^= flag;
        return this;
    }

    hasFlag(flag) {
        return (this.#flags & flag) !== 0;
    }

    getFlags() {
        return this.#flags;
    }

    setFlags(flags) {
        this.#flags = flags;
        return this;
    }

    #updateFlag(flag, value) {
        if (value) {
            this.#flags |= flag;
        } else {
            this.#flags &= ~flag;
        }
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
            matrixAutoUpdate: this.matrixAutoUpdate,
            isCentered: this.#isCentered,
            isStatic: this.#isStatic,
            isLocked: this.#isLocked,
            isFrozen: this.#isFrozen,
            isSelected: this.#isSelected,
            isFrustumCulled: this.#isFrustumCulled,
            isCastShadow: this.#isCastShadow,
            isReceiveShadow: this.#isReceiveShadow,
            isTransparent: this.#isTransparent,
            flags: this.#flags
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
    get isCentered() { return this.#isCentered; }
    get isStatic() { return this.#isStatic; }
    get isLocked() { return this.#isLocked; }
    get isFrozen() { return this.#isFrozen; }
    get isPaused() { return this.#isPaused; }
    get isSelected() { return this.#isSelected; }
    get isHovered() { return this.#isHovered; }
    get isDragging() { return this.#isDragging; }
    get isColliding() { return this.#isColliding; }
    get isOnGround() { return this.#isOnGround; }
    get isMoving() { return this.#isMoving; }
    get isJumping() { return this.#isJumping; }
    get isFalling() { return this.#isFalling; }
    get isAttacking() { return this.#isAttacking; }
    get isDefending() { return this.#isDefending; }
    get isDead() { return this.#isDead; }
    get isSpawned() { return this.#isSpawned; }
    get isLoaded() { return this.#isLoaded; }
    get isInitialized() { return this.#isInitialized; }
    get isUpdated() { return this.#isUpdated; }
    get isRendered() { return this.#isRendered; }
    get isCulled() { return this.#isCulled; }
    get isFrustumCulled() { return this.#isFrustumCulled; }
    get isLayerVisible() { return this.#isLayerVisible; }
    get isParentVisible() { return this.#isParentVisible; }
    get isChildVisible() { return this.#isChildVisible; }
    get isCastShadow() { return this.#isCastShadow; }
    get isReceiveShadow() { return this.#isReceiveShadow; }
    get isTransparent() { return this.#isTransparent; }
    get isBlending() { return this.#isBlending; }
    get isDepthWrite() { return this.#isDepthWrite; }
    get isDepthTest() { return this.#isDepthTest; }

    get position() { return this._position; }
    get rotation() { return this._rotation; }
    get scale() { return this._scale; }
    get quaternion() { return this._quaternion; }
    get up() { return this._up; }

    set visible(value) {
        if (this.#isDestroyed) return;
        this.#visible = value;
        this.#updateFlag(Object.FLAGS.VISIBLE, value);
        this.__dirty = true;
        this.emit('visibilityChanged', { object: this, visible: value });
    }

    set renderOrder(value) {
        if (this.#isDestroyed) return;
        this.#renderOrder = value;
        this.emit('renderOrderChanged', { object: this, order: value });
    }

    set isCentered(value) {
        this.#isCentered = value;
        if (value) {
            this.centerOnScreen();
        }
    }

    set isStatic(value) {
        this.#isStatic = value;
        this.#updateFlag(Object.FLAGS.STATIC, value);
    }

    set isLocked(value) {
        this.#isLocked = value;
        this.#updateFlag(Object.FLAGS.LOCKED, value);
    }

    set isFrozen(value) {
        this.#isFrozen = value;
        this.#updateFlag(Object.FLAGS.FROZEN, value);
    }

    set isPaused(value) {
        this.#isPaused = value;
        this.#updateFlag(Object.FLAGS.PAUSED, value);
    }

    set isSelected(value) {
        this.#isSelected = value;
        this.#updateFlag(Object.FLAGS.SELECTED, value);
    }

    set isHovered(value) {
        this.#isHovered = value;
        this.#updateFlag(Object.FLAGS.HOVERED, value);
    }

    set isDragging(value) {
        this.#isDragging = value;
        this.#updateFlag(Object.FLAGS.DRAGGING, value);
    }

    set isColliding(value) {
        this.#isColliding = value;
        this.#updateFlag(Object.FLAGS.COLLIDING, value);
    }

    set isOnGround(value) {
        this.#isOnGround = value;
        this.#updateFlag(Object.FLAGS.ON_GROUND, value);
    }

    set isMoving(value) {
        this.#isMoving = value;
        this.#updateFlag(Object.FLAGS.MOVING, value);
    }

    set isJumping(value) {
        this.#isJumping = value;
        this.#updateFlag(Object.FLAGS.JUMPING, value);
    }

    set isFalling(value) {
        this.#isFalling = value;
        this.#updateFlag(Object.FLAGS.FALLING, value);
    }

    set isAttacking(value) {
        this.#isAttacking = value;
        this.#updateFlag(Object.FLAGS.ATTACKING, value);
    }

    set isDefending(value) {
        this.#isDefending = value;
        this.#updateFlag(Object.FLAGS.DEFENDING, value);
    }

    set isDead(value) {
        this.#isDead = value;
        this.#updateFlag(Object.FLAGS.DEAD, value);
    }

    set isSpawned(value) {
        this.#isSpawned = value;
        this.#updateFlag(Object.FLAGS.SPAWNED, value);
    }

    set isLoaded(value) {
        this.#isLoaded = value;
        this.#updateFlag(Object.FLAGS.LOADED, value);
    }

    set isInitialized(value) {
        this.#isInitialized = value;
        this.#updateFlag(Object.FLAGS.INITIALIZED, value);
    }

    set isFrustumCulled(value) {
        this.#isFrustumCulled = value;
        this.#updateFlag(Object.FLAGS.FRUSTUM_CULLED, value);
    }

    set isCastShadow(value) {
        this.#isCastShadow = value;
        this.#updateFlag(Object.FLAGS.CAST_SHADOW, value);
    }

    set isReceiveShadow(value) {
        this.#isReceiveShadow = value;
        this.#updateFlag(Object.FLAGS.RECEIVE_SHADOW, value);
    }

    set isTransparent(value) {
        this.#isTransparent = value;
        this.#updateFlag(Object.FLAGS.TRANSPARENT, value);
    }

    toString() {
        return `Object(name=${this.name}, type=${this.type}, active=${this.active}, visible=${this.#visible}, centered=${this.#isCentered}, flags=${this.#flags}, children=${this.#children.length})`;
    }
}

export default Object;
