/**
 * Logger.js - Logging system for LXRN Engine.
 * Provides logging with levels, colors, categories, and file output.
 * Essential for debugging both game logic and graphics.
 * 
 * @module Logger
 * @author LXRN
 * @version 2.0.0
 */

/**
 * Log levels with priorities.
 */
export const LOG_LEVELS = {
    DEBUG: { value: 0, label: 'DEBUG', color: '#00bfff' },
    INFO: { value: 1, label: 'INFO', color: '#00ff00' },
    LOG: { value: 2, label: 'LOG', color: '#ffffff' },
    WARN: { value: 3, label: 'WARN', color: '#ffff00' },
    ERROR: { value: 4, label: 'ERROR', color: '#ff0000' },
    FATAL: { value: 5, label: 'FATAL', color: '#ff00ff' },
    NONE: { value: 6, label: 'NONE', color: '#888888' }
};

/**
 * Categories for organizing logs.
 */
export const LOG_CATEGORIES = {
    ENGINE: 'engine',
    SCENE: 'scene',
    ENTITY: 'entity',
    RENDER: 'render',
    SHADER: 'shader',
    TEXTURE: 'texture',
    AUDIO: 'audio',
    PHYSICS: 'physics',
    AI: 'ai',
    INPUT: 'input',
    NETWORK: 'network',
    UI: 'ui',
    ANIMATION: 'animation',
    PARTICLES: 'particles',
    COLLISION: 'collision',
    CUSTOM: 'custom'
};

class Logger {
    #level = LOG_LEVELS.LOG;
    #enabled = true;
    #colorEnabled = true;
    #timestampEnabled = true;
    #categoriesEnabled = {};
    #logHistory = [];
    #maxHistory = 1000;
    #fileOutputEnabled = false;
    #filePath = './logs/engine.log';
    #fileHandle = null;
    #consoleMethods = {
        debug: console.debug,
        info: console.info,
        log: console.log,
        warn: console.warn,
        error: console.error
    };
    #categoryColors = {};
    #indentLevel = 0;
    #indentString = '  ';
    #useGrouping = false;
    #groupStack = [];
    #performanceMarks = {};
    #isDestroyed = false;

    constructor(options = {}) {
        this.#level = options.level || LOG_LEVELS.LOG;
        this.#enabled = options.enabled !== undefined ? options.enabled : true;
        this.#colorEnabled = options.colorEnabled !== undefined ? options.colorEnabled : true;
        this.#timestampEnabled = options.timestampEnabled !== undefined ? options.timestampEnabled : true;
        this.#maxHistory = options.maxHistory || 1000;
        this.#fileOutputEnabled = options.fileOutputEnabled || false;
        this.#filePath = options.filePath || './logs/engine.log';
        this.#indentString = options.indentString || '  ';
        this.#useGrouping = options.useGrouping || false;

        // Set default category colors
        this.#categoryColors = {
            [LOG_CATEGORIES.ENGINE]: '#ff6b6b',
            [LOG_CATEGORIES.SCENE]: '#ffd93d',
            [LOG_CATEGORIES.ENTITY]: '#6bcb77',
            [LOG_CATEGORIES.RENDER]: '#4d96ff',
            [LOG_CATEGORIES.SHADER]: '#9b59b6',
            [LOG_CATEGORIES.TEXTURE]: '#e67e22',
            [LOG_CATEGORIES.AUDIO]: '#1abc9c',
            [LOG_CATEGORIES.PHYSICS]: '#e74c3c',
            [LOG_CATEGORIES.AI]: '#3498db',
            [LOG_CATEGORIES.INPUT]: '#2ecc71',
            [LOG_CATEGORIES.NETWORK]: '#f39c12',
            [LOG_CATEGORIES.UI]: '#ecf0f1',
            [LOG_CATEGORIES.ANIMATION]: '#d35400',
            [LOG_CATEGORIES.PARTICLES]: '#8e44ad',
            [LOG_CATEGORIES.COLLISION]: '#c0392b'
        };

        if (options.categoryColors) {
            this.#categoryColors = { ...this.#categoryColors, ...options.categoryColors };
        }

        // Enable all categories by default
        for (const category of Object.values(LOG_CATEGORIES)) {
            this.#categoriesEnabled[category] = true;
        }

        if (this.#fileOutputEnabled) {
            this.#initFileOutput();
        }

        // Install global error handler
        this.#installErrorHandler();

        console.log('[LXRN] Logger initialized');
    }

    /**
     * Sets the log level.
     * 
     * @param {Object} level - Log level from LOG_LEVELS
     * @returns {Logger} This
     */
    setLevel(level) {
        this.#level = level;
        return this;
    }

    /**
     * Gets the current log level.
     * 
     * @returns {Object} Current log level
     */
    getLevel() {
        return this.#level;
    }

    /**
     * Enables or disables logging.
     * 
     * @param {boolean} enabled - Enable/disable
     * @returns {Logger} This
     */
    setEnabled(enabled) {
        this.#enabled = enabled;
        return this;
    }

    /**
     * Checks if logging is enabled.
     * 
     * @returns {boolean} True if enabled
     */
    isEnabled() {
        return this.#enabled;
    }

    /**
     * Enables a category.
     * 
     * @param {string} category - Category name
     * @returns {Logger} This
     */
    enableCategory(category) {
        this.#categoriesEnabled[category] = true;
        return this;
    }

    /**
     * Disables a category.
     * 
     * @param {string} category - Category name
     * @returns {Logger} This
     */
    disableCategory(category) {
        this.#categoriesEnabled[category] = false;
        return this;
    }

    /**
     * Checks if a category is enabled.
     * 
     * @param {string} category - Category name
     * @returns {boolean} True if enabled
     */
    isCategoryEnabled(category) {
        return this.#categoriesEnabled[category] !== false;
    }

    /**
     * Sets color for a category.
     * 
     * @param {string} category - Category name
     * @param {string} color - CSS color
     * @returns {Logger} This
     */
    setCategoryColor(category, color) {
        this.#categoryColors[category] = color;
        return this;
    }

    /**
     * Log a debug message (level 0).
     * 
     * @param {...any} args - Message parts
     * @param {string} category - Optional category
     * @returns {Logger} This
     */
    debug(...args) {
        this.#log(LOG_LEVELS.DEBUG, args);
        return this;
    }

    /**
     * Log an info message (level 1).
     * 
     * @param {...any} args - Message parts
     * @param {string} category - Optional category
     * @returns {Logger} This
     */
    info(...args) {
        this.#log(LOG_LEVELS.INFO, args);
        return this;
    }

    /**
     * Log a standard message (level 2).
     * 
     * @param {...any} args - Message parts
     * @param {string} category - Optional category
     * @returns {Logger} This
     */
    log(...args) {
        this.#log(LOG_LEVELS.LOG, args);
        return this;
    }

    /**
     * Log a warning message (level 3).
     * 
     * @param {...any} args - Message parts
     * @param {string} category - Optional category
     * @returns {Logger} This
     */
    warn(...args) {
        this.#log(LOG_LEVELS.WARN, args);
        return this;
    }

    /**
     * Log an error message (level 4).
     * 
     * @param {...any} args - Message parts
     * @param {string} category - Optional category
     * @returns {Logger} This
     */
    error(...args) {
        this.#log(LOG_LEVELS.ERROR, args);
        return this;
    }

    /**
     * Log a fatal message (level 5).
     * 
     * @param {...any} args - Message parts
     * @param {string} category - Optional category
     * @returns {Logger} This
     */
    fatal(...args) {
        this.#log(LOG_LEVELS.FATAL, args);
        return this;
    }

    /**
     * Internal log method.
     * 
     * @private
     * @param {Object} level - Log level
     * @param {Array} args - Arguments
     */
    #log(level, args) {
        if (!this.#enabled) return;
        if (level.value < this.#level.value) return;

        const category = this.#extractCategory(args);
        if (!this.isCategoryEnabled(category)) return;

        const timestamp = this.#timestampEnabled ? this.#getTimestamp() : '';
        const prefix = this.#formatPrefix(level, timestamp, category);
        const message = this.#formatMessage(args);
        const fullMessage = `${prefix} ${message}`;

        // Console output
        this.#outputToConsole(level, fullMessage, args);

        // History
        this.#addHistory(level, fullMessage, category);

        // File output
        if (this.#fileOutputEnabled) {
            this.#outputToFile(fullMessage);
        }

        // Emit event
        this.#emitLogEvent(level, fullMessage, category);

        // Fatal stops execution
        if (level === LOG_LEVELS.FATAL) {
            throw new Error(`Fatal: ${fullMessage}`);
        }
    }

    /**
     * Extracts category from arguments.
     * 
     * @private
     * @param {Array} args - Arguments
     * @returns {string} Category
     */
    #extractCategory(args) {
        const last = args[args.length - 1];
        if (typeof last === 'string' && Object.values(LOG_CATEGORIES).includes(last)) {
            args.pop();
            return last;
        }
        return LOG_CATEGORIES.CUSTOM;
    }

    /**
     * Gets timestamp string.
     * 
     * @private
     * @returns {string} Timestamp
     */
    #getTimestamp() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        return `[${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${String(now.getMilliseconds()).padStart(3, '0')}]`;
    }

    /**
     * Formats log prefix.
     * 
     * @private
     * @param {Object} level - Log level
     * @param {string} timestamp - Timestamp
     * @param {string} category - Category
     * @returns {string} Formatted prefix
     */
    #formatPrefix(level, timestamp, category) {
        const indent = this.#indentString.repeat(this.#indentLevel);
        const categoryColor = this.#categoryColors[category] || '#ffffff';
        const levelColor = this.#colorEnabled ? level.color : '';
        const reset = this.#colorEnabled ? '\x1b[0m' : '';

        let prefix = timestamp;
        if (prefix) prefix += ' ';

        if (this.#colorEnabled) {
            prefix += `\x1b[${this.#colorToAnsi(levelColor)}m${level.label}\x1b[0m`;
            prefix += ` \x1b[${this.#colorToAnsi(categoryColor)}m${category}\x1b[0m`;
        } else {
            prefix += `${level.label} [${category}]`;
        }

        return `${indent}${prefix}:`;
    }

    /**
     * Converts CSS color to ANSI color code.
     * 
     * @private
     * @param {string} color - CSS color
     * @returns {number} ANSI code
     */
    #colorToAnsi(color) {
        const map = {
            '#00bfff': 36, // Cyan (DEBUG)
            '#00ff00': 32, // Green (INFO)
            '#ffffff': 37, // White (LOG)
            '#ffff00': 33, // Yellow (WARN)
            '#ff0000': 31, // Red (ERROR)
            '#ff00ff': 35, // Magenta (FATAL)
        };
        return map[color] || 37;
    }

    /**
     * Formats message from arguments.
     * 
     * @private
     * @param {Array} args - Arguments
     * @returns {string} Formatted message
     */
    #formatMessage(args) {
        return args.map(arg => {
            if (arg === null) return 'null';
            if (arg === undefined) return 'undefined';
            if (typeof arg === 'object') {
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            }
            return String(arg);
        }).join(' ');
    }

    /**
     * Outputs to console.
     * 
     * @private
     * @param {Object} level - Log level
     * @param {string} message - Log message
     * @param {Array} args - Original arguments
     */
    #outputToConsole(level, message, args) {
        const method = level.label.toLowerCase();
        const consoleMethod = this.#consoleMethods[method] || console.log;

        if (this.#useGrouping && this.#groupStack.length > 0) {
            consoleMethod(message);
        } else {
            consoleMethod(message);
        }
    }

    /**
     * Adds to history.
     * 
     * @private
     * @param {Object} level - Log level
     * @param {string} message - Log message
     * @param {string} category - Category
     */
    #addHistory(level, message, category) {
        this.#logHistory.push({
            level: level.label,
            message,
            category,
            timestamp: Date.now()
        });

        if (this.#logHistory.length > this.#maxHistory) {
            this.#logHistory.shift();
        }
    }

    /**
     * Outputs to file.
     * 
     * @private
     * @param {string} message - Log message
     */
    #outputToFile(message) {
        // File output implementation depends on environment
        // This is a stub for browser/Node.js compatibility
        try {
            if (typeof window !== 'undefined') {
                // Browser - use console
            } else if (typeof process !== 'undefined') {
                // Node.js - write to file
            }
        } catch {
            // Silent fail for file output
        }
    }

    /**
     * Emits log event.
     * 
     * @private
     * @param {Object} level - Log level
     * @param {string} message - Log message
     * @param {string} category - Category
     */
    #emitLogEvent(level, message, category) {
        if (this._onLog) {
            this._onLog({ level: level.label, message, category, timestamp: Date.now() });
        }
    }

    /**
     * Sets log event callback.
     * 
     * @param {Function} callback - Callback function
     * @returns {Logger} This
     */
    onLog(callback) {
        this._onLog = callback;
        return this;
    }

    /**
     * Starts a group.
     * 
     * @param {string} label - Group label
     * @param {boolean} collapsed - Collapsed by default
     * @returns {Logger} This
     */
    group(label, collapsed = false) {
        this.#groupStack.push(label);
        this.#indentLevel++;
        console.group(label);
        return this;
    }

    /**
     * Ends the current group.
     * 
     * @returns {Logger} This
     */
    groupEnd() {
        if (this.#groupStack.length > 0) {
            this.#groupStack.pop();
            this.#indentLevel = Math.max(0, this.#indentLevel - 1);
            console.groupEnd();
        }
        return this;
    }

    /**
     * Starts performance mark.
     * 
     * @param {string} name - Mark name
     * @returns {Logger} This
     */
    mark(name) {
        this.#performanceMarks[name] = performance.now();
        return this;
    }

    /**
     * Measures time between marks.
     * 
     * @param {string} name - Measurement name
     * @param {string} startMark - Start mark name
     * @param {string} endMark - End mark name (optional)
     * @returns {Logger} This
     */
    measure(name, startMark, endMark = null) {
        const endTime = endMark ? this.#performanceMarks[endMark] : performance.now();
        const startTime = this.#performanceMarks[startMark];
        if (startTime) {
            const duration = endTime - startTime;
            this.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
        }
        return this;
    }

    /**
     * Clears the log history.
     * 
     * @returns {Logger} This
     */
    clearHistory() {
        this.#logHistory = [];
        return this;
    }

    /**
     * Gets log history.
     * 
     * @param {Object} options - Filter options
     * @param {string} options.level - Filter by level
     * @param {string} options.category - Filter by category
     * @param {number} options.limit - Max entries
     * @returns {Array} Log entries
     */
    getHistory(options = {}) {
        let history = this.#logHistory;

        if (options.level) {
            history = history.filter(h => h.level === options.level);
        }

        if (options.category) {
            history = history.filter(h => h.category === options.category);
        }

        if (options.limit) {
            history = history.slice(-options.limit);
        }

        return history;
    }

    /**
     * Installs global error handler.
     * 
     * @private
     */
    #installErrorHandler() {
        if (typeof window !== 'undefined') {
            window.onerror = (message, source, line, col, error) => {
                this.error(`Uncaught: ${message} at ${source}:${line}:${col}`, error);
                return false;
            };

            window.onunhandledrejection = (event) => {
                this.error('Unhandled rejection:', event.reason);
            };
        } else if (typeof process !== 'undefined') {
            process.on('uncaughtException', (error) => {
                this.fatal('Uncaught exception:', error);
            });

            process.on('unhandledRejection', (reason) => {
                this.error('Unhandled rejection:', reason);
            });
        }
    }

    /**
     * Initializes file output.
     * 
     * @private
     */
    #initFileOutput() {
        // Stub for file output initialization
    }

    /**
     * Creates a child logger with a category.
     * 
     * @param {string} category - Category name
     * @param {Object} options - Child options
     * @returns {Logger} Child logger
     */
    child(category, options = {}) {
        const child = new Logger({
            level: this.#level,
            enabled: this.#enabled,
            colorEnabled: this.#colorEnabled,
            timestampEnabled: this.#timestampEnabled,
            maxHistory: this.#maxHistory,
            fileOutputEnabled: this.#fileOutputEnabled,
            filePath: this.#filePath,
            indentString: this.#indentString,
            useGrouping: this.#useGrouping,
            ...options
        });

        // Override log methods to include category
        const methods = ['debug', 'info', 'log', 'warn', 'error', 'fatal'];
        for (const method of methods) {
            const original = child[method].bind(child);
            child[method] = (...args) => {
                args.push(category);
                return original(...args);
            };
        }

        return child;
    }

    /**
     * Destroys the logger.
     */
    destroy() {
        if (this.#isDestroyed) return;
        this.#isDestroyed = true;
        this.clearHistory();
        this.#performanceMarks = {};
        this.#groupStack = [];
        console.log('[LXRN] Logger destroyed');
    }

    /**
     * Checks if destroyed.
     * 
     * @returns {boolean} True if destroyed
     */
    isDestroyed() {
        return this.#isDestroyed;
    }

    toString() {
        return `Logger(level=${this.#level.label}, enabled=${this.#enabled}, history=${this.#logHistory.length})`;
    }
}

/**
 * Default logger instance.
 */
export const defaultLogger = new Logger();

/**
 * Convenience functions using default logger.
 */
export const debug = (...args) => defaultLogger.debug(...args);
export const info = (...args) => defaultLogger.info(...args);
export const log = (...args) => defaultLogger.log(...args);
export const warn = (...args) => defaultLogger.warn(...args);
export const error = (...args) => defaultLogger.error(...args);
export const fatal = (...args) => defaultLogger.fatal(...args);

export default Logger;
