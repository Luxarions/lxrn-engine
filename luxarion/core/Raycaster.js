/**
 * Raycaster.js - Advanced raycasting system for LXRN Engine.
 * Integrates with Octree for performance and supports mesh/models.
 * 
 * @module Raycaster
 * @author LXRN
 * @version 2.0.0
 */

import { Vector3 } from '../math/Vector3.js';
import { Vector2 } from '../math/Vector2.js';
import Ray from './Ray.js';
import Intersection from './Intersection.js';
import { Logger } from '../utils/Logger.js';
import Octree from './Octree.js';
import MeshRaycaster from './MeshRaycaster.js';
import ModelRaycaster from './ModelRaycaster.js';

class Raycaster {
    #ray = new Ray();
    #near = 0;
    #far = Infinity;
    #precision = 0.0001;
    #maxIntersections = 100;
    #is3D = true;
    #filter = null;
    #sortByDistance = true;
    #octree = null;
    #meshRaycaster = null;
    #modelRaycaster = null;
    #useOctree = false;
    #useBVH = true;
    
    __cache = new Map();
    __intersections = [];

    constructor(options = {}) {
        this.#near = options.near || 0;
        this.#far = options.far || Infinity;
        this.#precision = options.precision || 0.0001;
        this.#maxIntersections = options.maxIntersections || 100;
        this.#is3D = options.is3D !== undefined ? options.is3D : true;
        this.#sortByDistance = options.sortByDistance !== undefined ? options.sortByDistance : true;
        this.#filter = options.filter || null;
        this.#useOctree = options.useOctree || false;
        this.#useBVH = options.useBVH !== undefined ? options.useBVH : true;
        
        this.#meshRaycaster = new MeshRaycaster({
            precision: this.#precision,
            maxDistance: this.#far
        });
        
        this.#modelRaycaster = new ModelRaycaster({
            precision: this.#precision,
            maxDistance: this.#far
        });
        
        if (options.octreeBounds) {
            this.setOctree(options.octreeBounds, options.octreeOptions);
        }
        
        Logger.log('Raycaster v2 created');
    }

    get ray() { return this.#ray; }
    get near() { return this.#near; }
    get far() { return this.#far; }
    get precision() { return this.#precision; }
    get maxIntersections() { return this.#maxIntersections; }
    get is3D() { return this.#is3D; }
    get sortByDistance() { return this.#sortByDistance; }
    get useOctree() { return this.#useOctree; }
    get useBVH() { return this.#useBVH; }

    set near(value) { this.#near = Math.max(0, value); }
    set far(value) { 
        this.#far = Math.max(this.#near, value);
        this.#meshRaycaster.#maxDistance = value;
        this.#modelRaycaster.#maxDistance = value;
    }
    set precision(value) { 
        this.#precision = Math.max(0, value);
        this.#meshRaycaster.#precision = value;
        this.#modelRaycaster.#precision = value;
    }
    set maxIntersections(value) { this.#maxIntersections = Math.max(1, value); }
    set sortByDistance(value) { this.#sortByDistance = value; }
    set useOctree(value) { this.#useOctree = value; }
    set useBVH(value) { this.#useBVH = value; }

    setOctree(bounds, options = {}) {
        this.#octree = new Octree(bounds, options);
        this.#useOctree = true;
        Logger.log('Octree attached to Raycaster');
    }

    addToOctree(object) {
        if (this.#octree) {
            this.#octree.insert(object);
        }
    }

    addAllToOctree(objects) {
        if (this.#octree) {
            this.#octree.insertAll(objects);
        }
    }

    rebuildOctree() {
        if (this.#octree) {
            const objects = Array.from(this.#octree.#objectMap.values());
            this.#octree.clear();
            this.#octree.insertAll(objects);
        }
    }

    setFromCamera(camera, mouse, width, height) {
        const ndc = new Vector3(
            (mouse.x / width) * 2 - 1,
            -((mouse.y / height) * 2 - 1),
            0
        );
        
        const fov = camera.fov || 60;
        const aspect = width / height;
        const tanFov = Math.tan(fov * 0.5 * Math.PI / 180);
        const dir = new Vector3(
            ndc.x * tanFov * aspect,
            ndc.y * tanFov,
            -1
        );
        dir.normalize();
        
        dir.applyQuaternion(camera.quaternion);
        
        this.#ray.origin.copy(camera.position);
        this.#ray.direction.copy(dir);
    }

    setFromMouse(mouse, width, height) {
        const x = (mouse.x / width) * 2 - 1;
        const y = -((mouse.y / height) * 2 - 1);
        
        this.#ray.origin.set(0, 0, 0);
        this.#ray.direction.set(x, y, -1);
        this.#ray.direction.normalize();
    }

    setRay(origin, direction) {
        this.#ray.origin.copy(origin);
        this.#ray.direction.copy(direction);
        this.#ray.direction.normalize();
    }

    intersectObjects(objects, recursive = false) {
        if (this.#useOctree && this.#octree) {
            return this.#intersectWithOctree(objects, recursive);
        }
        
        if (this.#useBVH) {
            return this.#intersectWithBVH(objects, recursive);
        }
        
        return this.#intersectBruteForce(objects, recursive);
    }

    #intersectWithOctree(objects, recursive) {
        const candidates = this.#octree.queryRay(this.#ray);
        return this.#intersectCandidates(candidates, recursive);
    }

    #intersectWithBVH(objects, recursive) {
        // Use MeshRaycaster for mesh objects
        const meshes = [];
        const models = [];
        
        for (const obj of objects) {
            if (obj.isMesh || obj.geometry) {
                meshes.push(obj);
            } else if (obj.children) {
                models.push(obj);
            }
        }
        
        let results = [];
        
        if (meshes.length > 0) {
            const meshHits = this.#meshRaycaster.intersectMeshGroup(this.#ray, meshes, recursive);
            results.push(...meshHits);
        }
        
        if (models.length > 0) {
            const modelHits = this.#modelRaycaster.intersectModels(this.#ray, models, recursive);
            results.push(...modelHits);
        }
        
        return this.#filterResults(results);
    }

    #intersectBruteForce(objects, recursive) {
        const results = [];
        for (const obj of objects) {
            if (obj.isMesh || obj.geometry) {
                const hits = this.#meshRaycaster.intersectMesh(this.#ray, obj, recursive);
                results.push(...hits);
            } else if (obj.children) {
                const hits = this.#modelRaycaster.intersectModel(this.#ray, obj, recursive);
                results.push(...hits);
            }
        }
        return this.#filterResults(results);
    }

    #intersectCandidates(candidates, recursive) {
        const results = [];
        for (const obj of candidates) {
            if (obj.isMesh || obj.geometry) {
                const hits = this.#meshRaycaster.intersectMesh(this.#ray, obj, recursive);
                results.push(...hits);
            }
        }
        return this.#filterResults(results);
    }

    #filterResults(results) {
        let filtered = results;
        
        if (this.#filter) {
            filtered = results.filter(this.#filter);
        }
        
        if (this.#sortByDistance) {
            filtered.sort((a, b) => a.distance - b.distance);
        }
        
        if (filtered.length > this.#maxIntersections) {
            filtered = filtered.slice(0, this.#maxIntersections);
        }
        
        this.__intersections = filtered;
        return filtered;
    }

    getClosest(objects, recursive = false) {
        const results = this.intersectObjects(objects, recursive);
        return results.length > 0 ? results[0] : null;
    }

    hasHit(objects, recursive = false) {
        return this.getClosest(objects, recursive) !== null;
    }

    getIntersections() {
        return this.__intersections;
    }

    clearCache() {
        this.__cache.clear();
        if (this.#meshRaycaster) this.#meshRaycaster.clearCache();
    }

    setFilter(filter) {
        this.#filter = filter;
    }

    clearFilter() {
        this.#filter = null;
    }

    getOctreeStatistics() {
        if (this.#octree) {
            return this.#octree.getStatistics();
        }
        return null;
    }

    toString() {
        return `Raycaster(near=${this.#near}, far=${this.#far}, maxIntersections=${this.#maxIntersections}, useOctree=${this.#useOctree}, useBVH=${this.#useBVH})`;
    }
}

export default Raycaster;
