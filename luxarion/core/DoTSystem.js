/**
 * DoTSystem.js - Damage Over Time system for LXRN Engine.
 * Manages DOT effects like poison, burn, bleed.
 * 
 * @module DoTSystem
 * @author LXRN
 * @version 1.0.0
 */

import Entity from '../core/Entity.js';
import { Logger } from '../utils/Logger.js';

class DOTEffect {
    #id = null;
    #name = '';
    #type = 'poison'; // poison, burn, bleed, freeze, shock
    #damagePerTick = 10;
    #tickInterval = 1;
    #duration = 5;
    #remaining = 0;
    #tickTimer = 0;
    #stacks = 1;
    #maxStacks = 5;
    #source = null;
    #target = null;
    #isPermanent = false;
    #onTick = null;
    #onApply = null;
    #onRemove = null;
    
    constructor(options = {}) {
        this.#id = options.id || generateId();
        this.#name = options.name || 'DOT';
        this.#type = options.type || 'poison';
        this.#damagePerTick = options.damagePerTick || 10;
        this.#tickInterval = options.tickInterval || 1;
        this.#duration = options.duration || 5;
        this.#remaining = this.#duration;
        this.#stacks = options.stacks || 1;
        this.#maxStacks = options.maxStacks || 5;
        this.#source = options.source || null;
        this.#isPermanent = options.permanent || false;
        this.#onTick = options.onTick || null;
        this.#onApply = options.onApply || null;
        this.#onRemove = options.onRemove || null;
    }

    get id() { return this.#id; }
    get name() { return this.#name; }
    get type() { return this.#type; }
    get damagePerTick() { return this.#damagePerTick; }
    get tickInterval() { return this.#tickInterval; }
    get duration() { return this.#duration; }
    get remaining() { return this.#remaining; }
    get stacks() { return this.#stacks; }
    get maxStacks() { return this.#maxStacks; }
    get source() { return this.#source; }
    get target() { return this.#target; }
    get isExpired() { return this.#remaining <= 0 && !this.#isPermanent; }
    get totalDamage() { return this.#damagePerTick * this.#stacks * (this.#duration / this.#tickInterval); }

    set target(value) {
        this.#target = value;
    }

    apply() {
        if (this.#onApply) {
            this.#onApply(this);
        }
        this.#target?.emit('dotApplied', { dot: this, target: this.#target });
        Logger.log(`DOT "${this.#name}" applied to ${this.#target?.name || 'unknown'}`);
    }

    update(deltaTime) {
        if (this.#isPermanent || this.#remaining <= 0) return;
        
        this.#remaining -= deltaTime;
        this.#tickTimer += deltaTime;
        
        if (this.#tickTimer >= this.#tickInterval) {
            this.#tickTimer = 0;
            this.#tick();
        }
        
        if (this.#remaining <= 0) {
            this.remove();
        }
    }

    #tick() {
        const damage = this.#damagePerTick * this.#stacks;
        const actualDamage = this.#target?.takeDamage(damage, this.#source) || 0;
        
        if (this.#onTick) {
            this.#onTick(this, actualDamage);
        }
        
        this.#target?.emit('dotTick', { 
            dot: this, 
            target: this.#target, 
            damage: actualDamage,
            stacks: this.#stacks
        });
    }

    remove() {
        if (this.#onRemove) {
            this.#onRemove(this);
        }
        this.#target?.emit('dotRemoved', { dot: this, target: this.#target });
        Logger.log(`DOT "${this.#name}" removed from ${this.#target?.name || 'unknown'}`);
    }

    addStack() {
        if (this.#stacks < this.#maxStacks) {
            this.#stacks++;
            this.#remaining = this.#duration;
            this.#target?.emit('dotStacked', { dot: this, stacks: this.#stacks });
            return true;
        }
        return false;
    }

    refresh() {
        this.#remaining = this.#duration;
        this.#target?.emit('dotRefreshed', { dot: this });
    }
}

class DoTSystem {
    #entity = null;
    #dots = new Map();
    #maxDots = 10;
    
    constructor(entity) {
        if (!(entity instanceof Entity)) {
            throw new Error('DoTSystem requires an Entity');
        }
        this.#entity = entity;
        this.#entity.addComponent('dotSystem', this);
    }

    addDOT(dot) {
        if (!(dot instanceof DOTEffect)) {
            throw new Error('Invalid DOT');
        }
        
        if (this.#dots.size >= this.#maxDots) {
            Logger.warn(`Max DOTs reached for ${this.#entity.name}`);
            return false;
        }
        
        if (this.#dots.has(dot.id)) {
            const existing = this.#dots.get(dot.id);
            if (existing.stacks < existing.maxStacks) {
                existing.addStack();
                return true;
            }
            existing.refresh();
            return true;
        }
        
        dot.target = this.#entity;
        this.#dots.set(dot.id, dot);
        dot.apply();
        this.#entity.emit('dotAdded', { entity: this.#entity, dot });
        return true;
    }

    removeDOT(dotId) {
        const dot = this.#dots.get(dotId);
        if (!dot) return false;
        
        dot.remove();
        this.#dots.delete(dotId);
        this.#entity.emit('dotRemoved', { entity: this.#entity, dot });
        return true;
    }

    removeAllDOTs() {
        for (const [id, dot] of this.#dots) {
            dot.remove();
        }
        this.#dots.clear();
        this.#entity.emit('allDotsRemoved', { entity: this.#entity });
    }

    getDOT(dotId) {
        return this.#dots.get(dotId) || null;
    }

    getDOTs() {
        return Array.from(this.#dots.values());
    }

    getDOTsByType(type) {
        return this.getDOTs().filter(d => d.type === type);
    }

    getDOTCount() {
        return this.#dots.size;
    }

    hasDOT(dotId) {
        return this.#dots.has(dotId);
    }

    hasDOTs() {
        return this.#dots.size > 0;
    }

    update(deltaTime) {
        const expired = [];
        for (const [id, dot] of this.#dots) {
            dot.update(deltaTime);
            if (dot.isExpired) {
                expired.push(id);
            }
        }
        
        for (const id of expired) {
            this.removeDOT(id);
        }
    }

    getTotalDOTDamage() {
        let total = 0;
        for (const dot of this.#dots.values()) {
            total += dot.totalDamage;
        }
        return total;
    }

    destroy() {
        this.removeAllDOTs();
        this.#entity = null;
    }
}

export { DOTEffect, DoTSystem };
