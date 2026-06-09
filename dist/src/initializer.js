"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentInstancesStatus = void 0;
exports.getCurrentMMKVInstanceIDs = getCurrentMMKVInstanceIDs;
exports.initialize = initialize;
const utils_1 = require("./utils");
const IDStore_1 = __importDefault(require("./mmkv/IDStore"));
const module_1 = __importDefault(require("./module"));
exports.currentInstancesStatus = {};
/**
 * Get current instance ID status for instances
 * loaded since application started
 */
function getCurrentMMKVInstanceIDs() {
    return Object.assign({}, exports.currentInstancesStatus);
}
/**
 *
 * Initialize function is used to create
 * the storage or load the storage if
 * it already exists with the given options.
 *
 */
function initialize(id) {
    let opts = utils_1.options[id];
    if (!module_1.default.setupMMKVInstance)
        return false;
    if (opts.serviceName && opts.alias && module_1.default.setMMKVServiceName) {
        module_1.default.setMMKVServiceName(opts.alias, opts.serviceName);
    }
    if (IDStore_1.default.exists(id)) {
        if (!IDStore_1.default.encrypted(id)) {
            return initWithoutEncryption(opts);
        }
        opts.alias = IDStore_1.default.getAlias(id);
        return initWithEncryptionUsingOldKey(opts);
    }
    if (!opts.initWithEncryption) {
        return initWithoutEncryption(opts);
    }
    if (!opts.secureKeyStorage) {
        return initWithEncryptionWithoutSecureStorage(opts);
    }
    if (opts.alias && !module_1.default.secureKeyExists(opts.alias)) {
        return initWithEncryptionUsingNewKey(opts);
    }
    return initWithEncryptionUsingOldKey(opts);
}
/**
 * Usually after first creation of the
 * storage, your database will be
 * initialized with its old key stored
 * in the secure storage.
 *
 */
function initWithEncryptionUsingOldKey(options) {
    if (!options.alias)
        return false;
    let key = !options.secureKeyStorage ? options.key : module_1.default.getSecureKey(options.alias);
    if (key) {
        return setupWithEncryption(options.instanceID, options.processingMode, key, options.alias);
    }
    return false;
}
/**
 * For first creation of storage
 * this function is called when
 * you are encrypting it on initialzation
 *
 */
function initWithEncryptionUsingNewKey(options) {
    if (!options.key || options.key.length < 3)
        throw new Error('Key is null or too short');
    if (!options.alias)
        return false;
    module_1.default.setSecureKey(options.alias, options.key, options.accessibleMode);
    return setupWithEncryption(options.instanceID, options.processingMode, options.key, options.alias);
}
/**
 * It is possible that the user does not
 * want to store the key in secure storage.
 * In such a case, this function will
 * be called to encrypt the storage.
 *
 */
function initWithEncryptionWithoutSecureStorage(options) {
    if (!options.key || options.key.length < 3)
        throw new Error('Key is null or too short');
    if (!options.alias)
        return false;
    return setupWithEncryption(options.instanceID, options.processingMode, options.key, options.alias);
}
/**
 *
 * When you want to initialize the storage
 * without encryption this function is called.
 *
 */
function initWithoutEncryption(options) {
    return setup(options.instanceID, options.processingMode);
}
function setup(id, mode) {
    module_1.default.setupMMKVInstance(id, mode, '', '', utils_1.options[id].enableIndexing);
    if (!IDStore_1.default.exists(id)) {
        module_1.default.setBoolMMKV(id, true, id);
        IDStore_1.default.add(id, false, null);
        return true;
    }
    else {
        if (module_1.default.containsKeyMMKV(id, id)) {
            return true;
        }
        else {
            return encryptionHandler(id, mode);
        }
    }
}
function setupWithEncryption(id, mode, key, alias) {
    module_1.default.setupMMKVInstance(id, mode, key, '', utils_1.options[id].enableIndexing);
    if (!IDStore_1.default.exists(id)) {
        module_1.default.setBoolMMKV(id, true, id);
        IDStore_1.default.add(id, true, alias);
        return true;
    }
    else {
        if (module_1.default.containsKeyMMKV(id, id)) {
            utils_1.options[id].key = key;
            return true;
        }
        else {
            return encryptionHandler(id, mode);
        }
    }
}
/**
 * When a storage instance is encrypted at runtime, this functions
 * helps in detecting and loading the instance properly.
 */
function encryptionHandler(id, mode) {
    let alias = IDStore_1.default.getAlias(id);
    if (!alias)
        return module_1.default.setupMMKVInstance(id, mode, '', '', utils_1.options[id].enableIndexing);
    let exists = module_1.default.secureKeyExists(alias);
    let key = exists && module_1.default.getSecureKey(alias);
    if (IDStore_1.default.encrypted(id) && key) {
        utils_1.options[id].key = key;
        return module_1.default.setupMMKVInstance(id, mode, key, '', utils_1.options[id].enableIndexing);
    }
    else {
        return module_1.default.setupMMKVInstance(id, mode, '', '', utils_1.options[id].enableIndexing);
    }
}
