/**
 * SkillSystem.js - Skill system for LXRN Engine.
 * Manages skills, abilities, and cooldowns.
 * 
 * @module SkillSystem
 * @author LXRN
 * @version 1.0.0
 */

import Entity from '../core/Entity.js';
import { Logger } from '../utils/Logger.js';

class Skill {
    #id = null;
    #name = '';
    #description = '';
    #cooldown = 0;
    #remainingCooldown = 0;
    #cost = 0;
    #costType = 'mana'; // mana, stamina, health
    #level = 1;
    #maxLevel = 10;
    #damage = 0;
    #heal = 0;
    #range = 0;
    #duration = 0;
    #isPassive = false;
    #isUltimate = false;
    #icon = null;
    #onCast = null;
    #onTick = null;
    #onComplete = null;
    #target = null;
    #caster = null;
    
    constructor(options = {}) {
        this.#id = options.id || generateId();
        this.#name = options.name || 'Skill';
        this.#description = options.description || '';
        this.#cooldown = options.cooldown || 0;
        this.#cost = options.cost || 0;
        this.#costType = options.costType || 'mana';
        this.#level = options.level || 1;
        this.#maxLevel = options.maxLevel || 10;
        this.#damage = options.damage || 0;
        this.#heal = options.heal || 0;
        this.#range = options.range || 0;
        this.#duration = options.duration || 0;
        this.#isPassive = options.isPassive || false;
        this.#isUltimate = options.isUltimate || false;
        this.#icon = options.icon || null;
        this.#onCast = options.onCast || null;
        this.#onTick = options.onTick || null;
        this.#onComplete = options.onComplete || null;
        this.#caster = options.caster || null;
    }

    get id() { return this.#id; }
    get name() { return this.#name; }
    get description() { return this.#description; }
    get cooldown() { return this.#cooldown; }
    get remainingCooldown() { return this.#remainingCooldown; }
    get cost() { return this.#cost; }
    get costType() { return this.#costType; }
    get level() { return this.#level; }
    get maxLevel() { return this.#maxLevel; }
    get damage() { return this.#damage; }
    get heal() { return this.#heal; }
    get range() { return this.#range; }
    get duration() { return this.#duration; }
    get isPassive() { return this.#isPassive; }
    get isUltimate() { return this.#isUltimate; }
    get icon() { return this.#icon; }
    get isReady() { return this.#remainingCooldown <= 0; }

    set caster(value) {
        this.#caster = value;
    }

    set target(value) {
        this.#target = value;
    }

    canCast() {
        if (!this.isReady) return false;
        if (this.#caster) {
            if (this.#costType === 'mana') {
                return this.#caster._mana >= this.#cost;
            }
        }
        return true;
    }

    cast(target) {
        if (!this.canCast()) return false;
        if (target) this.#target = target;
        
        // Apply cost
        if (this.#caster) {
            if (this.#costType === 'mana') {
                this.#caster._mana -= this.#cost;
            }
        }
        
        this.#remainingCooldown = this.#cooldown;
        
        if (this.#onCast) {
            this.#onCast(this, this.#caster, this.#target);
        }
        
        this.#caster?.emit('skillCast', { 
            skill: this, 
            caster: this.#caster, 
            target: this.#target 
        });
        
        return true;
    }

    update(deltaTime) {
        if (this.#remainingCooldown > 0) {
            this.#remainingCooldown -= deltaTime;
            if (this.#remainingCooldown < 0) {
                this.#remainingCooldown = 0;
                this.#caster?.emit('skillReady', { skill: this, caster: this.#caster });
            }
        }
    }

    levelUp() {
        if (this.#level >= this.#maxLevel) return false;
        
        this.#level++;
        this.#damage *= 1.1;
        this.#heal *= 1.1;
        this.#cooldown *= 0.95;
        
        this.#caster?.emit('skillLevelUp', { skill: this, level: this.#level });
        return true;
    }

    getStats() {
        return {
            name: this.#name,
            level: this.#level,
            maxLevel: this.#maxLevel,
            damage: this.#damage,
            heal: this.#heal,
            cooldown: this.#cooldown,
            remainingCooldown: this.#remainingCooldown,
            cost: this.#cost,
            costType: this.#costType,
            range: this.#range,
            duration: this.#duration,
            isReady: this.isReady,
            isPassive: this.#isPassive,
            isUltimate: this.#isUltimate
        };
    }
}

class SkillSystem {
    #entity = null;
    #skills = new Map();
    #activeSkills = new Map();
    #maxSkills = 10;
    #maxActiveSkills = 5;
    
    constructor(entity) {
        if (!(entity instanceof Entity)) {
            throw new Error('SkillSystem requires an Entity');
        }
        this.#entity = entity;
        this.#entity.addComponent('skillSystem', this);
    }

    addSkill(skill) {
        if (!(skill instanceof Skill)) {
            throw new Error('Invalid skill');
        }
        
        if (this.#skills.size >= this.#maxSkills) {
            Logger.warn(`Max skills reached for ${this.#entity.name}`);
            return false;
        }
        
        if (this.#skills.has(skill.id)) {
            Logger.warn(`Skill ${skill.name} already exists`);
            return false;
        }
        
        skill.caster = this.#entity;
        this.#skills.set(skill.id, skill);
        this.#entity.emit('skillAdded', { entity: this.#entity, skill });
        return true;
    }

    removeSkill(skillId) {
        const skill = this.#skills.get(skillId);
        if (!skill) return false;
        
        this.#skills.delete(skillId);
        this.#activeSkills.delete(skillId);
        this.#entity.emit('skillRemoved', { entity: this.#entity, skill });
        return true;
    }

    getSkill(skillId) {
        return this.#skills.get(skillId) || null;
    }

    getSkills() {
        return Array.from(this.#skills.values());
    }

    getActiveSkills() {
        return Array.from(this.#activeSkills.values());
    }

    getReadySkills() {
        const ready = [];
        for (const skill of this.#skills.values()) {
            if (skill.isReady) {
                ready.push(skill);
            }
        }
        return ready;
    }

    getSkillById(id) {
        return this.#skills.get(id) || null;
    }

    getSkillByName(name) {
        for (const skill of this.#skills.values()) {
            if (skill.name === name) {
                return skill;
            }
        }
        return null;
    }

    getSkillsByType(type) {
        const result = [];
        for (const skill of this.#skills.values()) {
            if (skill.costType === type) {
                result.push(skill);
            }
        }
        return result;
    }

    castSkill(skillId, target = null) {
        const skill = this.#skills.get(skillId);
        if (!skill) return false;
        
        if (target) skill.target = target;
        
        const result = skill.cast(target);
        if (result) {
            this.#entity.emit('skillCast', { 
                entity: this.#entity, 
                skill, 
                target 
            });
        }
        return result;
    }

    update(deltaTime) {
        for (const skill of this.#skills.values()) {
            skill.update(deltaTime);
        }
    }

    levelUpSkill(skillId) {
        const skill = this.#skills.get(skillId);
        if (!skill) return false;
        return skill.levelUp();
    }

    getSkillCount() {
        return this.#skills.size;
    }

    getActiveSkillCount() {
        return this.#activeSkills.size;
    }

    getTotalSkillLevel() {
        let total = 0;
        for (const skill of this.#skills.values()) {
            total += skill.level;
        }
        return total;
    }

    destroy() {
        this.#skills.clear();
        this.#activeSkills.clear();
        this.#entity = null;
    }
}

export { Skill, SkillSystem };
