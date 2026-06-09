"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useIndex = void 0;
const react_1 = require("react");
const constants_1 = require("./constants");
/**
 * A hook that will take an array of keys and returns an array of values for those keys.
 * This is supposed to work in combination with `Transactions`s. When you have build your custom index,
 * you will need an easy and quick way to load values for your index. useIndex hook actively listens
 * to all read/write changes and updates the values accordingly.
 *
 * ```tsx
 * import MMKVStorage from "react-native-mmkv-storage"
 *
 * const storage = new MMKVStorage.Loader().initialize();
 *
 * const App = () => {
    const postsIndex = useMMKVStorage("postsIndex",MMKV,[]);
    const [posts] = useIndex(postsIndex,"object" MMKV);

    return <View>
    <FlatList
    data={posts}
    renderItem={...}
    >
</View>

}
 * ```
 *
 * Documentation: https://rnmmkv.vercel.app/#/useindex
 *
 * @param keys Array of keys against which the hook should load values
 * @param type Type of values
 * @param storage The storage instance
 *
 * @returns `[values, update, remove]`
 */
const useIndex = (keys, type, storage) => {
    const [values, setValues] = (0, react_1.useState)(storage.getMultipleItems(keys || [], type));
    const onChange = (0, react_1.useCallback)(({ key }) => {
        setValues(values => {
            let index = values.findIndex(v => v[0] === key);
            //@ts-ignore
            let value = storage[constants_1.methods[type]['get']](key);
            if (value) {
                if (index !== -1) {
                    values[index][1] = value;
                }
                else {
                    storage.getMultipleItemsAsync(keys || [], type).then(data => {
                        setValues(data);
                    });
                }
            }
            else {
                values.splice(index);
            }
            return [...values];
        });
    }, []);
    (0, react_1.useEffect)(() => {
        let names = keys.map(v => `${v}:onwrite`);
        storage.ev.subscribeMulti(names, onChange);
        return () => {
            names.forEach(name => {
                storage.ev.unsubscribe(name, onChange);
            });
        };
    }, [keys, type]);
    const update = (0, react_1.useCallback)((key, value) => {
        if (!value)
            return remove(key);
        //@ts-ignore
        storage[constants_1.methods[type]['set']](key, value);
    }, []);
    const remove = (0, react_1.useCallback)(key => {
        storage.removeItem(key);
    }, []);
    return [values.map(v => v[1]).filter(v => v !== null), update, remove];
};
exports.useIndex = useIndex;
