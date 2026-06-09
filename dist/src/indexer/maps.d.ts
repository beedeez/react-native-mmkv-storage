/**
 * Index of all objects stored in storage.
 */
export default class mapsIndex {
    instanceID: string;
    constructor(id: string);
    /**
     *
     * Get all keys
     */
    getKeys(): Promise<string[]>;
    /**
     * Check if a key exists.
     */
    hasKey(key: string): boolean;
    /**
     * Get all objects stored in storage.
     */
    getAll<T>(): Promise<unknown>;
}
//# sourceMappingURL=maps.d.ts.map