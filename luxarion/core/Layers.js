/**
 * Layers.js - Layer constants for LXRN Engine.
 * These constants are used with Object layer methods.
 * 
 * @module Layers
 * @author LXRN
 * @version 1.0.0
 */

export const LAYERS = {
    DEFAULT: 0,
    BACKGROUND: 1,
    ENVIRONMENT: 2,
    PLAYER: 3,
    ENEMY: 4,
    NPC: 5,
    PICKUP: 6,
    PARTICLE: 7,
    UI: 8,
    UI_BACKGROUND: 9,
    UI_FOREGROUND: 10,
    DEBUG: 11,
    SHADOW: 12,
    REFLECTION: 13,
    WATER: 14,
    TRANSPARENT: 15,
    SKYBOX: 16,
    LIGHTING: 17,
    POSTPROCESS: 18,
    CUSTOM_1: 19,
    CUSTOM_2: 20,
    CUSTOM_3: 21,
    CUSTOM_4: 22,
    CUSTOM_5: 23,
    ALL: 0xFFFFFFFF
};

export const LayerUtils = {
    /**
     * Create a layer mask from multiple layers.
     * 
     * @param {...number} layers - Layer numbers
     * @returns {number} Layer mask
     */
    mask(...layers) {
        let mask = 0;
        for (const layer of layers) {
            mask |= 1 << layer;
        }
        return mask;
    },
    
    /**
     * Check if a mask contains a specific layer.
     * 
     * @param {number} mask - Layer mask
     * @param {number} layer - Layer number
     * @returns {boolean} True if contains layer
     */
    hasLayer(mask, layer) {
        return (mask & (1 << layer)) !== 0;
    },
    
    /**
     * Add a layer to a mask.
     * 
     * @param {number} mask - Layer mask
     * @param {number} layer - Layer number
     * @returns {number} Updated mask
     */
    addLayer(mask, layer) {
        return mask | (1 << layer);
    },
    
    /**
     * Remove a layer from a mask.
     * 
     * @param {number} mask - Layer mask
     * @param {number} layer - Layer number
     * @returns {number} Updated mask
     */
    removeLayer(mask, layer) {
        return mask & ~(1 << layer);
    },
    
    /**
     * Get all layer numbers from a mask.
     * 
     * @param {number} mask - Layer mask
     * @returns {number[]} Array of layer numbers
     */
    getLayers(mask) {
        const layers = [];
        for (let i = 0; i < 32; i++) {
            if (mask & (1 << i)) {
                layers.push(i);
            }
        }
        return layers;
    }
};
