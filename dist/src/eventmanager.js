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
class EventManager {
    constructor() {
        this._registry = {};
    }
    unsubscribeAll() {
        this._registry = {};
    }
    subscribeMulti(names, handler) {
        names.forEach(name => {
            this.subscribe(name, handler);
        });
    }
    subscribe(name, handler) {
        if (!name || !handler)
            throw new Error('name and handler are required.');
        if (!this._registry[name])
            this._registry[name] = [];
        this._registry[name].push(handler);
    }
    unsubscribe(name, handler) {
        if (!this._registry[name])
            return;
        const index = this._registry[name].indexOf(handler);
        if (index <= -1)
            return;
        this._registry[name].splice(index, 1);
    }
    publish(name, ...args) {
        if (!this._registry[name])
            return;
        const handlers = this._registry[name];
        handlers.forEach(handler => {
            handler(...args);
        });
    }
    publishWithResult(name, ...args) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this._registry[name])
                return true;
            const handlers = this._registry[name];
            if (handlers.length <= 0)
                return true;
            return yield Promise.all(handlers.map(handler => handler(...args)));
        });
    }
}
exports.default = EventManager;
