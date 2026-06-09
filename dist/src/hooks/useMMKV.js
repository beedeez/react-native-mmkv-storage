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
exports.useMMKVStorage = exports.create = void 0;
const react_1 = require("react");
const constants_1 = require("./constants");
const functions_1 = require("./functions");
/**
 * A helper function which returns `useMMKVStorage` hook with a storage instance set.
 *
 * ```tsx
 * import MMKVStorage, {create} from "react-native-mmkv-storage"
 *
 * const storage = new MMKVStorage.Loader().initialize();
 * const useStorage = create(storage);
 *
 * // Then later in your component
 * const App = () => {
 *  const [value, setValue] = useStorage("key");
 *
 * ...
 * }
 * ```
 * Documentation: https://rnmmkv.vercel.app/#/usemmkvstorage
 *
 * @param storage The storage instance
 * @returns `useMMKVStorage` hook
 */
const create = (storage) => (key, defaultValue, equalityFn) => {
    if (!key || typeof key !== 'string' || !storage)
        throw new Error('Key and Storage are required parameters.');
    return (0, exports.useMMKVStorage)(key, storage, defaultValue, equalityFn);
};
exports.create = create;
/**
 *
 * useMMKVStorage Hook is like a persisted state that will always write every change in storage and update your app UI instantly.
 * It doesn’t matter if you reload the app or restart it. Everything will be in place on app load.
 *
 * ```tsx
 * import MMKVStorage from "react-native-mmkv-storage"
 *
 * const MMKV = new MMKVStorage.Loader().initialize();
 *
 * // Then later in your component
 * const App = () => {
 * const [user, setUser] = useMMKVStorage("user", MMKV, "robert");
 *
 * ...
 * };
 * ```
 * Documentation: https://rnmmkv.vercel.app/#/usemmkvstorage
 *
 * @param key The key against which the hook should update
 * @param storage The storage instance
 * @param defaultValue Default value if any
 * @param equalityFn Provide a custom function to handle state update if value has changed.
 *
 * @returns `[value,setValue]`
 */
const useMMKVStorage = (key, storage, defaultValue, equalityFn) => {
    const getValue = (0, react_1.useCallback)((0, functions_1.getInitialValue)(key, storage, 'value'), [key, storage]);
    const getValueType = (0, react_1.useCallback)((0, functions_1.getInitialValue)(key, storage, 'type'), [key, storage]);
    const [value, setValue] = (0, react_1.useState)(getValue);
    const [valueType, setValueType] = (0, react_1.useState)(getValueType);
    const prevKey = usePrevious(key);
    const prevStorage = usePrevious(storage);
    const prevValue = (0, react_1.useRef)(value);
    (0, react_1.useEffect)(() => {
        prevValue.current = value;
        if (storage.options.persistDefaults &&
            defaultValue !== undefined &&
            defaultValue !== null &&
            (value === null || value === undefined)) {
            setNewValue(defaultValue);
        }
    }, [value]);
    (0, react_1.useEffect)(() => {
        if (storage !== null) {
            // This check prevents getInitialValue from being called twice when this hook intially loads
            if (prevKey !== key || prevStorage !== storage) {
                setValue(getValue);
                setValueType(getValueType);
            }
            storage.ev.subscribe(`${key}:onwrite`, updateValue);
        }
        return () => {
            if (storage != null) {
                storage.ev.unsubscribe(`${key}:onwrite`, updateValue);
            }
        };
    }, [prevKey, key, prevStorage, storage, getValue, getValueType]);
    const updateValue = (0, react_1.useCallback)(event => {
        let type = (0, functions_1.getDataType)(event.value);
        //@ts-ignore
        let _value = event.value ? constants_1.methods[type]['copy'](event.value) : event.value;
        if (prevValue.current === _value || (equalityFn === null || equalityFn === void 0 ? void 0 : equalityFn(prevValue.current, _value)))
            return;
        setValue(_value);
        setValueType(type);
    }, []);
    const setNewValue = (0, react_1.useCallback)((nextValue) => __awaiter(void 0, void 0, void 0, function* () {
        let updatedValue = nextValue;
        if (typeof nextValue === 'function') {
            if (nextValue.constructor.name === 'AsyncFunction') {
                __DEV__ &&
                    console.warn(`Attempting to use an async function as state setter is not allowed.`);
                return;
            }
            updatedValue = nextValue(prevValue.current || defaultValue);
        }
        let _value;
        let _valueType = valueType;
        if (updatedValue === null || updatedValue === undefined) {
            storage.removeItem(key);
            _valueType = null;
        }
        else {
            let _dataType = (0, functions_1.getDataType)(updatedValue);
            if (_valueType && _dataType !== valueType) {
                __DEV__ &&
                    console.warn(`Trying to set a ${_dataType} value to hook for type ${_valueType} is not allowed.`);
                return;
            }
            if (!valueType) {
                _valueType = _dataType;
            }
            _value = updatedValue;
            //@ts-ignore
            storage[constants_1.methods[_valueType]['set']](key, _value);
        }
    }), [key, storage, valueType]);
    return [
        valueType === 'boolean' || valueType === 'number' ? value : value || defaultValue,
        setNewValue
    ];
};
exports.useMMKVStorage = useMMKVStorage;
function usePrevious(value) {
    const ref = (0, react_1.useRef)(value);
    (0, react_1.useEffect)(() => {
        ref.current = value;
    }, [value]);
    return ref.current;
}
