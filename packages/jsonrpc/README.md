# JSON-RPC TypeScript Library

A JSON-RPC 2.0 library for TypeScript, providing a client and server implementation with middleware support.

## Features

* JSON-RPC 2.0 compliant client and server.
* Type-safe method definitions using TypeScript generics.
* Support for middleware functions on the server.
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
    response => {
        window.postMessage(JSON.stringify(response), '*');
    }
);

// Register methods
server.registerMethod('echo', async (params) => {
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
        response => {
            ws.send(JSON.stringify(response));
        }
    )
    
    // Register methods
    server.registerMethod('echo', async (params) => {
        return params;
    })

    ws.on('message', message => {
        server.receiveRequest(JSON.parse(message));
    });
})
```

### Middleware

```js
const server = new JSONRPCServer<MethodMap>(
    response => {
        // Send the response back to the client
    }
);

// Logging middleware applied to all methods
server.addMiddleware(async (request, next) => {
    console.log('Received request:', request);
    const response = await next();
    console.log('Sending response:', response);
    return response;
});
```

### Defining RPC Methods

Define a method map to specify the RPC methods, their parameters, and the result.

```js
type MethodMap = {
    add: { params: { a: number; b: number }; result: number };
    greet: { params: { name: string }; result: string };
    // ...other methods
};
```

### Server

Create a JSON-RPC server and register methods.

```js
import { JSONRPCServer } from '@walletmesh/jsonrpc';

// Create a server instance
const server = new JSONRPCServer<MethodMap>(async response => {
    // Send the response back to the client
    // Implementation depends on your transport (e.g., WebSocket, HTTP)
});

// Register methods
server.registerMethod('add', ({ a, b }) => {
    return a + b;
});

server.registerMethod('greet', ({ name }) => {
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
server.registerMethod('notifyMethod', ({ data }) => {
    console.log('Received notification with data:', data);
});
```

### Middleware

Use middleware to modify requests or responses, perform authorization checks, log requests, and more.

```js
import { applyToMethods } from '@walletmesh/jsonrpc';

// Logging middleware applied to all methods
server.addMiddleware(async (request, next) => {
    console.log('Received request:', request);
    const response = await next();
    console.log('Sending response:', response);
    return response;
});

// Middleware applied to specific methods
server.addMiddleware(
    applyToMethods(['add'], async (request, next) => {
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

client.callMethod('slowMethod', { data: 'test' }, 5).then(result => {
    console.log('Result:', result);
}).catch(error => {
    if (error instanceof TimeoutError) {
        console.error('Method call timed out, required id:', error.id);
    } else {
        console.error('Error:', error);
    }
});

```


### Error Handling

Custom errors can be thrown in method handlers or middleware.

```js
import { JSONRPCError } from '@walletmesh/jsonrpc';

server.registerMethod('errorMethod', () => {
    throw new JSONRPCError(-32000, 'Custom error', 'Error data');
});
```

## Testing

```bash
pnpm test
```
