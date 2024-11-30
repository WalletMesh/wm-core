import type { JSONRPCMiddleware, RPCMethodMap } from './types.js';

/**
 * Helper function to apply a middleware function to specific methods.
 *
 * @typeParam T - The RPC method map.
 * @param methods - An array of method names or '*' to apply to all methods.
 * @param middleware - The middleware function to apply.
 * @returns A new middleware function that applies the given middleware to the specified methods.
 */
export function applyToMethods<T extends RPCMethodMap>(
    methods: (keyof T)[] | '*',
    middleware: JSONRPCMiddleware<T>,
): JSONRPCMiddleware<T> {
    return async (request, next) => {
        if (methods === '*' || methods.includes(request.method)) {
            return middleware(request, next);
        }
        return next();
    };
}
