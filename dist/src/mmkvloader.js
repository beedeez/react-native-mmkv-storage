"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mmkvinstance_1 = __importDefault(require("./mmkvinstance"));
const handlers_1 = require("./handlers");
const initializer_1 = require("./initializer");
const keygen_1 = __importDefault(require("./keygen"));
const init_1 = require("./mmkv/init");
const utils_1 = require("./utils");
class MMKVLoader {
    constructor() {
        this.options = {
            instanceID: 'default',
            initWithEncryption: false,
            secureKeyStorage: false,
            accessibleMode: utils_1.IOSAccessibleStates.AFTER_FIRST_UNLOCK,
            processingMode: utils_1.ProcessingModes.SINGLE_PROCESS,
            aliasPrefix: 'com.MMKV.',
            alias: null,
            key: null,
            serviceName: null,
            initialized: false,
            persistDefaults: false,
            enableIndexing: true
        };
    }
    /**
     * Load MMKV with the specified ID. If instance does not exist, a new instance will be created.
     */
    withInstanceID(id) {
        this.options.instanceID = id;
        return this;
    }
    /**
     * Persist default values in hooks.
     * Normally hooks do not persist default values in storage,
     * so for example calling `getItem` will return `null`.
     * Setting this to true, the defaultValue will be returned instead.
     *
     */
    withPersistedDefaultValues() {
        this.options.persistDefaults = true;
        return this;
    }
    /**
     * Encrypt MMKV Instance and store the creditials in secured storage for later use.
     * The key for encryption is automatically generated and the default alias for key storage is 'com.MMKV.ammarahmed' which is converted to HEX for usage.
     *
     * Requires an ID to be specified.
     *
     */
    withEncryption() {
        this.options.initWithEncryption = true;
        this.options.key = (0, keygen_1.default)();
        this.options.alias = (0, utils_1.stringToHex)(this.options.aliasPrefix + this.options.instanceID);
        this.options.secureKeyStorage = true;
        return this;
    }
    /**
     * (iOS only) Sets the kSecAttrService attribute in the key chain (https://developer.apple.com/documentation/security/ksecattrservice).
     * Addresses https://github.com/ammarahm-ed/react-native-mmkv-storage/issues/156#issuecomment-934046177 issue.
     */
    withServiceName(serviceName) {
        this.options.serviceName = serviceName;
        return this;
    }
    /**
     * Set accessible mode for secure storage on ios devices
     *
     * @param accessible `MMKVStorage.ACCESSIBLE`
     */
    setAccessibleIOS(accessible) {
        this.options.accessibleMode = accessible;
        return this;
    }
    /**
     * Provide a custom key to encrypt the storage. Use this if you dont want to generate the key automatically.
     * You must call withEncryption() to use this.
     *
     * @param key the key to encrypt the storage with
     * @param secureKeyStorage Should the key be stored securely.
     * @param alias Provide an alias for key storage. Default alias is aliasPrefix + instanceID
     */
    encryptWithCustomKey(key, secureKeyStorage, alias) {
        this.options.key = key;
        this.options.secureKeyStorage = false;
        if (secureKeyStorage) {
            this.options.secureKeyStorage = true;
            if (alias) {
                this.options.alias = (0, utils_1.stringToHex)(this.options.aliasPrefix + alias);
            }
            else {
                this.options.alias = (0, utils_1.stringToHex)(this.options.aliasPrefix + this.options.instanceID);
            }
        }
        return this;
    }
    /**
     * Set the processing mode for storage.
     *
     * Will recieve the following values.
     * MMKV.MULTI_PROCESS
     * MMKV.SINGLE_PROCESS
     *
     * @param {number} mode Set processing mode for storage
     */
    setProcessingMode(mode) {
        this.options.processingMode = mode;
        return this;
    }
    /**
     * Create the instance with the given options.
     */
    initialize() {
        if (!(0, init_1.init)())
            throw new Error('MMKVStorage bindings not installed');
        initializer_1.currentInstancesStatus[this.options.instanceID] = false;
        utils_1.options[this.options.instanceID] = this.options;
        let instance = new mmkvinstance_1.default(this.options.instanceID);
        //@ts-ignore
        (0, handlers_1.handleAction)(null, this.options.instanceID);
        return instance;
    }
    /**
     * Disable indexing values by data type.
     */
    disableIndexing() {
        this.options.enableIndexing = false;
        return this;
    }
    generateKey() {
        this.options.key = (0, keygen_1.default)();
        return this;
    }
}
exports.default = MMKVLoader;
