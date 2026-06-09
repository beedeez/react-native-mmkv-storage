import MMKVInstance from '../mmkvinstance';
export declare function useMMKVRef<T>(key: string, storage: MMKVInstance, defaultValue: T): {
    current: T;
    reset(): void;
};
export declare const createMMKVRefHookForStorage: (storage: MMKVInstance) => <T>(key: string, defaultValue?: T) => {
    current: T;
    reset(): void;
};
//# sourceMappingURL=useMMKVRef.d.ts.map