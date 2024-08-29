import { Channel, Connection, ConsumeMessage, Options } from "amqplib";
import { AMQPConnection } from "./connection.js";
import { logger } from "./logger.js";

export interface WorkerConfig {
  prefetchCount: number;
  bindingKey?: string;
  queue: {
    name: string;
    options?: Options.AssertQueue;
  };
  exchange?: {
    name: string;
    type: "direct" | "topic" | "headers" | "fanout" | "match" | string;
    options?: Options.AssertExchange;
  };
  consume: {
    options?: Options.Consume;
    onMessage: (
      msg: ConsumeMessage,
      ack: Channel["ack"],
      nack: Channel["nack"]
    ) => void;
  };
}

export class Worker {
  private channel: Channel | null = null;

  constructor(
    private connection: AMQPConnection,
    private config: WorkerConfig
  ) {
    this.setupConnectionHandlers();
    if (!this.config.consume.onMessage) {
      throw new Error("onMessage callback is required in WorkerConfig");
    }
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
      this.channel = await this.createChannel();
      this.setupChannelHandlers();
      await this.assertQueue();
      await this.bindQueue();
      await this.startConsuming();
    } catch (error) {
      /**
       * TODO: check if it is better to crash the server if a worker could not be started
       * or leave it to fail silently as it's event driven and if the worker does not start,
       * messages won't be lost and it can be taken down and debugged
       */
      logger.error("[AMQP] Failed to start worker", error);
    }
  }

  private async createChannel(): Promise<Channel> {
    const conn = this.connection.getConnection();
    if (!conn) {
      throw new Error("Connection is not initialized");
    }
    return await conn.createChannel();
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

  private async assertQueue(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }
    await this.channel.assertQueue(
      this.config.queue.name,
      this.config.queue.options
    );
  }

  private async bindQueue(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    if (!this.config.bindingKey) {
      logger.warn("[AMQP] No binding key provided. Skipping binding.");
      return;
    }

    if (!this.config.exchange) {
      logger.warn(
        "[AMQP] No exchange configuration provided. Skipping binding."
      );
      return;
    }

    if (!this.config.exchange.name || this.config.exchange.name === "") {
      logger.warn("[AMQP] Skipping binding for the default exchange");
      return;
    }

    await this.assertExchange();

    await this.channel.bindQueue(
      this.config.queue.name,
      this.config.exchange.name,
      this.config.bindingKey
    );

    logger.debug(
      `Queue ${this.config.queue.name} bound to exchange ${this.config.exchange.name} with binding key ${this.config.bindingKey}`
    );
  }

  private async assertExchange(): Promise<void> {
    if (!this.channel) {
      throw new Error("Channel not initialized");
    }

    if (!this.config.exchange) {
      logger.warn(
        "[AMQP] No exchange configuration provided. Skipping exchange assertion."
      );
      return;
    }

    if (!this.config.exchange.name || this.config.exchange.name === "") {
      logger.warn(
        "[AMQP] Skipping exchange assertion for the default exchange"
      );
      return;
    }

    if (!this.config.exchange.type) {
      throw new Error("Exchange type must be specified");
    }

    await this.channel.assertExchange(
      this.config.exchange.name,
      this.config.exchange.type,
      this.config.exchange.options
    );

    logger.debug(`Exchange ${this.config.exchange.name} asserted`);
  }

  private async startConsuming(): Promise<void> {
    if (!this.channel) return;

    await this.channel.prefetch(this.config.prefetchCount);
    await this.channel.consume(
      this.config.queue.name,
      this.processMsg.bind(this),
      this.config.consume?.options
    );

    logger.info(
      `Worker started consuming from queue: ${this.config.queue.name}`
    );
  }

  private processMsg(msg: ConsumeMessage | null): void {
    if (!msg || !this.channel) return;

    try {
      logger.debug("Got msg ", msg.content.toString());
      this.config.consume.onMessage(
        msg,
        this.channel.ack.bind(this.channel),
        this.channel.nack.bind(this.channel)
      );

      //this.channel.ack(msg);
    } catch (error) {
      console.error("Error handling message:", error);
      // Optionally nack the message if an error occurs
      //this.channel.nack(msg);
    }
  }
}
