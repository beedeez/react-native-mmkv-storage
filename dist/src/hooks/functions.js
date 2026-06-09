"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInitialValue = exports.getDataType = void 0;
const constants_1 = require("./constants");
const getDataType = (value) => {
    if (value === null || value === undefined)
        return null;
    let type = Array.isArray(value) ? 'array' : typeof value;
    return type;
};
exports.getDataType = getDataType;
const getInitialValue = (key, storage, initialValueType) => () => {
    if (!(storage === null || storage === void 0 ? void 0 : storage.indexer)) {
        return null;
    }
    let indexer = storage.indexer;
    if (indexer.hasKey(key)) {
        for (let i = 0; i < constants_1.types.length; i++) {
            let type = constants_1.types[i];
            //@ts-ignore
            if (indexer[constants_1.methods[type].indexer].hasKey(key)) {
                if (initialValueType === 'value') {
                    //@ts-ignore
                    return storage[constants_1.methods[type]['get']](key);
                }
                if (initialValueType === 'type') {
                    return type;
                }
            }
        }
    }
    return null;
};
exports.getInitialValue = getInitialValue;
