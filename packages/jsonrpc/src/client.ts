import type {
    JSONRPCRequest,
    JSONRPCResponse,
    RPCMethodMap,
    JSONRPCID,
} from './types.js';
import { JSONRPCError } from './error.js';

/**
 * JSONRPCClient class for sending requests and handling responses.
 *
 * @typeParam T - The RPC method map.
 */
export class JSONRPCClient<T extends RPCMethodMap> {
    private pendingRequests: Map<
        JSONRPCID,
        (response: JSONRPCResponse<T, keyof T>) => void
    > = new Map();

    /**
     * Creates a new JSONRPCClient instance.
     *
     * @param sendRequest - A function that sends a JSON-RPC request.
     */
    constructor(
        private sendRequest: (request: JSONRPCRequest<T, keyof T>) => void,
    ) { }

    /**
     * Calls a method on the JSON-RPC server.
     *
     * @typeParam M - The method name.
     * @param method - The method name to call.
     * @param params - Parameters to pass to the method.
     * @returns A Promise that resolves with the result or rejects with an error.
     */
    public callMethod<M extends keyof T>(
        method: M,
        params?: T[M]['params'],
    ): Promise<T[M]['result']> {
        const id = crypto.randomUUID();
        const request: JSONRPCRequest<T, M> = {
            jsonrpc: '2.0',
            method,
            params: params || null,
            id,
        };

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(id, (response: JSONRPCResponse<T, keyof T>) => {
                if (response.error) {
                    reject(response.error);
                } else {
                    resolve(response.result);
                }
            });

            this.sendRequest(request);
        });
    }

    /**
     * Sends a notification to the JSON-RPC server (no response expected).
     *
     * @typeParam M - The method name.
     * @param method - The method name to notify.
     * @param params - Parameters to pass to the method.
     */
    public notify<M extends keyof T>(method: M, params: T[M]['params']): void {
        const request: JSONRPCRequest<T, keyof T> = {
            jsonrpc: '2.0',
            method,
            params,
            id: null,
        };
        this.sendRequest(request);
    }

    /**
     * Handles incoming JSON-RPC responses.
     *
     * @param response - The JSON-RPC response object.
     */
    public receiveResponse(response: JSONRPCResponse<T, keyof T>): void {
        const callback = this.pendingRequests.get(response.id);
        if (callback) {
            if (response.error) {
                // Reconstruct JSONRPCError from error response
                const error = new JSONRPCError(
                    response.error.code,
                    response.error.message,
                    response.error.data,
                );
                callback({ ...response, error });
            } else {
                callback(response);
            }
            this.pendingRequests.delete(response.id);
        } else {
            console.warn('Received response with unknown id:', response.id);
        }
    }
}
