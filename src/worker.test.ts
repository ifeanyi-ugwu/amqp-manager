import { Worker, WorkerConfig } from "./worker.js";
import { AMQPConnection } from "./connection.js";
import { ConsumeMessage } from "amqplib";

// Mock AMQPConnection
jest.mock("./connection");

describe("Worker Async Iterator", () => {
  let worker: Worker;
  let mockConnection: jest.Mocked<AMQPConnection>;
  let mockChannel: any;

  beforeEach(() => {
    mockChannel = {
      assertQueue: jest.fn(),
      bindQueue: jest.fn(),
      prefetch: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      on: jest.fn(),
    };

    mockConnection = new AMQPConnection(
      {} as any
    ) as jest.Mocked<AMQPConnection>;
    (mockConnection as any).getConnection = jest.fn().mockReturnValue({
      createChannel: jest.fn().mockResolvedValue(mockChannel),
    });

    const config: WorkerConfig = {
      prefetchCount: 1,
      queue: { name: "test-queue" },
      consume: {
        onMessage: jest.fn(),
      },
    };

    worker = new Worker(mockConnection, config);
  });

  test("async iterator should yield messages", async () => {
    jest.setTimeout(10000); // Increase timeout to 10 seconds

    await worker.start();

    // Simulate receiving messages
    const mockMessages = [
      { content: Buffer.from("Message 1") },
      { content: Buffer.from("Message 2") },
      { content: Buffer.from("Message 3") },
    ] as ConsumeMessage[];

    // Use a timeout to simulate asynchronous message arrival
    setTimeout(() => {
      mockMessages.forEach((msg) => (worker as any).processMsg(msg));
    }, 100);

    const receivedMessages = [];
    for await (const message of worker) {
      receivedMessages.push(message);
      if (receivedMessages.length === mockMessages.length) break;
    }

    expect(receivedMessages).toEqual(mockMessages);
  });
});
