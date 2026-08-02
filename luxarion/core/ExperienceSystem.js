/**
 * ExperienceSystem.js - Experience and leveling system for LXRN Engine.
 * Manages XP gain, level progression, and stat growth.
 * 
 * @module ExperienceSystem
 * @author LXRN
 * @version 1.0.0
 */

import Entity from '../core/Entity.js';
import { Logger } from '../utils/Logger.js';

class ExperienceSystem {
    #entity = null;
    #experience = 0;
    #maxLevel = 100;
    #levelMultiplier = 1.5;
    #baseExpRequired = 100;
    #expModifier = 1;
    #levelUpStats = {
        hp: 10,
        damage: 2,
        defense: 1,
        speed: 0.5
    };
    #onLevelUp = null;
    
    constructor(entity, options = {}) {
        if (!(entity instanceof Entity)) {
            throw new Error('ExperienceSystem requires an Entity');
        }
        this.#entity = entity;
        this.#experience = options.experience || 0;
        this.#maxLevel = options.maxLevel || 100;
        this.#levelMultiplier = options.levelMultiplier || 1.5;
        this.#baseExpRequired = options.baseExpRequired || 100;
        this.#expModifier = options.expModifier || 1;
        this.#levelUpStats = options.levelUpStats || {
            hp: 10,
            damage: 2,
            defense: 1,
            speed: 0.5
        };
        this.#onLevelUp = options.onLevelUp || null;
        this.#entity.addComponent('experienceSystem', this);
    }

    get experience() { return this.#experience; }
    get level() { return this.#entity._level || 1; }
    get maxLevel() { return this.#maxLevel; }
    get expModifier() { return this.#expModifier; }

    set expModifier(value) {
        this.#expModifier = Math.max(0, value);
    }

    getExpRequired(level) {
        return Math.floor(this.#baseExpRequired * Math.pow(this.#levelMultiplier, level - 1));
    }

    getCurrentExpRequired() {
        return this.getExpRequired(this.level);
    }

    getExpProgress() {
        const required = this.getCurrentExpRequired();
        return Math.min(1, this.#experience / required);
    }

    getExpProgressPercent() {
        return this.getExpProgress() * 100;
    }

    getExpToNextLevel() {
        return Math.max(0, this.getCurrentExpRequired() - this.#experience);
    }

    addExperience(amount) {
        if (this.level >= this.#maxLevel) return;
        
        const actualAmount = Math.floor(amount * this.#expModifier);
        this.#experience += actualAmount;
        
        this.#entity.emit('experienceGained', { 
            entity: this.#entity, 
            amount: actualAmount,
            total: this.#experience
        });
        
        // Check for level up
        while (this.#experience >= this.getCurrentExpRequired() && this.level < this.#maxLevel) {
            this.levelUp();
        }
    }

    levelUp() {
        if (this.level >= this.#maxLevel) return;
        
        const oldLevel = this.level;
        this.#experience -= this.getCurrentExpRequired();
        this.#entity._level++;
        
        // Apply level up stats
        this.#entity._maxHp += this.#levelUpStats.hp;
        this.#entity._hp = this.#entity._maxHp;
        this.#entity._damage += this.#levelUpStats.damage;
        this.#entity._defense += this.#levelUpStats.defense;
        this.#entity._speed += this.#levelUpStats.speed;
        
        if (this.#onLevelUp) {
            this.#onLevelUp(this.#entity, this.level);
        }
        
        this.#entity.emit('levelUp', { 
            entity: this.#entity, 
            oldLevel,
            newLevel: this.level,
            stats: this.#levelUpStats
        });
        
        Logger.log(`${this.#entity.name} leveled up from ${oldLevel} to ${this.level}!`);
    }

    setLevel(level) {
        if (level < 1 || level > this.#maxLevel) return;
        
        this.#entity._level = level;
        this.#experience = 0;
        this.#entity.emit('levelSet', { entity: this.#entity, level });
    }

    resetExperience() {
        this.#experience = 0;
        this.#entity.emit('experienceReset', { entity: this.#entity });
    }

    getLevelUpStats() {
        return { ...this.#levelUpStats };
    }

    setLevelUpStats(stats) {
        this.#levelUpStats = { ...this.#levelUpStats, ...stats };
    }

    getStats() {
        return {
            level: this.level,
            experience: this.#experience,
            maxLevel: this.#maxLevel,
            expRequired: this.getCurrentExpRequired(),
            expProgress: this.getExpProgressPercent(),
            expToNextLevel: this.getExpToNextLevel(),
            expModifier: this.#expModifier,
            levelMultiplier: this.#levelMultiplier
        };
    }

    getLevelProgress(level) {
        if (level < 1 || level > this.#maxLevel) return 0;
        return (level - 1) / (this.#maxLevel - 1);
    }

    destroy() {
        this.#entity = null;
    }
}

export default ExperienceSystem;
