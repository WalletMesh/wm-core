import { afterEach } from 'node:test';
import {
  applyToMethods,
  JSONRPCError,
  JSONRPCClient,
  JSONRPCServer,
  TimeoutError,
  type JSONRPCContext,
  type JSONRPCRequest,
  type Serializer,
  type JSONRPCSerializer,
} from './index.js';
import { describe, it, beforeEach, expect, vi } from 'vitest';

type TestMethods = {
  add: { params: { a: number; b: number }; result: number };
  errorMethod: { result: never };
  notifyMethod: { params: { data: string }; result: undefined };
  unknownMethod: { result: never };
  concatenate: { params: { str1: string; str2: string }; result: string };
  sumArray: { params: number[]; result: number };
  processObject: {
    params: { key: string; value: number };
    result: { key: string; value: number };
  };
  delayedMethod: { result: string };
  throwJSONRPCError: { result: never };
  throwStandardError: { result: never };
  methodWithFaultyDeserializer: { params: { str1: string }; result: string };
};

describe('JSONRPC', () => {
  let client: JSONRPCClient<TestMethods>;
  let server: JSONRPCServer<TestMethods, JSONRPCContext>;
  let clientSendRequest: ReturnType<typeof vi.fn>;
  let serverSendResponse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    clientSendRequest = vi.fn();
    serverSendResponse = vi.fn();

    client = new JSONRPCClient<TestMethods>(clientSendRequest);
    server = new JSONRPCServer<TestMethods, JSONRPCContext>(serverSendResponse);

    clientSendRequest.mockImplementation((request: JSONRPCRequest<TestMethods, keyof TestMethods>) => {
      console.log('clientSendRequest', request);
      server.receiveRequest({}, request);
    });

    serverSendResponse.mockImplementation((response) => {
      client.receiveResponse(response);
    });
  });

  it('should call a method on the server and receive the correct response', async () => {
    server.registerMethod('add', (_context, params) => {
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
      id: undefined, // Notifications should not have an ID
    });

    expect(serverSendResponse).not.toHaveBeenCalled();
  });

  it('should handle notifications on the server without sending a response', () => {
    const handler = vi.fn();
    server.registerMethod('notifyMethod', handler);

    client.notify('notifyMethod', { data: 'test' });

    expect(handler).toHaveBeenCalledWith(
      expect.any(Object), // context
      { data: 'test' },
    );
    expect(serverSendResponse).not.toHaveBeenCalled();
  });

  it('should warn when receiving a response with unknown id', () => {
    const consoleWarnStub = vi.spyOn(console, 'warn');

    client.receiveResponse({
      jsonrpc: '2.0',
      result: 'bar',
      id: 999,
    });

    expect(consoleWarnStub).toHaveBeenCalledWith('Received response with unknown id:', 999);

    consoleWarnStub.mockRestore();
  });

  it('should handle string parameters correctly', async () => {
    server.registerMethod('concatenate', (_context, params) => {
      return params.str1 + params.str2;
    });

    await expect(client.callMethod('concatenate', { str1: 'Hello, ', str2: 'World!' })).resolves.toBe(
      'Hello, World!',
    );
  });

  it('should handle array parameters correctly', async () => {
    server.registerMethod('sumArray', (_context, params) => {
      return params.reduce((sum, num) => sum + num, 0);
    });

    await expect(client.callMethod('sumArray', [1, 2, 3, 4, 5])).resolves.toBe(15);
  });

  it('should handle object parameters correctly', async () => {
    server.registerMethod('processObject', (_context, params) => {
      return { key: params.key, value: params.value * 2 };
    });

    await expect(client.callMethod('processObject', { key: 'test', value: 10 })).resolves.toEqual({
      key: 'test',
      value: 20,
    });
  });

  describe('Middleware', () => {
    it('should execute middleware in order', async () => {
      const order: number[] = [];
      server.addMiddleware(async (_context, _req, next) => {
        order.push(1);
        return await next();
      });
      server.addMiddleware(async (_context, _req, next) => {
        order.push(2);
        return await next();
      });
      server.addMiddleware(async (_context, _req, next) => {
        order.push(3);
        return await next();
      });

      server.registerMethod('add', (_context, params) => params.a + params.b);
      await client.callMethod('add', { a: 1, b: 2 });

      expect(order).toEqual([1, 2, 3]);
    });

    it('should allow middleware to modify request', async () => {
      server.addMiddleware(async (_context, req, next) => {
        if (req.method === 'add') {
          req.params = { a: 10, b: 20 };
        }
        return await next();
      });

      server.registerMethod('add', (_context, params) => params.a + params.b);
      const result = await client.callMethod('add', { a: 1, b: 2 });

      expect(result).toBe(30);
    });

    it('should support removing middleware', async () => {
      const callLog: string[] = [];
      const removeMiddleware = server.addMiddleware(async (_context, _req, next) => {
        callLog.push('middleware');
        return next();
      });

      server.registerMethod('add', (_context, params) => {
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
      const middleware = vi.fn(async (_context, req, next) => {
        callLog.push(`middleware for ${String(req.method)}`);
        return next();
      });

      server.addMiddleware(applyToMethods(['add', 'concatenate'], middleware));

      server.registerMethod('add', (_context, params) => {
        callLog.push('add method');
        return params.a + params.b;
      });
      server.registerMethod('concatenate', (_context, params) => {
        callLog.push('concatenate method');
        return params.str1 + params.str2;
      });
      server.registerMethod('processObject', (_context, params) => {
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
      const middleware = vi.fn(async (_context, req, next) => {
        callLog.push(`middleware for ${String(req.method)}`);
        return await next();
      });

      server.addMiddleware(applyToMethods('*', middleware));

      server.registerMethod('add', (_context, params) => {
        callLog.push('add method');
        return params.a + params.b;
      });
      server.registerMethod('concatenate', (_context, params) => {
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
      const middleware = vi.fn(async (_context, req, next) => {
        callLog.push(`middleware for ${String(req.method)}`);
        return await next();
      });

      server.addMiddleware(applyToMethods(['concatenate'], middleware));

      server.registerMethod('add', (_context, params) => {
        callLog.push('add method');
        return params.a + params.b;
      });
      server.registerMethod('concatenate', (_context, params) => {
        callLog.push('concatenate method');
        return params.str1 + params.str2;
      });

      await client.callMethod('add', { a: 1, b: 2 });
      await client.callMethod('concatenate', {
        str1: 'Hello, ',
        str2: 'World!',
      });

      expect(callLog).toEqual(['add method', 'middleware for concatenate', 'concatenate method']);
      expect(middleware).toHaveBeenCalledTimes(1);
    });

    it('should allow middleware to modify response', async () => {
      server.addMiddleware(async (_context, req, next) => {
        const response = await next();
        if (req.method === 'add') {
          response.result = (response.result as number) * 2;
        }
        return response;
      });

      server.registerMethod('add', (_context, params) => params.a + params.b);
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
      await server.receiveRequest({}, invalidRequest as any);

      expect(serverSendResponse).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid Request' },
      });
    });

    it('should handle method not found', async () => {
      const request = {
        jsonrpc: '2.0',
        method: 'nonExistentMethod',
        id: 1,
      };

      // biome-ignore lint/suspicious/noExplicitAny: test
      await server.receiveRequest({}, request as any);

      expect(serverSendResponse).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: { code: -32601, message: 'Method not found' },
        id: 1,
      });
    });

    it('should handle next() called multiple times error', async () => {
      server.addMiddleware(async (_context, _req, next) => {
        await next();
        return await next();
      });

      server.registerMethod('add', (_context, params) => params.a + params.b);

      const request = {
        jsonrpc: '2.0',
        method: 'add',
        params: { a: 1, b: 2 },
        id: 1,
      };

      // biome-ignore lint/suspicious/noExplicitAny: test
      await server.receiveRequest({}, request as any);

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

      server.registerMethod('add', (_context, params) => params.a + params.b);

      const request = {
        jsonrpc: '2.0',
        method: 'add',
        params: { a: 1, b: 2 },
        id: 1,
      };

      // biome-ignore lint/suspicious/noExplicitAny: test
      await server.receiveRequest({}, request as any);

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

      server.registerMethod('add', (_context, params) => params.a + params.b);

      const request = {
        jsonrpc: '2.0',
        method: 'add',
        params: { a: 1, b: 2 },
        id: 1,
      };

      // biome-ignore lint/suspicious/noExplicitAny: test
      await server.receiveRequest({}, request as any);

      expect(serverSendResponse).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'No middleware to handle request' },
        id: 1,
      });
    });

    it('should handle JSONRPCError thrown in method handler', async () => {
      server.registerMethod('throwJSONRPCError', () => {
        throw new JSONRPCError(-32010, 'Custom JSONRPC error', 'throwJSONRPCError');
      });

      await server.receiveRequest(
        {}, // context
        {
          jsonrpc: '2.0',
          method: 'throwJSONRPCError',
          id: 'test-id',
        },
      );

      expect(serverSendResponse).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32010,
          message: 'Custom JSONRPC error',
          data: 'throwJSONRPCError',
        },
        id: 'test-id',
      });
    });

    // Test when error thrown is not a JSONRPCError (lines 169 & 170 failure case)
    it('should handle standard Error thrown in method handler', async () => {
      server.registerMethod('throwStandardError', () => {
        throw new Error('Standard error');
      });

      await server.receiveRequest(
        {}, // context
        {
          jsonrpc: '2.0',
          method: 'throwStandardError',
          id: 'test-id-2',
        },
      );

      expect(serverSendResponse).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Standard error',
        },
        id: 'test-id-2',
      });
    });

    // Test when error is thrown in deserialization (line 151)
    it('should handle errors thrown during parameter deserialization', async () => {
      const faultySerializer: JSONRPCSerializer<{ str1: string }, string> = {
        params: {
          serialize: (params) => ({ serialized: params.str1 }),
          deserialize: () => {
            throw new Error('Deserialization error');
          },
        },
      };

      server.registerMethod(
        'methodWithFaultyDeserializer',
        (_context, params) => params.str1,
        faultySerializer,
      );

      await server.receiveRequest(
        {},
        {
          jsonrpc: '2.0',
          method: 'methodWithFaultyDeserializer',
          params: { some: 'data' },
          id: 'test-id-3',
        },
      );

      expect(serverSendResponse).toHaveBeenCalledWith({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Deserialization error',
        },
        id: 'test-id-3',
      });
    });
  });

  it('should serialize parameters when using notify with serializers', () => {
    const params = { data: 'test' };
    const serializedParams = { serialized: params.data };
    const paramSerializer: JSONRPCSerializer<{ data: string }, undefined> = {
      params: {
        serialize: vi.fn((params: { data: string }) => ({ serialized: params.data })),
        deserialize: vi.fn((params: { serialized: string }) => ({ data: params.serialized })),
      },
    };

    client.registerSerializer('notifyMethod', paramSerializer);

    vi.spyOn(paramSerializer.params, 'serialize');
    client.notify('notifyMethod', params);

    expect(paramSerializer.params.serialize).toHaveBeenCalledWith(params);
    expect(clientSendRequest).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      method: 'notifyMethod',
      params: serializedParams,
    });
  });

  it('should handle receiving a response with error and no pending request', () => {
    const consoleWarnStub = vi.spyOn(console, 'warn').mockImplementation(() => {});
    client.receiveResponse({
      jsonrpc: '2.0',
      error: { code: -32601, message: 'Method not found' },
      id: 'unknown-id',
    });
    expect(consoleWarnStub).toHaveBeenCalledWith('Received response with unknown id:', 'unknown-id');
    consoleWarnStub.mockRestore();
  });

  it('should handle requests with undefined method', async () => {
    const request = {
      jsonrpc: '2.0',
      method: undefined,
      id: 1,
    };

    // @ts-ignore: testing invalid method
    await server.receiveRequest({}, request);

    expect(serverSendResponse).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: { code: -32601, message: 'Method not found' },
      id: 1,
    });
  });

  it('should handle exceptions thrown from middleware', async () => {
    server.addMiddleware(async () => {
      throw new Error('Middleware error');
    });

    server.registerMethod('add', (_context, params) => params.a + params.b);

    await server.receiveRequest(
      {}, // context
      {
        jsonrpc: '2.0',
        method: 'add',
        params: { a: 1, b: 2 },
        id: 2,
      },
    );

    expect(serverSendResponse).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Middleware error' },
      id: 2,
    });
  });

  it('should handle string serialization for parameters and results', async () => {
    const paramSerializer: Serializer<{ a: number; b: number }> = {
      serialize: (params) => ({ serialized: JSON.stringify(params) }),
      deserialize: (data) => JSON.parse(data.serialized),
    };

    const resultSerializer: Serializer<number> = {
      serialize: (result) => ({ serialized: result.toString() }),
      deserialize: (data) => Number.parseInt(data.serialized, 10),
    };

    server.registerMethod('add', (_context, params) => params.a + params.b, {
      params: paramSerializer,
      result: resultSerializer,
    });

    client.registerSerializer('add', {
      params: paramSerializer,
      result: resultSerializer,
    });

    const result = await client.callMethod('add', { a: 1, b: 2 });
    expect(result).toBe(3);

    // Verify that the request was sent with serialized parameters
    expect(clientSendRequest).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      method: 'add',
      params: { serialized: JSON.stringify({ a: 1, b: 2 }) },
      id: expect.any(String),
    });

    // Verify that the response was sent with serialized result
    expect(serverSendResponse).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      result: { serialized: '3' },
      id: expect.any(String),
    });
  });

  // Update notification serialization test
  it('should handle string serialization for notifications', () => {
    const paramSerializer: Serializer<{ data: string }> = {
      serialize: (params) => ({ serialized: JSON.stringify(params) }),
      deserialize: (data) => JSON.parse(data.serialized),
    };

    client.registerSerializer('notifyMethod', { params: paramSerializer });

    const params = { data: 'test' };
    client.notify('notifyMethod', params);

    expect(clientSendRequest).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      method: 'notifyMethod',
      params: { serialized: JSON.stringify(params) },
    });
  });

  // Add test for handling undefined parameters with serializer
  it('should handle undefined parameters with serializer', async () => {
    const paramSerializer: Serializer<undefined> = {
      serialize: (params) => ({ serialized: String(params) }),
      deserialize: () => undefined,
    };

    server.registerMethod('delayedMethod', () => 'result', { params: paramSerializer });

    client.registerSerializer('delayedMethod', { params: paramSerializer });

    await client.callMethod('delayedMethod', undefined);

    expect(clientSendRequest).toHaveBeenCalledWith({
      jsonrpc: '2.0',
      method: 'delayedMethod',
      params: undefined,
      id: expect.any(String),
    });
  });

  it('should pass context to method handlers', async () => {
    // Middleware to set context
    server.addMiddleware(async (context, _request, next) => {
      context.user = 'testUser';
      return next();
    });

    const handler = vi.fn((_context, params) => params.a + params.b);

    server.registerMethod('add', handler);

    await expect(client.callMethod('add', { a: 1, b: 2 })).resolves.toBe(3);

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ user: 'testUser' }), { a: 1, b: 2 });
  });
});

describe('JSONRPCClient timeout', () => {
  let client: JSONRPCClient<TestMethods>;
  let server: JSONRPCServer<TestMethods, JSONRPCContext>;
  let clientSendRequest: ReturnType<typeof vi.fn>;
  let serverSendResponse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    clientSendRequest = vi.fn();
    serverSendResponse = vi.fn();

    client = new JSONRPCClient<TestMethods>(clientSendRequest);
    server = new JSONRPCServer<TestMethods, JSONRPCContext>(serverSendResponse);

    clientSendRequest.mockImplementation((request) => {
      // Simulate network delay
      if (request.method === 'delayedMethod') {
        setTimeout(() => server.receiveRequest({}, request), 2000);
        vi.advanceTimersByTime(2000);
      } else {
        server.receiveRequest({}, request);
      }
    });

    serverSendResponse.mockImplementation((response) => {
      client.receiveResponse(response);
    });

    server.registerMethod('delayedMethod', async () => {
      // Simulate delay in method processing
      return 'Delayed Response';
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should timeout if response takes too long', async () => {
    await expect(client.callMethod('delayedMethod', undefined, 1)).rejects.toBeInstanceOf(TimeoutError);
  });

  it('should not timeout if response is within the timeout period', async () => {
    const result = await client.callMethod('delayedMethod', undefined, 5);
    expect(result).toBe('Delayed Response');
  });

  it('should not timeout when timeoutInSeconds is 0 (no timeout)', async () => {
    const result = await client.callMethod('delayedMethod', undefined, 0);
    expect(result).toBe('Delayed Response');
  });
});
