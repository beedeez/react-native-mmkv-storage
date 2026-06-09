"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Listen to a value’s lifecycle and mutate it on the go.
 * Transactions lets you register lifecycle functions
 * with your storage instance such as `onwrite`,
 * `beforewrite`, `onread`, `ondelete`. This allows for a
 * better and more managed control over the storage and
 * also let’s you build custom indexes with a few lines of code.
 *
 * Example:
 * ```tsx
 * import MMKVStorage from "react-native-mmkv-storage";
 *
 * const MMKV = new MMKVStorage.Loader().initialize();
 *
 * MMKV.transactions.register("object", "onwrite", ({ key, value }) => {
 *    console.log(MMKV.instanceID, "object:onwrite: ", key, value)
 * });
 * ```
 *
 * Documentation: https://rnmmkv.vercel.app/#/transactionmanager
 */
class transactions {
    constructor() {
        this.beforewrite = {};
        this.onwrite = {};
        this.onread = {};
        this.ondelete = null;
    }
    /**
     * Register a lifecycle function for a given data type.
     *
     * @param type Type of data to register a mutator function for
     * @param transaction Type of transaction to listen to
     * @param mutator The mutator function
     */
    register(type, transaction, mutator) {
        if (!transaction || !type || !mutator)
            throw new Error('All parameters are required');
        if (transaction === 'ondelete') {
            this.ondelete = mutator;
        }
        else {
            this[transaction][type] = mutator;
        }
        return () => this.unregister(type, transaction);
    }
    /**
     * Register a lifecycle function for a given data type.
     * @param type Type of data to register a mutator function for
     * @param transaction Type of transaction to listen to
     */
    unregister(type, transaction) {
        if (!type || !transaction)
            throw new Error('All parameters are required');
        if (transaction === 'ondelete') {
            this.ondelete = null;
            return;
        }
        this[transaction][type] = null;
    }
    /**
     * Clear all registered functions.
     */
    clear() {
        this.beforewrite = {};
        this.onread = {};
        this.onwrite = {};
        this.ondelete = null;
    }
    transact(type, transaction, key, value) {
        const mutator = transaction === 'ondelete' ? this.ondelete : this[transaction][type];
        if (!mutator)
            return value;
        let _value = mutator(key, value);
        // In case a mutator function does not return a value or returns undefined, we will return the original value.
        return _value === undefined || _value === null ? value : _value;
    }
}
exports.default = transactions;
