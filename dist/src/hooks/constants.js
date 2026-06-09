"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methods = exports.types = void 0;
exports.types = ['string', 'number', 'boolean', 'object', 'array'];
exports.methods = {
    string: {
        indexer: 'strings',
        get: 'getString',
        set: 'setString',
        copy: (value) => {
            return value;
        }
    },
    number: {
        indexer: 'numbers',
        get: 'getInt',
        set: 'setInt',
        copy: (value) => {
            return value;
        }
    },
    boolean: {
        indexer: 'booleans',
        get: 'getBool',
        set: 'setBool',
        copy: (value) => {
            return value;
        }
    },
    object: {
        indexer: 'maps',
        get: 'getMap',
        set: 'setMap',
        copy: (value) => {
            return Object.assign({}, value);
        }
    },
    array: {
        indexer: 'arrays',
        get: 'getArray',
        set: 'setArray',
        copy: (value) => {
            return [...value];
        }
    }
};
