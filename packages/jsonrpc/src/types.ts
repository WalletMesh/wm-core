/**
 * Type representing a JSON-RPC ID.
 * Can be undefined (for notifications), a string, or a number.
 */
export type JSONRPCID = undefined | string | number;

/**
 * Type representing JSON-RPC parameters.
 * Can be undefined, an array, or an object.
 */
export type JSONRPCParams = undefined | unknown[] | Record<string, unknown>;

/**
 * Type representing serialized RPC data.
 * Contains a single string property 'serialized' containing the serialized data.
 */
export type JSONRPCSerializedData = { serialized: string };

/**
 * Interface for serializing and deserializing values.
 * @typeParam T - The type of value to serialize/deserialize.
 */
export interface Serializer<T> {
  /** Serializes a value to RPCSerializedData */
  serialize(value: T): JSONRPCSerializedData;
  /** Deserializes RPCSerializedData back to the original type */
  deserialize(value: JSONRPCSerializedData): T;
}

/**
 * Interface for RPC method parameter and result serialization.
 * @typeParam P - The parameters type
 * @typeParam R - The result type
 */
export interface JSONRPCSerializer<P, R> {
  /** Serializer for method parameters */
  params: Serializer<P>;
  /** Optional serializer for method result */
  result?: Serializer<R>;
}

/**
 * Method definition with generic parameters and result.
 */
export type JSONRPCMethodDef<P extends JSONRPCParams = JSONRPCParams, R = unknown> = {
  /** The parameters of the method. */
  params?: P;
  /** The result of the method. */
  result: R;
  /** Optional serializer for parameters and result */
  serializer?: JSONRPCSerializer<P, R>;
};

/**
 * Method map with method names as keys and method definitions as values.
 */
export type JSONRPCMethodMap = {
  [method: string]: JSONRPCMethodDef;
};

/**
 * JSON-RPC 2.0 Request interface.
 *
 * @typeParam T - The RPC method map.
 * @typeParam M - The method name.
 */
export interface JSONRPCRequest<
  T extends JSONRPCMethodMap,
  M extends keyof T,
  P extends JSONRPCParams = JSONRPCParams,
> {
  /** The JSON-RPC version ('2.0'). */
  jsonrpc: '2.0';
  /** The method name. */
  method: M;
  /** The parameters of the method. */
  params?: P;
  /** The request ID. */
  id?: JSONRPCID;
}

/**
 * JSON-RPC 2.0 Response interface.
 *
 * @typeParam T - The RPC method map.
 * @typeParam M - The method name.
 */
export interface JSONRPCResponse<T extends JSONRPCMethodMap, M extends keyof T> {
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
  data?: string | undefined;
}

/**
 * Middleware function for JSON-RPC requests.
 *
 * @typeParam T - The RPC method map.
 */
export type JSONRPCMiddleware<T extends JSONRPCMethodMap, C extends JSONRPCContext> = (
  context: C,
  request: JSONRPCRequest<T, keyof T>,
  next: () => Promise<JSONRPCResponse<T, keyof T>>,
) => Promise<JSONRPCResponse<T, keyof T>> | JSONRPCResponse<T, keyof T>;

/**
 * JSON-RPC context object.
 */
export type JSONRPCContext = Record<string, unknown>;
