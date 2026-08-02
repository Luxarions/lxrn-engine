// config/version.config.js
export const LUXARION_VERSION = {
    // Identitas
    short_name: "luxarion",
    name: "LUXARION Engine",
    
    // Version number
    major: 0,
    minor: 1,
    patch: 0,
    status: "alpha", // alpha | beta | rc | stable
    
    // Metadata
    website: "https://luxarion.dev",
    docs: "latest",
    build_date: new Date().toISOString(),
    
    // Utility methods
    toString() {
        return `${this.major}.${this.minor}.${this.patch}`;
    },
    
    getFullVersion() {
        return `${this.toString()}-${this.status}`;
    },
    
    getBuildName() {
        return `${this.short_name}.${this.status}.v${this.toString()}`;
    },
    
    isCompatible(major, minor) {
        return this.major === major && this.minor >= minor;
    }
};
