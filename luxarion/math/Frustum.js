/**
 * Frustum.js - Frustum culling for LXRN Engine.
 * Used for visibility testing of objects in camera view.
 * 
 * @module Frustum
 * @author LXRN
 * @version 1.0.0
 */

import { Vector3 } from '../math/Vector3.js';
import { Plane } from '../math/Plane.js';

class Frustum {
    #planes = [];
    #planesCount = 6;

    constructor(matrix = null) {
        for (let i = 0; i < this.#planesCount; i++) {
            this.#planes.push(new Plane());
        }
        if (matrix) {
            this.setFromMatrix(matrix);
        }
    }

    setFromMatrix(matrix) {
        const m = matrix.elements;
        const planes = this.#planes;

        // Left
        planes[0].set(
            m[3] + m[0],
            m[7] + m[4],
            m[11] + m[8],
            m[15] + m[12]
        );

        // Right
        planes[1].set(
            m[3] - m[0],
            m[7] - m[4],
            m[11] - m[8],
            m[15] - m[12]
        );

        // Bottom
        planes[2].set(
            m[3] + m[1],
            m[7] + m[5],
            m[11] + m[9],
            m[15] + m[13]
        );

        // Top
        planes[3].set(
            m[3] - m[1],
            m[7] - m[5],
            m[11] - m[9],
            m[15] - m[13]
        );

        // Near
        planes[4].set(
            m[3] + m[2],
            m[7] + m[6],
            m[11] + m[10],
            m[15] + m[14]
        );

        // Far
        planes[5].set(
            m[3] - m[2],
            m[7] - m[6],
            m[11] - m[10],
            m[15] - m[14]
        );

        for (const plane of planes) {
            plane.normalize();
        }
    }

    containsPoint(point) {
        for (const plane of this.#planes) {
            if (plane.distanceToPoint(point) < 0) {
                return false;
            }
        }
        return true;
    }

    intersectsBox(box) {
        for (const plane of this.#planes) {
            const normal = plane.normal;
            const constant = plane.constant;
            
            const p = new Vector3(
                normal.x > 0 ? box.max.x : box.min.x,
                normal.y > 0 ? box.max.y : box.min.y,
                normal.z > 0 ? box.max.z : box.min.z
            );
            
            const n = new Vector3(
                normal.x > 0 ? box.min.x : box.max.x,
                normal.y > 0 ? box.min.y : box.max.y,
                normal.z > 0 ? box.min.z : box.max.z
            );
            
            if (p.dot(normal) + constant < 0) {
                return false;
            }
        }
        return true;
    }

    intersectsSphere(sphere) {
        const center = sphere.center;
        const radius = sphere.radius;
        
        for (const plane of this.#planes) {
            const distance = plane.distanceToPoint(center);
            if (distance < -radius) {
                return false;
            }
        }
        return true;
    }

    get planes() {
        return this.#planes;
    }
}

export default Frustum;
