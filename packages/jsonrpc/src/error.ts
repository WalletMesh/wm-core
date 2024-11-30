import type { JSONRPCErrorInterface } from './types.js';

/**
 * JSON-RPC Error class.
 *
 * Represents an error that can occur during JSON-RPC communication.
 */
export class JSONRPCError implements JSONRPCErrorInterface {
    /**
     * Creates a new JSONRPCError instance.
     *
     * @param code - The error code.
     * @param message - The error message.
     * @param data - Additional error data.
     */
    constructor(
        public code: number,
        public message: string,
        public data?: string,
    ) { }
}
