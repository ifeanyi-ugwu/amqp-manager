# AMQP Manager

A robust and flexible AMQP (Advanced Message Queuing Protocol) library for Node.js applications. This library provides an easy-to-use interface for working with AMQP, supporting publishers, workers, and connection management.

## Features

- Singleton AMQP connection management
- Support for publishers and workers
- Automatic reconnection handling
- Configurable logging
- Buffer utilities for easy message conversion
- Retry mechanism with exponential backoff
- Default publisher for quick and easy message publishing
- Access to the underlying connection instance
- Ability to create additional connections

## Installation

```bash
npm install github:ifeanyi-ugwu/amqp-manager
```

## Usage

### Initializing the AMQP Manager

```javascript
import { AMQPManager } from "amqp-manager";

const config = {
  connect: {
    url: "amqp://localhost",
    socketOptions: {}, // Optional
  },
};

await AMQPManager.connect(config);
```

### Initializing the AMQP Manager with Default Publisher

```javascript
import { AMQPManager } from "amqp-manager";

const connectionConfig = {
  connect: {
    url: "amqp://localhost",
    socketOptions: {}, // Optional
  },
};

const defaultPublisherConfig = {
  exchange: {
    name: "default_exchange",
    type: "topic",
    options: {}, // Optional
  },
};

await AMQPManager.connect(connectionConfig, defaultPublisherConfig);
```

### Using the Default Publisher

The AMQPManager provides a static `publish` method that uses the default publisher. This is convenient for quick publishing without the need to create and manage separate publisher instances.

```javascript
import { AMQPManager } from "amqp-manager";

// Publish a message using the default publisher
const routingKey = "my.routing.key";
const content = Buffer.from("Hello, AMQP!");
const options = {}; // Optional publishing options

AMQPManager.publish(routingKey, content, options);
```

Note: The default publisher must be initialized when connecting to use this method. If not initialized, an error will be thrown.

### Creating Additional Publishers

You can still create additional publishers for more complex scenarios:

```javascript
const publisherConfig = {
  exchange: {
    name: "my_exchange",
    type: "topic",
    options: {}, // Optional
  },
};

const publisher = await AMQPManager.createPublisher(publisherConfig);

// Publishing a message with the new publisher
const routingKey = "my.routing.key";
const content = Buffer.from("Hello, AMQP!");
publisher.publish(routingKey, content);
```

### Creating a Worker

```javascript
const workerConfig = {
  prefetchCount: 1,
  bindingKey: "my.routing.key",
  queue: {
    name: "my_queue",
    options: {}, // Optional
  },
  exchange: {
    name: "my_exchange",
    type: "topic",
    options: {}, // Optional
  },
  consume: {
    options: {}, // Optional
    onMessage: (msg, ack, nack) => {
      console.log("Received message:", msg.content.toString());
      ack(msg);
    },
  },
};

const worker = await AMQPManager.createWorker(workerConfig);
```

### Accessing the Connection Instance

You can access the underlying AMQP connection instance managed by the AMQPManager. This can be useful for advanced operations or when you need direct access to the amqplib Connection object.

```javascript
import { AMQPManager } from "amqp-manager";

// Make sure AMQPManager is initialized before calling this
const connection = AMQPManager.connection();

// Now you can use the connection object directly if needed
// Be cautious when using this, as it bypasses the library's management features
```

### Creating Additional Connections

While the AMQPManager typically manages a single connection, there might be cases where you need to create additional, separate connections. The library provides a method to create new connections without interfering with the main managed connection.

```javascript
import { AMQPManager } from "amqp-manager";

const newConnectionConfig = {
  connect: {
    url: "amqp://localhost:5672",
    socketOptions: {}, // Optional
  },
};

const newConnection = await AMQPManager.createConnection(newConnectionConfig);

// newConnection is an instance of amqplib's Connection
// You're responsible for managing this connection (error handling, closing, etc.)
```

Note: When creating additional connections, you're responsible for managing their lifecycle, including error handling and properly closing the connection when it's no longer needed.

### Utilities

The library provides utility functions for converting between Buffer and various data types:

```javascript
import { dataToBuffer, bufferToData } from "amqp-manager";

const myObject = { hello: "world" };
const buffer = dataToBuffer(myObject);
const reconstructedObject = bufferToData(buffer);
```

## Logging

The library uses a built-in logger with configurable log levels. Set the `AMQP_LOG_LEVEL` environment variable to one of the following values:

- `DEBUG`
- `INFO`
- `WARN`
- `ERROR`
- `NONE`

## Error Handling

The library implements automatic reconnection and provides hooks for error handling. Make sure to implement proper error handling in your application code, especially in the `onMessage` callback for workers.

## Connection Events and Error Handling

### Critical: Handling Connection Events

When using this library without creating any publishers or workers, it's crucial to handle connection events manually. Failure to do so can result in unhandled errors that may crash your application.

```javascript
import { AMQPManager } from "amqp-manager";

const connectionConfig = {
  connect: {
    url: "amqp://localhost:5672",
    socketOptions: {}, // Optional
  },
};

// Initialize the connection
await AMQPManager.connect(connectionConfig);

// IMPORTANT: Handle connection events
AMQPManager.connection().on("error", (err) => {
  console.error("AMQP connection error:", err);
  // Handle the error appropriately
});

AMQPManager.connection().on("close", () => {
  console.log("AMQP connection closed");
  // Handle the closure, potentially attempt to reconnect
});
```

Remember:

- If you're not using any publishers or workers, the library won't automatically handle these events for you.
- Always implement these event handlers to prevent unhandled errors from crashing your application.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see the [LICENSE](LICENSE) file for details.
