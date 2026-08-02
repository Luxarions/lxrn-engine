/**
 * Camera.js - Base camera class for LXRN Engine.
 * Provides view and projection matrix management.
 * Supports frustum culling, layers, and post-processing.
 * Includes comprehensive flags and boolean state management.
 * 
 * @module Camera
 * @author LXRN
 * @version 2.0.0
 */

import Object from './Object.js';
import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Frustum } from '../math/Frustum.js';
import { Logger } from '../utils/Logger.js';

class Camera extends Object {
    #viewMatrix = new Matrix4();
    #projectionMatrix = new Matrix4();
    #projectionMatrixInverse = new Matrix4();
    #frustum = null;
    #isDirty = true;
    #viewport = { x: 0, y: 0, width: 800, height: 600 };
    #aspect = 1;
    #near = 0.1;
    #far = 1000;
    #zoom = 1;
    #isOrthographic = false;
    #isPerspective = false;
    #layers = 1;
    #cullingEnabled = true;
    #postProcessing = null;
    #depthOfField = null;
    #motionBlur = null;
    #vignette = null;
    #clearColor = '#000000';
    #clearDepth = 1;
    #renderOrder = 0;
    #isMain = false;
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
    #isMoving = false;
    
    // Render flags
    #isOrtho = false;
    #isPersp = false;
    #isCullingEnabled = true;
    #isLayerCullingEnabled = true;
    #isFrustumCullingEnabled = true;
    #isPostProcessingEnabled = false;
    #isDepthOfFieldEnabled = false;
    #isMotionBlurEnabled = false;
    #isVignetteEnabled = false;
    #isClearEnabled = true;
    #isClearDepthEnabled = true;
    #isRenderEnabled = true;
    #isUpdateEnabled = true;
    #isAutoUpdate = true;
    #isDirtyFlag = true;
    #isStatic = false;
    
    // Lifecycle flags
    #isSpawned = false;
    #isLoaded = false;
    #isInitialized = false;
    #isUpdated = false;
    #isRendered = false;
    #isCulled = false;

    static FLAGS = {
        ACTIVE: 1 << 0,
        VISIBLE: 1 << 1,
        STATIC: 1 << 2,
        DIRTY: 1 << 3,
        DESTROYED: 1 << 4,
        LOCKED: 1 << 5,
        FROZEN: 1 << 6,
        PAUSED: 1 << 7,
        SELECTED: 1 << 8,
        HOVERED: 1 << 9,
        DRAGGING: 1 << 10,
        MOVING: 1 << 11,
        CENTERED: 1 << 12,
        ORTHOGRAPHIC: 1 << 13,
        PERSPECTIVE: 1 << 14,
        CULLING_ENABLED: 1 << 15,
        LAYER_CULLING_ENABLED: 1 << 16,
        FRUSTUM_CULLING_ENABLED: 1 << 17,
        POST_PROCESSING_ENABLED: 1 << 18,
        DEPTH_OF_FIELD_ENABLED: 1 << 19,
        MOTION_BLUR_ENABLED: 1 << 20,
        VIGNETTE_ENABLED: 1 << 21,
        CLEAR_ENABLED: 1 << 22,
        CLEAR_DEPTH_ENABLED: 1 << 23,
        RENDER_ENABLED: 1 << 24,
        UPDATE_ENABLED: 1 << 25,
        AUTO_UPDATE: 1 << 26,
        SPAWNED: 1 << 27,
        LOADED: 1 << 28,
        INITIALIZED: 1 << 29,
        UPDATED: 1 << 30,
        RENDERED: 1 << 31,
        CULLED: 1 << 32,
        MAIN: 1 << 33
    };

    constructor(options = {}) {
        super({
            name: options.name || 'Camera',
            type: 'Camera',
            is3D: true,
            position: options.position || { x: 0, y: 0, z: 10 },
            rotation: options.rotation || { x: 0, y: 0, z: 0 }
        });

        this.#aspect = options.aspect || 1;
        this.#near = options.near || 0.1;
        this.#far = options.far || 1000;
        this.#zoom = options.zoom || 1;
        this.#layers = options.layers || 1;
        this.#cullingEnabled = options.cullingEnabled !== undefined ? options.cullingEnabled : true;
        this.#clearColor = options.clearColor || '#000000';
        this.#renderOrder = options.renderOrder || 0;
        this.#isMain = options.isMain || false;

        if (options.flags !== undefined) {
            this.#flags = options.flags;
        }
        
        if (options.isCentered !== undefined) {
            this.#isCentered = options.isCentered;
            this.#updateFlag(Camera.FLAGS.CENTERED, this.#isCentered);
        }
        
        if (options.isStatic !== undefined) {
            this.#isStatic = options.isStatic;
            this.#updateFlag(Camera.FLAGS.STATIC, this.#isStatic);
        }
        
        if (options.isLocked !== undefined) {
            this.#isLocked = options.isLocked;
            this.#updateFlag(Camera.FLAGS.LOCKED, this.#isLocked);
        }
        
        if (options.isFrozen !== undefined) {
            this.#isFrozen = options.isFrozen;
            this.#updateFlag(Camera.FLAGS.FROZEN, this.#isFrozen);
        }
        
        if (options.isPaused !== undefined) {
            this.#isPaused = options.isPaused;
            this.#updateFlag(Camera.FLAGS.PAUSED, this.#isPaused);
        }
        
        if (options.isSelected !== undefined) {
            this.#isSelected = options.isSelected;
            this.#updateFlag(Camera.FLAGS.SELECTED, this.#isSelected);
        }
        
        if (options.isHovered !== undefined) {
            this.#isHovered = options.isHovered;
            this.#updateFlag(Camera.FLAGS.HOVERED, this.#isHovered);
        }
        
        if (options.isDragging !== undefined) {
            this.#isDragging = options.isDragging;
            this.#updateFlag(Camera.FLAGS.DRAGGING, this.#isDragging);
        }
        
        if (options.isMoving !== undefined) {
            this.#isMoving = options.isMoving;
            this.#updateFlag(Camera.FLAGS.MOVING, this.#isMoving);
        }
        
        if (options.isCullingEnabled !== undefined) {
            this.#isCullingEnabled = options.isCullingEnabled;
            this.#updateFlag(Camera.FLAGS.CULLING_ENABLED, this.#isCullingEnabled);
        }
        
        if (options.isLayerCullingEnabled !== undefined) {
            this.#isLayerCullingEnabled = options.isLayerCullingEnabled;
            this.#updateFlag(Camera.FLAGS.LAYER_CULLING_ENABLED, this.#isLayerCullingEnabled);
        }
        
        if (options.isFrustumCullingEnabled !== undefined) {
            this.#isFrustumCullingEnabled = options.isFrustumCullingEnabled;
            this.#updateFlag(Camera.FLAGS.FRUSTUM_CULLING_ENABLED, this.#isFrustumCullingEnabled);
        }
        
        if (options.isPostProcessingEnabled !== undefined) {
            this.#isPostProcessingEnabled = options.isPostProcessingEnabled;
            this.#updateFlag(Camera.FLAGS.POST_PROCESSING_ENABLED, this.#isPostProcessingEnabled);
        }
        
        if (options.isDepthOfFieldEnabled !== undefined) {
            this.#isDepthOfFieldEnabled = options.isDepthOfFieldEnabled;
            this.#updateFlag(Camera.FLAGS.DEPTH_OF_FIELD_ENABLED, this.#isDepthOfFieldEnabled);
        }
        
        if (options.isMotionBlurEnabled !== undefined) {
            this.#isMotionBlurEnabled = options.isMotionBlurEnabled;
            this.#updateFlag(Camera.FLAGS.MOTION_BLUR_ENABLED, this.#isMotionBlurEnabled);
        }
        
        if (options.isVignetteEnabled !== undefined) {
            this.#isVignetteEnabled = options.isVignetteEnabled;
            this.#updateFlag(Camera.FLAGS.VIGNETTE_ENABLED, this.#isVignetteEnabled);
        }
        
        if (options.isClearEnabled !== undefined) {
            this.#isClearEnabled = options.isClearEnabled;
            this.#updateFlag(Camera.FLAGS.CLEAR_ENABLED, this.#isClearEnabled);
        }
        
        if (options.isClearDepthEnabled !== undefined) {
            this.#isClearDepthEnabled = options.isClearDepthEnabled;
            this.#updateFlag(Camera.FLAGS.CLEAR_DEPTH_ENABLED, this.#isClearDepthEnabled);
        }
        
        if (options.isRenderEnabled !== undefined) {
            this.#isRenderEnabled = options.isRenderEnabled;
            this.#updateFlag(Camera.FLAGS.RENDER_ENABLED, this.#isRenderEnabled);
        }
        
        if (options.isUpdateEnabled !== undefined) {
            this.#isUpdateEnabled = options.isUpdateEnabled;
            this.#updateFlag(Camera.FLAGS.UPDATE_ENABLED, this.#isUpdateEnabled);
        }
        
        if (options.isAutoUpdate !== undefined) {
            this.#isAutoUpdate = options.isAutoUpdate;
            this.#updateFlag(Camera.FLAGS.AUTO_UPDATE, this.#isAutoUpdate);
        }
        
        if (options.isDirty !== undefined) {
            this.#isDirtyFlag = options.isDirty;
            this.#updateFlag(Camera.FLAGS.DIRTY, this.#isDirtyFlag);
        }
        
        if (options.isSpawned !== undefined) {
            this.#isSpawned = options.isSpawned;
            this.#updateFlag(Camera.FLAGS.SPAWNED, this.#isSpawned);
        }
        
        if (options.isLoaded !== undefined) {
            this.#isLoaded = options.isLoaded;
            this.#updateFlag(Camera.FLAGS.LOADED, this.#isLoaded);
        }
        
        if (options.isInitialized !== undefined) {
            this.#isInitialized = options.isInitialized;
            this.#updateFlag(Camera.FLAGS.INITIALIZED, this.#isInitialized);
        }
        
        if (options.isMain !== undefined) {
            this.#isMain = options.isMain;
            this.#updateFlag(Camera.FLAGS.MAIN, this.#isMain);
        }

        if (options.viewport) {
            this.#viewport = { ...this.#viewport, ...options.viewport };
        }

        if (options.postProcessing) {
            this.#postProcessing = options.postProcessing;
        }

        this.#updateFlag(Camera.FLAGS.ACTIVE, this.active);
        this.#updateFlag(Camera.FLAGS.VISIBLE, this.visible);
        this.#updateFlag(Camera.FLAGS.DIRTY, true);

        this.#updateFrustum();
        Logger.log(`Camera created: ${this.name}`);
    }

    get viewMatrix() { return this.#viewMatrix; }
    get projectionMatrix() { return this.#projectionMatrix; }
    get projectionMatrixInverse() { return this.#projectionMatrixInverse; }
    get viewport() { return this.#viewport; }
    get aspect() { return this.#aspect; }
    get near() { return this.#near; }
    get far() { return this.#far; }
    get zoom() { return this.#zoom; }
    get isOrthographic() { return this.#isOrthographic; }
    get isPerspective() { return this.#isPerspective; }
    get layers() { return this.#layers; }
    get cullingEnabled() { return this.#cullingEnabled; }
    get postProcessing() { return this.#postProcessing; }
    get depthOfField() { return this.#depthOfField; }
    get motionBlur() { return this.#motionBlur; }
    get vignette() { return this.#vignette; }
    get clearColor() { return this.#clearColor; }
    get clearDepth() { return this.#clearDepth; }
    get renderOrder() { return this.#renderOrder; }
    get isMain() { return this.#isMain; }
    get frustum() { return this.#frustum; }
    get isCentered() { return this.#isCentered; }
    get isLocked() { return this.#isLocked; }
    get isFrozen() { return this.#isFrozen; }
    get isPaused() { return this.#isPaused; }
    get isSelected() { return this.#isSelected; }
    get isHovered() { return this.#isHovered; }
    get isDragging() { return this.#isDragging; }
    get isMoving() { return this.#isMoving; }
    get isCullingEnabled() { return this.#isCullingEnabled; }
    get isLayerCullingEnabled() { return this.#isLayerCullingEnabled; }
    get isFrustumCullingEnabled() { return this.#isFrustumCullingEnabled; }
    get isPostProcessingEnabled() { return this.#isPostProcessingEnabled; }
    get isDepthOfFieldEnabled() { return this.#isDepthOfFieldEnabled; }
    get isMotionBlurEnabled() { return this.#isMotionBlurEnabled; }
    get isVignetteEnabled() { return this.#isVignetteEnabled; }
    get isClearEnabled() { return this.#isClearEnabled; }
    get isClearDepthEnabled() { return this.#isClearDepthEnabled; }
    get isRenderEnabled() { return this.#isRenderEnabled; }
    get isUpdateEnabled() { return this.#isUpdateEnabled; }
    get isAutoUpdate() { return this.#isAutoUpdate; }
    get isDirtyFlag() { return this.#isDirtyFlag; }
    get isStatic() { return this.#isStatic; }
    get isSpawned() { return this.#isSpawned; }
    get isLoaded() { return this.#isLoaded; }
    get isInitialized() { return this.#isInitialized; }
    get isUpdated() { return this.#isUpdated; }
    get isRendered() { return this.#isRendered; }
    get isCulled() { return this.#isCulled; }

    set viewport(value) {
        this.#viewport = { ...this.#viewport, ...value };
        this.#aspect = this.#viewport.width / this.#viewport.height;
        this.#isDirty = true;
        this.#updateFlag(Camera.FLAGS.DIRTY, true);
    }

    set aspect(value) {
        this.#aspect = value;
        this.#isDirty = true;
        this.#updateFlag(Camera.FLAGS.DIRTY, true);
    }

    set near(value) {
        this.#near = Math.max(0, value);
        this.#isDirty = true;
        this.#updateFlag(Camera.FLAGS.DIRTY, true);
    }

    set far(value) {
        this.#far = Math.max(this.#near, value);
        this.#isDirty = true;
        this.#updateFlag(Camera.FLAGS.DIRTY, true);
    }

    set zoom(value) {
        this.#zoom = Math.max(0.01, value);
        this.#isDirty = true;
        this.#updateFlag(Camera.FLAGS.DIRTY, true);
    }

    set layers(value) {
        this.#layers = value;
    }

    set cullingEnabled(value) {
        this.#cullingEnabled = value;
        this.#isCullingEnabled = value;
        this.#updateFlag(Camera.FLAGS.CULLING_ENABLED, value);
    }

    set postProcessing(value) {
        this.#postProcessing = value;
        if (value) {
            this.#isPostProcessingEnabled = true;
            this.#updateFlag(Camera.FLAGS.POST_PROCESSING_ENABLED, true);
        }
    }

    set depthOfField(value) {
        this.#depthOfField = value;
        if (value) {
            this.#isDepthOfFieldEnabled = true;
            this.#updateFlag(Camera.FLAGS.DEPTH_OF_FIELD_ENABLED, true);
        }
    }

    set motionBlur(value) {
        this.#motionBlur = value;
        if (value) {
            this.#isMotionBlurEnabled = true;
            this.#updateFlag(Camera.FLAGS.MOTION_BLUR_ENABLED, true);
        }
    }

    set vignette(value) {
        this.#vignette = value;
        if (value) {
            this.#isVignetteEnabled = true;
            this.#updateFlag(Camera.FLAGS.VIGNETTE_ENABLED, true);
        }
    }

    set clearColor(value) {
        this.#clearColor = value;
    }

    set clearDepth(value) {
        this.#clearDepth = Math.max(0, Math.min(1, value));
    }

    set renderOrder(value) {
        this.#renderOrder = value;
    }

    set isMain(value) {
        this.#isMain = value;
        this.#updateFlag(Camera.FLAGS.MAIN, value);
    }

    set isCentered(value) {
        this.#isCentered = value;
        this.#updateFlag(Camera.FLAGS.CENTERED, value);
        if (value) {
            this.centerOnScreen();
        }
    }

    set isLocked(value) {
        this.#isLocked = value;
        this.#updateFlag(Camera.FLAGS.LOCKED, value);
    }

    set isFrozen(value) {
        this.#isFrozen = value;
        this.#updateFlag(Camera.FLAGS.FROZEN, value);
    }

    set isPaused(value) {
        this.#isPaused = value;
        this.#updateFlag(Camera.FLAGS.PAUSED, value);
    }

    set isSelected(value) {
        this.#isSelected = value;
        this.#updateFlag(Camera.FLAGS.SELECTED, value);
    }

    set isHovered(value) {
        this.#isHovered = value;
        this.#updateFlag(Camera.FLAGS.HOVERED, value);
    }

    set isDragging(value) {
        this.#isDragging = value;
        this.#updateFlag(Camera.FLAGS.DRAGGING, value);
    }

    set isMoving(value) {
        this.#isMoving = value;
        this.#updateFlag(Camera.FLAGS.MOVING, value);
    }

    set isCullingEnabled(value) {
        this.#isCullingEnabled = value;
        this.#updateFlag(Camera.FLAGS.CULLING_ENABLED, value);
    }

    set isLayerCullingEnabled(value) {
        this.#isLayerCullingEnabled = value;
        this.#updateFlag(Camera.FLAGS.LAYER_CULLING_ENABLED, value);
    }

    set isFrustumCullingEnabled(value) {
        this.#isFrustumCullingEnabled = value;
        this.#updateFlag(Camera.FLAGS.FRUSTUM_CULLING_ENABLED, value);
    }

    set isPostProcessingEnabled(value) {
        this.#isPostProcessingEnabled = value;
        this.#updateFlag(Camera.FLAGS.POST_PROCESSING_ENABLED, value);
    }

    set isDepthOfFieldEnabled(value) {
        this.#isDepthOfFieldEnabled = value;
        this.#updateFlag(Camera.FLAGS.DEPTH_OF_FIELD_ENABLED, value);
    }

    set isMotionBlurEnabled(value) {
        this.#isMotionBlurEnabled = value;
        this.#updateFlag(Camera.FLAGS.MOTION_BLUR_ENABLED, value);
    }

    set isVignetteEnabled(value) {
        this.#isVignetteEnabled = value;
        this.#updateFlag(Camera.FLAGS.VIGNETTE_ENABLED, value);
    }

    set isClearEnabled(value) {
        this.#isClearEnabled = value;
        this.#updateFlag(Camera.FLAGS.CLEAR_ENABLED, value);
    }

    set isClearDepthEnabled(value) {
        this.#isClearDepthEnabled = value;
        this.#updateFlag(Camera.FLAGS.CLEAR_DEPTH_ENABLED, value);
    }

    set isRenderEnabled(value) {
        this.#isRenderEnabled = value;
        this.#updateFlag(Camera.FLAGS.RENDER_ENABLED, value);
    }

    set isUpdateEnabled(value) {
        this.#isUpdateEnabled = value;
        this.#updateFlag(Camera.FLAGS.UPDATE_ENABLED, value);
    }

    set isAutoUpdate(value) {
        this.#isAutoUpdate = value;
        this.#updateFlag(Camera.FLAGS.AUTO_UPDATE, value);
    }

    set isStatic(value) {
        this.#isStatic = value;
        this.#updateFlag(Camera.FLAGS.STATIC, value);
    }

    updateMatrix() {
        super.updateMatrix();
        this.#isDirty = true;
        this.#updateFlag(Camera.FLAGS.DIRTY, true);
    }

    updateProjectionMatrix() {
        this.#isDirty = false;
        this.#updateFlag(Camera.FLAGS.DIRTY, false);
    }

    updateViewMatrix() {
        this.#isDirty = false;
        this.#updateFlag(Camera.FLAGS.DIRTY, false);
    }

    update() {
        if (!this.#isUpdateEnabled) return;
        this.updateViewMatrix();
        this.updateProjectionMatrix();
        this.#updateFrustum();
        this.#isDirty = false;
        this.#updateFlag(Camera.FLAGS.DIRTY, false);
        this.#updateFlag(Camera.FLAGS.UPDATED, true);
    }

    #updateFrustum() {
        if (!this.#cullingEnabled || !this.#isFrustumCullingEnabled) return;
        const mvp = new Matrix4();
        mvp.multiplyMatrices(this.#projectionMatrix, this.#viewMatrix);
        this.#frustum = new Frustum(mvp);
    }

    centerOnScreen(viewport = null) {
        if (viewport) {
            this.#viewport = { ...this.#viewport, ...viewport };
        }
        this.position.x = this.#viewport.width / 2;
        this.position.y = this.#viewport.height / 2;
        this.position.z = 0;
        this.#isCentered = true;
        this.#updateFlag(Camera.FLAGS.CENTERED, true);
        this.#updateFlag(Camera.FLAGS.DIRTY, true);
        this.emit('centered', { camera: this });
        return this;
    }

    lookAt(target) {
        super.lookAt(target);
        this.#isDirty = true;
        this.#updateFlag(Camera.FLAGS.DIRTY, true);
        return this;
    }

    getWorldPosition() {
        return this.position;
    }

    getWorldDirection(target = null) {
        const dir = target || new Vector3(0, 0, -1);
        const quat = this.quaternion;
        dir.applyQuaternion(quat);
        return dir;
    }

    isDirty() {
        return this.#isDirty;
    }

    isObjectVisible(object) {
        if (!this.#cullingEnabled) return true;
        if (!this.#isFrustumCullingEnabled) return true;
        if (!this.#frustum) return true;
        if (!object) return true;

        if (this.#isLayerCullingEnabled && object.layers) {
            if ((this.#layers & object.layers) === 0) return false;
        }

        const bounds = object.boundingBox || object.getBoundingBox?.();
        if (bounds) {
            return this.#frustum.intersectsBox(bounds);
        }

        const sphere = object.boundingSphere || object.getBoundingSphere?.();
        if (sphere) {
            return this.#frustum.intersectsSphere(sphere);
        }

        return true;
    }

    isPointVisible(point) {
        if (!this.#cullingEnabled) return true;
        if (!this.#isFrustumCullingEnabled) return true;
        if (!this.#frustum) return true;
        return this.#frustum.containsPoint(point);
    }

    isSphereVisible(sphere) {
        if (!this.#cullingEnabled) return true;
        if (!this.#isFrustumCullingEnabled) return true;
        if (!this.#frustum) return true;
        return this.#frustum.intersectsSphere(sphere);
    }

    isBoxVisible(box) {
        if (!this.#cullingEnabled) return true;
        if (!this.#isFrustumCullingEnabled) return true;
        if (!this.#frustum) return true;
        return this.#frustum.intersectsBox(box);
    }

    addLayer(layer) {
        this.#layers |= (1 << layer);
        return this;
    }

    removeLayer(layer) {
        this.#layers &= ~(1 << layer);
        return this;
    }

    toggleLayer(layer) {
        this.#layers ^= (1 << layer);
        return this;
    }

    isOnLayer(layer) {
        return (this.#layers & (1 << layer)) !== 0;
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

    setPostProcessing(pp) {
        this.#postProcessing = pp;
        this.#isPostProcessingEnabled = true;
        this.#updateFlag(Camera.FLAGS.POST_PROCESSING_ENABLED, true);
        return this;
    }

    setDepthOfField(focusDistance, aperture) {
        this.#depthOfField = { focusDistance, aperture };
        this.#isDepthOfFieldEnabled = true;
        this.#updateFlag(Camera.FLAGS.DEPTH_OF_FIELD_ENABLED, true);
        return this;
    }

    setMotionBlur(intensity) {
        this.#motionBlur = { intensity };
        this.#isMotionBlurEnabled = true;
        this.#updateFlag(Camera.FLAGS.MOTION_BLUR_ENABLED, true);
        return this;
    }

    setVignette(intensity, radius) {
        this.#vignette = { intensity, radius };
        this.#isVignetteEnabled = true;
        this.#updateFlag(Camera.FLAGS.VIGNETTE_ENABLED, true);
        return this;
    }

    enablePostProcessing() {
        this.#isPostProcessingEnabled = true;
        this.#updateFlag(Camera.FLAGS.POST_PROCESSING_ENABLED, true);
    }

    disablePostProcessing() {
        this.#isPostProcessingEnabled = false;
        this.#updateFlag(Camera.FLAGS.POST_PROCESSING_ENABLED, false);
    }

    enableDepthOfField() {
        this.#isDepthOfFieldEnabled = true;
        this.#updateFlag(Camera.FLAGS.DEPTH_OF_FIELD_ENABLED, true);
    }

    disableDepthOfField() {
        this.#isDepthOfFieldEnabled = false;
        this.#updateFlag(Camera.FLAGS.DEPTH_OF_FIELD_ENABLED, false);
    }

    enableMotionBlur() {
        this.#isMotionBlurEnabled = true;
        this.#updateFlag(Camera.FLAGS.MOTION_BLUR_ENABLED, true);
    }

    disableMotionBlur() {
        this.#isMotionBlurEnabled = false;
        this.#updateFlag(Camera.FLAGS.MOTION_BLUR_ENABLED, false);
    }

    enableVignette() {
        this.#isVignetteEnabled = true;
        this.#updateFlag(Camera.FLAGS.VIGNETTE_ENABLED, true);
    }

    disableVignette() {
        this.#isVignetteEnabled = false;
        this.#updateFlag(Camera.FLAGS.VIGNETTE_ENABLED, false);
    }

    enableCulling() {
        this.#cullingEnabled = true;
        this.#isCullingEnabled = true;
        this.#updateFlag(Camera.FLAGS.CULLING_ENABLED, true);
    }

    disableCulling() {
        this.#cullingEnabled = false;
        this.#isCullingEnabled = false;
        this.#updateFlag(Camera.FLAGS.CULLING_ENABLED, false);
    }

    enableFrustumCulling() {
        this.#isFrustumCullingEnabled = true;
        this.#updateFlag(Camera.FLAGS.FRUSTUM_CULLING_ENABLED, true);
    }

    disableFrustumCulling() {
        this.#isFrustumCullingEnabled = false;
        this.#updateFlag(Camera.FLAGS.FRUSTUM_CULLING_ENABLED, false);
    }

    enableLayerCulling() {
        this.#isLayerCullingEnabled = true;
        this.#updateFlag(Camera.FLAGS.LAYER_CULLING_ENABLED, true);
    }

    disableLayerCulling() {
        this.#isLayerCullingEnabled = false;
        this.#updateFlag(Camera.FLAGS.LAYER_CULLING_ENABLED, false);
    }

    clone() {
        const clone = new Camera({
            name: `${this.name}_clone`,
            position: this.position.clone(),
            rotation: this.rotation.clone(),
            aspect: this.#aspect,
            near: this.#near,
            far: this.#far,
            zoom: this.#zoom,
            layers: this.#layers,
            cullingEnabled: this.#cullingEnabled,
            clearColor: this.#clearColor,
            renderOrder: this.#renderOrder,
            isMain: this.#isMain,
            viewport: { ...this.#viewport },
            isCentered: this.#isCentered,
            isStatic: this.#isStatic,
            isLocked: this.#isLocked,
            isFrozen: this.#isFrozen,
            isPaused: this.#isPaused,
            isSelected: this.#isSelected,
            isHovered: this.#isHovered,
            isDragging: this.#isDragging,
            isMoving: this.#isMoving,
            isCullingEnabled: this.#isCullingEnabled,
            isLayerCullingEnabled: this.#isLayerCullingEnabled,
            isFrustumCullingEnabled: this.#isFrustumCullingEnabled,
            isPostProcessingEnabled: this.#isPostProcessingEnabled,
            isDepthOfFieldEnabled: this.#isDepthOfFieldEnabled,
            isMotionBlurEnabled: this.#isMotionBlurEnabled,
            isVignetteEnabled: this.#isVignetteEnabled,
            isClearEnabled: this.#isClearEnabled,
            isClearDepthEnabled: this.#isClearDepthEnabled,
            isRenderEnabled: this.#isRenderEnabled,
            isUpdateEnabled: this.#isUpdateEnabled,
            isAutoUpdate: this.#isAutoUpdate,
            isSpawned: this.#isSpawned,
            isLoaded: this.#isLoaded,
            isInitialized: this.#isInitialized,
            flags: this.#flags
        });
        return clone;
    }

    toString() {
        return `Camera(name=${this.name}, type=${this.constructor.name}, near=${this.#near}, far=${this.#far}, layers=${this.#layers}, culling=${this.#cullingEnabled}, centered=${this.#isCentered}, flags=${this.#flags})`;
    }
}

export default Camera;
