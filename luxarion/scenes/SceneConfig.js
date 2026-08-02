/**
 * SceneConfig.js - Central configuration system for LXRN Engine.
 * Provides configuration for scenes, rendering, physics, and game systems.
 * Supports quality presets and runtime configuration.
 * 
 * @module SceneConfig
 * @author LXRN
 * @version 1.0.0
 */

import { Color } from '../math/Color.js';
import { Logger } from '../utils/Logger.js';

/**
 * Quality presets for rendering and performance.
 */
export const QUALITY = {
    LOW: {
        label: 'Low',
        renderScale: 0.5,
        shadows: false,
        antialiasing: false,
        postProcessing: false,
        particleLimit: 100,
        textureQuality: 'low',
        shadowResolution: 256,
        maxLights: 4
    },
    MEDIUM: {
        label: 'Medium',
        renderScale: 0.75,
        shadows: true,
        antialiasing: false,
        postProcessing: true,
        particleLimit: 500,
        textureQuality: 'medium',
        shadowResolution: 512,
        maxLights: 8
    },
    HIGH: {
        label: 'High',
        renderScale: 1,
        shadows: true,
        antialiasing: true,
        postProcessing: true,
        particleLimit: 2000,
        textureQuality: 'high',
        shadowResolution: 1024,
        maxLights: 16
    },
    ULTRA: {
        label: 'Ultra',
        renderScale: 1.5,
        shadows: true,
        antialiasing: true,
        postProcessing: true,
        particleLimit: 5000,
        textureQuality: 'ultra',
        shadowResolution: 2048,
        maxLights: 32
    }
};

/**
 * Default scene configuration.
 */
export const SCENE_CONFIG = {
    // === SCENE DEFAULTS ===
    scene: {
        defaultName: 'UnnamedScene',
        defaultMode: '2D', // '2D' or '3D'
        defaultActive: true,
        autoClear: true,
        autoSort: false,
        autoLoad: false,
        maxEntities: 1000,
        maxParticles: 500
    },

    // === GAME SETTINGS ===
    game: {
        defaultLives: 3,
        defaultScore: 0,
        defaultLevel: 1,
        defaultTime: 0,
        maxScore: 999999,
        maxLevel: 100,
        gameOverDelay: 2,
        restartDelay: 1
    },

    // === PHYSICS ===
    physics: {
        gravity: 9.8,
        friction: 0.8,
        damping: 0.99,
        restitution: 0.5,
        maxVelocity: 100,
        fixedTimestep: 1 / 60,
        maxSubsteps: 10,
        broadphase: 'sweep', // 'sweep', 'grid', 'tree'
        debugDraw: false
    },

    // === RENDER SETTINGS ===
    render: {
        defaultClearColor: '#000000',
        defaultPixelRatio: 1,
        defaultWidth: 800,
        defaultHeight: 600,
        antialiasing: false,
        vsync: true,
        fullscreen: false,
        gammaCorrection: true,
        toneMapping: false,
        exposure: 1,
        bloom: false,
        bloomIntensity: 1,
        bloomThreshold: 0.5,
        ao: false,
        aoIntensity: 1,
        ssr: false
    },

    // === CAMERA DEFAULTS ===
    camera: {
        fov: 60,
        near: 0.1,
        far: 1000,
        defaultPosition: { x: 0, y: 0, z: 10 },
        defaultRotation: { x: 0, y: 0, z: 0 },
        orthographic: false,
        zoom: 1,
        minZoom: 0.1,
        maxZoom: 10
    },

    // === LIGHT DEFAULTS ===
    light: {
        ambientColor: '#ffffff',
        ambientIntensity: 0.5,
        directionalColor: '#ffffff',
        directionalIntensity: 1,
        shadowEnabled: false,
        shadowResolution: 512,
        shadowBias: 0.0001,
        shadowMapSize: 1024,
        maxLights: 8
    },

    // === FOG DEFAULTS ===
    fog: {
        defaultColor: '#000000',
        defaultNear: 0.1,
        defaultFar: 100,
        defaultDensity: 0.01,
        defaultType: 'linear', // 'linear', 'exponential', 'exponential2'
        enabled: false,
        autoUpdate: true
    },

    // === ENTITY DEFAULTS ===
    entity: {
        defaultHp: 100,
        defaultMaxHp: 100,
        defaultSpeed: 1,
        defaultDamage: 10,
        defaultDefense: 0,
        defaultLevel: 1,
        defaultTeam: 'neutral',
        defaultFaction: 'neutral',
        defaultAttackRange: 50,
        defaultAttackSpeed: 1,
        defaultVisionRange: 300,
        maxEntities: 1000,
        maxComponents: 20,
        maxBehaviors: 10,
        maxTags: 10
    },

    // === AUDIO ===
    audio: {
        enabled: true,
        masterVolume: 1,
        sfxVolume: 0.8,
        musicVolume: 0.6,
        ambientVolume: 0.4,
        maxSources: 32,
        useWebAudio: true,
        autoplay: false
    },

    // === INPUT ===
    input: {
        enabled: true,
        keyboardEnabled: true,
        mouseEnabled: true,
        touchEnabled: true,
        gamepadEnabled: true,
        pointerLock: false,
        keyRepeatDelay: 0.3,
        keyRepeatRate: 0.05,
        mouseSensitivity: 1,
        touchSensitivity: 1
    },

    // === DEBUG ===
    debug: {
        enabled: false,
        showFPS: false,
        showStats: false,
        showGrid: false,
        showAxes: false,
        showBoundingBoxes: false,
        showCollision: false,
        showLabels: false,
        logLevel: 'warn', // 'debug', 'info', 'warn', 'error'
        logToFile: false,
        logFilePath: './logs/engine.log'
    },

    // === PERFORMANCE ===
    performance: {
        targetFPS: 60,
        maxFPS: 144,
        minFPS: 30,
        autoQuality: false,
        quality: 'medium', // 'low', 'medium', 'high', 'ultra'
        throttleUpdates: false,
        updateThrottle: 0.1,
        renderThrottle: 0.016,
        useWebWorkers: false,
        workerCount: 4
    },

    // === NETWORK ===
    network: {
        enabled: false,
        serverUrl: '',
        serverPort: 8080,
        useWebSocket: true,
        reconnectAttempts: 5,
        reconnectDelay: 1,
        timeout: 30,
        maxPlayers: 64,
        tickRate: 20
    },

    // === ASSETS ===
    assets: {
        basePath: './assets/',
        imagesPath: './assets/images/',
        soundsPath: './assets/sounds/',
        fontsPath: './assets/fonts/',
        modelsPath: './assets/models/',
        shadersPath: './assets/shaders/',
        cacheEnabled: true,
        maxCacheSize: 100,
        preloadEnabled: true,
        parallelLoad: true,
        maxParallelLoads: 8,
        retryOnFail: true,
        retryAttempts: 3,
        retryDelay: 1
    },

    // === UI ===
    ui: {
        defaultTheme: 'dark',
        defaultFont: 'Arial',
        defaultFontSize: 16,
        defaultTextColor: '#ffffff',
        defaultBackgroundColor: '#1a1a2e',
        defaultBorderColor: '#333333',
        defaultBorderRadius: 4,
        defaultPadding: 8,
        defaultMargin: 4,
        animationDuration: 0.3,
        tooltipDelay: 0.5
    },

    // === ANIMATION ===
    animation: {
        defaultDuration: 0.5,
        defaultDelay: 0,
        defaultEasing: 'easeInOut', // 'linear', 'easeIn', 'easeOut', 'easeInOut'
        defaultLoop: false,
        defaultYoyo: false,
        defaultPingPong: false,
        maxAnimations: 100,
        autoPlay: true
    },

    // === PARTICLE ===
    particle: {
        maxParticles: 2000,
        defaultLifetime: 1,
        defaultSpeed: 1,
        defaultSize: 10,
        defaultColor: '#ffffff',
        defaultOpacity: 1,
        defaultGravity: 0,
        defaultWind: { x: 0, y: 0 },
        defaultTexture: null,
        autoUpdate: true,
        poolSize: 1000
    }
};

/**
 * Configuration manager with runtime updates and presets.
 */
class ConfigManager {
    #config = {};
    #quality = 'medium';
    #isDestroyed = false;
    __listeners = [];

    constructor() {
        this.#config = this.#deepClone(SCENE_CONFIG);
        Logger.log('ConfigManager created');
    }

    /**
     * Gets a configuration value by path.
     * 
     * @param {string} path - Dot notation path (e.g., 'render.defaultClearColor')
     * @param {*} defaultValue - Default value if path not found
     * @returns {*} Configuration value
     */
    get(path, defaultValue = null) {
        if (this.#isDestroyed) return defaultValue;
        
        const keys = path.split('.');
        let current = this.#config;
        
        for (const key of keys) {
            if (current === undefined || current === null) {
                return defaultValue;
            }
            current = current[key];
        }
        
        return current !== undefined ? current : defaultValue;
    }

    /**
     * Sets a configuration value by path.
     * 
     * @param {string} path - Dot notation path
     * @param {*} value - Value to set
     * @returns {ConfigManager} This
     */
    set(path, value) {
        if (this.#isDestroyed) return this;
        
        const keys = path.split('.');
        const lastKey = keys.pop();
        let current = this.#config;
        
        for (const key of keys) {
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        this.#notifyListeners(path, value, oldValue);
        Logger.log(`Config updated: ${path} = ${value}`);
        
        return this;
    }

    /**
     * Gets the entire configuration object.
     * 
     * @returns {Object} Configuration object
     */
    getAll() {
        return this.#deepClone(this.#config);
    }

    /**
     * Gets a section of the configuration.
     * 
     * @param {string} section - Section name
     * @returns {Object} Section configuration
     */
    getSection(section) {
        return this.#deepClone(this.#config[section] || {});
    }

    /**
     * Sets a quality preset.
     * 
     * @param {string} quality - Quality level ('low', 'medium', 'high', 'ultra')
     * @returns {ConfigManager} This
     */
    setQuality(quality) {
        if (this.#isDestroyed) return this;
        
        if (!QUALITY[quality.toUpperCase()]) {
            Logger.warn(`Unknown quality: ${quality}, using medium`);
            quality = 'medium';
        }
        
        this.#quality = quality.toLowerCase();
        const preset = QUALITY[quality.toUpperCase()];
        
        // Apply quality settings
        this.set('performance.quality', this.#quality);
        this.set('render.antialiasing', preset.antialiasing);
        this.set('render.renderScale', preset.renderScale);
        this.set('render.shadows', preset.shadows);
        this.set('render.postProcessing', preset.postProcessing);
        this.set('particle.maxParticles', preset.particleLimit);
        this.set('light.shadowResolution', preset.shadowResolution);
        this.set('light.maxLights', preset.maxLights);
        
        Logger.log(`Quality set to: ${this.#quality}`);
        return this;
    }

    /**
     * Gets the current quality level.
     * 
     * @returns {string} Quality level
     */
    getQuality() {
        return this.#quality;
    }

    /**
     * Gets quality preset data.
     * 
     * @param {string} quality - Quality level
     * @returns {Object} Quality preset
     */
    getQualityPreset(quality = null) {
        const key = (quality || this.#quality).toUpperCase();
        return QUALITY[key] || QUALITY.MEDIUM;
    }

    /**
     * Resets configuration to defaults.
     * 
     * @returns {ConfigManager} This
     */
    reset() {
        if (this.#isDestroyed) return this;
        
        this.#config = this.#deepClone(SCENE_CONFIG);
        this.#listeners = [];
        Logger.log('Config reset to defaults');
        return this;
    }

    /**
     * Registers a configuration change listener.
     * 
     * @param {Function} callback - Callback (path, value, oldValue)
     * @returns {Function} Unsubscribe function
     */
    onChange(callback) {
        if (this.#isDestroyed) return () => {};
        
        this.#listeners.push(callback);
        return () => {
            this.#listeners = this.#listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notifies listeners of configuration changes.
     * 
     * @private
     * @param {string} path - Changed path
     * @param {*} value - New value
     * @param {*} oldValue - Old value
     */
    #notifyListeners(path, value, oldValue) {
        for (const listener of this.#listeners) {
            try {
                listener(path, value, oldValue);
            } catch (error) {
                Logger.error(`Config listener error: ${error}`);
            }
        }
    }

    /**
     * Creates a deep clone of an object.
     * 
     * @private
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    #deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Color) return obj.clone();
        if (Array.isArray(obj)) return obj.map(item => this.#deepClone(item));
        
        const cloned = {};
        for (const key of Object.keys(obj)) {
            cloned[key] = this.#deepClone(obj[key]);
        }
        return cloned;
    }

    /**
     * Destroys the config manager.
     */
    destroy() {
        if (this.#isDestroyed) return;
        
        this.#isDestroyed = true;
        this.#listeners = [];
        this.#config = {};
        Logger.log('ConfigManager destroyed');
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
        return `ConfigManager(quality=${this.#quality}, sections=${Object.keys(this.#config).length})`;
    }
}

/**
 * Global configuration instance.
 */
export const Config = new ConfigManager();

/**
 * Helper function to get config values.
 * 
 * @param {string} path - Config path
 * @param {*} defaultValue - Default value
 * @returns {*} Config value
 */
export function getConfig(path, defaultValue = null) {
    return Config.get(path, defaultValue);
}

/**
 * Helper function to set config values.
 * 
 * @param {string} path - Config path
 * @param {*} value - Value to set
 * @returns {ConfigManager} Config manager
 */
export function setConfig(path, value) {
    return Config.set(path, value);
}

export default Config;
