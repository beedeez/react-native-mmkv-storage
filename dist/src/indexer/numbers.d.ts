/**
 * Index of all numbers stored in storage.
 */
export default class numbersIndex {
    instanceID: string;
    constructor(id: string);
    /**
     *
     * Get all keys
     */
    getKeys(): Promise<string[]>;
    /**
     * Check if a key exists
     */
    hasKey(key: string): boolean;
    /**
     * Get all numbers from storage
     */
    getAll(): Promise<unknown>;
}
//# sourceMappingURL=numbers.d.ts.map