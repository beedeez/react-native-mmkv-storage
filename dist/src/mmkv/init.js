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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLoaded = isLoaded;
exports.init = init;
const index_1 = __importStar(require("../module/index"));
// Installing JSI Bindings as done by
// https://github.com/mrousavy/react-native-mmkv
/**
 * Check if functions installed from JSI are present in global object.
 */
function isLoaded() {
    return typeof (index_1.default === null || index_1.default === void 0 ? void 0 : index_1.default.getStringMMKV) === 'function';
}
/**
 * Install bindings lazily.
 *
 * Note: You don't need to call this normally.
 */
function init() {
    try {
        if (!isLoaded()) {
            const installed = index_1.mmkvBridgeModule.install();
            if (!installed)
                throw new Error('JSI bindings were not installed for: MMKVStorage');
            if (!isLoaded()) {
                throw new Error('JSI bindings installation failed for: MMKVStorage');
            }
            return installed;
        }
        return true;
    }
    catch (e) {
        console.error('JSI bindings were not installed for: MMKVStorage', e);
        return false;
    }
}
