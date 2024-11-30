import type {
    JSONRPCMiddleware,
    JSONRPCRequest,
    JSONRPCResponse,
    RPCMethodMap,
    JSONRPCID,
} from './types.js';
import { JSONRPCError } from './error.js';

/**
 * JSONRPCServer class for handling requests and sending responses.
 *
 * @typeParam T - The RPC method map.
 */
export class JSONRPCServer<T extends RPCMethodMap> {
    private methods: Map<
        keyof T,
        (
            params: T[keyof T]['params'],
        ) => Promise<T[keyof T]['result']> | T[keyof T]['result']
    > = new Map();
    private middlewareStack: JSONRPCMiddleware<T>[] = [];
    private sendResponse: (
        response: JSONRPCResponse<T, keyof T>,
    ) => Promise<void>;

    /**
     * Creates a new JSONRPCServer instance.
     *
     * @param sendResponse - A function that sends a JSON-RPC response.
     */
    constructor(
        sendResponse: (response: JSONRPCResponse<T, keyof T>) => Promise<void>,
    ) {
        // Wrap the sendResponse function to log responses
        this.sendResponse = async (response: JSONRPCResponse<T, keyof T>) => {
            console.debug('Sending response:', response);
            await sendResponse(response);
        };

        // Base handler middleware
        const baseHandler: JSONRPCMiddleware<T> = async (request, next) => {
            const handler = this.methods.get(request.method);
            if (!handler) {
                throw new JSONRPCError(-32601, 'Method not found');
            }
            const result = await Promise.resolve(handler(request.params));
            return {
                jsonrpc: '2.0',
                result,
                id: request.id,
            };
        };
        // Add base handler to the middleware stack
        this.middlewareStack.push(baseHandler);
    }

    /**
     * Registers a method that can be called remotely.
     *
     * @param name - The method name.
     * @param handler - The function to handle the method call.
     */
    public registerMethod<M extends keyof T>(
        name: M,
        handler: (
            params: T[M]['params'],
        ) => Promise<T[M]['result']> | T[M]['result'],
    ): void {
        this.methods.set(name, handler);
    }

    /**
     * Adds a middleware function to the stack.
     *
     * @param middleware - The middleware function to add.
     * @returns A function to remove the middleware from the stack.
     */
    public addMiddleware(middleware: JSONRPCMiddleware<T>): () => void {
        // Insert middleware before the base handler
        const baseHandlerIndex = this.middlewareStack.length - 1;
        this.middlewareStack.splice(baseHandlerIndex, 0, middleware);
        return () => {
            const index = this.middlewareStack.indexOf(middleware);
            if (index !== -1) {
                this.middlewareStack.splice(index, 1);
            }
        };
    }

    /**
     * Receives a JSON-RPC request and handles it.
     *
     * @param request - The JSON-RPC request object.
     */
    public async receiveRequest(
        request: JSONRPCRequest<T, keyof T>,
    ): Promise<void> {
        console.debug('Received request:', request);
        if (request.jsonrpc !== '2.0') {
            if (request.id) {
                await this.sendError(null, -32600, 'Invalid Request');
            }
            return;
        }

        try {
            const composed = this.composeMiddleware(this.middlewareStack);
            const response = await composed(request);
            if (request.id) {
                await this.sendResponse(response);
            }
        } catch (error) {
            if (error instanceof JSONRPCError) {
                if (request.id !== undefined) {
                    await this.sendError(
                        request.id,
                        error.code,
                        error.message,
                        error.data,
                    );
                }
            } else {
                if (request.id) {
                    await this.sendError(
                        request.id,
                        -32000,
                        error instanceof Error ? error.message : 'Unknown error',
                    );
                }
            }
        }
    }

    /**
     * Composes the middleware stack into a single function.
     *
     * @param middlewareList - The list of middleware functions.
     * @returns A composed middleware function.
     */
    private composeMiddleware(middlewareList: JSONRPCMiddleware<T>[]) {
        return async (request: JSONRPCRequest<T, keyof T>): Promise<JSONRPCResponse<T, keyof T>> => {
            let index = -1;
            const dispatch = async (i: number): Promise<JSONRPCResponse<T, keyof T>> => {
                if (i <= index) {
                    throw new Error('next() called multiple times');
                }
                index = i;
                if (i >= middlewareList.length) {
                    throw new Error('No middleware to handle request');
                }
                const fn = middlewareList[i];
                return await fn(request, () => dispatch(i + 1));
            };
            return dispatch(0);
        };
    }

    /**
     * Sends a JSON-RPC error response.
     *
     * @param id - The ID of the request that caused the error.
     * @param code - The error code.
     * @param message - The error message.
     * @param data - Additional error data.
     */
    private async sendError(
        id: JSONRPCID,
        code: number,
        message: string,
        data?: string,
    ): Promise<void> {
        const response: JSONRPCResponse<T, keyof T> = {
            jsonrpc: '2.0',
            error: { code, message, data },
            id,
        };
        this.sendResponse(response);
    }
}
