import type { MMKVCoreError } from './types';
/**
 * Returns the MMKV core errors (CRC check failures, file length errors, error-level logs)
 * recorded natively since the previous call, and clears the native buffer (last 50 kept).
 * Returns an empty array when the JSI bindings are not installed yet.
 */
export declare function drainMMKVErrors(): MMKVCoreError[];
//# sourceMappingURL=errors.d.ts.map