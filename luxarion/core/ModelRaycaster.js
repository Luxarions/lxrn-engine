/**
 * ModelRaycaster.js - Model/GLTF raycasting for LXRN Engine.
 * Supports complex 3D models with multiple meshes.
 * 
 * @module ModelRaycaster
 * @author LXRN
 * @version 1.0.0
 */

import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';
import Intersection from './Intersection.js';
import { Logger } from '../utils/Logger.js';

class ModelRaycaster {
    #precision = 0.0001;
    #maxDistance = Infinity;
    #includeInvisible = false;

    constructor(options = {}) {
        this.#precision = options.precision || 0.0001;
        this.#maxDistance = options.maxDistance || Infinity;
        this.#includeInvisible = options.includeInvisible || false;
        Logger.log('ModelRaycaster created');
    }

    intersectModel(ray, model, recursive = true) {
        if (!model) return [];

        const results = [];

        if (model.isMesh || model.geometry) {
            return this.#intersectMesh(ray, model);
        }

        if (model.children) {
            for (const child of model.children) {
                if (!this.#includeInvisible && !child.visible) continue;
                const hits = this.intersectModel(ray, child, recursive);
                results.push(...hits);
            }
        }

        return results.sort((a, b) => a.distance - b.distance);
    }

    #intersectMesh(ray, mesh) {
        const geometry = mesh.geometry;
        if (!geometry) return [];

        const inverseMatrix = new Matrix4();
        inverseMatrix.copy(mesh.matrixWorld);
        inverseMatrix.invert();

        const localOrigin = ray.origin.clone().applyMatrix4(inverseMatrix);
        const localDirection = ray.direction.clone().applyMatrix4(inverseMatrix).normalize();
        const localRay = { origin: localOrigin, direction: localDirection };

        const results = [];

        if (geometry.attributes && geometry.attributes.position) {
            const position = geometry.attributes.position;
            const count = position.count;

            if (geometry.index) {
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
            } else {
                for (let i = 0; i < count; i += 3) {
                    const a = new Vector3(position.getX(i), position.getY(i), position.getZ(i));
                    const b = new Vector3(position.getX(i + 1), position.getY(i + 1), position.getZ(i + 1));
                    const c = new Vector3(position.getX(i + 2), position.getY(i + 2), position.getZ(i + 2));

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

    intersectModels(ray, models, recursive = true) {
        const results = [];
        for (const model of models) {
            const hits = this.intersectModel(ray, model, recursive);
            results.push(...hits);
        }
        return results.sort((a, b) => a.distance - b.distance);
    }

    getClosest(ray, models, recursive = true) {
        const results = this.intersectModels(ray, models, recursive);
        return results.length > 0 ? results[0] : null;
    }

    hasHit(ray, models, recursive = true) {
        return this.getClosest(ray, models, recursive) !== null;
    }

    toString() {
        return `ModelRaycaster(precision=${this.#precision}, maxDistance=${this.#maxDistance})`;
    }
}

export default ModelRaycaster;
