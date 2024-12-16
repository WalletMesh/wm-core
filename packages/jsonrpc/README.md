# JSON-RPC TypeScript Library

A JSON-RPC 2.0 library for TypeScript, providing a client and server implementation with middleware support.

## Features

* JSON-RPC 2.0 compliant client and server.
* Type-safe method definitions using TypeScript generics.
* Support for middleware functions on the server with context passing.
* Customizable transport layer for sending requests and responses.
* Built-in error handling with custom error codes and messages.
* Support for notifications (methods without responses).
* Timeout support for client method calls.

## Usage

1. Define [RPC methods](#defining-rpc-methods) using TypeScript generics.
2. Setup a transport layer for sending requests and responses (see [Examples](#examples)).
3. Create a [server instance](#server) and register methods.
4. Create a [client instance](#client) and call server methods.

The library does not provide a built-in transport layer, allowing you to use any communication method needed.

Additional features:
- Use [middleware](#middleware) to modify requests or responses.
- [Handle errors](#error-handling) in method handlers or middleware.
- [Customize parameter serialization](#parameter-serialization) for method parameters and results.
- Send [notifications](#notifications) to the server.

### Examples

- Using [window.postMessage](#using-windowpostmessage-for-communication) for communication.
- Using [WebSockets](#using-websockets-for-communication) for communication.
- Using a middleware to [log requests](#middleware).

#### Using `window.postMessage` for communication

```js
// client
type MethodMap = {
  echo: { params: string; result: string };
};

const client = new JSONRPCClient(
    request => {
        window.postMessage(JSON.stringify(request), '*');
    }
);

client.callMethod('echo', 'Hello, world!').then(result => {
    console.log('Result:', result);
});
```

```js
// server
type MethodMap = {
  echo: { params: string; result: string };
};

const server = new JSONRPCServer(
    (_context, _request, response) => {
        window.postMessage(JSON.stringify(response), '*');
    }
);

// Register methods
server.registerMethod('echo', async (_context, params) => {
    return params;
});

window.addEventListener('message', event => {
    server.receiveRequest(JSON.parse(event.data));
});
```

#### Using WebSockets for communication

```js
// client
type MethodMap = {
  echo: { params: string; result: string };
};

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    const client = new JSONRPCClient(
        request => {
            ws.send(JSON.stringify(request));
        },
        { timeout: 5000 },
    );

    ws.on('message', message => {
        client.receiveResponse(JSON.parse(message));
    });

    client.callMethod('echo', 'Hello, world!').then(result => {
        console.log('Result:', result);
    });
})
```

```js
// server
type MethodMap = {
  echo: { params: string; result: string };
};

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
    const server = new JSONRPCServer<MethodMap>(
        (_context, _request, response) => {
            ws.send(JSON.stringify(response));
        }
    )
   
    // Register methods
    server.registerMethod('echo', async (_context, params) => {
        return params;
    })

    ws.on('message', message => {
        server.receiveRequest(JSON.parse(message));
    });
})
```

### Middleware

Middleware functions can now receive a context object `C` that can be used to share data across middleware and method handlers.

```typescript
// Define a context type
type Context = JSONRPCContext & {
  user?: string;
};

// Create a server instance with context type
const server = new JSONRPCServer<MethodMap, Context>(async (context, request, response) => {
  // Send the response back to the client
});

// Middleware that modifies the context
server.addMiddleware(async (context, request, next) => {
  // Set user information in context
  context.user = request.params?.userName;
  // Proceed to the next middleware or handler
  return next();
});

// Method handler that accesses the context
server.registerMethod('getUser', (context, params) => {
  // Return the user from context
  return `Current user: ${context.user}`;
});
```

The context object is created per request and passed through all middleware and method handlers. It allows you to store and access request-specific data, enabling features like authentication, authorization, and logging.

```js
const server = new JSONRPCServer<MethodMap>(
    (context, request, response) => {
        // Send the response back to the client
    }
);

// Logging middleware applied to all methods
server.addMiddleware(async (context, request, next) => {
    console.log('Received request:', request);
    const response = await next();
    console.log('Sending response:', response);
    return response;
});
```

#### Middleware Applied to Specific Methods with Context

You can apply middleware to specific methods and utilize the context:

```typescript
import { applyToMethods } from '@walletmesh/jsonrpc';

// Middleware applied only to 'add' method
server.addMiddleware(
  applyToMethods(['add'], async (context, request, next) => {
    // Perform authorization check and store result in context
    context.isAuthorized = checkAuthorization(request);
    if (!context.isAuthorized) {
      throw new JSONRPCError(-32600, 'Unauthorized');
    }
    return next();
  }),
);

// Method handler that relies on context
server.registerMethod('add', (context, params) => {
  if (!context.isAuthorized) {
    throw new JSONRPCError(-32600, 'Unauthorized');
  }
  return params.a + params.b;
});
```

In this example, the middleware checks authorization and sets a flag in the context. The method handler can then read the context to enforce authorization.

### Defining RPC Methods

Define a method map to specify the RPC methods, their parameters, and the result.

```js
type MethodMap = {
    add: { params: { a: number; b: number }; result: number };
    greet: { params: { name: string }; result: string };
    // ...other methods
};
```

### Defining RPC Methods with Context

When registering methods, you can define handlers that accept the context:

```typescript
// Register a method with context parameter
server.registerMethod('greet', (context, params) => {
  const user = context.user || 'Guest';
  return `Hello, ${user}!`;
});
```

The method handler receives the context object, allowing it to access data set by middleware or other parts of your application.

### Server

Create a JSON-RPC server and register methods.

```js
import { JSONRPCServer } from '@walletmesh/jsonrpc';

// Create a server instance
const server = new JSONRPCServer<MethodMap>(async (context, request, response) => {
    // Send the response back to the client
    // Implementation depends on your transport (e.g., WebSocket, HTTP)
});

// Register methods
server.registerMethod('add', (_context, { a, b }) => {
    return a + b;
});

server.registerMethod('greet', (_context, { name }) => {
    return `Hello, ${name}!`;
});

// Receive requests
// Call server.receiveRequest when a request is received from the client
// Example:
server.receiveRequest({
    jsonrpc: '2.0',
    method: 'add',
    params: { a: 1, b: 2 },
    id: '1',
});
```

### Full Example with Context

Here's a complete example demonstrating context usage in middleware and method handlers:

```typescript
type MethodMap = {
  login: { params: { username: string }; result: string };
  getData: { params: null; result: string };
};

type Context = {
  user?: string;
};

// Server setup
const server = new JSONRPCServer<MethodMap, Context>(async (context, request, response) => {
  // Send the response back to the client
});

// Authentication middleware
server.addMiddleware(async (context, request, next) => {
  if (request.method === 'login') {
    // Skip authentication for login method
    return next();
  }
  if (!context.user) {
    throw new JSONRPCError(-32600, 'Authentication required');
  }
  return next();
});

// Method to handle login
server.registerMethod('login', (context, params) => {
  // Perform login logic
  context.user = params.username;
  return `Logged in as ${context.user}`;
});

// Protected method
server.registerMethod('getData', (context, params) => {
  return `Sensitive data for ${context.user}`;
});
```

In this example, the `login` method sets the `user` in the context. The middleware checks for the authenticated user before allowing access to other methods.

## Client

Create a JSON-RPC client to call server methods.

```js
import { JSONRPCClient } from '@walletmesh/jsonrpc';

// Create a client instance
const client = new JSONRPCClient<MethodMap>(request => {
    // Send the request to the server
    // Implementation depends on your transport (e.g., WebSocket, HTTP)
});

// Call methods
client.callMethod('add', { a: 1, b: 2 }).then(result => {
    console.log('Result:', result); // Output: Result: 3
});

// Handle responses
// Call client.receiveResponse when a response is received from the server
// Example:
client.receiveResponse({
    jsonrpc: '2.0',
    result: 3,
    id: '1',
});
```

### Notifications

Send notifications to the server when no response is expected.

```js
// Client-side
client.notify('notifyMethod', { data: 'test' });

// Server-side handler
server.registerMethod('notifyMethod', (context, { data }) => {
    console.log('Received notification with data:', data);
});
```

### Middleware

Use middleware to modify requests or responses, perform authorization checks, log requests, and more.

```js
import { applyToMethods } from '@walletmesh/jsonrpc';

// Logging middleware applied to all methods
server.addMiddleware(async (context, request, next) => {
    console.log('Received request:', request);
    const response = await next();
    console.log('Sending response:', response);
    return response;
});

// Middleware applied to specific methods
server.addMiddleware(
    applyToMethods(['add'], async (context, request, next) => {
        // Perform checks or modify the request
        return next();
    }),
);
```

### Call Method Timeout

The client's `callMethod` function supports an optional `timeoutInSeconds` parameter. A value of `0` means
no timeout (wait indefinitely), which is also the default behavior.

```js
import { JSONRPCClient, TimeoutError } from '@walletmesh/jsonrpc';

const client = new JSONRPCClient<MethodMap>(request => {
    // Send the request to the server
    // Implementation depends on your transport (e.g., WebSocket, HTTP)
});

try {
  const result = await client.callMethod('slowMethod', { data: 'test' }, 5);
  console.log('Result:', result);
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Request timed out:', error.id);
  } else {
    console.error('Error:', error);
  }
}
```

### Error Handling

Custom errors can be thrown in method handlers or middleware.

```js
import { JSONRPCError } from '@walletmesh/jsonrpc';

server.registerMethod('errorMethod', () => {
    throw new JSONRPCError(-32000, 'Custom error', 'Error data');
});
```

### Parameter Serialization

The library supports custom serialization and deserialization of method parameters and results,
allowing you to define custom serializers for the data types used in your methods.

The serialization process is transparent to method handlers -- they receive and return the
original types, while serialization is handled automatically by the library.


```js
// Define serializers for your types
const dateSerializer: Serializer<Date> = {
    serialize: (date: Date) => ({ serialized: date.toISOString() }),
    deserialize: (data: JSONRPCSerializedData) => new Date(data.serialized)
};

// Create method-specific serializer
const methodSerializer: JSONRPCSerializer<{ date: Date }, Date> = {
    params: {
        serialize: (params) => ({
            serialized: JSON.stringify({ date: params.date.toISOString() })
        }),
        deserialize: (data) => {
            const parsed = JSON.parse(data.serialized);
            return { date: new Date(parsed.date) };
        }
    },
    result: dateSerializer
};

// Register method with serializer
server.registerMethod('processDate',
    (_context, params) => {
        // params.date is automatically deserialized to Date
        return params.date;
    },
    methodSerializer
);

// Register serializer on client
client.registerSerializer('processDate', methodSerializer);

// Call method - serialization is handled automatically
const result = await client.callMethod('processDate', {
    date: new Date()
});
// result is automatically deserialized to Date
```

## Testing

```bash
pnpm test
```
