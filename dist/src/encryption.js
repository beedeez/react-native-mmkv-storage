"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const initializer_1 = require("./initializer");
const keygen_1 = __importDefault(require("./keygen"));
const utils_1 = require("./utils");
const handlers_1 = require("./handlers");
const IDStore_1 = __importDefault(require("./mmkv/IDStore"));
const module_1 = __importDefault(require("./module"));
function encryptStorage(id, key, secureKeyStorage = true, alias, accessibleMode) {
    if (secureKeyStorage) {
        module_1.default.setSecureKey(alias, key, accessibleMode);
        module_1.default.encryptMMKV(key, id);
        module_1.default.setBoolMMKV(id, true, id);
        IDStore_1.default.add(id, true, alias);
    }
    else {
        module_1.default.encryptMMKV(key, id);
        module_1.default.setBoolMMKV(id, true, id);
        IDStore_1.default.add(id, true, null);
    }
    return true;
}
class encryption {
    constructor(id) {
        let opts = utils_1.options[id];
        this.instanceID = opts.instanceID;
        this.alias = opts.alias;
        this.aliasPrefix = opts.aliasPrefix;
        this.key = opts.key;
        this.accessibleMode = opts.accessibleMode;
        this.initialized = opts.initialized;
    }
    /**
     * You can encrypt an MMKV instance anytime, even after it is created.
     *
     * Calling this without a key will generate a key itself & store it in secure storage.
     * If no parameters are provided, a key is generated and securely stored in the storage with the default alias for later use.
     *
     * Note that you don't need to use this method if you use `withEncryption()` at initialization.
     * This is only used for encrypting an unencrypted instance at runtime.
     *
     * @param key; Provide a custom key to encrypt the storage.
     * @param secureKeyStorage Store the key in secure storage.
     * @param alias Provide a custom alias to store the key with in secure storage
     * @param accessibleMode Set accessible mode for secure storage on ios devices
     * @returns An object with alias and key
     */
    encrypt(key, secureKeyStorage = true, alias, accessibleMode) {
        if (accessibleMode) {
            this.accessibleMode = accessibleMode;
        }
        this.alias = (0, utils_1.stringToHex)(this.aliasPrefix + this.instanceID);
        this.key = key || (0, keygen_1.default)();
        utils_1.options[this.instanceID].key = this.key;
        if (secureKeyStorage) {
            this.alias = (0, utils_1.stringToHex)(alias ? this.aliasPrefix + alias : this.aliasPrefix + this.instanceID);
        }
        utils_1.options[this.instanceID].alias = this.alias;
        if (!initializer_1.currentInstancesStatus[this.instanceID]) {
            (0, initializer_1.initialize)(this.instanceID);
            initializer_1.currentInstancesStatus[this.instanceID] = true;
        }
        return encryptStorage(this.instanceID, this.key, secureKeyStorage, this.alias, this.accessibleMode);
    }
    /**
     * You can decrypt an encrypted MMKV instance anytime, even after it is created.
     * Decrypting the storage will delete the key you encrypted it with
     *
     */
    decrypt() {
        (0, handlers_1.handleAction)(module_1.default.decryptMMKV, this.instanceID);
        module_1.default.setBoolMMKV(this.instanceID, true, this.instanceID);
        IDStore_1.default.add(this.instanceID, false, null);
        return true;
    }
    /**
     * Change the encryption key incase the old one has been compromised.
     * @param  key; Provide a custom key to encrypt the storage.
     * @param secureKeyStorage Store the key in secure storage.
     * @param alias Provide a custom alias to store the key with in secure storage
     * @param accessibleMode Set accessible mode for secure storage on ios devices
     */
    changeEncryptionKey(key, secureKeyStorage = true, alias, accessibleMode) {
        return this.encrypt(key, secureKeyStorage, alias, accessibleMode);
    }
}
exports.default = encryption;
