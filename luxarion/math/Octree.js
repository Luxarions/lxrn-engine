/**
 * Octree.js - Spatial partitioning system for LXRN Engine.
 * Optimizes raycasting and collision detection for large scenes.
 * 
 * @module Octree
 * @author LXRN
 * @version 1.0.0
 */

import { Vector3 } from '../math/Vector3.js';
import { BoundingBox } from '../core/BoundingBox.js';
import { Logger } from '../utils/Logger.js';

class OctreeNode {
    #bounds = null;
    #objects = [];
    #children = [];
    #isLeaf = true;
    #depth = 0;
    #maxDepth = 8;
    #maxObjects = 10;
    #center = new Vector3();
    #halfSize = new Vector3();

    constructor(bounds, depth = 0, maxDepth = 8, maxObjects = 10) {
        this.#bounds = bounds;
        this.#depth = depth;
        this.#maxDepth = maxDepth;
        this.#maxObjects = maxObjects;
        this.#center.copy(bounds.min).add(bounds.max).multiplyScalar(0.5);
        this.#halfSize.copy(bounds.max).sub(bounds.min).multiplyScalar(0.5);
    }

    get bounds() { return this.#bounds; }
    get objects() { return this.#objects; }
    get children() { return this.#children; }
    get isLeaf() { return this.#isLeaf; }
    get depth() { return this.#depth; }
    get objectCount() { return this.#objects.length; }

    insert(object) {
        if (!this.#intersectsBounds(object)) return false;

        if (this.#isLeaf) {
            this.#objects.push(object);
            if (this.#objects.length > this.#maxObjects && this.#depth < this.#maxDepth) {
                this.#split();
            }
            return true;
        }

        for (const child of this.#children) {
            if (child.insert(object)) return true;
        }

        this.#objects.push(object);
        return true;
    }

    #split() {
        const half = this.#halfSize.clone().multiplyScalar(0.5);
        const center = this.#center.clone();

        const offsets = [
            [-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1],
            [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]
        ];

        for (const offset of offsets) {
            const min = new Vector3(
                center.x + offset[0] * half.x,
                center.y + offset[1] * half.y,
                center.z + offset[2] * half.z
            );
            const max = new Vector3(
                center.x + (offset[0] + 1) * half.x,
                center.y + (offset[1] + 1) * half.y,
                center.z + (offset[2] + 1) * half.z
            );
            const childBounds = new BoundingBox(min, max);
            const child = new OctreeNode(
                childBounds,
                this.#depth + 1,
                this.#maxDepth,
                this.#maxObjects
            );
            this.#children.push(child);
        }

        this.#isLeaf = false;

        const objects = this.#objects;
        this.#objects = [];

        for (const obj of objects) {
            for (const child of this.#children) {
                if (child.insert(obj)) break;
            }
        }
    }

    #intersectsBounds(object) {
        const bounds = object.boundingBox || object.getBoundingBox?.();
        if (!bounds) return true;

        return bounds.intersectsBox(this.#bounds);
    }

    query(ray, results = []) {
        if (!this.#bounds.intersectRay(ray)) return results;

        for (const object of this.#objects) {
            const bounds = object.boundingBox || object.getBoundingBox?.();
            if (!bounds || bounds.intersectRay(ray) !== null) {
                results.push(object);
            }
        }

        for (const child of this.#children) {
            child.query(ray, results);
        }

        return results;
    }

    querySphere(sphere, results = []) {
        if (!this.#bounds.intersectsSphere(sphere)) return results;

        for (const object of this.#objects) {
            const bounds = object.boundingBox || object.getBoundingBox?.();
            if (!bounds || bounds.intersectsSphere(sphere)) {
                results.push(object);
            }
        }

        for (const child of this.#children) {
            child.querySphere(sphere, results);
        }

        return results;
    }

    queryBox(box, results = []) {
        if (!this.#bounds.intersectsBox(box)) return results;

        for (const object of this.#objects) {
            const bounds = object.boundingBox || object.getBoundingBox?.();
            if (!bounds || bounds.intersectsBox(box)) {
                results.push(object);
            }
        }

        for (const child of this.#children) {
            child.queryBox(box, results);
        }

        return results;
    }

    clear() {
        this.#objects = [];
        for (const child of this.#children) {
            child.clear();
        }
        this.#children = [];
        this.#isLeaf = true;
    }

    getStatistics() {
        let stats = {
            nodes: 1,
            leafNodes: this.#isLeaf ? 1 : 0,
            objects: this.#objects.length,
            depth: this.#depth
        };

        for (const child of this.#children) {
            const childStats = child.getStatistics();
            stats.nodes += childStats.nodes;
            stats.leafNodes += childStats.leafNodes;
            stats.objects += childStats.objects;
        }

        return stats;
    }

    toString() {
        const stats = this.getStatistics();
        return `OctreeNode(depth=${this.#depth}, objects=${this.#objects.length}, children=${this.#children.length}, nodes=${stats.nodes})`;
    }
}

class Octree {
    #root = null;
    #bounds = null;
    #objectMap = new Map();
    #maxDepth = 8;
    #maxObjects = 10;
    #isDestroyed = false;

    constructor(bounds, options = {}) {
        this.#bounds = bounds;
        this.#maxDepth = options.maxDepth || 8;
        this.#maxObjects = options.maxObjects || 10;
        this.#root = new OctreeNode(
            bounds,
            0,
            this.#maxDepth,
            this.#maxObjects
        );
        Logger.log(`Octree created with bounds ${bounds.toString()}`);
    }

    get bounds() { return this.#bounds; }
    get root() { return this.#root; }
    get objectCount() { return this.#objectMap.size; }

    insert(object) {
        if (this.#isDestroyed) return false;

        const id = object.id || object.uuid;
        if (this.#objectMap.has(id)) {
            this.remove(object);
        }

        const result = this.#root.insert(object);
        if (result) {
            this.#objectMap.set(id, object);
        }
        return result;
    }

    insertAll(objects) {
        let count = 0;
        for (const object of objects) {
            if (this.insert(object)) count++;
        }
        return count;
    }

    remove(object) {
        const id = object.id || object.uuid;
        if (!this.#objectMap.has(id)) return false;

        this.#objectMap.delete(id);
        this.#rebuild();
        return true;
    }

    #rebuild() {
        const objects = Array.from(this.#objectMap.values());
        this.#root = new OctreeNode(
            this.#bounds,
            0,
            this.#maxDepth,
            this.#maxObjects
        );
        for (const object of objects) {
            this.#root.insert(object);
        }
    }

    queryRay(ray) {
        if (this.#isDestroyed) return [];
        return this.#root.query(ray);
    }

    querySphere(sphere) {
        if (this.#isDestroyed) return [];
        return this.#root.querySphere(sphere);
    }

    queryBox(box) {
        if (this.#isDestroyed) return [];
        return this.#root.queryBox(box);
    }

    queryPoint(point, radius = 0) {
        if (this.#isDestroyed) return [];
        const sphere = { center: point, radius };
        return this.#root.querySphere(sphere);
    }

    queryAABB(box) {
        if (this.#isDestroyed) return [];
        return this.#root.queryBox(box);
    }

    getStatistics() {
        if (this.#isDestroyed) return null;
        return this.#root.getStatistics();
    }

    clear() {
        if (this.#isDestroyed) return;
        this.#root.clear();
        this.#objectMap.clear();
    }

    destroy() {
        if (this.#isDestroyed) return;
        this.#isDestroyed = true;
        this.clear();
        this.#root = null;
        this.#bounds = null;
        Logger.log('Octree destroyed');
    }

    toString() {
        const stats = this.getStatistics();
        return `Octree(objects=${this.#objectMap.size}, nodes=${stats?.nodes || 0}, leafNodes=${stats?.leafNodes || 0})`;
    }
}

export { Octree, OctreeNode };
export default Octree;
