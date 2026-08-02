/**
 * BuffSystem.js - Buff/Debuff system for LXRN Engine.
 * Provides temporary stat modifications for entities.
 * 
 * @module BuffSystem
 * @author LXRN
 * @version 1.0.0
 */

import Entity from '../core/Entity.js';
import { Logger } from '../utils/Logger.js';

class Buff {
    #id = null;
    #name = '';
    #type = 'buff'; // 'buff' | 'debuff'
    #stats = {};
    #duration = 0;
    #remaining = 0;
    #stacks = 1;
    #maxStacks = 1;
    #isPermanent = false;
    #source = null;
    #target = null;
    #tickInterval = 0;
    #tickTimer = 0;
    #onApply = null;
    #onRemove = null;
    #onTick = null;
    
    constructor(options = {}) {
        this.#id = options.id || generateId();
        this.#name = options.name || 'Buff';
        this.#type = options.type || 'buff';
        this.#stats = options.stats || {};
        this.#duration = options.duration || 0;
        this.#remaining = this.#duration;
        this.#stacks = options.stacks || 1;
        this.#maxStacks = options.maxStacks || 1;
        this.#isPermanent = options.permanent || false;
        this.#source = options.source || null;
        this.#tickInterval = options.tickInterval || 0;
        this.#onApply = options.onApply || null;
        this.#onRemove = options.onRemove || null;
        this.#onTick = options.onTick || null;
    }

    get id() { return this.#id; }
    get name() { return this.#name; }
    get type() { return this.#type; }
    get stats() { return this.#stats; }
    get duration() { return this.#duration; }
    get remaining() { return this.#remaining; }
    get stacks() { return this.#stacks; }
    get maxStacks() { return this.#maxStacks; }
    get isPermanent() { return this.#isPermanent; }
    get source() { return this.#source; }
    get target() { return this.#target; }
    get isExpired() { return this.#remaining <= 0 && !this.#isPermanent; }
    get isBuff() { return this.#type === 'buff'; }
    get isDebuff() { return this.#type === 'debuff'; }

    set target(value) {
        this.#target = value;
    }

    apply() {
        if (this.#onApply) {
            this.#onApply(this);
        }
        Logger.log(`Buff "${this.#name}" applied to ${this.#target?.name || 'unknown'}`);
    }

    update(deltaTime) {
        if (this.#isPermanent || this.#remaining <= 0) return;
        
        this.#remaining -= deltaTime;
        
        if (this.#tickInterval > 0) {
            this.#tickTimer += deltaTime;
            if (this.#tickTimer >= this.#tickInterval) {
                this.#tickTimer = 0;
                if (this.#onTick) {
                    this.#onTick(this);
                }
                this.#target?.emit('buffTick', { buff: this, target: this.#target });
            }
        }
        
        if (this.#remaining <= 0) {
            this.remove();
        }
    }

    remove() {
        if (this.#onRemove) {
            this.#onRemove(this);
        }
        this.#target?.emit('buffRemoved', { buff: this, target: this.#target });
        Logger.log(`Buff "${this.#name}" removed from ${this.#target?.name || 'unknown'}`);
    }

    addStack() {
        if (this.#stacks < this.#maxStacks) {
            this.#stacks++;
            this.#remaining = this.#duration;
            this.#target?.emit('buffStacked', { buff: this, stacks: this.#stacks });
            return true;
        }
        return false;
    }

    removeStack() {
        if (this.#stacks > 1) {
            this.#stacks--;
            this.#target?.emit('buffStacked', { buff: this, stacks: this.#stacks });
            return true;
        }
        return false;
    }

    refresh() {
        this.#remaining = this.#duration;
        this.#target?.emit('buffRefreshed', { buff: this });
    }

    toJSON() {
        return {
            id: this.#id,
            name: this.#name,
            type: this.#type,
            stats: this.#stats,
            duration: this.#duration,
            remaining: this.#remaining,
            stacks: this.#stacks,
            maxStacks: this.#maxStacks,
            permanent: this.#isPermanent,
            tickInterval: this.#tickInterval
        };
    }
}

class BuffSystem {
    #entity = null;
    #buffs = new Map();
    #maxBuffs = 10;
    
    constructor(entity) {
        if (!(entity instanceof Entity)) {
            throw new Error('BuffSystem requires an Entity');
        }
        this.#entity = entity;
        this.#entity.addComponent('buffSystem', this);
    }

    addBuff(buff) {
        if (!(buff instanceof Buff)) {
            throw new Error('Invalid buff');
        }
        
        if (this.#buffs.size >= this.#maxBuffs) {
            Logger.warn(`Max buffs reached for ${this.#entity.name}`);
            return false;
        }
        
        // Check for existing buff with same id
        if (this.#buffs.has(buff.id)) {
            const existing = this.#buffs.get(buff.id);
            if (existing.stacks < existing.maxStacks) {
                existing.addStack();
                return true;
            }
            existing.refresh();
            return true;
        }
        
        buff.target = this.#entity;
        this.#buffs.set(buff.id, buff);
        buff.apply();
        this.#applyBuffStats(buff);
        this.#entity.emit('buffAdded', { entity: this.#entity, buff });
        return true;
    }

    removeBuff(buffId) {
        const buff = this.#buffs.get(buffId);
        if (!buff) return false;
        
        this.#removeBuffStats(buff);
        buff.remove();
        this.#buffs.delete(buffId);
        this.#entity.emit('buffRemoved', { entity: this.#entity, buff });
        return true;
    }

    removeAllBuffs() {
        for (const [id, buff] of this.#buffs) {
            this.#removeBuffStats(buff);
            buff.remove();
        }
        this.#buffs.clear();
        this.#entity.emit('allBuffsRemoved', { entity: this.#entity });
    }

    getBuff(buffId) {
        return this.#buffs.get(buffId) || null;
    }

    getBuffs() {
        return Array.from(this.#buffs.values());
    }

    getBuffsByType(type) {
        return this.getBuffs().filter(b => b.type === type);
    }

    getBuffCount() {
        return this.#buffs.size;
    }

    hasBuff(buffId) {
        return this.#buffs.has(buffId);
    }

    hasBuffs() {
        return this.#buffs.size > 0;
    }

    update(deltaTime) {
        const expired = [];
        for (const [id, buff] of this.#buffs) {
            buff.update(deltaTime);
            if (buff.isExpired) {
                expired.push(id);
            }
        }
        
        for (const id of expired) {
            this.removeBuff(id);
        }
    }

    #applyBuffStats(buff) {
        const stats = buff.stats;
        if (stats.hp) this.#entity.heal(stats.hp);
        if (stats.maxHp) this.#entity._maxHp += stats.maxHp;
        if (stats.speed) this.#entity._speed += stats.speed;
        if (stats.damage) this.#entity._damage += stats.damage;
        if (stats.defense) this.#entity._defense += stats.defense;
        if (stats.attackSpeed) this.#entity._attackSpeed += stats.attackSpeed;
        if (stats.attackRange) this.#entity._attackRange += stats.attackRange;
        if (stats.visionRange) this.#entity._visionRange += stats.visionRange;
    }

    #removeBuffStats(buff) {
        const stats = buff.stats;
        if (stats.hp) { /* HP removal handled by heal */ }
        if (stats.maxHp) this.#entity._maxHp -= stats.maxHp;
        if (stats.speed) this.#entity._speed -= stats.speed;
        if (stats.damage) this.#entity._damage -= stats.damage;
        if (stats.defense) this.#entity._defense -= stats.defense;
        if (stats.attackSpeed) this.#entity._attackSpeed -= stats.attackSpeed;
        if (stats.attackRange) this.#entity._attackRange -= stats.attackRange;
        if (stats.visionRange) this.#entity._visionRange -= stats.visionRange;
        
        // Clamp values
        this.#entity._hp = Math.max(0, this.#entity._hp);
        this.#entity._maxHp = Math.max(1, this.#entity._maxHp);
        this.#entity._speed = Math.max(0, this.#entity._speed);
        this.#entity._damage = Math.max(0, this.#entity._damage);
        this.#entity._defense = Math.max(0, this.#entity._defense);
    }

    destroy() {
        this.removeAllBuffs();
        this.#entity = null;
    }
}

export { Buff, BuffSystem };
