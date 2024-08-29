import { Options } from "amqplib";
import { AMQPConnection, AMQPConnectionConfig } from "./connection";
import { Publisher, PublisherConfig } from "./publisher";
import { Worker, WorkerConfig } from "./worker";

export class AMQPManager {
  private connection: AMQPConnection;
  private static instance: AMQPManager | null = null;
  private static publisher: Publisher | null = null;

  /*
  constructor(config: AMQPConnectionConfig) {
    this.connection = new AMQPConnection(config);
  }

  async initialize(): Promise<void> {
    await this.connection.connect();
  }

  createPublisher(publisherConfig: PublisherConfig): Publisher {
    return new Publisher(this.connection, publisherConfig);
  }

  createWorker(workerConfig: WorkerConfig): Worker {
    return new Worker(this.connection, workerConfig);
  }
*/

  private constructor(
    config: AMQPConnectionConfig,
    publisherConfig?: PublisherConfig
  ) {
    this.connection = new AMQPConnection(config);

    if (publisherConfig) {
      AMQPManager.publisher = new Publisher(this.connection, publisherConfig);
    }
  }

  async shutdown(): Promise<void> {
    await this.connection.disconnect();
  }

  public static async connect(
    config: AMQPConnectionConfig,
    publisherConfig?: PublisherConfig
  ): Promise<void> {
    if (!AMQPManager.instance) {
      AMQPManager.instance = new AMQPManager(config, publisherConfig);

      await AMQPManager.instance.connection.connect();

      if (AMQPManager.publisher) {
        // await AMQPManager.publisher.start(); // no need to start, the publisher is event driven and starts once the connection starts
      }
    }
  }

  public static getInstance(): AMQPManager {
    if (!AMQPManager.instance) {
      throw new Error("AMQPManager is not initialized. Call connect() first.");
    }
    return AMQPManager.instance;
  }

  public static async createPublisher(
    publisherConfig: PublisherConfig
  ): Promise<Publisher> {
    const instance = AMQPManager.getInstance();
    const publisher = new Publisher(instance.connection, publisherConfig);
    await publisher.start();
    return publisher;
  }

  public static async createWorker(
    workerConfig: WorkerConfig
  ): Promise<Worker> {
    const instance = AMQPManager.getInstance();
    const worker = new Worker(instance.connection, workerConfig);
    await worker.start();
    return worker;
  }

  public static publish(
    routingKey: string,
    content: Buffer,
    options?: Options.Publish
  ): boolean {
    const publisher = AMQPManager.publisher;
    if (!publisher) {
      throw new Error("Publisher is not initialized.");
    }
    return publisher.publish(routingKey, content, options);
  }

  public static connection() {
    const instance = AMQPManager.getInstance();
    return instance.connection.getConnection();
  }
}
