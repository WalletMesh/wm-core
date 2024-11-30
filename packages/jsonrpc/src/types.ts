/**
 * Type representing a JSON-RPC ID.
 */
export type JSONRPCID = string | number | null;

/**
 * Type representing JSON-RPC parameters.
 */
export type JSONRPCParams =
    | undefined
    | unknown[]
    | Record<string, unknown>
    | null;

/**
 * Method definition with generic parameters and result.
 *
 * @typeParam P - The type of the method parameters.
 * @typeParam R - The type of the method result.
 */
export type RPCMethodDef<
    P extends JSONRPCParams = JSONRPCParams,
    R = unknown,
> = {
    /** The parameters of the method. */
    params: P;
    /** The result of the method. */
    result: R;
};

/**
 * Method map with method names as keys and method definitions as values.
 */
export type RPCMethodMap = {
    [method: string]: RPCMethodDef;
};

/**
 * JSON-RPC 2.0 Request interface.
 *
 * @typeParam T - The RPC method map.
 * @typeParam M - The method name.
 */
export interface JSONRPCRequest<T extends RPCMethodMap, M extends keyof T> {
    /** The JSON-RPC version ('2.0'). */
    jsonrpc: '2.0';
    /** The method name. */
    method: M;
    /** The parameters of the method. */
    params: T[M]['params'];
    /** The request ID. */
    id: JSONRPCID | null;
}

/**
 * JSON-RPC 2.0 Response interface.
 *
 * @typeParam T - The RPC method map.
 * @typeParam M - The method name.
 */
export interface JSONRPCResponse<T extends RPCMethodMap, M extends keyof T> {
    /** The JSON-RPC version ('2.0'). */
    jsonrpc: '2.0';
    /** The result of the method call, if successful. */
    result?: T[M]['result'];
    /** The error object, if an error occurred. */
    error?: JSONRPCErrorInterface;
    /** The request ID. */
    id: JSONRPCID;
}

/**
 * JSON-RPC 2.0 Error interface.
 */
export interface JSONRPCErrorInterface {
    /** The error code. */
    code: number;
    /** The error message. */
    message: string;
    /** Additional error data. */
    data?: string;
}

/**
 * Middleware function for JSON-RPC requests.
 *
 * @typeParam T - The RPC method map.
 */
export type JSONRPCMiddleware<T extends RPCMethodMap> = (
    request: JSONRPCRequest<T, keyof T>,
    next: () => Promise<JSONRPCResponse<T, keyof T>>,
) => Promise<JSONRPCResponse<T, keyof T>> | JSONRPCResponse<T, keyof T>;
