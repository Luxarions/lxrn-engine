/**
 * Timer.js - Advanced timer system for LXRN Engine.
 * Provides countdowns, intervals, delays, cooldowns, and tickers.
 * Essential for both game logic and rendering.
 * 
 * @module Timer
 * @author LXRN
 * @version 1.0.0
 */

import EventEmitter from '../core/EventEmitter.js';
import { Logger } from '../utils/Logger.js';
import { clamp } from '../utils/Helpers.js';

/**
 * Timer states
 */
export const TIMER_STATE = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    COMPLETED: 'completed',
    STOPPED: 'stopped'
};

class Timer extends EventEmitter {
    #id = null;
    #duration = 0;
    #remaining = 0;
    #elapsed = 0;
    #state = TIMER_STATE.IDLE;
    #isRepeating = false;
    #isLooping = false;
    #isPaused = false;
    #isDestroyed = false;
    #tickInterval = 0;
    #tickTimer = 0;
    #startTime = 0;
    #timeScale = 1;
    #count = 0;
    #maxCount = 0;
    #callback = null;
    #onComplete = null;
    #onTick = null;
    #onStart = null;
    #onPause = null;
    #onResume = null;
    #onStop = null;
    #onReset = null;
    #data = null;
    
    __cache = {};
    __lastTick = 0;

    constructor(options = {}) {
        super();
        
        this.#id = options.id || this.#generateId();
        this.#duration = options.duration || 0;
        this.#remaining = this.#duration;
        this.#isRepeating = options.repeat || false;
        this.#isLooping = options.loop || false;
        this.#tickInterval = options.tickInterval || 0;
        this.#timeScale = options.timeScale || 1;
        this.#maxCount = options.maxCount || 0;
        this.#callback = options.callback || null;
        this.#onComplete = options.onComplete || null;
        this.#onTick = options.onTick || null;
        this.#onStart = options.onStart || null;
        this.#onPause = options.onPause || null;
        this.#onResume = options.onResume || null;
        this.#onStop = options.onStop || null;
        this.#onReset = options.onReset || null;
        this.#data = options.data || null;
        
        if (options.autoStart) {
            this.start();
        }
        
        Logger.log(`Timer created: ${this.#id} (${this.#duration}s)`);
        this.emit('created', { timer: this });
    }

    get id() { return this.#id; }
    get duration() { return this.#duration; }
    get remaining() { return this.#remaining; }
    get elapsed() { return this.#elapsed; }
    get state() { return this.#state; }
    get isRunning() { return this.#state === TIMER_STATE.RUNNING; }
    get isPaused() { return this.#state === TIMER_STATE.PAUSED; }
    get isCompleted() { return this.#state === TIMER_STATE.COMPLETED; }
    get isStopped() { return this.#state === TIMER_STATE.STOPPED; }
    get isIdle() { return this.#state === TIMER_STATE.IDLE; }
    get isRepeating() { return this.#isRepeating; }
    get isLooping() { return this.#isLooping; }
    get tickInterval() { return this.#tickInterval; }
    get timeScale() { return this.#timeScale; }
    get count() { return this.#count; }
    get maxCount() { return this.#maxCount; }
    get progress() { return this.#duration > 0 ? clamp(this.#elapsed / this.#duration, 0, 1) : 0; }
    get remainingProgress() { return 1 - this.progress; }
    get data() { return this.#data; }

    /**
     * Starts the timer.
     * 
     * @param {number} duration - Optional new duration
     * @returns {Timer} This
     */
    start(duration = null) {
        if (this.#isDestroyed) return this;
        
        if (duration !== null) {
            this.#duration = duration;
            this.#remaining = duration;
        }
        
        if (this.#remaining <= 0) {
            this.#remaining = this.#duration;
        }
        
        this.#state = TIMER_STATE.RUNNING;
        this.#elapsed = 0;
        this.#tickTimer = 0;
        this.#startTime = performance.now();
        this.#count = 0;
        
        if (this.#onStart) {
            this.#onStart(this);
        }
        
        this.emit('started', { timer: this });
        Logger.log(`Timer started: ${this.#id}`);
        return this;
    }

    /**
     * Pauses the timer.
     * 
     * @returns {Timer} This
     */
    pause() {
        if (this.#isDestroyed || this.#state !== TIMER_STATE.RUNNING) return this;
        
        this.#state = TIMER_STATE.PAUSED;
        this.#isPaused = true;
        
        if (this.#onPause) {
            this.#onPause(this);
        }
        
        this.emit('paused', { timer: this });
        Logger.log(`Timer paused: ${this.#id}`);
        return this;
    }

    /**
     * Resumes the timer.
     * 
     * @returns {Timer} This
     */
    resume() {
        if (this.#isDestroyed || this.#state !== TIMER_STATE.PAUSED) return this;
        
        this.#state = TIMER_STATE.RUNNING;
        this.#isPaused = false;
        
        if (this.#onResume) {
            this.#onResume(this);
        }
        
        this.emit('resumed', { timer: this });
        Logger.log(`Timer resumed: ${this.#id}`);
        return this;
    }

    /**
     * Stops the timer.
     * 
     * @returns {Timer} This
     */
    stop() {
        if (this.#isDestroyed) return this;
        
        this.#state = TIMER_STATE.STOPPED;
        this.#remaining = 0;
        
        if (this.#onStop) {
            this.#onStop(this);
        }
        
        this.emit('stopped', { timer: this });
        Logger.log(`Timer stopped: ${this.#id}`);
        return this;
    }

    /**
     * Resets the timer.
     * 
     * @param {number} duration - Optional new duration
     * @returns {Timer} This
     */
    reset(duration = null) {
        if (this.#isDestroyed) return this;
        
        if (duration !== null) {
            this.#duration = duration;
        }
        
        this.#remaining = this.#duration;
        this.#elapsed = 0;
        this.#tickTimer = 0;
        this.#count = 0;
        this.#state = TIMER_STATE.IDLE;
        this.#isPaused = false;
        
        if (this.#onReset) {
            this.#onReset(this);
        }
        
        this.emit('reset', { timer: this });
        Logger.log(`Timer reset: ${this.#id}`);
        return this;
    }

    /**
     * Restarts the timer.
     * 
     * @param {number} duration - Optional new duration
     * @returns {Timer} This
     */
    restart(duration = null) {
        this.reset(duration);
        return this.start();
    }

    /**
     * Updates the timer.
     * 
     * @param {number} deltaTime - Delta time
     * @returns {Timer} This
     */
    update(deltaTime) {
        if (this.#isDestroyed) return this;
        if (this.#state !== TIMER_STATE.RUNNING) return this;
        
        const scaledDelta = deltaTime * this.#timeScale;
        this.#elapsed += scaledDelta;
        this.#remaining -= scaledDelta;
        
        // Tick interval
        if (this.#tickInterval > 0) {
            this.#tickTimer += scaledDelta;
            if (this.#tickTimer >= this.#tickInterval) {
                this.#tickTimer = 0;
                this.#tick();
            }
        }
        
        // Check completion
        if (this.#remaining <= 0) {
            this.#complete();
        }
        
        this.emit('updated', { timer: this, deltaTime: scaledDelta });
        return this;
    }

    /**
     * Handles timer completion.
     * 
     * @private
     */
    #complete() {
        this.#count++;
        this.#state = TIMER_STATE.COMPLETED;
        
        if (this.#onComplete) {
            this.#onComplete(this);
        }
        
        if (this.#callback) {
            this.#callback(this);
        }
        
        this.emit('completed', { timer: this });
        Logger.log(`Timer completed: ${this.#id} (${this.#count}x)`);
        
        // Handle repeat/loop
        if (this.#isRepeating || this.#isLooping) {
            if (this.#maxCount > 0 && this.#count >= this.#maxCount) {
                this.stop();
                return;
            }
            this.#remaining = this.#duration;
            this.#elapsed = 0;
            this.#state = TIMER_STATE.RUNNING;
            this.emit('repeat', { timer: this });
        }
    }

    /**
     * Handles timer tick.
     * 
     * @private
     */
    #tick() {
        if (this.#onTick) {
            this.#onTick(this);
        }
        this.emit('tick', { timer: this });
    }

    /**
     * Sets the time scale.
     * 
     * @param {number} scale - Time scale
     * @returns {Timer} This
     */
    setTimeScale(scale) {
        this.#timeScale = Math.max(0, scale);
        this.emit('timeScaleChanged', { timer: this, scale });
        return this;
    }

    /**
     * Extends the timer duration.
     * 
     * @param {number} extra - Extra time in seconds
     * @returns {Timer} This
     */
    extend(extra) {
        if (this.#isDestroyed) return this;
        this.#remaining += extra;
        this.#duration += extra;
        this.emit('extended', { timer: this, extra });
        return this;
    }

    /**
     * Reduces the timer duration.
     * 
     * @param {number} amount - Time to reduce
     * @returns {Timer} This
     */
    reduce(amount) {
        if (this.#isDestroyed) return this;
        this.#remaining = Math.max(0, this.#remaining - amount);
        this.emit('reduced', { timer: this, amount });
        return this;
    }

    /**
     * Gets remaining time as string.
     * 
     * @param {string} format - Format: 'mm:ss', 'hh:mm:ss', 'ms'
     * @returns {string} Formatted time
     */
    getTimeString(format = 'mm:ss') {
        const remaining = Math.max(0, this.#remaining);
        const hours = Math.floor(remaining / 3600);
        const minutes = Math.floor((remaining % 3600) / 60);
        const seconds = Math.floor(remaining % 60);
        const ms = Math.floor((remaining % 1) * 1000);
        
        switch (format) {
            case 'hh:mm:ss':
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            case 'mm:ss':
                return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            case 'ms':
                return `${Math.floor(remaining * 1000)}ms`;
            case 'seconds':
                return `${remaining.toFixed(1)}s`;
            default:
                return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
    }

    /**
     * Gets progress as string.
     * 
     * @returns {string} Progress percentage
     */
    getProgressString() {
        return `${(this.progress * 100).toFixed(1)}%`;
    }

    /**
     * Creates a clone of this timer.
     * 
     * @returns {Timer} Cloned timer
     */
    clone() {
        const clone = new Timer({
            duration: this.#duration,
            repeat: this.#isRepeating,
            loop: this.#isLooping,
            tickInterval: this.#tickInterval,
            timeScale: this.#timeScale,
            maxCount: this.#maxCount,
            callback: this.#callback,
            data: this.#data,
            autoStart: false
        });
        
        clone.#state = this.#state;
        clone.#remaining = this.#remaining;
        clone.#elapsed = this.#elapsed;
        clone.#count = this.#count;
        
        return clone;
    }

    /**
     * Destroys the timer.
     */
    destroy() {
        if (this.#isDestroyed) return;
        
        this.#isDestroyed = true;
        this.#state = TIMER_STATE.STOPPED;
        this.removeAllListeners();
        Logger.log(`Timer destroyed: ${this.#id}`);
    }

    /**
     * Checks if the timer is destroyed.
     * 
     * @returns {boolean} True if destroyed
     */
    isDestroyed() {
        return this.#isDestroyed;
    }

    /**
     * Generates a unique ID.
     * 
     * @private
     * @returns {string} Unique ID
     */
    #generateId() {
        return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    toString() {
        return `Timer(id=${this.#id}, state=${this.#state}, remaining=${this.#remaining.toFixed(2)}s, elapsed=${this.#elapsed.toFixed(2)}s, count=${this.#count}, duration=${this.#duration}s)`;
    }
}

/**
 * TimerManager - Manages multiple timers.
 */
class TimerManager {
    #timers = new Map();
    #isDestroyed = false;

    constructor() {
        Logger.log('TimerManager created');
    }

    /**
     * Creates a timer.
     * 
     * @param {Object} options - Timer options
     * @returns {Timer} Created timer
     */
    createTimer(options = {}) {
        if (this.#isDestroyed) return null;
        
        const timer = new Timer(options);
        this.#timers.set(timer.id, timer);
        this.emit('timerCreated', { timer });
        return timer;
    }

    /**
     * Gets a timer by ID.
     * 
     * @param {string} id - Timer ID
     * @returns {Timer|null} Timer or null
     */
    getTimer(id) {
        return this.#timers.get(id) || null;
    }

    /**
     * Removes a timer.
     * 
     * @param {string} id - Timer ID
     * @returns {boolean} True if removed
     */
    removeTimer(id) {
        const timer = this.#timers.get(id);
        if (!timer) return false;
        
        timer.destroy();
        this.#timers.delete(id);
        return true;
    }

    /**
     * Removes all timers.
     */
    removeAllTimers() {
        for (const [id, timer] of this.#timers) {
            timer.destroy();
        }
        this.#timers.clear();
    }

    /**
     * Updates all timers.
     * 
     * @param {number} deltaTime - Delta time
     */
    update(deltaTime) {
        if (this.#isDestroyed) return;
        
        for (const [id, timer] of this.#timers) {
            if (!timer.isDestroyed()) {
                timer.update(deltaTime);
            }
        }
    }

    /**
     * Gets all timers.
     * 
     * @returns {Timer[]} Array of timers
     */
    getTimers() {
        return Array.from(this.#timers.values());
    }

    /**
     * Gets timer count.
     * 
     * @returns {number} Timer count
     */
    getTimerCount() {
        return this.#timers.size;
    }

    /**
     * Destroys the timer manager.
     */
    destroy() {
        if (this.#isDestroyed) return;
        
        this.#isDestroyed = true;
        this.removeAllTimers();
        Logger.log('TimerManager destroyed');
    }

    toString() {
        return `TimerManager(timers=${this.#timers.size})`;
    }
}

export { Timer, TimerManager, TIMER_STATE };
export default Timer;
