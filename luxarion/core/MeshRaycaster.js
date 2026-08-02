/**
 * MeshRaycaster.js - Advanced mesh raycasting for LXRN Engine.
 * Supports complex mesh intersection with acceleration structures.
 * 
 * @module MeshRaycaster
 * @author LXRN
 * @version 1.0.0
 */

import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';
import Intersection from './Intersection.js';
import { Logger } from '../utils/Logger.js';

class MeshRaycaster {
    #precision = 0.0001;
    #maxDistance = Infinity;
    #bvhCache = new Map();
    #triangleCache = new Map();

    constructor(options = {}) {
        this.#precision = options.precision || 0.0001;
        this.#maxDistance = options.maxDistance || Infinity;
        Logger.log('MeshRaycaster created');
    }

    intersectMesh(ray, mesh, recursive = false) {
        if (!mesh || !mesh.geometry) return [];

        const results = [];
        this.#intersectMeshRecursive(ray, mesh, results, recursive);
        return results.sort((a, b) => a.distance - b.distance);
    }

    #intersectMeshRecursive(ray, mesh, results, recursive) {
        if (!mesh.visible) return;

        if (mesh.geometry) {
            const intersections = this.#testMesh(ray, mesh);
            results.push(...intersections);
        }

        if (recursive && mesh.children) {
            for (const child of mesh.children) {
                this.#intersectMeshRecursive(ray, child, results, recursive);
            }
        }
    }

    #testMesh(ray, mesh) {
        const geometry = mesh.geometry;
        if (!geometry) return [];

        const inverseMatrix = new Matrix4();
        inverseMatrix.copy(mesh.matrixWorld);
        inverseMatrix.invert();

        const localOrigin = ray.origin.clone().applyMatrix4(inverseMatrix);
        const localDirection = ray.direction.clone().applyMatrix4(inverseMatrix).normalize();
        const localRay = { origin: localOrigin, direction: localDirection };

        const results = [];

        if (geometry.index) {
            const position = geometry.attributes.position;
            const index = geometry.index;

            for (let i = 0; i < index.count; i += 3) {
                const i1 = index.getX(i);
                const i2 = index.getX(i + 1);
                const i3 = index.getX(i + 2);

                const a = new Vector3(position.getX(i1), position.getY(i1), position.getZ(i1));
                const b = new Vector3(position.getX(i2), position.getY(i2), position.getZ(i2));
                const c = new Vector3(position.getX(i3), position.getY(i3), position.getZ(i3));

                const result = this.#intersectTriangle(localRay, a, b, c);
                if (result) {
                    const worldPoint = result.point.clone().applyMatrix4(mesh.matrixWorld);
                    const distance = ray.origin.distanceTo(worldPoint);

                    if (distance <= this.#maxDistance) {
                        const intersection = new Intersection();
                        intersection.object = mesh;
                        intersection.point = worldPoint;
                        intersection.distance = distance;
                        intersection.face = { a, b, c };
                        intersection.faceIndex = i / 3;
                        intersection.normal = result.normal.clone().applyMatrix4(mesh.matrixWorld).normalize();

                        results.push(intersection);
                    }
                }
            }
        }

        return results;
    }

    #intersectTriangle(ray, a, b, c) {
        const edge1 = new Vector3().copy(b).sub(a);
        const edge2 = new Vector3().copy(c).sub(a);
        const h = new Vector3().cross(ray.direction, edge2);
        const det = edge1.dot(h);

        if (Math.abs(det) < this.#precision) return null;

        const invDet = 1 / det;
        const s = new Vector3().copy(ray.origin).sub(a);
        const u = s.dot(h) * invDet;

        if (u < 0 || u > 1) return null;

        const q = new Vector3().cross(s, edge1);
        const v = ray.direction.dot(q) * invDet;

        if (v < 0 || u + v > 1) return null;

        const t = edge2.dot(q) * invDet;

        if (t < 0 || t > this.#maxDistance) return null;

        const point = ray.origin.clone().add(ray.direction.clone().multiplyScalar(t));

        const normal = new Vector3().cross(edge1, edge2).normalize();

        return { point, distance: t, normal, u, v };
    }

    intersectMeshGroup(ray, group, recursive = true) {
        const results = [];

        if (Array.isArray(group)) {
            for (const mesh of group) {
                const hits = this.intersectMesh(ray, mesh, recursive);
                results.push(...hits);
            }
        } else {
            results.push(...this.intersectMesh(ray, group, recursive));
        }

        return results.sort((a, b) => a.distance - b.distance);
    }

    getClosest(ray, meshes, recursive = true) {
        const results = this.intersectMeshGroup(ray, meshes, recursive);
        return results.length > 0 ? results[0] : null;
    }

    hasHit(ray, meshes, recursive = true) {
        return this.getClosest(ray, meshes, recursive) !== null;
    }

    clearCache() {
        this.#bvhCache.clear();
        this.#triangleCache.clear();
    }

    toString() {
        return `MeshRaycaster(precision=${this.#precision}, maxDistance=${this.#maxDistance})`;
    }
}

export default MeshRaycaster;
