"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useMMKVRef = exports.createMMKVRefHookForStorage = exports.IDSTORE_ID = exports.getAllMMKVInstanceIDs = exports.getCurrentMMKVInstanceIDs = exports.IOSAccessibleStates = exports.ProcessingModes = exports.MMKVLoader = exports.MMKVInstance = exports.init = exports.isLoaded = exports.useIndex = exports.create = exports.useMMKVStorage = void 0;
const mmkvinstance_1 = __importDefault(require("./src/mmkvinstance"));
exports.MMKVInstance = mmkvinstance_1.default;
const useIndex_1 = require("./src/hooks/useIndex");
Object.defineProperty(exports, "useIndex", { enumerable: true, get: function () { return useIndex_1.useIndex; } });
const useMMKV_1 = require("./src/hooks/useMMKV");
Object.defineProperty(exports, "create", { enumerable: true, get: function () { return useMMKV_1.create; } });
Object.defineProperty(exports, "useMMKVStorage", { enumerable: true, get: function () { return useMMKV_1.useMMKVStorage; } });
const useMMKVRef_1 = require("./src/hooks/useMMKVRef");
Object.defineProperty(exports, "createMMKVRefHookForStorage", { enumerable: true, get: function () { return useMMKVRef_1.createMMKVRefHookForStorage; } });
Object.defineProperty(exports, "useMMKVRef", { enumerable: true, get: function () { return useMMKVRef_1.useMMKVRef; } });
const initializer_1 = require("./src/initializer");
Object.defineProperty(exports, "getCurrentMMKVInstanceIDs", { enumerable: true, get: function () { return initializer_1.getCurrentMMKVInstanceIDs; } });
const mmkvloader_1 = __importDefault(require("./src/mmkvloader"));
exports.MMKVLoader = mmkvloader_1.default;
const IDStore_1 = __importDefault(require("./src/mmkv/IDStore"));
const init_1 = require("./src/mmkv/init");
Object.defineProperty(exports, "init", { enumerable: true, get: function () { return init_1.init; } });
Object.defineProperty(exports, "isLoaded", { enumerable: true, get: function () { return init_1.isLoaded; } });
const module_1 = __importStar(require("./src/module"));
const utils_1 = require("./src/utils");
Object.defineProperty(exports, "IOSAccessibleStates", { enumerable: true, get: function () { return utils_1.IOSAccessibleStates; } });
Object.defineProperty(exports, "ProcessingModes", { enumerable: true, get: function () { return utils_1.ProcessingModes; } });
const MMKVStorage = {
    /**
     * @deprecated Use `import {MMKVLoader} from "react-native-mmkv-storage`"
     */
    Loader: mmkvloader_1.default,
    /**
     * @deprecated Use `import {MMKVInstance} from "react-native-mmkv-storage`"
     */
    API: mmkvinstance_1.default,
    /**
     * @deprecated Use `import {ProcessingModes} from "react-native-mmkv-storage`"
     */
    MODES: utils_1.ProcessingModes,
    /**
     * @deprecated Use `import {IOSAccessibleStates} from "react-native-mmkv-storage`"
     */
    ACCESSIBLE: utils_1.IOSAccessibleStates,
    /**
     * @deprecated Use `import {getAllMMKVInstanceIDs} from "react-native-mmkv-storage`"
     */
    getAllMMKVInstanceIDs: IDStore_1.default.getAllMMKVInstanceIDs,
    /**
     * @deprecated Use `import {getCurrentMMKVInstanceIDs} from "react-native-mmkv-storage`"
     */
    getCurrentMMKVInstanceIDs: initializer_1.getCurrentMMKVInstanceIDs,
    /**
     * @deprecated Use `import {IDSTORE_ID} from "react-native-mmkv-storage`"
     */
    IDSTORE_ID: IDStore_1.default.STORE_ID,
    _jsiModule: module_1.default,
    _bridgeModule: module_1.mmkvBridgeModule
};
exports.default = MMKVStorage;
const { getAllMMKVInstanceIDs, STORE_ID: IDSTORE_ID } = IDStore_1.default;
exports.getAllMMKVInstanceIDs = getAllMMKVInstanceIDs;
exports.IDSTORE_ID = IDSTORE_ID;
