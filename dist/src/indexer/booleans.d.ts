/**
 * Index of all boolean values stored in storage.
 */
export default class boolIndex {
    instanceID: string;
    constructor(id: string);
    /**
     * Get all keys
     */
    getKeys(): Promise<string[]>;
    /**
     * Check if a key exists.
     */
    hasKey(key: string): boolean;
    /**
     * Get all boolean values from storage
     */
    getAll(): Promise<unknown>;
}
//# sourceMappingURL=booleans.d.ts.map