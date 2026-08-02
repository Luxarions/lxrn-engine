/**
 * EventEmitter.js - Advanced event system for LXRN Engine.
 * Provides publish/subscribe pattern with full event handling.
 * Supports async/await, wildcard events, and comprehensive listener management.
 * 
 * @module EventEmitter
 * @author LXRN
 * @version 2.0.0
 */

class EventEmitter {
    #events = new Map();
    #anyEvents = [];
    #maxListeners = 10;
    #isDestroyed = false;
    
    __eventCache = new Map();
    __onceWrappers = new WeakMap();

    constructor(options = {}) {
        if (options.maxListeners !== undefined) {
            this.#maxListeners = options.maxListeners;
        }
    }

    /**
     * Register an event listener.
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for callback (optional)
     * @returns {EventEmitter} This
     */
    on(event, callback, context = null) {
        if (this.#isDestroyed) return this;
        
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this.#events.has(event)) {
            this.#events.set(event, []);
        }
        
        const listeners = this.#events.get(event);
        
        if (listeners.length >= this.#maxListeners) {
            console.warn(`Max listeners (${this.#maxListeners}) reached for event: ${event}`);
        }
        
        listeners.push({ callback, context, once: false });
        this.__eventCache.delete(event);
        
        return this;
    }

    /**
     * Register a one-time event listener.
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for callback (optional)
     * @returns {EventEmitter} This
     */
    once(event, callback, context = null) {
        if (this.#isDestroyed) return this;
        
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback.apply(context, args);
        };
        
        this.__onceWrappers.set(callback, wrapper);
        
        if (!this.#events.has(event)) {
            this.#events.set(event, []);
        }
        
        const listeners = this.#events.get(event);
        
        if (listeners.length >= this.#maxListeners) {
            console.warn(`Max listeners (${this.#maxListeners}) reached for event: ${event}`);
        }
        
        listeners.push({ callback: wrapper, context, once: true });
        this.__eventCache.delete(event);
        
        return this;
    }

    /**
     * Prepend an event listener (adds to front).
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for callback (optional)
     * @returns {EventEmitter} This
     */
    prependListener(event, callback, context = null) {
        if (this.#isDestroyed) return this;
        
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        if (!this.#events.has(event)) {
            this.#events.set(event, []);
        }
        
        const listeners = this.#events.get(event);
        
        if (listeners.length >= this.#maxListeners) {
            console.warn(`Max listeners (${this.#maxListeners}) reached for event: ${event}`);
        }
        
        listeners.unshift({ callback, context, once: false });
        this.__eventCache.delete(event);
        
        return this;
    }

    /**
     * Prepend a one-time event listener.
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for callback (optional)
     * @returns {EventEmitter} This
     */
    prependOnceListener(event, callback, context = null) {
        if (this.#isDestroyed) return this;
        
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        const wrapper = (...args) => {
            this.off(event, wrapper);
            callback.apply(context, args);
        };
        
        this.__onceWrappers.set(callback, wrapper);
        
        if (!this.#events.has(event)) {
            this.#events.set(event, []);
        }
        
        const listeners = this.#events.get(event);
        
        if (listeners.length >= this.#maxListeners) {
            console.warn(`Max listeners (${this.#maxListeners}) reached for event: ${event}`);
        }
        
        listeners.unshift({ callback: wrapper, context, once: true });
        this.__eventCache.delete(event);
        
        return this;
    }

    /**
     * Remove an event listener.
     * 
     * @param {string} event - Event name
     * @param {Function} callback - Callback to remove
     * @returns {EventEmitter} This
     */
    off(event, callback) {
        if (this.#isDestroyed) return this;
        
        if (!this.#events.has(event)) return this;
        
        const listeners = this.#events.get(event);
        
        // Check if callback is wrapped (from once)
        const wrapped = this.__onceWrappers.get(callback);
        const targetCallback = wrapped || callback;
        
        const filtered = listeners.filter(l => l.callback !== targetCallback);
        
        if (filtered.length === 0) {
            this.#events.delete(event);
        } else {
            this.#events.set(event, filtered);
        }
        
        this.__eventCache.delete(event);
        
        return this;
    }

    /**
     * Remove all listeners for an event or all events.
     * 
     * @param {string} event - Event name (optional)
     * @returns {EventEmitter} This
     */
    removeAllListeners(event) {
        if (this.#isDestroyed) return this;
        
        if (event) {
            this.#events.delete(event);
            this.__eventCache.delete(event);
        } else {
            this.#events.clear();
            this.__eventCache.clear();
            this.#anyEvents = [];
        }
        
        return this;
    }

    /**
     * Emit an event synchronously.
     * 
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @returns {boolean} True if event had listeners
     */
    emit(event, data = null) {
        if (this.#isDestroyed) return false;
        
        let hasListener = false;
        const args = data !== null ? [data] : [];
        
        // Emit to specific event listeners
        if (this.#events.has(event)) {
            hasListener = true;
            const listeners = this.#events.get(event);
            const toRemove = [];
            
            for (let i = 0; i < listeners.length; i++) {
                const listener = listeners[i];
                try {
                    listener.callback.apply(listener.context, args);
                } catch (error) {
                    console.error(`Error in event "${event}":`, error);
                }
                
                if (listener.once) {
                    toRemove.push(listener);
                }
            }
            
            // Remove once listeners
            if (toRemove.length > 0) {
                const remaining = listeners.filter(l => !toRemove.includes(l));
                if (remaining.length === 0) {
                    this.#events.delete(event);
                } else {
                    this.#events.set(event, remaining);
                }
                this.__eventCache.delete(event);
            }
        }
        
        // Emit to wildcard listeners (any event)
        for (const anyListener of this.#anyEvents) {
            try {
                anyListener.callback.apply(anyListener.context, [event, data]);
            } catch (error) {
                console.error(`Error in any event listener:`, error);
            }
        }
        
        return hasListener;
    }

    /**
     * Emit an event asynchronously.
     * 
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @returns {Promise<boolean>} True if event had listeners
     */
    async emitAsync(event, data = null) {
        if (this.#isDestroyed) return false;
        
        let hasListener = false;
        const args = data !== null ? [data] : [];
        
        if (this.#events.has(event)) {
            hasListener = true;
            const listeners = this.#events.get(event);
            const toRemove = [];
            
            const promises = [];
            for (let i = 0; i < listeners.length; i++) {
                const listener = listeners[i];
                try {
                    const result = listener.callback.apply(listener.context, args);
                    if (result instanceof Promise) {
                        promises.push(result);
                    }
                } catch (error) {
                    console.error(`Error in event "${event}":`, error);
                }
                
                if (listener.once) {
                    toRemove.push(listener);
                }
            }
            
            await Promise.all(promises);
            
            if (toRemove.length > 0) {
                const remaining = listeners.filter(l => !toRemove.includes(l));
                if (remaining.length === 0) {
                    this.#events.delete(event);
                } else {
                    this.#events.set(event, remaining);
                }
                this.__eventCache.delete(event);
            }
        }
        
        for (const anyListener of this.#anyEvents) {
            try {
                const result = anyListener.callback.apply(anyListener.context, [event, data]);
                if (result instanceof Promise) {
                    await result;
                }
            } catch (error) {
                console.error(`Error in any event listener:`, error);
            }
        }
        
        return hasListener;
    }

    /**
     * Wait for an event to be emitted (Promise-based).
     * 
     * @param {string} event - Event name
     * @param {number} timeout - Timeout in ms (optional)
     * @returns {Promise} Promise that resolves with event data
     */
    waitFor(event, timeout = null) {
        return new Promise((resolve, reject) => {
            if (this.#isDestroyed) {
                reject(new Error('EventEmitter is destroyed'));
                return;
            }
            
            let timeoutId = null;
            
            const listener = (data) => {
                if (timeoutId) clearTimeout(timeoutId);
                this.off(event, listener);
                resolve(data);
            };
            
            this.once(event, listener);
            
            if (timeout !== null) {
                timeoutId = setTimeout(() => {
                    this.off(event, listener);
                    reject(new Error(`Timeout waiting for event: ${event}`));
                }, timeout);
            }
        });
    }

    /**
     * Register a wildcard listener for all events.
     * 
     * @param {Function} callback - Callback function (event, data)
     * @param {Object} context - Context for callback (optional)
     * @returns {EventEmitter} This
     */
    onAny(callback, context = null) {
        if (this.#isDestroyed) return this;
        
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        
        this.#anyEvents.push({ callback, context });
        return this;
    }

    /**
     * Remove a wildcard listener.
     * 
     * @param {Function} callback - Callback to remove
     * @returns {EventEmitter} This
     */
    offAny(callback) {
        if (this.#isDestroyed) return this;
        
        this.#anyEvents = this.#anyEvents.filter(l => l.callback !== callback);
        return this;
    }

    /**
     * Get listener count for an event.
     * 
     * @param {string} event - Event name
     * @returns {number} Number of listeners
     */
    listenerCount(event) {
        if (this.#isDestroyed) return 0;
        return this.#events.has(event) ? this.#events.get(event).length : 0;
    }

    /**
     * Get all event names with listeners.
     * 
     * @returns {string[]} Array of event names
     */
    eventNames() {
        if (this.#isDestroyed) return [];
        return Array.from(this.#events.keys());
    }

    /**
     * Get all listeners for an event.
     * 
     * @param {string} event - Event name
     * @returns {Array} Array of listener objects
     */
    getListeners(event) {
        if (this.#isDestroyed) return [];
        return this.#events.get(event) || [];
    }

    /**
     * Check if an event has listeners.
     * 
     * @param {string} event - Event name
     * @returns {boolean} True if has listeners
     */
    hasListener(event) {
        if (this.#isDestroyed) return false;
        return this.#events.has(event) && this.#events.get(event).length > 0;
    }

    /**
     * Set max listeners.
     * 
     * @param {number} max - Max listeners
     * @returns {EventEmitter} This
     */
    setMaxListeners(max) {
        if (this.#isDestroyed) return this;
        this.#maxListeners = max;
        return this;
    }

    /**
     * Get max listeners.
     * 
     * @returns {number} Max listeners
     */
    getMaxListeners() {
        return this.#maxListeners;
    }

    /**
     * Clear all listeners and reset state.
     * 
     * @returns {EventEmitter} This
     */
    clear() {
        this.#events.clear();
        this.#anyEvents = [];
        this.__eventCache.clear();
        return this;
    }

    /**
     * Destroy the event emitter.
     */
    destroy() {
        if (this.#isDestroyed) return;
        this.#isDestroyed = true;
        this.clear();
        this.#onceWrappers = new WeakMap();
        console.log('EventEmitter destroyed');
    }

    /**
     * Check if destroyed.
     * 
     * @returns {boolean} True if destroyed
     */
    isDestroyed() {
        return this.#isDestroyed;
    }

    /**
     * Get listener count for all events.
     * 
     * @returns {number} Total listeners
     */
    totalListenerCount() {
        if (this.#isDestroyed) return 0;
        let count = 0;
        for (const [event, listeners] of this.#events) {
            count += listeners.length;
        }
        count += this.#anyEvents.length;
        return count;
    }

    toString() {
        return `EventEmitter(events=${this.#events.size}, anyListeners=${this.#anyEvents.length}, maxListeners=${this.#maxListeners}, destroyed=${this.#isDestroyed})`;
    }
}

/**
 * Global Event Bus singleton.
 */
export const EventBus = new EventEmitter({
    maxListeners: 20
});

export default EventEmitter;
