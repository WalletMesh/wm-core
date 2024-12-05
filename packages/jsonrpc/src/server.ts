import type {
  JSONRPCSerializedData,
  JSONRPCMiddleware,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCMethodMap,
  JSONRPCSerializer,
  JSONRPCID,
  JSONRPCContext,
} from './types.js';
import { JSONRPCError } from './error.js';

/**
 * Handler function for an RPC method.
 * @typeParam T - The RPC method map type
 * @typeParam M - The method name type
 * @typeParam C - The context type
 */
type MethodHandler<T extends JSONRPCMethodMap, M extends keyof T, C extends JSONRPCContext> = (
  context: C,
  params: T[M]['params'],
) => Promise<T[M]['result']> | T[M]['result'];

/**
 * Internal interface for a registered method.
 * @typeParam T - The RPC method map type
 * @typeParam M - The method name type
 * @typeParam C - The context type
 */
interface RegisteredMethod<T extends JSONRPCMethodMap, M extends keyof T, C extends JSONRPCContext> {
  handler: MethodHandler<T, M, C>;
  serializer: JSONRPCSerializer<T[M]['params'], T[M]['result']> | undefined;
}

/**
 * JSON-RPC server implementation.
 * Handles incoming requests, executes registered methods, and sends responses.
 *
 * @typeParam T - The RPC method map defining available methods
 */
export class JSONRPCServer<T extends JSONRPCMethodMap, C extends JSONRPCContext> {
  private methods: Partial<{ [K in keyof T]: RegisteredMethod<T, K, C> }> = {};
  private middlewareStack: JSONRPCMiddleware<T, C>[] = [];
  private sendResponse: (response: JSONRPCResponse<T, keyof T>) => Promise<void>;

  /**
   * Creates a new JSONRPCServer instance.
   *
   * @param sendResponse - A function that sends a JSON-RPC response.
   */
  constructor(sendResponse: (response: JSONRPCResponse<T, keyof T>) => Promise<void>) {
    // Wrap the sendResponse function to log responses
    this.sendResponse = async (response: JSONRPCResponse<T, keyof T>) => {
      console.debug('Sending response:', response);
      await sendResponse(response);
    };

    // Base handler middleware
    const baseHandler: JSONRPCMiddleware<T, C> = async (context, request, _next) => {
      const method = this.methods[request.method];
      if (!method) {
        throw new JSONRPCError(-32601, 'Method not found');
      }
      const handler = method.handler;
      const result = await Promise.resolve(handler(context, request.params ?? ({} as T[keyof T]['params'])));
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
   * @param serializer - Optional serializer for parameters and result.
   */
  public registerMethod<M extends keyof T>(
    name: M,
    handler: MethodHandler<T, M, C>,
    serializer?: JSONRPCSerializer<T[M]['params'], T[M]['result']>,
  ): void {
    this.methods[name] = { handler, serializer };
  }

  /**
   * Adds a middleware function to the stack.
   *
   * @param middleware - The middleware function to add.
   * @returns A function to remove the middleware from the stack.
   */
  public addMiddleware(middleware: JSONRPCMiddleware<T, C>): () => void {
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
  public async receiveRequest(context: C, request: JSONRPCRequest<T, keyof T>): Promise<void> {
    if (request.jsonrpc !== '2.0') {
      await this.sendError(undefined, -32600, 'Invalid Request');
      return;
    }

    try {
      // Deserialize the request parameters
      const method = this.methods[request.method];
      const deserializedRequest =
        method?.serializer?.params && request.params
          ? {
              ...request,
              params: method.serializer.params.deserialize(request.params as JSONRPCSerializedData),
            }
          : request;

      const composed = this.composeMiddleware(this.middlewareStack);
      const response = await composed(context, deserializedRequest);

      if (request.id) {
        // Serialize the response result
        const serializedResponse =
          method?.serializer?.result && response.result !== undefined
            ? {
                ...response,
                result: method.serializer.result.serialize(response.result),
              }
            : response;

        await this.sendResponse(serializedResponse);
      }
    } catch (error) {
      console.error('Error handling request:', error);
      if (error instanceof JSONRPCError) {
        if (request.id !== undefined) {
          await this.sendError(request.id, error.code, error.message, error.data);
        }
      } else {
        await this.sendError(request.id, -32000, error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }

  /**
   * Composes the middleware stack into a single function.
   *
   * @param middlewareList - The list of middleware functions.
   * @returns A composed middleware function.
   */
  private composeMiddleware(middlewareList: JSONRPCMiddleware<T, C>[]) {
    return async (context: C, request: JSONRPCRequest<T, keyof T>): Promise<JSONRPCResponse<T, keyof T>> => {
      let index = -1;
      const dispatch = async (i: number): Promise<JSONRPCResponse<T, keyof T>> => {
        if (i <= index) throw new Error('next() called multiple times');
        index = i;
        if (i >= middlewareList.length) throw new Error('No middleware to handle request');
        const fn = middlewareList[i];
        if (!fn) throw new Error(`Middleware function at index ${i} is undefined`);
        return await fn(context, request, () => dispatch(i + 1));
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
  private async sendError(id: JSONRPCID, code: number, message: string, data?: string): Promise<void> {
    const response: JSONRPCResponse<T, keyof T> = {
      jsonrpc: '2.0',
      error: { code, message, data },
      id,
    };
    this.sendResponse(response);
  }
}
