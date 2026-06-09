"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMMKVRefHookForStorage = void 0;
exports.useMMKVRef = useMMKVRef;
/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/
const react_1 = require("react");
function useMMKVRef(key, storage, defaultValue) {
    var _a;
    const refKey = `__mmkvref:${key}`;
    const value = (0, react_1.useRef)(((_a = storage.getMap(refKey)) === null || _a === void 0 ? void 0 : _a.current) || defaultValue);
    const frameRef = (0, react_1.useRef)(0);
    (0, react_1.useEffect)(() => {
        const onWrite = event => {
            value.current = event.value;
        };
        if (storage !== null) {
            storage.ev.subscribe(`${key}:onwrite`, onWrite);
        }
        return () => {
            if (storage != null) {
                storage.ev.unsubscribe(`${key}:onwrite`, onWrite);
            }
        };
    }, [key, storage]);
    return {
        get current() {
            return value.current;
        },
        set current(next) {
            value.current = next;
            cancelAnimationFrame(frameRef.current);
            frameRef.current = requestAnimationFrame(() => {
                storage.setMap(refKey, {
                    current: value.current
                });
            });
        },
        reset() {
            storage.removeItem(refKey);
        }
    };
}
const createMMKVRefHookForStorage = (storage) => (key, defaultValue) => {
    if (!key || typeof key !== 'string' || !storage)
        throw new Error('Key and Storage are required parameters.');
    return useMMKVRef(key, storage, defaultValue);
};
exports.createMMKVRefHookForStorage = createMMKVRefHookForStorage;
