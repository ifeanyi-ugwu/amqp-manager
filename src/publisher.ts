import { Channel, Connection, Options } from "amqplib";
import { AMQPConnection } from "./connection.js";
import { logger } from "./logger.js";

export interface PublisherConfig {
  exchange: {
    name: string;
    type: "direct" | "topic" | "headers" | "fanout" | "match" | string;
    options?: Options.AssertExchange;
  };
}

export class Publisher {
  private channel: Channel | null = null;
  private offlinePubQueue: [string, Buffer, Options.Publish?][] = [];

  constructor(
    private connection: AMQPConnection,
    private config: PublisherConfig
  ) {
    this.setupConnectionHandlers();
  }

  private setupConnectionHandlers(): void {
    this.connection.on("connected", async (conn: Connection) => {
      await this.start();
    });

    this.connection.on("disconnected", () => {
      this.channel = null;
    });
  }

  async start(): Promise<void> {
    try {
      this.channel = await this.createConfirmChannel();
      await this.setupExchange();
      this.setupChannelHandlers();
      this.processOfflineQueue();
    } catch (error) {
      logger.error("[AMQP] Failed to start publisher", error);
    }
  }

  private async createConfirmChannel(): Promise<Channel> {
    const conn = this.connection.getConnection();
    if (!conn) {
      throw new Error("Connection is not initialized");
    }
    return conn.createConfirmChannel();
  }

  private async setupExchange(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel is not initialized");
    }

    if (this.config.exchange.name === "") {
      logger.debug("[AMQP] Skipping assertion for the default exchange");
      return;
    }

    await this.channel.assertExchange(
      this.config.exchange.name,
      this.config.exchange.type,
      this.config.exchange.options
    );
  }

  private setupChannelHandlers(): void {
    if (!this.channel) {
      logger.error("[AMQP] Channel is not initialized");
      return;
    }

    this.channel.on("error", (err: Error) => {
      logger.error("[AMQP] channel error", err.message);
    });

    this.channel.on("close", () => {
      logger.debug("[AMQP] channel closed");
      this.channel = null;
    });
  }

  private processOfflineQueue(): void {
    while (this.offlinePubQueue.length > 0) {
      const item = this.offlinePubQueue.shift();
      if (item) {
        const [routingKey, content] = item;
        this.publish(routingKey, content);
      }
    }
  }

  publish(routingKey: string, content: Buffer, options?: Options.Publish) {
    if (!this.channel) {
      //this.offlinePubQueue.push([routingKey, content, options]);

      if (this.connection.getConnection()) {
        // Attempt to create a new channel if connection is available
        this.start()
          .then(() => {
            // Retry publishing after attempting to start
            this.publish(routingKey, content, options);
          })
          .catch((error) => {
            /**
             * TODO: check if it's preferable to throw an error here if
             * a channel could not be created since the error might not be recoverable
             * and may always fail even on each publisher restart
             * I.E. a failure to create a channel even when there is a connection is likely that
             * the publisher restart won't be able to recreate a channel
             *
             * TODO: if there is a connection and a channel could not be created and I wish to throw an error:
             * this retrying of the channel creation should be
             * with retry of x maximum retries before throwing the error. In that way,
             * a message with no guarantee of being published will not be added to the offline
             * pub queue
             *
             * Mongoose simply throws errors when it cant write or write, hopefully this is what is expected,
             * so the offline pubque does not unnecessarily get written on, it is solely meant for if there was no
             * connection
             *
             * TODO: add option to add error handler to the connection instance
             */
            logger.error("[AMQP] Failed to create channel", error);
            this.offlinePubQueue.push([routingKey, content, options]);
          });
      } else {
        // Connection is not available, push to offline queue
        this.offlinePubQueue.push([routingKey, content, options]);
      }

      return false;
    }

    try {
      const result = this.channel.publish(
        this.config.exchange.name,
        routingKey,
        content,
        options
      );

      if (!result) {
        this.channel.once("drain", () => this.processOfflineQueue());
      }

      return result;
    } catch (e) {
      logger.error("[AMQP] publish", e);
      this.offlinePubQueue.push([routingKey, content, options]);
      return false;
    }
  }
}
