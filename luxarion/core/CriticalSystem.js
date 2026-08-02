/**
 * CriticalSystem.js - Critical hit system for LXRN Engine.
 * Manages critical strike chance and damage multipliers.
 * 
 * @module CriticalSystem
 * @author LXRN
 * @version 1.0.0
 */

import Entity from '../core/Entity.js';
import { Logger } from '../utils/Logger.js';

class CriticalSystem {
    #entity = null;
    #critChance = 0.1;
    #critMultiplier = 1.5;
    #critResist = 0;
    #critDamageBonus = 0;
    #isEnabled = true;
    
    constructor(entity, options = {}) {
        if (!(entity instanceof Entity)) {
            throw new Error('CriticalSystem requires an Entity');
        }
        this.#entity = entity;
        this.#critChance = options.critChance || 0.1;
        this.#critMultiplier = options.critMultiplier || 1.5;
        this.#critResist = options.critResist || 0;
        this.#critDamageBonus = options.critDamageBonus || 0;
        this.#isEnabled = options.enabled !== undefined ? options.enabled : true;
        this.#entity.addComponent('criticalSystem', this);
    }

    get critChance() { return this.#critChance; }
    get critMultiplier() { return this.#critMultiplier; }
    get critResist() { return this.#critResist; }
    get isEnabled() { return this.#isEnabled; }

    set critChance(value) {
        this.#critChance = Math.max(0, Math.min(1, value));
    }

    set critMultiplier(value) {
        this.#critMultiplier = Math.max(1, value);
    }

    set critResist(value) {
        this.#critResist = Math.max(0, value);
    }

    set enabled(value) {
        this.#isEnabled = value;
    }

    calculateCrit(damage, target = null) {
        if (!this.#isEnabled) return { damage, isCrit: false };
        
        let targetResist = 0;
        if (target && target.hasComponent && target.hasComponent('criticalSystem')) {
            const targetCrit = target.getComponent('criticalSystem');
            targetResist = targetCrit.critResist;
        }
        
        const effectiveChance = Math.max(0, this.#critChance - targetResist);
        const isCrit = Math.random() < effectiveChance;
        
        if (isCrit) {
            const bonus = this.#critMultiplier + this.#critDamageBonus - 1;
            const critDamage = damage * (1 + bonus);
            this.#entity.emit('criticalHit', { 
                entity: this.#entity, 
                target,
                damage: critDamage,
                baseDamage: damage,
                multiplier: this.#critMultiplier + this.#critDamageBonus
            });
            return { damage: critDamage, isCrit: true };
        }
        
        return { damage, isCrit: false };
    }

    getCritStats() {
        return {
            critChance: this.#critChance,
            critMultiplier: this.#critMultiplier,
            critResist: this.#critResist,
            critDamageBonus: this.#critDamageBonus,
            enabled: this.#isEnabled
        };
    }

    setCritChance(percent) {
        this.#critChance = Math.max(0, Math.min(1, percent / 100));
        return this;
    }

    setCritMultiplier(multiplier) {
        this.#critMultiplier = Math.max(1, multiplier);
        return this;
    }

    setCritDamageBonus(bonus) {
        this.#critDamageBonus = bonus;
        return this;
    }

    setCritResist(resist) {
        this.#critResist = Math.max(0, resist);
        return this;
    }

    enable() {
        this.#isEnabled = true;
        this.#entity.emit('critSystemEnabled', { entity: this.#entity });
    }

    disable() {
        this.#isEnabled = false;
        this.#entity.emit('critSystemDisabled', { entity: this.#entity });
    }

    destroy() {
        this.#entity = null;
    }
}

export default CriticalSystem;
