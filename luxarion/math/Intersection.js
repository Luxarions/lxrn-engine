/**
 * Intersection.js - Intersection result class for LXRN Engine.
 * Contains data from a ray-object intersection.
 * 
 * @module Intersection
 * @author LXRN
 * @version 1.0.0
 */

class Intersection {
    point = null;
    distance = 0;
    object = null;
    face = null;
    faceIndex = -1;
    uv = null;
    normal = null;
    instanceId = -1;

    constructor(object = null, point = null, distance = 0, face = null, normal = null) {
        this.object = object;
        this.point = point;
        this.distance = distance;
        this.face = face;
        this.normal = normal;
    }

    isValid() {
        return this.object !== null && this.point !== null && this.distance > 0;
    }

    clone() {
        const clone = new Intersection();
        clone.object = this.object;
        clone.point = this.point ? this.point.clone() : null;
        clone.distance = this.distance;
        clone.face = this.face;
        clone.faceIndex = this.faceIndex;
        clone.uv = this.uv ? this.uv.clone() : null;
        clone.normal = this.normal ? this.normal.clone() : null;
        clone.instanceId = this.instanceId;
        return clone;
    }

    toString() {
        return `Intersection(object=${this.object?.name || 'null'}, distance=${this.distance.toFixed(2)}, point=${this.point?.toString() || 'null'})`;
    }
}

export default Intersection;
