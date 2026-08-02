/**
 * Clock.js - Time management system for LXRN Engine.
 * Provides delta time, FPS tracking, timers, and time scale control.
 * Essential for both game logic and rendering.
 * 
 * @module Clock
 * @author LXRN
 * @version 1.0.0
 */

import EventEmitter from '../core/EventEmitter.js';
import { Logger } from '../utils/Logger.js';

class Clock extends EventEmitter {
    #startTime = 0;
    #lastTime = 0;
    #deltaTime = 0;
    #fixedDeltaTime = 1 / 60;
    #elapsedTime = 0;
    #timeScale = 1;
    #isPaused = false;
    #isRunning = false;
    #fps = 0;
    #frameCount = 0;
    #fpsUpdateInterval = 0.5;
    #fpsTimer = 0;
    #maxDeltaTime = 0.1;
    #fixedTimestep = false;
    #accumulator = 0;
    #frameTime = 0;
    #smoothDeltaTime = 0;
    #deltaSmoothing = 0.1;
    #timers = new Map();
    #timerId = 0;
    #isDestroyed = false;
    
    __performance = null;
    __lastTimestamp = 0;
    __smoothFPS = 0;

    constructor(options = {}) {
        super();
        
        this.#startTime = performance.now();
        this.#lastTime = this.#startTime;
        this.#fixedDeltaTime = options.fixedDeltaTime || 1 / 60;
        this.#maxDeltaTime = options.maxDeltaTime || 0.1;
        this.#deltaSmoothing = options.deltaSmoothing || 0.1;
        this.#fpsUpdateInterval = options.fpsUpdateInterval || 0.5;
        
        if (options.fixedTimestep !== undefined) {
            this.#fixedTimestep = options.fixedTimestep;
        }
        
        if (options.timeScale !== undefined) {
            this.#timeScale = options.timeScale;
        }
        
        this.#isRunning = true;
        
        Logger.log('Clock created');
        this.emit('created', { clock: this });
    }

    get deltaTime() { return this.#smoothDeltaTime; }
    get rawDeltaTime() { return this.#deltaTime; }
    get fixedDeltaTime() { return this.#fixedDeltaTime; }
    get elapsedTime() { return this.#elapsedTime; }
    get timeScale() { return this.#timeScale; }
    get fps() { return this.#smoothFPS || this.#fps; }
    get isPaused() { return this.#isPaused; }
    get isRunning() { return this.#isRunning; }
    get frameCount() { return this.#frameCount; }

    /**
     * Updates the clock with the current timestamp.
     * Called once per frame in the game loop.
     * 
     * @param {number} timestamp - Current timestamp from requestAnimationFrame
     * @returns {number} Delta time in seconds
     */
    update(timestamp = null) {
        if (this.#isDestroyed) return 0;
        
        const now = timestamp || performance.now();
        const rawDelta = (now - this.#lastTime) / 1000;
        
        this.#deltaTime = Math.min(rawDelta, this.#maxDeltaTime);
        this.#lastTime = now;
        
        if (this.#isPaused) {
            this.#deltaTime = 0;
            this.#smoothDeltaTime = 0;
            return 0;
        }
        
        const scaledDelta = this.#deltaTime * this.#timeScale;
        
        // Smooth delta time
        this.#smoothDeltaTime += (scaledDelta - this.#smoothDeltaTime) * this.#deltaSmoothing;
        
        if (this.#fixedTimestep) {
            return this.#updateFixed(scaledDelta);
        }
        
        this.#elapsedTime += scaledDelta;
        this.#frameTime = scaledDelta;
        this.#frameCount++;
        
        this.#updateFPS();
        this.#updateTimers(scaledDelta);
        
        this.emit('updated', { 
            clock: this, 
            deltaTime: this.#smoothDeltaTime,
            elapsedTime: this.#elapsedTime,
            fps: this.#fps
        });
        
        return this.#smoothDeltaTime;
    }

    /**
     * Updates the clock with fixed timestep.
     * 
     * @private
     * @param {number} delta - Delta time
     * @returns {number} Delta time
     */
    #updateFixed(delta) {
        this.#accumulator += delta;
        
        let fixedUpdates = 0;
        const maxUpdates = 10;
        
        while (this.#accumulator >= this.#fixedDeltaTime && fixedUpdates < maxUpdates) {
            this.#elapsedTime += this.#fixedDeltaTime;
            this.#accumulator -= this.#fixedDeltaTime;
            fixedUpdates++;
            this.#frameCount++;
            
            this.emit('fixedUpdate', {
                clock: this,
                fixedDelta: this.#fixedDeltaTime,
                updateCount: fixedUpdates
            });
        }
        
        if (fixedUpdates === 0) {
            this.#frameTime = 0;
        } else {
            this.#frameTime = this.#fixedDeltaTime;
        }
        
        this.#updateFPS();
        this.#updateTimers(this.#fixedDeltaTime);
        
        return this.#fixedDeltaTime;
    }

    /**
     * Updates FPS tracking.
     * 
     * @private
     */
    #updateFPS() {
        this.#fpsTimer += this.#deltaTime;
        
        if (this.#fpsTimer >= this.#fpsUpdateInterval) {
            const elapsed = this.#fpsTimer;
            this.#fps = Math.round(this.#frameCount / elapsed);
            this.#smoothFPS += (this.#fps - this.#smoothFPS) * 0.1;
            this.#frameCount = 0;
            this.#fpsTimer = 0;
            
            this.emit('fpsUpdate', { clock: this, fps: this.#fps, smoothFPS: this.#smoothFPS });
        }
    }

    /**
     * Updates all active timers.
     * 
     * @private
     * @param {number} delta - Delta time
     */
    #updateTimers(delta) {
        const expired = [];
        
        for (const [id, timer] of this.#timers) {
            timer.remaining -= delta;
            
            if (timer.remaining <= 0) {
                expired.push(id);
                
                try {
                    timer.callback();
                } catch (error) {
                    Logger.error(`Timer callback error: ${error}`);
                }
                
                if (!timer.repeat) {
                    this.emit('timerComplete', { clock: this, timerId: id, timer });
                }
            }
            
            if (timer.onTick) {
                timer.onTick(timer.remaining, timer.elapsed);
            }
        }
        
        for (const id of expired) {
            const timer = this.#timers.get(id);
            if (timer && timer.repeat) {
                timer.remaining += timer.duration;
                timer.elapsed += timer.duration;
            } else {
                this.#timers.delete(id);
            }
        }
    }

    /**
     * Sets the time scale (slow-mo / fast-forward).
     * 
     * @param {number} scale - Time scale (0 = pause, 1 = normal)
     * @returns {Clock} This
     */
    setTimeScale(scale) {
        if (this.#isDestroyed) return this;
        
        const oldScale = this.#timeScale;
        this.#timeScale = Math.max(0, scale);
        
        this.emit('timeScaleChanged', { 
            clock: this, 
            oldScale, 
            newScale: this.#timeScale 
        });
        
        Logger.log(`Time scale changed: ${oldScale} -> ${this.#timeScale}`);
        return this;
    }

    /**
     * Gets the time scale.
     * 
     * @returns {number} Time scale
     */
    getTimeScale() {
        return this.#timeScale;
    }

    /**
     * Pauses the clock.
     * 
     * @returns {Clock} This
     */
    pause() {
        if (this.#isDestroyed) return this;
        if (this.#isPaused) return this;
        
        this.#isPaused = true;
        this.emit('paused', { clock: this });
        Logger.log('Clock paused');
        return this;
    }

    /**
     * Resumes the clock.
     * 
     * @returns {Clock} This
     */
    resume() {
        if (this.#isDestroyed) return this;
        if (!this.#isPaused) return this;
        
        this.#isPaused = false;
        this.#lastTime = performance.now();
        this.emit('resumed', { clock: this });
        Logger.log('Clock resumed');
        return this;
    }

    /**
     * Toggles pause state.
     * 
     * @returns {boolean} New pause state
     */
    togglePause() {
        if (this.#isPaused) {
            this.resume();
        } else {
            this.pause();
        }
        return this.#isPaused;
    }

    /**
     * Creates a timer.
     * 
     * @param {number} duration - Timer duration in seconds
     * @param {Function} callback - Callback when timer completes
     * @param {Object} options - Timer options
     * @param {boolean} options.repeat - Whether to repeat
     * @param {Function} options.onTick - Called on each tick
     * @param {string} options.name - Timer name
     * @param {boolean} options.autoStart - Auto start timer
     * @returns {string} Timer ID
     */
    createTimer(duration, callback, options = {}) {
        if (this.#isDestroyed) return null;
        
        const id = `timer_${++this.#timerId}`;
        const timer = {
            id,
            duration,
            remaining: duration,
            elapsed: 0,
            callback,
            repeat: options.repeat || false,
            onTick: options.onTick || null,
            name: options.name || `Timer ${this.#timerId}`,
            startTime: this.#elapsedTime
        };
        
        this.#timers.set(id, timer);
        this.emit('timerCreated', { clock: this, timerId: id, timer });
        Logger.log(`Timer created: ${timer.name} (${duration}s)`);
        
        return id;
    }

    /**
     * Creates a repeating timer.
     * 
     * @param {number} interval - Interval in seconds
     * @param {Function} callback - Callback on each interval
     * @param {Object} options - Timer options
     * @returns {string} Timer ID
     */
    createInterval(interval, callback, options = {}) {
        return this.createTimer(interval, callback, { 
            ...options, 
            repeat: true,
            name: options.name || `Interval ${this.#timerId}`
        });
    }

    /**
     * Creates a delayed callback.
     * 
     * @param {number} delay - Delay in seconds
     * @param {Function} callback - Callback after delay
     * @param {Object} options - Timer options
     * @returns {string} Timer ID
     */
    createTimeout(delay, callback, options = {}) {
        return this.createTimer(delay, callback, { 
            ...options, 
            repeat: false,
            name: options.name || `Timeout ${this.#timerId}`
        });
    }

    /**
     * Removes a timer.
     * 
     * @param {string} timerId - Timer ID
     * @returns {boolean} True if removed
     */
    removeTimer(timerId) {
        const deleted = this.#timers.delete(timerId);
        if (deleted) {
            this.emit('timerRemoved', { clock: this, timerId });
            Logger.log(`Timer removed: ${timerId}`);
        }
        return deleted;
    }

    /**
     * Removes all timers.
     * 
     * @returns {Clock} This
     */
    removeAllTimers() {
        this.#timers.clear();
        this.emit('allTimersRemoved', { clock: this });
        Logger.log('All timers removed');
        return this;
    }

    /**
     * Gets a timer by ID.
     * 
     * @param {string} timerId - Timer ID
     * @returns {Object|null} Timer object
     */
    getTimer(timerId) {
        return this.#timers.get(timerId) || null;
    }

    /**
     * Gets all timers.
     * 
     * @returns {Object[]} Array of timers
     */
    getTimers() {
        return Array.from(this.#timers.values());
    }

    /**
     * Gets timer count.
     * 
     * @returns {number} Number of timers
     */
    getTimerCount() {
        return this.#timers.size;
    }

    /**
     * Checks if a timer exists.
     * 
     * @param {string} timerId - Timer ID
     * @returns {boolean} True if exists
     */
    hasTimer(timerId) {
        return this.#timers.has(timerId);
    }

    /**
     * Gets the current FPS.
     * 
     * @returns {number} Current FPS
     */
    getFPS() {
        return this.#smoothFPS || this.#fps;
    }

    /**
     * Gets the frame time.
     * 
     * @returns {number} Frame time in seconds
     */
    getFrameTime() {
        return this.#frameTime;
    }

    /**
     * Resets the clock.
     * 
     * @returns {Clock} This
     */
    reset() {
        if (this.#isDestroyed) return this;
        
        this.#elapsedTime = 0;
        this.#frameCount = 0;
        this.#fps = 0;
        this.#smoothFPS = 0;
        this.#fpsTimer = 0;
        this.#accumulator = 0;
        this.#startTime = performance.now();
        this.#lastTime = this.#startTime;
        
        this.removeAllTimers();
        this.emit('reset', { clock: this });
        Logger.log('Clock reset');
        return this;
    }

    /**
     * Gets the current time in seconds.
     * 
     * @returns {number} Current time
     */
    getTime() {
        return this.#elapsedTime;
    }

    /**
     * Gets the real time in seconds (unscaled).
     * 
     * @returns {number} Real time
     */
    getRealTime() {
        return (performance.now() - this.#startTime) / 1000;
    }

    /**
     * Gets the delta time for physics.
     * 
     * @returns {number} Fixed delta time
     */
    getPhysicsDelta() {
        return this.#fixedTimestep ? this.#fixedDeltaTime : this.#smoothDeltaTime;
    }

    /**
     * Enables fixed timestep mode.
     * 
     * @param {number} fixedDelta - Fixed delta time (optional)
     * @returns {Clock} This
     */
    enableFixedTimestep(fixedDelta = null) {
        if (fixedDelta !== null) {
            this.#fixedDeltaTime = fixedDelta;
        }
        this.#fixedTimestep = true;
        this.#accumulator = 0;
        this.emit('fixedTimestepEnabled', { clock: this, fixedDelta: this.#fixedDeltaTime });
        Logger.log(`Fixed timestep enabled: ${this.#fixedDeltaTime}s`);
        return this;
    }

    /**
     * Disables fixed timestep mode.
     * 
     * @returns {Clock} This
     */
    disableFixedTimestep() {
        this.#fixedTimestep = false;
        this.#accumulator = 0;
        this.emit('fixedTimestepDisabled', { clock: this });
        Logger.log('Fixed timestep disabled');
        return this;
    }

    /**
     * Checks if fixed timestep is enabled.
     * 
     * @returns {boolean} True if enabled
     */
    isFixedTimestep() {
        return this.#fixedTimestep;
    }

    /**
     * Gets the accumulated time for fixed timestep.
     * 
     * @returns {number} Accumulated time
     */
    getAccumulator() {
        return this.#accumulator;
    }

    /**
     * Creates a stopwatch.
     * 
     * @returns {Object} Stopwatch object
     */
    createStopwatch() {
        const startTime = this.#elapsedTime;
        
        return {
            /**
             * Gets elapsed time since stopwatch creation.
             * 
             * @returns {number} Elapsed time in seconds
             */
            getElapsed: () => {
                return this.#elapsedTime - startTime;
            },
            
            /**
             * Resets the stopwatch.
             * 
             * @returns {Object} This
             */
            reset: () => {
                const newStart = this.#elapsedTime;
                return {
                    getElapsed: () => this.#elapsedTime - newStart,
                    reset: () => this.#elapsedTime - this.#elapsedTime
                };
            },
            
            /**
             * Gets the start time.
             * 
             * @returns {number} Start time
             */
            getStartTime: () => startTime
        };
    }

    /**
     * Sets the maximum delta time.
     * 
     * @param {number} maxDelta - Maximum delta time
     * @returns {Clock} This
     */
    setMaxDeltaTime(maxDelta) {
        this.#maxDeltaTime = maxDelta;
        return this;
    }

    /**
     * Sets the delta smoothing factor.
     * 
     * @param {number} smoothing - Smoothing factor (0-1)
     * @returns {Clock} This
     */
    setDeltaSmoothing(smoothing) {
        this.#deltaSmoothing = Math.max(0, Math.min(1, smoothing));
        return this;
    }

    /**
     * Sets the FPS update interval.
     * 
     * @param {number} interval - FPS update interval in seconds
     * @returns {Clock} This
     */
    setFPSUpdateInterval(interval) {
        this.#fpsUpdateInterval = Math.max(0.1, interval);
        return this;
    }

    /**
     * Destroys the clock.
     */
    destroy() {
        if (this.#isDestroyed) return;
        
        this.#isDestroyed = true;
        this.#isRunning = false;
        this.removeAllTimers();
        this.removeAllListeners();
        Logger.log('Clock destroyed');
    }

    /**
     * Checks if the clock is destroyed.
     * 
     * @returns {boolean} True if destroyed
     */
    isDestroyed() {
        return this.#isDestroyed;
    }

    toString() {
        return `Clock(fps=${this.#smoothFPS || this.#fps}, time=${this.#elapsedTime.toFixed(2)}s, paused=${this.#isPaused}, timeScale=${this.#timeScale}, timers=${this.#timers.size})`;
    }
}

export default Clock;
