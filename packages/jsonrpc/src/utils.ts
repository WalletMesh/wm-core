import type { JSONRPCContext, JSONRPCMiddleware, JSONRPCMethodMap, JSONRPCSerializedData } from './types.js';

/**
 * Helper function to apply middleware to specific methods.
 * Creates a new middleware that only runs for the specified methods.
 *
 * @typeParam T - The RPC method map type
 * @param methods - Array of method names or '*' for all methods
 * @param middleware - The middleware function to apply
 * @returns A new middleware function that only runs for specified methods
 */
export function applyToMethods<T extends JSONRPCMethodMap, C extends JSONRPCContext>(
  methods: (keyof T)[] | '*',
  middleware: JSONRPCMiddleware<T, C>,
): JSONRPCMiddleware<T, C> {
  return async (context, request, next) => {
    if (methods === '*' || methods.includes(request.method)) {
      return middleware(context, request, next);
    }
    return next();
  };
}

/**
 * Type guard to check if an object is RPCSerializedData.
 *
 * @param obj - The object to check
 * @returns True if obj is RPCSerializedData, false otherwise
 */
export function isRPCSerializedData(obj: unknown): obj is JSONRPCSerializedData {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'serialized' in obj &&
    typeof (obj as JSONRPCSerializedData).serialized === 'string'
  );
}
