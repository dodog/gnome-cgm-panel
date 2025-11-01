// config.js
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

export class Config {
    constructor() {
        this.configDir = GLib.get_user_config_dir() + '/cgm-widget';
        this.configFile = this.configDir + '/config.json';
        this._config = this._loadConfig();
    }

    _loadConfig() {
        try {
            const file = Gio.File.new_for_path(this.configFile);
            if (!file.query_exists(null)) {
                // If the file doesn't exist, create it with defaults
                this._createDefaultConfig();
                return this._getDefaultConfig();
            }

            const [success, contents] = file.load_contents(null);
            if (success) {
                const decoder = new TextDecoder('utf-8');
                const configText = decoder.decode(contents);
                // Merge with defaults to ensure all keys are present after an update
                const defaultConfig = this._getDefaultConfig();
                const userConfig = JSON.parse(configText);

                const mergedConfig = { ...defaultConfig, ...userConfig };

                // If units are in mmol/L, convert thresholds to mg/dL for internal use
                if (mergedConfig.units === 'mmol/L') {
                    mergedConfig.thresholds.low = Math.round(mergedConfig.thresholds.low * 18);
                    mergedConfig.thresholds.high = Math.round(mergedConfig.thresholds.high * 18);
                }

                // Deep merge for nested objects to preserve old settings
                if (userConfig.thresholds) {
                    mergedConfig.thresholds = { ...defaultConfig.thresholds, ...mergedConfig.thresholds };
                }
                if (userConfig.notifications) {
                    userConfig.notifications = { ...defaultConfig.notifications, ...userConfig.notifications };
                }
                if (userConfig.colors) {
                    userConfig.colors = { ...defaultConfig.colors, ...userConfig.colors };
                }

                return { ...defaultConfig, ...userConfig };
            }
        } catch (error) {
            console.error('Error loading CGM config:', error);
        }

        return this._getDefaultConfig();
    }

    // config.js - Updated _getDefaultConfig() method
    _getDefaultConfig() {
        return {
            // Provider selection
            provider: "nightscout", // "nightscout" or "librelink"
            
            // Nightscout config
            nightscoutUrl: "",
            apiToken: "",
            
            // LibreLink config
            librelink: {
                email: "",
                password: "",
                region: "EU", // EU, US, etc.
                patientId: "" // auto-detected after first login
            },
            
            graphHours: 6,
            debug: false,
            units: "mg/dL", // "mg/dL" or "mmol/L"
            thresholds: {
                low: 70,
                high: 180,
            },
            notifications: {
                enabled: true,
                low: true,
                high: true,
            },
            colors: {
                low: '#ff4444',
                high: '#ffaa00',
                normal: '#ffffff',
            },
            staleMinutes: 10,     // Consider data stale after this many minutes
            historyFetchInterval: 5 // How often to fetch history data in minutes
        };
    }
    _createDefaultConfig() {
        this._saveConfig(this._getDefaultConfig());
        console.log(`Created default CGM config at: ${this.configFile}`);
    }

    get(key) {
        // Return the value from the config if it exists
        if (this._config[key] !== undefined) {
            return this._config[key];
        }
        // Otherwise, return the default value for that key
        const defaultConfig = this._getDefaultConfig();
        return defaultConfig[key];
    }

    set(key, value) {
        this._config[key] = value;
        this._saveConfig(this._config);
    }

    _saveConfig(configObject) {
        let configToSave = JSON.parse(JSON.stringify(configObject)); // Deep copy

        // If units are in mmol/L, convert thresholds back for saving
        if (configToSave.units === 'mmol/L') {
            configToSave.thresholds.low = (configToSave.thresholds.low / 18).toFixed(1);
            configToSave.thresholds.high = (configToSave.thresholds.high / 18).toFixed(1);
        }

        try {
            const dir = Gio.File.new_for_path(this.configDir);
            if (!dir.query_exists(null)) {
                dir.make_directory_with_parents(null);
            }

            const file = Gio.File.new_for_path(this.configFile);
            const configJson = JSON.stringify(configToSave, null, 2);
            file.replace_contents(configJson, null, false, Gio.FileCreateFlags.NONE, null);
        } catch (error) {
            console.error('Error saving CGM config:', error);
        }
    }

    reload() {
        this._config = this._loadConfig();
    }
}
