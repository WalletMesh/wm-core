import type {
    JSONRPCRequest,
    JSONRPCResponse,
    RPCMethodMap,
    JSONRPCID,
} from './types.js';
import { JSONRPCError } from './error.js';

/**
 * TimeoutError class for sending errors when a request times out.
 */
export class TimeoutError extends Error {
    /**
     * Creates a new TimeoutError instance.
     *
     * @param message - The error message.
     * @param id - The request ID.
     */
    constructor(message: string, public id: JSONRPCID) {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * JSONRPCClient class for sending requests and handling responses.
 *
 * @typeParam T - The RPC method map.
 */
export class JSONRPCClient<T extends RPCMethodMap> {
    private pendingRequests: Map<
        JSONRPCID,
        {
            resolve: (value: T[keyof T]['result']) => void;
            reject: (reason?: unknown) => void;
            timer: ReturnType<typeof setTimeout> | null;
        }
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
     * @param timeoutInSeconds - Timeout in seconds (0 means no timeout, default is 0).
     * @returns A Promise that resolves with the result or rejects with an error.
     */
    public callMethod<M extends keyof T>(
        method: M,
        params?: T[M]['params'],
        timeoutInSeconds = 0,
    ): Promise<T[M]['result']> {
        const id = crypto.randomUUID();
        const request: JSONRPCRequest<T, M> = {
            jsonrpc: '2.0',
            method,
            params: params || null,
            id,
        };

        return new Promise((resolve, reject) => {
            let timer: ReturnType<typeof setTimeout> | null = null;

            if (timeoutInSeconds > 0) {
                timer = setTimeout(() => {
                    this.pendingRequests.delete(id);
                    reject(new TimeoutError('Request timed out', id));
                }, timeoutInSeconds * 1000);
            }

            this.pendingRequests.set(id, { resolve, reject, timer });

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
        const pendingRequest = this.pendingRequests.get(response.id);
        if (pendingRequest) {
            if (pendingRequest.timer) {
                clearTimeout(pendingRequest.timer);
            }
            if (response.error) {
                // Reconstruct JSONRPCError from error response
                const error = new JSONRPCError(
                    response.error.code,
                    response.error.message,
                    response.error.data,
                );
                pendingRequest.reject(error);
            } else {
                pendingRequest.resolve(response.result);
            }
            this.pendingRequests.delete(response.id);
        } else {
            console.warn('Received response with unknown id:', response.id);
        }
    }
}
