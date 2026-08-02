/**
 * AggroSystem.js - Aggro/Threat system for LXRN Engine.
 * Manages enemy targeting and threat levels.
 * 
 * @module AggroSystem
 * @author LXRN
 * @version 1.0.0
 */

import Entity from '../core/Entity.js';
import { Logger } from '../utils/Logger.js';

class ThreatEntry {
    #target = null;
    #threat = 0;
    #lastUpdate = 0;
    
    constructor(target) {
        this.#target = target;
    }
    
    get target() { return this.#target; }
    get threat() { return this.#threat; }
    
    addThreat(amount) {
        this.#threat += amount;
        this.#lastUpdate = Date.now();
    }
    
    reset() {
        this.#threat = 0;
    }
    
    isAlive() {
        return this.#target && this.#target.isAlive && this.#target.isAlive();
    }
}

class AggroSystem {
    #entity = null;
    #threatTable = new Map();
    #maxThreatDistance = 500;
    #threatDecay = 0.01;
    #baseThreat = 10;
    #aggroRange = 300;
    #deaggroRange = 400;
    #target = null;
    
    constructor(entity) {
        if (!(entity instanceof Entity)) {
            throw new Error('AggroSystem requires an Entity');
        }
        this.#entity = entity;
        this.#entity.addComponent('aggroSystem', this);
    }

    addThreat(target, amount) {
        if (!target || !target.isAlive || !target.isAlive()) return;
        
        let entry = this.#threatTable.get(target);
        if (!entry) {
            entry = new ThreatEntry(target);
            this.#threatTable.set(target, entry);
        }
        entry.addThreat(amount);
        this.#entity.emit('threatChanged', { entity: this.#entity, target, amount });
    }

    getThreat(target) {
        const entry = this.#threatTable.get(target);
        return entry ? entry.threat : 0;
    }

    getHighestThreat() {
        let highest = null;
        let highestThreat = 0;
        
        for (const [target, entry] of this.#threatTable) {
            if (!entry.isAlive()) {
                this.#threatTable.delete(target);
                continue;
            }
            
            const dist = this.#entity.distanceTo(target);
            if (dist > this.#maxThreatDistance) continue;
            
            if (entry.threat > highestThreat) {
                highestThreat = entry.threat;
                highest = target;
            }
        }
        
        return highest;
    }

    getTarget() {
        if (!this.#target || !this.#target.isAlive() || 
            this.#entity.distanceTo(this.#target) > this.#deaggroRange) {
            this.#target = this.getHighestThreat();
        }
        return this.#target;
    }

    update(deltaTime) {
        // Decay threat over time
        for (const [target, entry] of this.#threatTable) {
            if (!entry.isAlive()) {
                this.#threatTable.delete(target);
                continue;
            }
            
            const dist = this.#entity.distanceTo(target);
            if (dist > this.#maxThreatDistance) {
                entry.addThreat(-this.#threatDecay * 10);
            } else {
                entry.addThreat(-this.#threatDecay);
            }
            
            if (entry.threat <= 0) {
                this.#threatTable.delete(target);
            }
        }
        
        // Update target
        const newTarget = this.getTarget();
        if (newTarget !== this.#target) {
            this.#target = newTarget;
            this.#entity.setTarget(newTarget);
            this.#entity.emit('aggroChanged', { entity: this.#entity, target: newTarget });
        }
    }

    isInAggroRange(target) {
        return this.#entity.distanceTo(target) <= this.#aggroRange;
    }

    isInDeaggroRange(target) {
        return this.#entity.distanceTo(target) <= this.#deaggroRange;
    }

    pull(target, amount = null) {
        const threatAmount = amount !== null ? amount : this.#baseThreat;
        this.addThreat(target, threatAmount);
        this.#entity.emit('aggroPulled', { entity: this.#entity, target, threat: threatAmount });
    }

    reset() {
        this.#threatTable.clear();
        this.#target = null;
        this.#entity.clearTarget();
        this.#entity.emit('aggroReset', { entity: this.#entity });
    }

    getThreatTable() {
        const result = [];
        for (const [target, entry] of this.#threatTable) {
            if (entry.isAlive()) {
                result.push({ target, threat: entry.threat });
            }
        }
        return result.sort((a, b) => b.threat - a.threat);
    }

    setAggroRange(range) {
        this.#aggroRange = range;
    }

    setDeaggroRange(range) {
        this.#deaggroRange = range;
    }

    setMaxThreatDistance(distance) {
        this.#maxThreatDistance = distance;
    }

    setThreatDecay(decay) {
        this.#threatDecay = decay;
    }

    destroy() {
        this.reset();
        this.#entity = null;
    }
}

export default AggroSystem;
