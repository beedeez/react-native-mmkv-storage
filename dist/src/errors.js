"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.drainMMKVErrors = drainMMKVErrors;
const module_1 = __importDefault(require("./module"));
/**
 * Returns the MMKV core errors (CRC check failures, file length errors, error-level logs)
 * recorded natively since the previous call, and clears the native buffer (last 50 kept).
 * Returns an empty array when the JSI bindings are not installed yet.
 */
function drainMMKVErrors() {
    if (typeof module_1.default.drainMMKVErrors !== 'function')
        return [];
    return module_1.default.drainMMKVErrors();
}
