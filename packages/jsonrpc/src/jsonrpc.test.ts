import {
    applyToMethods,
    JSONRPCError,
    JSONRPCClient,
    JSONRPCServer,
} from './index.js';
import { describe, it, beforeEach, expect, vi } from 'vitest';

type MethodMap = {
    add: { params: { a: number; b: number }; result: number };
    errorMethod: { params: undefined; result: never };
    notifyMethod: { params: { data: string }; result: undefined };
    unknownMethod: { params: undefined; result: never };
    concatenate: { params: { str1: string; str2: string }; result: string };
    sumArray: { params: number[]; result: number };
    processObject: {
        params: { key: string; value: number };
        result: { key: string; value: number };
    };
};

describe('JSONRPC', () => {
    let client: JSONRPCClient<MethodMap>;
    let server: JSONRPCServer<MethodMap>;
    let clientSendRequest: ReturnType<typeof vi.fn>;
    let serverSendResponse: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        clientSendRequest = vi.fn();
        serverSendResponse = vi.fn();

        client = new JSONRPCClient<MethodMap>(clientSendRequest);
        server = new JSONRPCServer<MethodMap>(serverSendResponse);

        clientSendRequest.mockImplementation((request) => {
            server.receiveRequest(request);
        });

        serverSendResponse.mockImplementation((response) => {
            client.receiveResponse(response);
        });
    });

    it('should call a method on the server and receive the correct response', async () => {
        server.registerMethod('add', (params) => {
            return params.a + params.b;
        });

        await expect(client.callMethod('add', { a: 1, b: 2 })).resolves.toBe(3);
    });

    it('should handle method not found error', async () => {
        await expect(client.callMethod('unknownMethod')).rejects.toMatchObject({
            code: -32601,
            message: 'Method not found',
        });
    });

    it('should handle errors thrown by method handlers', async () => {
        server.registerMethod('errorMethod', () => {
            throw new JSONRPCError(-32000, 'Custom error', 'Error data');
        });

        await expect(client.callMethod('errorMethod')).rejects.toMatchObject({
            code: -32000,
            message: 'Custom error',
            data: 'Error data',
        });
    });

    it('should send notifications without sending a response', () => {
        client.notify('notifyMethod', { data: 'test' });

        expect(clientSendRequest).toHaveBeenCalledWith({
            jsonrpc: '2.0',
            method: 'notifyMethod',
            params: { data: 'test' },
            id: null, // Expect id to be null for notifications
        });

        expect(serverSendResponse).not.toHaveBeenCalled();
    });

    it('should handle notifications on the server without sending a response', () => {
        const handler = vi.fn();
        server.registerMethod('notifyMethod', handler);

        client.notify('notifyMethod', { data: 'test' });

        expect(handler).toHaveBeenCalledWith({ data: 'test' });
        expect(serverSendResponse).not.toHaveBeenCalled();
    });

    it('should warn when receiving a response with unknown id', () => {
        const consoleWarnStub = vi.spyOn(console, 'warn');

        client.receiveResponse({
            jsonrpc: '2.0',
            result: 'bar',
            id: 999,
        });

        expect(consoleWarnStub).toHaveBeenCalledWith(
            'Received response with unknown id:',
            999,
        );

        consoleWarnStub.mockRestore();
    });

    it('should handle string parameters correctly', async () => {
        server.registerMethod('concatenate', (params) => {
            return params.str1 + params.str2;
        });

        await expect(
            client.callMethod('concatenate', { str1: 'Hello, ', str2: 'World!' }),
        ).resolves.toBe('Hello, World!');
    });

    it('should handle array parameters correctly', async () => {
        server.registerMethod('sumArray', (params) => {
            return params.reduce((sum, num) => sum + num, 0);
        });

        await expect(client.callMethod('sumArray', [1, 2, 3, 4, 5])).resolves.toBe(
            15,
        );
    });

    it('should handle object parameters correctly', async () => {
        server.registerMethod('processObject', (params) => {
            return { key: params.key, value: params.value * 2 };
        });

        await expect(
            client.callMethod('processObject', { key: 'test', value: 10 }),
        ).resolves.toEqual({ key: 'test', value: 20 });
    });

    // New middleware tests
    describe('Middleware', () => {
        it('should execute middleware in order', async () => {
            const order: number[] = [];
            server.addMiddleware(async (req, next) => {
                order.push(1);
                return await next();
            });
            server.addMiddleware(async (req, next) => {
                order.push(2);
                return await next();
            });
            server.addMiddleware(async (req, next) => {
                order.push(3);
                return await next();
            });

            server.registerMethod('add', (params) => params.a + params.b);
            await client.callMethod('add', { a: 1, b: 2 });

            expect(order).toEqual([1, 2, 3]);
        });

        it('should allow middleware to modify request', async () => {
            server.addMiddleware(async (req, next) => {
                if (req.method === 'add') {
                    req.params = { a: 10, b: 20 };
                }
                return await next();
            });

            server.registerMethod('add', (params) => params.a + params.b);
            const result = await client.callMethod('add', { a: 1, b: 2 });

            expect(result).toBe(30);
        });

        it('should support removing middleware', async () => {
            const callLog: string[] = [];
            const removeMiddleware = server.addMiddleware(async (req, next) => {
                callLog.push('middleware');
                return next();
            });

            server.registerMethod('add', (params) => {
                callLog.push('method');
                return params.a + params.b;
            });

            await client.callMethod('add', { a: 1, b: 2 });
            expect(callLog).toEqual(['middleware', 'method']);

            callLog.length = 0;
            removeMiddleware();

            await client.callMethod('add', { a: 1, b: 2 });
            expect(callLog).toEqual(['method']);
        });

        it('should apply middleware to specified methods', async () => {
            const callLog: string[] = [];
            const middleware = vi.fn(async (req, next) => {
                callLog.push(`middleware for ${String(req.method)}`);
                return next();
            });

            server.addMiddleware(applyToMethods(['add', 'concatenate'], middleware));

            server.registerMethod('add', (params) => {
                callLog.push('add method');
                return params.a + params.b;
            });
            server.registerMethod('concatenate', (params) => {
                callLog.push('concatenate method');
                return params.str1 + params.str2;
            });
            server.registerMethod('processObject', (params) => {
                callLog.push('processObject method');
                return { key: params.key, value: params.value };
            });

            await client.callMethod('add', { a: 1, b: 2 });
            await client.callMethod('concatenate', {
                str1: 'Hello, ',
                str2: 'World!',
            });
            await client.callMethod('processObject', { key: 'test', value: 10 });

            expect(callLog).toEqual([
                'middleware for add',
                'add method',
                'middleware for concatenate',
                'concatenate method',
                'processObject method',
            ]);
            expect(middleware).toHaveBeenCalledTimes(2);
        });

        it('should apply middleware to all methods when using "*"', async () => {
            const callLog: string[] = [];
            const middleware = vi.fn(async (req, next) => {
                callLog.push(`middleware for ${String(req.method)}`);
                return await next();
            });

            server.addMiddleware(applyToMethods('*', middleware));

            server.registerMethod('add', (params) => {
                callLog.push('add method');
                return params.a + params.b;
            });
            server.registerMethod('concatenate', (params) => {
                callLog.push('concatenate method');
                return params.str1 + params.str2;
            });

            await client.callMethod('add', { a: 1, b: 2 });
            await client.callMethod('concatenate', {
                str1: 'Hello, ',
                str2: 'World!',
            });

            expect(callLog).toEqual([
                'middleware for add',
                'add method',
                'middleware for concatenate',
                'concatenate method',
            ]);
            expect(middleware).toHaveBeenCalledTimes(2);
        });

        it('should not apply middleware to methods not specified', async () => {
            const callLog: string[] = [];
            const middleware = vi.fn(async (req, next) => {
                callLog.push(`middleware for ${String(req.method)}`);
                return await next();
            });

            server.addMiddleware(applyToMethods(['concatenate'], middleware));

            server.registerMethod('add', (params) => {
                callLog.push('add method');
                return params.a + params.b;
            });
            server.registerMethod('concatenate', (params) => {
                callLog.push('concatenate method');
                return params.str1 + params.str2;
            });

            await client.callMethod('add', { a: 1, b: 2 });
            await client.callMethod('concatenate', {
                str1: 'Hello, ',
                str2: 'World!',
            });

            expect(callLog).toEqual([
                'add method',
                'middleware for concatenate',
                'concatenate method',
            ]);
            expect(middleware).toHaveBeenCalledTimes(1);
        });

        it('should allow middleware to modify response', async () => {
            server.addMiddleware(async (req, next) => {
                const response = await next();
                if (req.method === 'add') {
                    response.result = (response.result as number) * 2;
                }
                return response;
            });

            server.registerMethod('add', (params) => params.a + params.b);
            const result = await client.callMethod('add', { a: 1, b: 2 });

            expect(result).toBe(6);
        });

        it('should handle invalid JSON-RPC version', async () => {
            const invalidRequest = {
                jsonrpc: '1.0',
                method: 'add',
                params: { a: 1, b: 2 },
                id: 1,
            };

            // biome-ignore lint/suspicious/noExplicitAny: test
            await server.receiveRequest(invalidRequest as any);

            expect(serverSendResponse).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                error: { code: -32600, message: 'Invalid Request' },
                id: null,
            });
        });

        it('should handle method not found', async () => {
            const request = {
                jsonrpc: '2.0',
                method: 'nonExistentMethod',
                id: 1,
            };

            // biome-ignore lint/suspicious/noExplicitAny: test
            await server.receiveRequest(request as any);

            expect(serverSendResponse).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                error: { code: -32601, message: 'Method not found' },
                id: 1,
            });
        });

        it('should handle next() called multiple times error', async () => {
            server.addMiddleware(async (req, next) => {
                await next();
                return await next();
            });

            server.registerMethod('add', (params) => params.a + params.b);

            const request = {
                jsonrpc: '2.0',
                method: 'add',
                params: { a: 1, b: 2 },
                id: 1,
            };

            // biome-ignore lint/suspicious/noExplicitAny: test
            await server.receiveRequest(request as any);

            expect(serverSendResponse).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'next() called multiple times' },
                id: 1,
            });
        });

        it('should handle unknown error', async () => {
            server.addMiddleware(async () => {
                throw new Error('Unknown error');
            });

            server.registerMethod('add', (params) => params.a + params.b);

            const request = {
                jsonrpc: '2.0',
                method: 'add',
                params: { a: 1, b: 2 },
                id: 1,
            };

            // biome-ignore lint/suspicious/noExplicitAny: test
            await server.receiveRequest(request as any);

            expect(serverSendResponse).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'Unknown error' },
                id: 1,
            });
        });

        it('should throw error when no middleware is available', async () => {
            // Clear the middleware stack
            // @ts-ignore: accessing private property for testing
            server.middlewareStack = [];

            server.registerMethod('add', (params) => params.a + params.b);

            const request = {
                jsonrpc: '2.0',
                method: 'add',
                params: { a: 1, b: 2 },
                id: 1,
            };

            // biome-ignore lint/suspicious/noExplicitAny: test
            await server.receiveRequest(request as any);

            expect(serverSendResponse).toHaveBeenCalledWith({
                jsonrpc: '2.0',
                error: { code: -32000, message: 'No middleware to handle request' },
                id: 1,
            });
        });
    });
});
