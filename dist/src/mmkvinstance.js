"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const encryption_1 = __importDefault(require("./encryption"));
const eventmanager_1 = __importDefault(require("./eventmanager"));
const handlers_1 = require("./handlers");
const indexer_1 = __importDefault(require("./indexer/indexer"));
const initializer_1 = require("./initializer");
const IDStore_1 = __importDefault(require("./mmkv/IDStore"));
const module_1 = __importDefault(require("./module"));
const transactions_1 = __importDefault(require("./transactions"));
const utils_1 = require("./utils");
function assert(type, value) {
    if (type === 'array') {
        if (!Array.isArray(value))
            throw new Error(`Trying to set ${typeof value} as a ${type}.`);
    }
    else {
        if (typeof value !== type)
            throw new Error(`Trying to set ${typeof value} as a ${type}.`);
    }
}
class MMKVInstance {
    constructor(id) {
        /**
         * Set a string value to storage for the given key.
         */
        this.setString = (key, value) => {
            if (this.transactions.beforewrite['string']) {
                value = this.transactions.transact('string', 'beforewrite', key, value);
            }
            if (this.handleNullOrUndefined(key, value))
                return true;
            assert('string', value);
            let result = (0, handlers_1.handleAction)(module_1.default.setStringMMKV, key, value, this.instanceID);
            if (result) {
                if (this.isRegisterd(key)) {
                    this.ev.publish(`${key}:onwrite`, { key, value: value });
                }
                if (this.transactions.onwrite['string']) {
                    this.transactions.transact('string', 'onwrite', key, value);
                }
            }
            return result;
        };
        /**
         * Get the string value for the given key.
         */
        this.getString = (key, callback) => {
            let string = (0, handlers_1.handleAction)(module_1.default.getStringMMKV, key, this.instanceID);
            if (this.transactions.onread['string']) {
                string = this.transactions.transact('string', 'onread', key, string);
            }
            callback && callback(null, string);
            return string;
        };
        /**
         * Set a number value to storage for the given key.
         */
        this.setInt = (key, value) => {
            if (this.transactions.beforewrite['number']) {
                value = this.transactions.transact('number', 'beforewrite', key, value);
            }
            if (this.handleNullOrUndefined(key, value))
                return true;
            assert('number', value);
            let result = (0, handlers_1.handleAction)(module_1.default.setNumberMMKV, key, value, this.instanceID);
            if (result) {
                if (this.isRegisterd(key)) {
                    this.ev.publish(`${key}:onwrite`, { key, value: value });
                }
                this.transactions.transact('number', 'onwrite', key, value);
            }
            return result;
        };
        /**
         * Get the number value for the given key
         */
        this.getInt = (key, callback) => {
            let int = (0, handlers_1.handleAction)(module_1.default.getNumberMMKV, key, this.instanceID);
            if (this.transactions.onread['number']) {
                int = this.transactions.transact('number', 'onread', key, int);
            }
            callback && callback(null, int);
            return int;
        };
        /**
         * Set a boolean value to storage for the given key
         */
        this.setBool = (key, value) => {
            if (this.transactions.beforewrite['boolean']) {
                value = this.transactions.transact('boolean', 'beforewrite', key, value);
            }
            if (this.handleNullOrUndefined(key, value))
                return true;
            assert('boolean', value);
            let result = (0, handlers_1.handleAction)(module_1.default.setBoolMMKV, key, value, this.instanceID);
            if (result) {
                if (this.isRegisterd(key)) {
                    this.ev.publish(`${key}:onwrite`, { key, value: value });
                }
                this.transactions.transact('boolean', 'onwrite', key, value);
            }
            return result;
        };
        /**
         * Get the boolean value for the given key.
         */
        this.getBool = (key, callback) => {
            let bool = (0, handlers_1.handleAction)(module_1.default.getBoolMMKV, key, this.instanceID);
            if (this.transactions.onread['boolean']) {
                bool = this.transactions.transact('boolean', 'onread', key, bool);
            }
            callback && callback(null, bool);
            return bool;
        };
        /**
         * Set an Object to storage for a given key.
         *
         * Note that this function does **not** work with the Map data type
         */
        this.setMap = (key, value) => {
            if (this.transactions.beforewrite['object']) {
                value = this.transactions.transact('object', 'beforewrite', key, value);
            }
            if (this.handleNullOrUndefined(key, value))
                return true;
            assert('object', value);
            let result = (0, handlers_1.handleAction)(module_1.default.setMapMMKV, key, JSON.stringify(value), this.instanceID);
            if (result) {
                if (this.isRegisterd(key)) {
                    this.ev.publish(`${key}:onwrite`, { key, value: value });
                }
                if (this.transactions.onwrite['object']) {
                    this.transactions.transact('object', 'onwrite', key, value);
                }
            }
            return result;
        };
        /**
         * Get an Object from storage for a given key.
         */
        this.getMap = (key, callback) => {
            let json = (0, handlers_1.handleAction)(module_1.default.getMapMMKV, key, this.instanceID);
            try {
                if (json) {
                    let map = JSON.parse(json);
                    if (this.transactions.onread['object']) {
                        map = this.transactions.transact('object', 'onread', key, map);
                    }
                    callback && callback(null, map);
                    return map;
                }
            }
            catch (e) { }
            this.transactions.transact('object', 'onread', key);
            callback && callback(null, null);
            return null;
        };
        /**
         * Set an array to storage for the given key.
         */
        this.setArray = (key, value) => {
            if (this.transactions.beforewrite['array']) {
                value = this.transactions.transact('array', 'beforewrite', key, value);
            }
            if (this.handleNullOrUndefined(key, value))
                return true;
            assert('array', value);
            let result = (0, handlers_1.handleAction)(module_1.default.setArrayMMKV, key, JSON.stringify(value), this.instanceID);
            if (result) {
                if (this.isRegisterd(key)) {
                    this.ev.publish(`${key}:onwrite`, { key, value: value });
                }
                if (this.transactions.onwrite['array']) {
                    this.transactions.transact('array', 'onwrite', key, value);
                }
            }
            return result;
        };
        /**
         * get an array from the storage for give key.
         */
        this.getArray = (key, callback) => {
            let json = (0, handlers_1.handleAction)(module_1.default.getMapMMKV, key, this.instanceID);
            try {
                if (json) {
                    let array = JSON.parse(json);
                    if (this.transactions.onread['array']) {
                        array = this.transactions.transact('array', 'onread', key, array);
                    }
                    callback && callback(null, array);
                    return array;
                }
            }
            catch (e) { }
            this.transactions.transact('array', 'onread', key);
            callback && callback(null, null);
            return null;
        };
        /**
         * Retrieve multiple items for the given array of keys.
         *
         */
        this.getMultipleItems = (keys, type) => {
            let items = [];
            if (type === 'map')
                type = 'object';
            // string/array/object can be read in a single native batch call (one JSI
            // crossing for N keys) instead of one native call per key. Mirrors
            // getMultipleItemsAsync. Falls back to the per-key loop if the native
            // batch function is unavailable in the current binary.
            if ((type === 'string' || type === 'array' || type === 'object') &&
                typeof module_1.default.getMultiMMKV === 'function') {
                const result = (0, handlers_1.handleAction)(module_1.default.getMultiMMKV, keys, this.instanceID) || [];
                return keys.map((key, index) => {
                    let value = type === 'string'
                        ? result[index]
                        : (result[index] ? JSON.parse(result[index]) : result[index]);
                    if (this.transactions.onread[type]) {
                        value = this.transactions.transact(type, 'onread', key, value);
                    }
                    return [key, value];
                });
            }
            if (type === 'string') {
                for (let i = 0; i < keys.length; i++) {
                    const item = [keys[i], this.getString(keys[i])];
                    if (this.transactions.onread[type]) {
                        item[1] = this.transactions.transact(type, 'onread', item[0], item[1]);
                    }
                    items.push(item);
                }
                return items;
            }
            else if (type === 'array') {
                for (let i = 0; i < keys.length; i++) {
                    const item = [keys[i], this.getArray(keys[i])];
                    if (this.transactions.onread[type]) {
                        item[1] = this.transactions.transact(type, 'onread', item[0], item[1]);
                    }
                    items.push(item);
                }
                return items;
            }
            else if (type === 'object') {
                for (let i = 0; i < keys.length; i++) {
                    const item = [keys[i], this.getMap(keys[i])];
                    if (this.transactions.onread[type]) {
                        item[1] = this.transactions.transact(type, 'onread', item[0], item[1]);
                    }
                    items.push(item);
                }
                return items;
            }
            else if (type === 'boolean') {
                for (let i = 0; i < keys.length; i++) {
                    const item = [keys[i], this.getBool(keys[i])];
                    if (this.transactions.onread[type]) {
                        item[1] = this.transactions.transact(type, 'onread', item[0], item[1]);
                    }
                    items.push(item);
                }
                return items;
            }
            else if (type === 'number') {
                for (let i = 0; i < keys.length; i++) {
                    const item = [keys[i], this.getInt(keys[i])];
                    if (this.transactions.onread[type]) {
                        item[1] = this.transactions.transact(type, 'onread', item[0], item[1]);
                    }
                    items.push(item);
                }
                return items;
            }
        };
        this.instanceID = id;
        this.encryption = new encryption_1.default(id);
        this.indexer = new indexer_1.default(id);
        this.ev = new eventmanager_1.default();
        this.transactions = new transactions_1.default();
        this.options = utils_1.options[id];
    }
    isRegisterd(key) {
        return this.ev._registry[`${key}:onwrite`];
    }
    handleNullOrUndefined(key, value) {
        if (value === null || value === undefined) {
            this.removeItem(key);
            return true;
        }
        return false;
    }
    /**
     * Set a string value to storage for the given key.
     * This method is added for redux-persist/zustand support.
     *
     */
    setItem(key, value, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                const result = this.setString(key, value);
                callback && callback(null);
                resolve(result);
            });
        });
    }
    /**
     * Get the string value for the given key.
     * This method is added for redux-persist/zustand support.
     */
    getItem(key, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                resolve(this.getString(key, callback));
            });
        });
    }
    /**
     * Set a string value to storage for the given key.
     */
    setStringAsync(key, value) {
        return new Promise(resolve => {
            resolve(this.setString(key, value));
        });
    }
    /**
     * Get the string value for the given key.
     */
    getStringAsync(key) {
        return new Promise(resolve => {
            resolve(this.getString(key));
        });
    }
    /**
     * Set a number value to storage for the given key.
     */
    setIntAsync(key, value) {
        return new Promise(resolve => {
            resolve(this.setInt(key, value));
        });
    }
    /**
     * Get the number value for the given key.
     */
    getIntAsync(key) {
        return new Promise(resolve => {
            resolve(this.getInt(key));
        });
    }
    /**
     * Set a boolean value to storage for the given key.
     *
     */
    setBoolAsync(key, value) {
        return new Promise(resolve => {
            resolve(this.setBool(key, value));
        });
    }
    /**
     * Get the boolean value for the given key.
     */
    getBoolAsync(key) {
        return new Promise(resolve => {
            resolve(this.getBool(key));
        });
    }
    /**
     * Set an Object to storage for the given key.
     *
     * Note that this function does **not** work with the Map data type.
     *
     */
    setMapAsync(key, value) {
        return new Promise(resolve => {
            resolve(this.setMap(key, value));
        });
    }
    /**
     * Get then Object from storage for the given key.
     */
    getMapAsync(key) {
        return new Promise(resolve => {
            resolve(this.getMap(key));
        });
    }
    /**
     * Set items in bulk of same type at once
     *
     * If a value against a key is null/undefined, it will be
     * set as null.
     *
     * @param keys Array of keys
     * @param values Array of values
     * @param type
     */
    setMultipleItemsAsync(items, type) {
        return __awaiter(this, void 0, void 0, function* () {
            if (type === 'object')
                type = 'map';
            let values = [];
            if (type === 'string' || type === 'array' || type === 'map') {
                values = items.map(item => {
                    let value = item[1];
                    if (this.transactions.beforewrite[type]) {
                        value = this.transactions.transact(type, 'beforewrite', item[0], value);
                    }
                    if (type === 'string')
                        return value;
                    return value ? JSON.stringify(value) : value;
                });
                (0, handlers_1.handleAction)(module_1.default.setMultiMMKV, items.map(item => item[0]), values, `${type}Index`, this.instanceID);
            }
            else {
                if (type === 'boolean') {
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        let value = item[1];
                        if (this.transactions.beforewrite[type]) {
                            value = this.transactions.transact(type, 'beforewrite', item[0], value);
                        }
                        values[i] = value;
                        this.setBool(item[0], value);
                    }
                }
                else if (type === 'number') {
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        let value = item[1];
                        if (this.transactions.beforewrite[type]) {
                            value = this.transactions.transact(type, 'beforewrite', item[0], value);
                        }
                        values[i] = value;
                        this.setInt(item[0], value);
                    }
                }
            }
            queueMicrotask(() => {
                items === null || items === void 0 ? void 0 : items.forEach((item, index) => {
                    if (this.isRegisterd(item[0])) {
                        this.ev.publish(`${item[0]}:onwrite`, { key: item[0], value: values[index] });
                    }
                    if (this.transactions.onwrite[type]) {
                        this.transactions.transact(type, 'onwrite', item[0], values[index]);
                    }
                });
            });
            return true;
        });
    }
    /**
     * Retrieve multiple items for the given array of keys
     */
    getMultipleItemsAsync(keys, type) {
        return __awaiter(this, void 0, void 0, function* () {
            let items = [];
            if (type === 'map')
                type = 'object';
            if (type === 'array' || type === 'string' || type === 'object') {
                const result = (0, handlers_1.handleAction)(module_1.default.getMultiMMKV, keys, this.instanceID);
                if (type === 'string')
                    return keys.map((key, index) => [key, result[index]]);
                return keys.map((key, index) => {
                    let value = result[index] ? JSON.parse(result[index]) : result[index];
                    if (this.transactions.onread[type]) {
                        value = this.transactions.transact(type, 'onread', key, value);
                    }
                    return [key, value];
                });
            }
            if (type === 'boolean') {
                for (let i = 0; i < keys.length; i++) {
                    let value = this.getBool(keys[i]);
                    if (this.transactions.onread[type]) {
                        value = this.transactions.transact(type, 'onread', keys[i], value);
                    }
                    const item = [keys[i], value];
                    items.push(item);
                }
                return items;
            }
            else if (type === 'number') {
                for (let i = 0; i < keys.length; i++) {
                    let value = this.getInt(keys[i]);
                    if (this.transactions.onread[type]) {
                        value = this.transactions.transact(type, 'onread', keys[i], value);
                    }
                    const item = [keys[i], value];
                    items.push(item);
                }
                return items;
            }
        });
    }
    /**
     * Set an array to storage for the given key.
     */
    setArrayAsync(key, value) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                resolve(this.setArray(key, value));
            });
        });
    }
    /**
     * Get the array from the storage for the given key.
     */
    getArrayAsync(key) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => {
                resolve(this.getArray(key));
            });
        });
    }
    /**
     * Returns true if the native batch operations (getStringsMMKV/setStringsMMKV)
     * are available in the current native binary.
     */
    hasBatchOps() {
        return typeof module_1.default.getStringsMMKV === 'function'
            && typeof module_1.default.setStringsMMKV === 'function';
    }
    /**
     * Batch-read multiple string keys in a single native call.
     * Skips indexing overhead. Returns an array of [key, value] pairs.
     */
    getStrings(keys) {
        if (!module_1.default.getStringsMMKV) {
            return keys.map(key => { var _a; return [key, (_a = this.getString(key)) !== null && _a !== void 0 ? _a : null]; });
        }
        const results = (0, handlers_1.handleAction)(module_1.default.getStringsMMKV, keys, this.instanceID);
        if (!results)
            return keys.map(key => [key, null]);
        return keys.map((key, index) => { var _a; return [key, (_a = results[index]) !== null && _a !== void 0 ? _a : null]; });
    }
    /**
     * Batch-write multiple string key/value pairs in a single native call.
     * Skips indexing overhead for maximum write performance.
     */
    setStrings(items) {
        if (!module_1.default.setStringsMMKV) {
            for (const [key, value] of items) {
                this.setString(key, value);
            }
            return true;
        }
        const keys = items.map(item => item[0]);
        const values = items.map(item => item[1]);
        return (0, handlers_1.handleAction)(module_1.default.setStringsMMKV, keys, values, this.instanceID);
    }
    /**
     *
     * Get all Storage Instance IDs that are currently loaded.
     *
     */
    getCurrentMMKVInstanceIDs() {
        return (0, initializer_1.getCurrentMMKVInstanceIDs)();
    }
    /**
     *
     * Get all Storage Instance IDs.
     *
     */
    getAllMMKVInstanceIDs() {
        return IDStore_1.default.getAllMMKVInstanceIDs();
    }
    /**
     * Remove an item from storage for a given key.
     *
     * If you are removing large number of keys, use `removeItems` instead.
     */
    removeItem(key) {
        let result = (0, handlers_1.handleAction)(module_1.default.removeValueMMKV, key, this.instanceID);
        if (result) {
            if (this.isRegisterd(key)) {
                this.ev.publish(`${key}:onwrite`, { key, value: null });
            }
        }
        if (this.transactions.ondelete) {
            this.transactions.transact('string', 'ondelete', key);
        }
        return result;
    }
    /**
     * Remove multiple items from storage for given keys
     *
     */
    removeItems(keys) {
        let result = (0, handlers_1.handleAction)(module_1.default.removeValuesMMKV, keys.filter(key => key !== this.instanceID), this.instanceID);
        for (const key of keys) {
            if (result) {
                if (this.isRegisterd(key)) {
                    this.ev.publish(`${key}:onwrite`, { key, value: null });
                }
            }
            if (this.transactions.ondelete) {
                this.transactions.transact('string', 'ondelete', key);
            }
        }
        return result;
    }
    /**
     * Remove all keys and values from storage.
     */
    clearStore() {
        let keys = (0, handlers_1.handleAction)(module_1.default.getAllKeysMMKV, this.instanceID);
        let cleared = (0, handlers_1.handleAction)(module_1.default.clearMMKV, this.instanceID);
        module_1.default.setBoolMMKV(this.instanceID, true, this.instanceID);
        queueMicrotask(() => {
            keys === null || keys === void 0 ? void 0 : keys.forEach((key) => {
                if (this.isRegisterd(key)) {
                    this.ev.publish(`${key}:onwrite`, { key });
                }
                if (this.transactions.ondelete) {
                    this.transactions.transact('string', 'ondelete', key);
                }
            });
        });
        return cleared;
    }
    /**
     * Get the key and alias for the encrypted storage
     */
    getKey() {
        let { alias, key } = utils_1.options[this.instanceID];
        return { alias, key };
    }
    /**
     * Clear memory cache of the current MMKV instance
     */
    clearMemoryCache() {
        let cleared = (0, handlers_1.handleAction)(module_1.default.clearMemoryCache, this.instanceID);
        return cleared;
    }
}
exports.default = MMKVInstance;
