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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleAction = handleAction;
exports.handleActionAsync = handleActionAsync;
exports.handlePromise = handlePromise;
const initializer_1 = require("./initializer");
/**
 *
 * A handler function used to handle all the
 * calls made to native code. The purpose is
 * to make sure that the storage is initialized
 * before any read/write requests are sent to the
 * MMKV instance.
 *
 *
 * @param action The native function that will be called
 * @param args Arguments for the native function
 */
function handleAction(action, ...args) {
    // The last argument is always the instance id.
    let id = args[args.length - 1];
    if (!initializer_1.currentInstancesStatus[id]) {
        initializer_1.currentInstancesStatus[id] = (0, initializer_1.initialize)(id);
    }
    if (!action)
        return undefined;
    let result = action(...args);
    if (result === undefined) {
        initializer_1.currentInstancesStatus[id] = (0, initializer_1.initialize)(id);
        result = action(...args);
    }
    return result;
}
/**
 *
 * A handler function used to handle all the
 * calls made to native code. The purpose is
 * to make sure that the storage is initialized
 * before any read/write requests are sent to the
 * MMKV instance.
 *
 *
 * @param action The native function that will be called
 * @param args Arguments for the native function
 */
function handleActionAsync(action, ...args) {
    return __awaiter(this, void 0, void 0, function* () {
        let id = args[args.length - 1];
        return new Promise(resolve => {
            if (!initializer_1.currentInstancesStatus[id]) {
                initializer_1.currentInstancesStatus[id] = (0, initializer_1.initialize)(id);
            }
            if (!action)
                return resolve(undefined);
            let result = action(...args);
            if (result === undefined) {
                initializer_1.currentInstancesStatus[id] = (0, initializer_1.initialize)(id);
                result = action(...args);
            }
            resolve(result);
        });
    });
}
function handlePromise(action, ...args) {
    return __awaiter(this, void 0, void 0, function* () {
        // The last argument is always the instance id.
        let id = args[args.length - 1];
        if (!initializer_1.currentInstancesStatus[id]) {
            initializer_1.currentInstancesStatus[id] = (0, initializer_1.initialize)(id);
        }
        if (!action)
            return undefined;
        let result = yield action(...args);
        if (result === undefined) {
            initializer_1.currentInstancesStatus[id] = (0, initializer_1.initialize)(id);
            result = yield action(...args);
        }
        return result;
    });
}
