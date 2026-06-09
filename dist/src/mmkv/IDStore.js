"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
const module_1 = __importDefault(require("../module"));
const STORE_ID = react_native_1.Platform.OS === 'ios' ? 'mmkvIdStore' : 'mmkvIDStore';
/**
 *	Store instance properties that we will use later to
 *  load the storage again.
 */
function add(id, encrypted, alias) {
    let storeUnit = {
        id,
        encrypted,
        alias
    };
    module_1.default.setStringMMKV(id, JSON.stringify(storeUnit), STORE_ID);
}
/**
 * Check if the storage instance with the given ID is encrypted or not.
 */
function encrypted(id) {
    let json = module_1.default.getStringMMKV(id, STORE_ID);
    if (!json) {
        return false;
    }
    let storeUnit = JSON.parse(json);
    return storeUnit.encrypted;
}
/**
 * Get the alias for the storage which we used
 * to store the crypt key in secure storage.
 * @param {string} id instance id
 */
function getAlias(id) {
    let json = module_1.default.getStringMMKV(id, STORE_ID);
    if (!json) {
        return null;
    }
    let storeUnit = JSON.parse(json);
    return storeUnit.alias;
}
/**
 * Check if an instance is already present in the store.
 * @param {string} id instance id
 */
function exists(id) {
    let json = module_1.default.getStringMMKV(id, STORE_ID);
    if (!json) {
        return false;
    }
    return true;
}
let blacklist = ['stringIndex'];
/**
 * Get all the available instances that
 * were loaded since the app was installed.
 */
function getAll() {
    let keys = module_1.default.getAllKeysMMKV(STORE_ID);
    if (!keys)
        return [];
    let storeUnits = {};
    keys.forEach(key => {
        if (!blacklist.includes(key)) {
            let json = module_1.default.getStringMMKV(key, STORE_ID);
            if (json) {
                let storeUnit = JSON.parse(json);
                storeUnits[key] = storeUnit;
            }
        }
    });
    return storeUnits;
}
/**
 * Get all the instance ids for instances
 * that were loaded since the app was installed
 */
function getAllMMKVInstanceIDs() {
    return Object.keys(getAll());
}
exports.default = {
    getAll,
    getAlias,
    getAllMMKVInstanceIDs,
    add,
    exists,
    encrypted,
    STORE_ID
};
