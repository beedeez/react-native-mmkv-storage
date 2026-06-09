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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strings_1 = __importDefault(require("./strings"));
const numbers_1 = __importDefault(require("./numbers"));
const booleans_1 = __importDefault(require("./booleans"));
const maps_1 = __importDefault(require("./maps"));
const arrays_1 = __importDefault(require("./arrays"));
const handlers_1 = require("../handlers");
const module_1 = __importDefault(require("../module"));
class indexer {
    constructor(id) {
        this.instanceID = id;
        this.strings = new strings_1.default(id);
        this.numbers = new numbers_1.default(id);
        this.booleans = new booleans_1.default(id);
        this.maps = new maps_1.default(id);
        this.arrays = new arrays_1.default(id);
    }
    /**
     * Get all keys from storage.
     *
     */
    getKeys() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield (0, handlers_1.handleActionAsync)(module_1.default.getAllKeysMMKV, this.instanceID);
        });
    }
    /**
     * Check if a key exists in storage.
     */
    hasKey(key) {
        return (0, handlers_1.handleAction)(module_1.default.containsKeyMMKV, key, this.instanceID);
    }
}
exports.default = indexer;
