/**
 * Entity.js - Base entity class for LXRN Engine.
 * Provides game logic, state management, combat system, and behavior tree.
 * Optimized with component caching and lazy loading.
 * Includes comprehensive flags and boolean state management.
 * 
 * @module Entity
 * @author LXRN
 * @version 2.0.0
 */

import Object from '../core/Object.js';
import { Logger } from '../utils/Logger.js';
import { generateId, distance, clamp } from '../utils/Helpers.js';

let BuffSystem, AggroSystem, DoTSystem, CriticalSystem, ExperienceSystem, SkillSystem;

class Entity extends Object {
    #id = null;
    #active = true;
    #state = 'idle';
    #states = new Map();
    #tags = new Set();
    #components = new Map();
    #componentCache = new Map();
    #behaviors = [];
    #isDestroyed = false;
    #parentEntity = null;
    #childrenEntities = [];
    #isInvulnerable = false;
    #invulnerableTimer = 0;
    #target = null;
    #attackCooldown = 0;
    #flags = 0;
    
    // Position flags
    #isCentered = false;
    #isLocked = false;
    #isFrozen = false;
    #isPaused = false;
    
    // State flags
    #isSelected = false;
    #isHovered = false;
    #isDragging = false;
    #isColliding = false;
    #isOnGround = false;
    #isMoving = false;
    #isJumping = false;
    #isFalling = false;
    #isAttacking = false;
    #isDefending = false;
    #isDead = false;
    
    // Lifecycle flags
    #isSpawned = false;
    #isLoaded = false;
    #isInitialized = false;
    #isUpdated = false;
    #isRendered = false;
    #isCulled = false;
    
    // Render flags
    #isFrustumCulled = true;
    #isLayerVisible = true;
    #isParentVisible = true;
    #isChildVisible = true;
    #isCastShadow = false;
    #isReceiveShadow = false;
    #isTransparent = false;
    #isBlending = false;
    #isDepthWrite = true;
    #isDepthTest = true;
    #isStatic = false;
    
    // Lazy-loaded system references
    #buffSystem = null;
    #aggroSystem = null;
    #dotSystem = null;
    #criticalSystem = null;
    #experienceSystem = null;
    #skillSystem = null;
    
    // Lazy-loaded flags
    #systemsInitialized = false;
    
    __updateQueue = [];
    __eventBuffer = [];
    __aiState = null;
    
    _hp = 100;
    _maxHp = 100;
    _speed = 1;
    _damage = 10;
    _defense = 0;
    _level = 1;
    _experience = 0;
    _nextLevelExp = 100;
    _attackRange = 50;
    _attackSpeed = 1;
    _visionRange = 300;
    _mana = 100;
    _maxMana = 100;
    _stamina = 100;
    _maxStamina = 100;
    
    name = 'Entity';
    type = 'Entity';
    userData = {};
    score = 0;
    team = 'neutral';
    faction = 'neutral';

    static FLAGS = {
        ACTIVE: 1 << 0,
        VISIBLE: 1 << 1,
        STATIC: 1 << 2,
        DIRTY: 1 << 3,
        DESTROYED: 1 << 4,
        LOCKED: 1 << 5,
        FROZEN: 1 << 6,
        PAUSED: 1 << 7,
        SELECTED: 1 << 8,
        HOVERED: 1 << 9,
        DRAGGING: 1 << 10,
        COLLIDING: 1 << 11,
        ON_GROUND: 1 << 12,
        MOVING: 1 << 13,
        JUMPING: 1 << 14,
        FALLING: 1 << 15,
        ATTACKING: 1 << 16,
        DEFENDING: 1 << 17,
        DEAD: 1 << 18,
        SPAWNED: 1 << 19,
        LOADED: 1 << 20,
        INITIALIZED: 1 << 21,
        UPDATED: 1 << 22,
        RENDERED: 1 << 23,
        CULLED: 1 << 24,
        FRUSTUM_CULLED: 1 << 25,
        LAYER_VISIBLE: 1 << 26,
        PARENT_VISIBLE: 1 << 27,
        CHILD_VISIBLE: 1 << 28,
        CAST_SHADOW: 1 << 29,
        RECEIVE_SHADOW: 1 << 30,
        TRANSPARENT: 1 << 31,
        INVULNERABLE: 1 << 32,
        CENTERED: 1 << 33
    };

    constructor(options = {}) {
        super({
            name: options.name || 'Entity',
            type: options.type || 'Entity',
            is3D: options.is3D || false,
            position: options.position || null,
            rotation: options.rotation || null,
            scale: options.scale || null,
            visible: options.visible !== undefined ? options.visible : true,
            active: options.active !== undefined ? options.active : true,
            layer: options.layer !== undefined ? options.layer : 3
        });
        
        this.#id = options.id || generateId();
        this.name = options.name || 'Entity';
        this.type = options.type || 'Entity';
        
        if (options.flags !== undefined) {
            this.#flags = options.flags;
        }
        
        if (options.isCentered !== undefined) {
            this.#isCentered = options.isCentered;
            this.#updateFlag(Entity.FLAGS.CENTERED, this.#isCentered);
        }
        
        if (options.isStatic !== undefined) {
            this.#isStatic = options.isStatic;
            this.#updateFlag(Entity.FLAGS.STATIC, this.#isStatic);
        }
        
        if (options.isLocked !== undefined) {
            this.#isLocked = options.isLocked;
            this.#updateFlag(Entity.FLAGS.LOCKED, this.#isLocked);
        }
        
        if (options.isFrozen !== undefined) {
            this.#isFrozen = options.isFrozen;
            this.#updateFlag(Entity.FLAGS.FROZEN, this.#isFrozen);
        }
        
        if (options.isPaused !== undefined) {
            this.#isPaused = options.isPaused;
            this.#updateFlag(Entity.FLAGS.PAUSED, this.#isPaused);
        }
        
        if (options.isSelected !== undefined) {
            this.#isSelected = options.isSelected;
            this.#updateFlag(Entity.FLAGS.SELECTED, this.#isSelected);
        }
        
        if (options.isHovered !== undefined) {
            this.#isHovered = options.isHovered;
            this.#updateFlag(Entity.FLAGS.HOVERED, this.#isHovered);
        }
        
        if (options.isDragging !== undefined) {
            this.#isDragging = options.isDragging;
            this.#updateFlag(Entity.FLAGS.DRAGGING, this.#isDragging);
        }
        
        if (options.isColliding !== undefined) {
            this.#isColliding = options.isColliding;
            this.#updateFlag(Entity.FLAGS.COLLIDING, this.#isColliding);
        }
        
        if (options.isOnGround !== undefined) {
            this.#isOnGround = options.isOnGround;
            this.#updateFlag(Entity.FLAGS.ON_GROUND, this.#isOnGround);
        }
        
        if (options.isMoving !== undefined) {
            this.#isMoving = options.isMoving;
            this.#updateFlag(Entity.FLAGS.MOVING, this.#isMoving);
        }
        
        if (options.isJumping !== undefined) {
            this.#isJumping = options.isJumping;
            this.#updateFlag(Entity.FLAGS.JUMPING, this.#isJumping);
        }
        
        if (options.isFalling !== undefined) {
            this.#isFalling = options.isFalling;
            this.#updateFlag(Entity.FLAGS.FALLING, this.#isFalling);
        }
        
        if (options.isAttacking !== undefined) {
            this.#isAttacking = options.isAttacking;
            this.#updateFlag(Entity.FLAGS.ATTACKING, this.#isAttacking);
        }
        
        if (options.isDefending !== undefined) {
            this.#isDefending = options.isDefending;
            this.#updateFlag(Entity.FLAGS.DEFENDING, this.#isDefending);
        }
        
        if (options.isDead !== undefined) {
            this.#isDead = options.isDead;
            this.#updateFlag(Entity.FLAGS.DEAD, this.#isDead);
        }
        
        if (options.isSpawned !== undefined) {
            this.#isSpawned = options.isSpawned;
            this.#updateFlag(Entity.FLAGS.SPAWNED, this.#isSpawned);
        }
        
        if (options.isLoaded !== undefined) {
            this.#isLoaded = options.isLoaded;
            this.#updateFlag(Entity.FLAGS.LOADED, this.#isLoaded);
        }
        
        if (options.isInitialized !== undefined) {
            this.#isInitialized = options.isInitialized;
            this.#updateFlag(Entity.FLAGS.INITIALIZED, this.#isInitialized);
        }
        
        if (options.isFrustumCulled !== undefined) {
            this.#isFrustumCulled = options.isFrustumCulled;
            this.#updateFlag(Entity.FLAGS.FRUSTUM_CULLED, this.#isFrustumCulled);
        }
        
        if (options.isCastShadow !== undefined) {
            this.#isCastShadow = options.isCastShadow;
            this.#updateFlag(Entity.FLAGS.CAST_SHADOW, this.#isCastShadow);
        }
        
        if (options.isReceiveShadow !== undefined) {
            this.#isReceiveShadow = options.isReceiveShadow;
            this.#updateFlag(Entity.FLAGS.RECEIVE_SHADOW, this.#isReceiveShadow);
        }
        
        if (options.isTransparent !== undefined) {
            this.#isTransparent = options.isTransparent;
            this.#updateFlag(Entity.FLAGS.TRANSPARENT, this.#isTransparent);
        }
        
        if (options.isInvulnerable !== undefined) {
            this.#isInvulnerable = options.isInvulnerable;
            this.#updateFlag(Entity.FLAGS.INVULNERABLE, this.#isInvulnerable);
        }
        
        if (options.hp !== undefined) {
            this._hp = options.hp;
            this._maxHp = options.hp;
        }
        if (options.mana !== undefined) {
            this._mana = options.mana;
            this._maxMana = options.mana;
        }
        if (options.stamina !== undefined) {
            this._stamina = options.stamina;
            this._maxStamina = options.stamina;
        }
        if (options.speed !== undefined) this._speed = options.speed;
        if (options.damage !== undefined) this._damage = options.damage;
        if (options.defense !== undefined) this._defense = options.defense;
        if (options.level !== undefined) {
            this._level = options.level;
            this._nextLevelExp = Math.floor(100 * Math.pow(1.5, this._level - 1));
        }
        if (options.team !== undefined) this.team = options.team;
        if (options.faction !== undefined) this.faction = options.faction;
        if (options.attackRange !== undefined) this._attackRange = options.attackRange;
        if (options.attackSpeed !== undefined) this._attackSpeed = options.attackSpeed;
        if (options.visionRange !== undefined) this._visionRange = options.visionRange;
        
        if (options.tags) {
            for (const tag of options.tags) {
                this.#tags.add(tag);
            }
        }
        
        if (options.state) this.#state = options.state;
        
        if (options.components) {
            for (const [name, component] of Object.entries(options.components)) {
                this.addComponent(name, component);
            }
        }
        
        if (options.behaviors) {
            for (const behavior of options.behaviors) {
                this.addBehavior(behavior);
            }
        }
        
        if (options.states) {
            for (const [name, callbacks] of Object.entries(options.states)) {
                this.addState(name, callbacks);
            }
        }
        
        if (options.systems !== false) {
            this.#systemsInitialized = true;
        }
        
        this.emit('created', { entity: this });
        Logger.log(`Entity created: ${this.name} (${this.type})`);
    }

    addComponent(name, component) {
        if (this.#isDestroyed) return this;
        if (this.#components.has(name)) {
            Logger.warn(`Component ${name} already exists, replacing`);
        }
        this.#components.set(name, component);
        this.#componentCache.delete(name);
        component.entity = this;
        if (typeof component.onAdd === 'function') {
            component.onAdd(this);
        }
        this.emit('componentAdded', { entity: this, name, component });
        return this;
    }

    getComponent(name) {
        if (this.#componentCache.has(name)) {
            return this.#componentCache.get(name);
        }
        const comp = this.#components.get(name);
        if (comp) {
            this.#componentCache.set(name, comp);
        }
        return comp || null;
    }

    removeComponent(name) {
        const component = this.#components.get(name);
        if (!component) return false;
        if (typeof component.onRemove === 'function') {
            component.onRemove(this);
        }
        this.#components.delete(name);
        this.#componentCache.delete(name);
        this.emit('componentRemoved', { entity: this, name });
        return true;
    }

    hasComponent(name) {
        return this.#components.has(name);
    }

    getComponents() {
        return Array.from(this.#components.keys());
    }

    clearComponentCache() {
        this.#componentCache.clear();
        this.emit('componentCacheCleared', { entity: this });
    }

    getBuffSystem() {
        if (this.#isDestroyed) return null;
        if (!this.#buffSystem) {
            if (!BuffSystem) {
                BuffSystem = require('./systems/BuffSystem.js')?.BuffSystem || 
                            (await import('./systems/BuffSystem.js')).BuffSystem;
            }
            this.#buffSystem = new BuffSystem(this);
            this.emit('buffSystemInitialized', { entity: this });
        }
        return this.#buffSystem;
    }

    getAggroSystem() {
        if (this.#isDestroyed) return null;
        if (!this.#aggroSystem) {
            if (!AggroSystem) {
                AggroSystem = require('./systems/AggroSystem.js')?.default || 
                             (await import('./systems/AggroSystem.js')).default;
            }
            this.#aggroSystem = new AggroSystem(this);
            this.emit('aggroSystemInitialized', { entity: this });
        }
        return this.#aggroSystem;
    }

    getDotSystem() {
        if (this.#isDestroyed) return null;
        if (!this.#dotSystem) {
            if (!DoTSystem) {
                DoTSystem = require('./systems/DoTSystem.js')?.DoTSystem || 
                           (await import('./systems/DoTSystem.js')).DoTSystem;
            }
            this.#dotSystem = new DoTSystem(this);
            this.emit('dotSystemInitialized', { entity: this });
        }
        return this.#dotSystem;
    }

    getCriticalSystem() {
        if (this.#isDestroyed) return null;
        if (!this.#criticalSystem) {
            if (!CriticalSystem) {
                CriticalSystem = require('./systems/CriticalSystem.js')?.default || 
                                (await import('./systems/CriticalSystem.js')).default;
            }
            this.#criticalSystem = new CriticalSystem(this);
            this.emit('criticalSystemInitialized', { entity: this });
        }
        return this.#criticalSystem;
    }

    getExperienceSystem() {
        if (this.#isDestroyed) return null;
        if (!this.#experienceSystem) {
            if (!ExperienceSystem) {
                ExperienceSystem = require('./systems/ExperienceSystem.js')?.default || 
                                  (await import('./systems/ExperienceSystem.js')).default;
            }
            this.#experienceSystem = new ExperienceSystem(this);
            this.emit('experienceSystemInitialized', { entity: this });
        }
        return this.#experienceSystem;
    }

    getSkillSystem() {
        if (this.#isDestroyed) return null;
        if (!this.#skillSystem) {
            if (!SkillSystem) {
                SkillSystem = require('./systems/SkillSystem.js')?.SkillSystem || 
                             (await import('./systems/SkillSystem.js')).SkillSystem;
            }
            this.#skillSystem = new SkillSystem(this);
            this.emit('skillSystemInitialized', { entity: this });
        }
        return this.#skillSystem;
    }

    hasBuffSystem() {
        return this.#buffSystem !== null;
    }

    hasAggroSystem() {
        return this.#aggroSystem !== null;
    }

    hasDotSystem() {
        return this.#dotSystem !== null;
    }

    hasCriticalSystem() {
        return this.#criticalSystem !== null;
    }

    hasExperienceSystem() {
        return this.#experienceSystem !== null;
    }

    hasSkillSystem() {
        return this.#skillSystem !== null;
    }

    async loadBuffSystem() {
        if (this.#buffSystem) return this.#buffSystem;
        const { BuffSystem: BS } = await import('./systems/BuffSystem.js');
        BuffSystem = BS;
        this.#buffSystem = new BuffSystem(this);
        this.emit('buffSystemLoaded', { entity: this });
        return this.#buffSystem;
    }

    async loadAggroSystem() {
        if (this.#aggroSystem) return this.#aggroSystem;
        const { default: AS } = await import('./systems/AggroSystem.js');
        AggroSystem = AS;
        this.#aggroSystem = new AggroSystem(this);
        this.emit('aggroSystemLoaded', { entity: this });
        return this.#aggroSystem;
    }

    async loadDotSystem() {
        if (this.#dotSystem) return this.#dotSystem;
        const { DoTSystem: DS } = await import('./systems/DoTSystem.js');
        DoTSystem = DS;
        this.#dotSystem = new DoTSystem(this);
        this.emit('dotSystemLoaded', { entity: this });
        return this.#dotSystem;
    }

    async loadCriticalSystem() {
        if (this.#criticalSystem) return this.#criticalSystem;
        const { default: CS } = await import('./systems/CriticalSystem.js');
        CriticalSystem = CS;
        this.#criticalSystem = new CriticalSystem(this);
        this.emit('criticalSystemLoaded', { entity: this });
        return this.#criticalSystem;
    }

    async loadExperienceSystem() {
        if (this.#experienceSystem) return this.#experienceSystem;
        const { default: ES } = await import('./systems/ExperienceSystem.js');
        ExperienceSystem = ES;
        this.#experienceSystem = new ExperienceSystem(this);
        this.emit('experienceSystemLoaded', { entity: this });
        return this.#experienceSystem;
    }

    async loadSkillSystem() {
        if (this.#skillSystem) return this.#skillSystem;
        const { SkillSystem: SS } = await import('./systems/SkillSystem.js');
        SkillSystem = SS;
        this.#skillSystem = new SkillSystem(this);
        this.emit('skillSystemLoaded', { entity: this });
        return this.#skillSystem;
    }

    setFlag(flag) {
        this.#flags |= flag;
        return this;
    }

    clearFlag(flag) {
        this.#flags &= ~flag;
        return this;
    }

    toggleFlag(flag) {
        this.#flags ^= flag;
        return this;
    }

    hasFlag(flag) {
        return (this.#flags & flag) !== 0;
    }

    getFlags() {
        return this.#flags;
    }

    setFlags(flags) {
        this.#flags = flags;
        return this;
    }

    #updateFlag(flag, value) {
        if (value) {
            this.#flags |= flag;
        } else {
            this.#flags &= ~flag;
        }
    }

    enable() {
        if (this.#isDestroyed) return this;
        super.enable();
        this.#active = true;
        this.#updateFlag(Entity.FLAGS.ACTIVE, true);
        this.emit('enabled', { entity: this });
        return this;
    }

    disable() {
        if (this.#isDestroyed) return this;
        super.disable();
        this.#active = false;
        this.#updateFlag(Entity.FLAGS.ACTIVE, false);
        this.emit('disabled', { entity: this });
        return this;
    }

    isAlive() {
        return !this.#isDestroyed && this.#active && this._hp > 0;
    }

    isDead() {
        return this._hp <= 0 || this.#isDestroyed;
    }

    canAttack(target) {
        if (!this.isAlive()) return false;
        if (!target || !target.isAlive()) return false;
        if (this.team === 'neutral' || target.team === 'neutral') return true;
        return this.team !== target.team;
    }

    attack(target) {
        if (!this.canAttack(target)) return 0;
        if (this.#attackCooldown > 0) return 0;
        this.#attackCooldown = 1 / this._attackSpeed;
        let damage = this._damage;
        let isCrit = false;
        if (this.#criticalSystem) {
            const result = this.#criticalSystem.calculateCrit(damage, target);
            damage = result.damage;
            isCrit = result.isCrit;
        } else {
            const variance = 1 + (Math.random() - 0.5) * 0.4;
            damage = Math.max(0, damage * variance - target._defense * 0.5);
        }
        const finalDamage = Math.floor(damage);
        this.emit('attack', { entity: this, target, damage: finalDamage, isCrit });
        Logger.log(`${this.name} attacked ${target.name} for ${finalDamage} damage${isCrit ? ' (CRIT!)' : ''}`);
        return target.takeDamage(finalDamage, this);
    }

    distanceTo(target) {
        if (!target || !target.position) return Infinity;
        const dx = this.position.x - target.position.x;
        const dy = this.position.y - target.position.y;
        const dz = this.position.z !== undefined && target.position.z !== undefined 
            ? this.position.z - target.position.z : 0;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    isInRange(target, range) {
        return this.distanceTo(target) <= range;
    }

    isInAttackRange(target) {
        return this.isInRange(target, this._attackRange);
    }

    isInVisionRange(target) {
        return this.isInRange(target, this._visionRange);
    }

    isAlly(entity) {
        if (!entity) return false;
        if (this.team === 'neutral' || entity.team === 'neutral') return false;
        return this.team === entity.team || this.faction === entity.faction;
    }

    isEnemy(entity) {
        if (!entity) return false;
        return !this.isAlly(entity);
    }

    getNearbyEntities(scene, radius) {
        if (!scene) return [];
        return scene.filterEntities(entity => {
            return entity !== this && 
                   entity.isAlive && 
                   entity.isAlive() && 
                   this.distanceTo(entity) <= radius;
        });
    }

    getNearbyAllies(scene, radius) {
        return this.getNearbyEntities(scene, radius).filter(e => this.isAlly(e));
    }

    getNearbyEnemies(scene, radius) {
        return this.getNearbyEntities(scene, radius).filter(e => this.isEnemy(e));
    }

    getNearestAlly(scene, radius) {
        const allies = this.getNearbyAllies(scene, radius);
        if (allies.length === 0) return null;
        return allies.reduce((a, b) => this.distanceTo(a) < this.distanceTo(b) ? a : b);
    }

    getNearestEnemy(scene, radius) {
        const enemies = this.getNearbyEnemies(scene, radius);
        if (enemies.length === 0) return null;
        return enemies.reduce((a, b) => this.distanceTo(a) < this.distanceTo(b) ? a : b);
    }

    moveToward(target, speed = null) {
        if (!target || !target.position) return;
        const moveSpeed = speed !== null ? speed : this._speed;
        const dx = target.position.x - this.position.x;
        const dy = target.position.y - this.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
            this.position.x += (dx / dist) * moveSpeed;
            this.position.y += (dy / dist) * moveSpeed;
            this.emit('moved', { entity: this, target });
        }
    }

    moveAwayFrom(target, speed = null) {
        if (!target || !target.position) return;
        const moveSpeed = speed !== null ? speed : this._speed;
        const dx = this.position.x - target.position.x;
        const dy = this.position.y - target.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 1) {
            this.position.x += (dx / dist) * moveSpeed;
            this.position.y += (dy / dist) * moveSpeed;
            this.emit('moved', { entity: this, target });
        }
    }

    setTarget(target) {
        this.#target = target;
        this.emit('targetSet', { entity: this, target });
    }

    getTarget() {
        return this.#target;
    }

    clearTarget() {
        this.#target = null;
        this.emit('targetCleared', { entity: this });
    }

    addState(stateName, callbacks = {}) {
        this.#states.set(stateName, {
            onEnter: callbacks.onEnter || null,
            onUpdate: callbacks.onUpdate || null,
            onExit: callbacks.onExit || null
        });
        this.emit('stateAdded', { entity: this, state: stateName });
        return this;
    }

    changeState(newState) {
        if (this.#state === newState) return;
        if (!this.#states.has(newState)) {
            Logger.warn(`State ${newState} not found for ${this.name}`);
            return;
        }
        const oldState = this.#state;
        const oldStateData = this.#states.get(oldState);
        const newStateData = this.#states.get(newState);
        if (oldStateData?.onExit) {
            oldStateData.onExit(this);
        }
        this.#state = newState;
        if (newStateData?.onEnter) {
            newStateData.onEnter(this);
        }
        this.emit('stateChanged', { entity: this, oldState, newState });
        Logger.log(`${this.name} changed state: ${oldState} -> ${newState}`);
    }

    getCurrentState() {
        return this.#state;
    }

    hasState(stateName) {
        return this.#states.has(stateName);
    }

    setInvulnerable(duration) {
        this.#isInvulnerable = true;
        this.#updateFlag(Entity.FLAGS.INVULNERABLE, true);
        this.#invulnerableTimer = duration;
        this.emit('invulnerable', { entity: this, duration });
    }

    isInvulnerable() {
        return this.#isInvulnerable;
    }

    takeDamage(amount, source = null) {
        if (this.#isDestroyed || !this.#active) return 0;
        if (this.#isInvulnerable) {
            this.emit('damageBlocked', { entity: this, source });
            return 0;
        }
        const actualDamage = Math.max(0, amount);
        const oldHp = this._hp;
        this._hp = Math.max(0, this._hp - actualDamage);
        const dealtDamage = oldHp - this._hp;
        this.emit('damageTaken', { entity: this, damage: dealtDamage, source });
        Logger.log(`${this.name} took ${dealtDamage} damage (HP: ${this._hp}/${this._maxHp})`);
        if (this._hp <= 0) {
            this.die();
        }
        return dealtDamage;
    }

    heal(amount) {
        if (this.#isDestroyed || !this.#active) return 0;
        if (this._hp <= 0) return 0;
        const actualHeal = Math.max(0, Math.min(amount, this._maxHp - this._hp));
        this._hp += actualHeal;
        this.emit('healed', { entity: this, heal: actualHeal });
        Logger.log(`${this.name} healed ${actualHeal} (HP: ${this._hp}/${this._maxHp})`);
        return actualHeal;
    }

    die() {
        if (this.#isDestroyed) return;
        this.#active = false;
        this.#state = 'dead';
        this.visible = false;
        this.#updateFlag(Entity.FLAGS.ACTIVE, false);
        this.#updateFlag(Entity.FLAGS.VISIBLE, false);
        this.#updateFlag(Entity.FLAGS.DEAD, true);
        this.emit('died', { entity: this });
        Logger.log(`${this.name} died`);
        this.onDeath();
    }

    revive(hp = null) {
        if (!this.#isDestroyed && this.#active) return;
        this.#isDestroyed = false;
        this.#active = true;
        this.visible = true;
        this._hp = hp !== null ? hp : this._maxHp;
        this.#state = 'idle';
        this.#updateFlag(Entity.FLAGS.ACTIVE, true);
        this.#updateFlag(Entity.FLAGS.VISIBLE, true);
        this.#updateFlag(Entity.FLAGS.DEAD, false);
        this.emit('revived', { entity: this });
        Logger.log(`${this.name} revived`);
    }

    addTag(tag) {
        this.#tags.add(tag);
        this.emit('tagAdded', { entity: this, tag });
        return this;
    }

    removeTag(tag) {
        const removed = this.#tags.delete(tag);
        if (removed) {
            this.emit('tagRemoved', { entity: this, tag });
        }
        return removed;
    }

    hasTag(tag) {
        return this.#tags.has(tag);
    }

    hasTags(tags) {
        return tags.every(tag => this.#tags.has(tag));
    }

    addBehavior(behavior) {
        if (this.#isDestroyed) return this;
        this.#behaviors.push(behavior);
        behavior.entity = this;
        if (typeof behavior.onAdd === 'function') {
            behavior.onAdd(this);
        }
        this.emit('behaviorAdded', { entity: this, behavior });
        return this;
    }

    removeBehavior(behavior) {
        const index = this.#behaviors.indexOf(behavior);
        if (index === -1) return false;
        if (typeof behavior.onRemove === 'function') {
            behavior.onRemove(this);
        }
        this.#behaviors.splice(index, 1);
        this.emit('behaviorRemoved', { entity: this, behavior });
        return true;
    }

    addChildEntity(child) {
        if (this.#isDestroyed) return this;
        if (child instanceof Entity) {
            if (child.#parentEntity) {
                child.#parentEntity.removeChildEntity(child);
            }
            this.#childrenEntities.push(child);
            child.#parentEntity = this;
            this.emit('childEntityAdded', { parent: this, child });
            child.emit('parentEntityChanged', { parent: this });
        }
        return this;
    }

    removeChildEntity(child) {
        const index = this.#childrenEntities.indexOf(child);
        if (index === -1) return false;
        this.#childrenEntities.splice(index, 1);
        child.#parentEntity = null;
        this.emit('childEntityRemoved', { parent: this, child });
        child.emit('parentEntityChanged', { parent: null });
        return true;
    }

    getAncestorEntities() {
        const ancestors = [];
        let current = this.#parentEntity;
        while (current) {
            ancestors.push(current);
            current = current.#parentEntity;
        }
        return ancestors;
    }

    getDescendantEntities() {
        const descendants = [];
        for (const child of this.#childrenEntities) {
            descendants.push(child);
            descendants.push(...child.getDescendantEntities());
        }
        return descendants;
    }

    addExperience(amount) {
        if (this.#isDestroyed || !this.#active) return;
        if (this.#experienceSystem) {
            this.#experienceSystem.addExperience(amount);
            return;
        }
        this._experience += amount;
        this.emit('experienceGained', { entity: this, amount });
        while (this._experience >= this._nextLevelExp) {
            this.levelUp();
        }
    }

    levelUp() {
        this._level++;
        this._experience -= this._nextLevelExp;
        this._nextLevelExp = Math.floor(this._nextLevelExp * 1.5);
        this._maxHp += 10;
        this._hp = this._maxHp;
        this._damage += 2;
        this._defense += 1;
        this.emit('levelUp', { entity: this, level: this._level });
        Logger.log(`${this.name} leveled up to ${this._level}!`);
        this.onLevelUp();
    }

    gainScore(points) {
        this.score += points;
        this.emit('scoreGained', { entity: this, points, totalScore: this.score });
    }

    getStats() {
        return {
            hp: this._hp,
            maxHp: this._maxHp,
            mana: this._mana,
            maxMana: this._maxMana,
            stamina: this._stamina,
            maxStamina: this._maxStamina,
            speed: this._speed,
            damage: this._damage,
            defense: this._defense,
            level: this._level,
            experience: this._experience,
            nextLevelExp: this._nextLevelExp,
            attackRange: this._attackRange,
            attackSpeed: this._attackSpeed,
            visionRange: this._visionRange
        };
    }

    centerOnScreen(viewport = null, camera = null) {
        if (this.#isDestroyed) return this;
        if (viewport) {
            this.position.x = viewport.width / 2;
            this.position.y = viewport.height / 2;
        } else if (this.is3D) {
            this.position.x = 0;
            this.position.y = 0;
            this.position.z = 0;
        } else {
            this.position.x = 0;
            this.position.y = 0;
        }
        this.#isCentered = true;
        this.#updateFlag(Entity.FLAGS.CENTERED, true);
        this.emit('centered', { entity: this });
        return this;
    }

    isCentered() {
        return this.#isCentered;
    }

    update(deltaTime) {
        if (this.#isDestroyed || !this.#active) return;
        super.update(deltaTime);
        if (this.#isInvulnerable) {
            this.#invulnerableTimer -= deltaTime;
            if (this.#invulnerableTimer <= 0) {
                this.#isInvulnerable = false;
                this.#updateFlag(Entity.FLAGS.INVULNERABLE, false);
                this.emit('invulnerabilityEnded', { entity: this });
            }
        }
        if (this.#attackCooldown > 0) {
            this.#attackCooldown -= deltaTime;
        }
        const stateData = this.#states.get(this.#state);
        if (stateData?.onUpdate) {
            stateData.onUpdate(this, deltaTime);
        }
        for (const [name, component] of this.#components) {
            if (typeof component.update === 'function') {
                component.update(deltaTime);
            }
        }
        for (const behavior of this.#behaviors) {
            if (typeof behavior.update === 'function') {
                behavior.update(deltaTime);
            }
        }
        if (this.#buffSystem) this.#buffSystem.update(deltaTime);
        if (this.#aggroSystem) this.#aggroSystem.update(deltaTime);
        if (this.#dotSystem) this.#dotSystem.update(deltaTime);
        if (this.#skillSystem) this.#skillSystem.update(deltaTime);
        this.emit('updated', { entity: this, deltaTime });
    }

    render(ctx) {
        if (this.#isDestroyed || !this.#active || !this.visible) return;
        super.render(ctx);
        for (const [name, component] of this.#components) {
            if (typeof component.render === 'function') {
                component.render(ctx);
            }
        }
        this.emit('rendered', { entity: this, ctx });
    }

    onDeath() {
        // Override in child class
    }

    onLevelUp() {
        // Override in child class
    }

    destroy() {
        if (this.#isDestroyed) return;
        this.#isDestroyed = true;
        this.#active = false;
        this.visible = false;
        this.#updateFlag(Entity.FLAGS.DESTROYED, true);
        this.#updateFlag(Entity.FLAGS.ACTIVE, false);
        this.#updateFlag(Entity.FLAGS.VISIBLE, false);
        for (const [name, component] of this.#components) {
            if (typeof component.destroy === 'function') {
                component.destroy();
            }
        }
        this.#components.clear();
        this.#componentCache.clear();
        for (const behavior of this.#behaviors) {
            if (typeof behavior.destroy === 'function') {
                behavior.destroy();
            }
        }
        this.#behaviors = [];
        if (this.#buffSystem) {
            this.#buffSystem.destroy();
            this.#buffSystem = null;
        }
        if (this.#aggroSystem) {
            this.#aggroSystem.destroy();
            this.#aggroSystem = null;
        }
        if (this.#dotSystem) {
            this.#dotSystem.destroy();
            this.#dotSystem = null;
        }
        if (this.#criticalSystem) {
            this.#criticalSystem.destroy();
            this.#criticalSystem = null;
        }
        if (this.#experienceSystem) {
            this.#experienceSystem.destroy();
            this.#experienceSystem = null;
        }
        if (this.#skillSystem) {
            this.#skillSystem.destroy();
            this.#skillSystem = null;
        }
        if (this.#parentEntity) {
            this.#parentEntity.removeChildEntity(this);
        }
        for (const child of this.#childrenEntities) {
            child.destroy();
        }
        this.#childrenEntities = [];
        super.destroy();
        this.emit('destroyed', { entity: this });
        Logger.log(`Entity destroyed: ${this.name}`);
    }

    clone(recursive = false) {
        const clone = new Entity({
            name: `${this.name}_clone`,
            type: this.type,
            is3D: this.is3D,
            position: this.position.clone ? this.position.clone() : { ...this.position },
            rotation: this.rotation.clone ? this.rotation.clone() : this.rotation,
            scale: this.scale.clone ? this.scale.clone() : { ...this.scale },
            hp: this._hp,
            maxHp: this._maxHp,
            mana: this._mana,
            maxMana: this._maxMana,
            stamina: this._stamina,
            maxStamina: this._maxStamina,
            speed: this._speed,
            damage: this._damage,
            defense: this._defense,
            level: this._level,
            team: this.team,
            faction: this.faction,
            attackRange: this._attackRange,
            attackSpeed: this._attackSpeed,
            visionRange: this._visionRange,
            tags: this.tags,
            state: this.#state,
            visible: this.visible,
            active: this.#active,
            layer: this.getLayerMask(),
            isCentered: this.#isCentered,
            isStatic: this.#isStatic,
            isLocked: this.#isLocked,
            isFrozen: this.#isFrozen,
            isPaused: this.#isPaused,
            isSelected: this.#isSelected,
            isHovered: this.#isHovered,
            isDragging: this.#isDragging,
            isColliding: this.#isColliding,
            isOnGround: this.#isOnGround,
            isMoving: this.#isMoving,
            isJumping: this.#isJumping,
            isFalling: this.#isFalling,
            isAttacking: this.#isAttacking,
            isDefending: this.#isDefending,
            isDead: this.#isDead,
            isSpawned: this.#isSpawned,
            isLoaded: this.#isLoaded,
            isInitialized: this.#isInitialized,
            isFrustumCulled: this.#isFrustumCulled,
            isCastShadow: this.#isCastShadow,
            isReceiveShadow: this.#isReceiveShadow,
            isTransparent: this.#isTransparent,
            isInvulnerable: this.#isInvulnerable,
            flags: this.#flags,
            systems: false
        });
        if (recursive) {
            for (const child of this.#childrenEntities) {
                clone.addChildEntity(child.clone(true));
            }
        }
        this.emit('cloned', { entity: this, clone });
        return clone;
    }

    get id() { return this.#id; }
    get active() { return this.#active; }
    get state() { return this.#state; }
    get tags() { return Array.from(this.#tags); }
    get components() { return Array.from(this.#components.keys()); }
    get behaviors() { return this.#behaviors; }
    get isDestroyed() { return this.#isDestroyed; }
    get parentEntity() { return this.#parentEntity; }
    get childrenEntities() { return this.#childrenEntities; }
    get target() { return this.#target; }
    get attackCooldown() { return this.#attackCooldown; }
    get isCentered() { return this.#isCentered; }
    get isStatic() { return this.#isStatic; }
    get isLocked() { return this.#isLocked; }
    get isFrozen() { return this.#isFrozen; }
    get isPaused() { return this.#isPaused; }
    get isSelected() { return this.#isSelected; }
    get isHovered() { return this.#isHovered; }
    get isDragging() { return this.#isDragging; }
    get isColliding() { return this.#isColliding; }
    get isOnGround() { return this.#isOnGround; }
    get isMoving() { return this.#isMoving; }
    get isJumping() { return this.#isJumping; }
    get isFalling() { return this.#isFalling; }
    get isAttacking() { return this.#isAttacking; }
    get isDefending() { return this.#isDefending; }
    get isDead() { return this.#isDead; }
    get isSpawned() { return this.#isSpawned; }
    get isLoaded() { return this.#isLoaded; }
    get isInitialized() { return this.#isInitialized; }
    get isUpdated() { return this.#isUpdated; }
    get isRendered() { return this.#isRendered; }
    get isCulled() { return this.#isCulled; }
    get isFrustumCulled() { return this.#isFrustumCulled; }
    get isLayerVisible() { return this.#isLayerVisible; }
    get isParentVisible() { return this.#isParentVisible; }
    get isChildVisible() { return this.#isChildVisible; }
    get isCastShadow() { return this.#isCastShadow; }
    get isReceiveShadow() { return this.#isReceiveShadow; }
    get isTransparent() { return this.#isTransparent; }
    get isBlending() { return this.#isBlending; }
    get isDepthWrite() { return this.#isDepthWrite; }
    get isDepthTest() { return this.#isDepthTest; }
    get isInvulnerable() { return this.#isInvulnerable; }
    
    get hp() { return this._hp; }
    get maxHp() { return this._maxHp; }
    get mana() { return this._mana; }
    get maxMana() { return this._maxMana; }
    get stamina() { return this._stamina; }
    get maxStamina() { return this._maxStamina; }
    get speed() { return this._speed; }
    get damage() { return this._damage; }
    get defense() { return this._defense; }
    get level() { return this._level; }
    get experience() { return this._experience; }
    get nextLevelExp() { return this._nextLevelExp; }
    get attackRange() { return this._attackRange; }
    get attackSpeed() { return this._attackSpeed; }
    get visionRange() { return this._visionRange; }

    set state(value) {
        this.changeState(value);
    }

    set hp(value) {
        if (value < this._hp) {
            this.takeDamage(this._hp - value);
        } else if (value > this._hp) {
            this.heal(value - this._hp);
        }
    }

    set speed(value) {
        this._speed = value;
        this.emit('speedChanged', { entity: this, speed: value });
    }

    set damage(value) {
        this._damage = value;
        this.emit('damageChanged', { entity: this, damage: value });
    }

    set defense(value) {
        this._defense = value;
        this.emit('defenseChanged', { entity: this, defense: value });
    }

    set attackRange(value) {
        this._attackRange = value;
        this.emit('attackRangeChanged', { entity: this, attackRange: value });
    }

    set attackSpeed(value) {
        this._attackSpeed = value;
        this.emit('attackSpeedChanged', { entity: this, attackSpeed: value });
    }

    set visionRange(value) {
        this._visionRange = value;
        this.emit('visionRangeChanged', { entity: this, visionRange: value });
    }

    set isCentered(value) {
        this.#isCentered = value;
        this.#updateFlag(Entity.FLAGS.CENTERED, value);
        if (value) {
            this.centerOnScreen();
        }
    }

    set isStatic(value) {
        this.#isStatic = value;
        this.#updateFlag(Entity.FLAGS.STATIC, value);
    }

    set isLocked(value) {
        this.#isLocked = value;
        this.#updateFlag(Entity.FLAGS.LOCKED, value);
    }

    set isFrozen(value) {
        this.#isFrozen = value;
        this.#updateFlag(Entity.FLAGS.FROZEN, value);
    }

    set isPaused(value) {
        this.#isPaused = value;
        this.#updateFlag(Entity.FLAGS.PAUSED, value);
    }

    set isSelected(value) {
        this.#isSelected = value;
        this.#updateFlag(Entity.FLAGS.SELECTED, value);
    }

    set isHovered(value) {
        this.#isHovered = value;
        this.#updateFlag(Entity.FLAGS.HOVERED, value);
    }

    set isDragging(value) {
        this.#isDragging = value;
        this.#updateFlag(Entity.FLAGS.DRAGGING, value);
    }

    set isColliding(value) {
        this.#isColliding = value;
        this.#updateFlag(Entity.FLAGS.COLLIDING, value);
    }

    set isOnGround(value) {
        this.#isOnGround = value;
        this.#updateFlag(Entity.FLAGS.ON_GROUND, value);
    }

    set isMoving(value) {
        this.#isMoving = value;
        this.#updateFlag(Entity.FLAGS.MOVING, value);
    }

    set isJumping(value) {
        this.#isJumping = value;
        this.#updateFlag(Entity.FLAGS.JUMPING, value);
    }

    set isFalling(value) {
        this.#isFalling = value;
        this.#updateFlag(Entity.FLAGS.FALLING, value);
    }

    set isAttacking(value) {
        this.#isAttacking = value;
        this.#updateFlag(Entity.FLAGS.ATTACKING, value);
    }

    set isDefending(value) {
        this.#isDefending = value;
        this.#updateFlag(Entity.FLAGS.DEFENDING, value);
    }

    set isDead(value) {
        this.#isDead = value;
        this.#updateFlag(Entity.FLAGS.DEAD, value);
    }

    set isSpawned(value) {
        this.#isSpawned = value;
        this.#updateFlag(Entity.FLAGS.SPAWNED, value);
    }

    set isLoaded(value) {
        this.#isLoaded = value;
        this.#updateFlag(Entity.FLAGS.LOADED, value);
    }

    set isInitialized(value) {
        this.#isInitialized = value;
        this.#updateFlag(Entity.FLAGS.INITIALIZED, value);
    }

    set isFrustumCulled(value) {
        this.#isFrustumCulled = value;
        this.#updateFlag(Entity.FLAGS.FRUSTUM_CULLED, value);
    }

    set isCastShadow(value) {
        this.#isCastShadow = value;
        this.#updateFlag(Entity.FLAGS.CAST_SHADOW, value);
    }

    set isReceiveShadow(value) {
        this.#isReceiveShadow = value;
        this.#updateFlag(Entity.FLAGS.RECEIVE_SHADOW, value);
    }

    set isTransparent(value) {
        this.#isTransparent = value;
        this.#updateFlag(Entity.FLAGS.TRANSPARENT, value);
    }

    set isInvulnerable(value) {
        this.#isInvulnerable = value;
        this.#updateFlag(Entity.FLAGS.INVULNERABLE, value);
    }

    toString() {
        return `Entity(name=${this.name}, type=${this.type}, active=${this.#active}, hp=${this._hp}/${this._maxHp}, level=${this._level}, state=${this.#state}, team=${this.team}, centered=${this.#isCentered}, flags=${this.#flags}, children=${this.#childrenEntities.length})`;
    }
}

export default Entity;
