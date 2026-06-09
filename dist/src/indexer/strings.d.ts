/**
 * Index of all string values in storage
 */
export default class stringsIndex {
    instanceID: string;
    constructor(id: string);
    /**
     * Get all keys
     */
    getKeys(): Promise<string[]>;
    /**
     * Checck if a key exists
     */
    hasKey(key: string): boolean;
    /**
     * Get all string values from storage
     */
    getAll(): Promise<unknown>;
}
//# sourceMappingURL=strings.d.ts.map