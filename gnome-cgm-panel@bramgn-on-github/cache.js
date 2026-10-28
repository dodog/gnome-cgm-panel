// cache.js
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

// A simple class to handle reading and writing a JSON cache file to disk.
export class Cache {
    constructor() {
        this.cacheDir = GLib.get_user_cache_dir() + '/cgm-widget';
        this.cacheFile = this.cacheDir + '/cache.json';
        this._file = Gio.File.new_for_path(this.cacheFile);
        this._dir = Gio.File.new_for_path(this.cacheDir);
        this._writing = false;
        this._pendingJson = null;
    }

    /**
     * Loads data from the cache file.
     * @returns {object | null} The parsed JSON object or null if not found/error.
     */
    load() {
        if (!this._file.query_exists(null)) {
            return null;
        }
        try {
            const [success, contents] = this._file.load_contents(null);
            if (success) {
                const decoder = new TextDecoder('utf-8');
                const cacheText = decoder.decode(contents);
                return JSON.parse(cacheText);
            }
        } catch (error) {
            console.error(`Error loading CGM cache: ${error.message}`);
        }
        return null;
    }

    /**
     * Saves a JavaScript object to the cache file as JSON, without blocking the shell.
     * The data is serialized immediately, so the caller may keep modifying the object.
     * If a write is already running, only the newest data is written afterwards.
     * @param {object} data The object to save.
     */
    save(data) {
        try {
            this._pendingJson = JSON.stringify(data);
        } catch (error) {
            console.error(`Error serializing CGM cache: ${error.message}`);
            return;
        }
        if (!this._writing) {
            this._flush();
        }
    }

    _flush() {
        const json = this._pendingJson;
        this._pendingJson = null;
        if (json === null) return;

        try {
            if (!this._dir.query_exists(null)) {
                this._dir.make_directory_with_parents(null);
            }
        } catch (error) {
            console.error(`Error creating CGM cache dir: ${error.message}`);
            return;
        }

        this._writing = true;
        const bytes = new GLib.Bytes(new TextEncoder().encode(json));
        this._file.replace_contents_bytes_async(
            bytes,
            null,
            false,
            Gio.FileCreateFlags.REPLACE_DESTINATION,
            null,
            (file, result) => {
                try {
                    file.replace_contents_finish(result);
                } catch (error) {
                    console.error(`Error saving CGM cache: ${error.message}`);
                }
                this._writing = false;
                if (this._pendingJson !== null) {
                    this._flush();
                }
            }
        );
    }
}
