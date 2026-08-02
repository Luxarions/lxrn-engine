/**
 * Ray.js - Ray class for LXRN Engine.
 * Represents a ray with origin and direction.
 * 
 * @module Ray
 * @author LXRN
 * @version 1.0.0
 */

import { Vector3 } from '../math/Vector3.js';

class Ray {
    origin = new Vector3(0, 0, 0);
    direction = new Vector3(0, 0, -1);

    constructor(origin = null, direction = null) {
        if (origin) this.origin.copy(origin);
        if (direction) {
            this.direction.copy(direction);
            this.direction.normalize();
        }
    }

    getPoint(t, target = null) {
        const result = target || new Vector3();
        result.copy(this.origin);
        result.addScaledVector(this.direction, t);
        return result;
    }

    intersectPlane(plane) {
        const denom = this.direction.dot(plane.normal);
        if (Math.abs(denom) < 0.0001) return null;
        const t = -(this.origin.dot(plane.normal) + plane.constant) / denom;
        return t;
    }

    intersectBox(box) {
        let tmin = 0;
        let tmax = Infinity;
        const origin = this.origin;
        const direction = this.direction;
        
        for (let i = 0; i < 3; i++) {
            if (Math.abs(direction.elements[i]) < 0.0001) {
                if (origin.elements[i] < box.min.elements[i] || 
                    origin.elements[i] > box.max.elements[i]) {
                    return null;
                }
            } else {
                const invD = 1 / direction.elements[i];
                let t1 = (box.min.elements[i] - origin.elements[i]) * invD;
                let t2 = (box.max.elements[i] - origin.elements[i]) * invD;
                
                if (t1 > t2) {
                    const temp = t1;
                    t1 = t2;
                    t2 = temp;
                }
                
                tmin = Math.max(tmin, t1);
                tmax = Math.min(tmax, t2);
                
                if (tmin > tmax) return null;
            }
        }
        
        return tmin;
    }

    clone() {
        return new Ray(this.origin.clone(), this.direction.clone());
    }

    toString() {
        return `Ray(origin=${this.origin.toString()}, direction=${this.direction.toString()})`;
    }
}

export default Ray;
