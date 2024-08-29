import amqp, { Connection } from "amqplib";
import EventEmitter from "events";
import { logger } from "./logger.js";
import { retry, RetryConfig } from "./retry.js";

const defaultRetryConfig: RetryConfig = {
  onError: (error, attempt, nextRetryTime) => {
    const retryIn = Math.round((nextRetryTime - Date.now()) / 1000);

    logger.error(
      `[AMQP] Connection attempt ${attempt} failed: ${error.message}. Retrying in ${retryIn} seconds`
    );
  },
  onMaxRetry: (attempt) => {
    logger.error(
      `[AMQP] Max retries reached after ${attempt} attempts, giving up`
    );
  },
};

export interface AMQPConnectionConfig {
  connect: {
    url: string | amqp.Options.Connect;
    socketOptions?: any;
  };
}

export class AMQPConnection extends EventEmitter {
  private connection: Connection | null = null;
  private isConnecting: boolean = false;
  private isIntentionalDisconnect: boolean = false;

  constructor(private config: AMQPConnectionConfig) {
    super();
    if (!config.connect || !config.connect.url) {
      throw new Error("[AMQP] Connection URL is required");
    }
  }

  async connect(): Promise<Connection | null> {
    if (this.isConnecting || this.connection) return this.connection;

    this.isConnecting = true;
    try {
      this.connection = await retry(
        () =>
          amqp.connect(
            this.config.connect.url,
            this.config.connect.socketOptions
          ),
        defaultRetryConfig
      );
      this.setupConnectionHandlers();

      logger.info("[AMQP] connected");
      this.emit("connected", this.connection);
      return this.connection;
    } catch (err: any) {
      logger.error("[AMQP]", err.message);
      return null;
    } finally {
      this.isConnecting = false;
    }
  }

  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.on("error", (err: Error) => {
      if (err.message !== "Connection closing") {
        logger.error("[AMQP] conn error", err.message);
      }
    });

    this.connection.on("close", () => {
      if (!this.isIntentionalDisconnect) {
        logger.error("[AMQP] connection closed unexpectedly");
        this.emit("disconnected");
        this.connection = null;
        this.reconnect();
      } else {
        logger.debug("[AMQP] connection closed intentionally");
      }
    });
  }

  getConnection(): Connection | null {
    return this.connection;
  }

  async disconnect(): Promise<void> {
    if (!this.connection) {
      logger.info("[AMQP] No active connection to close.");
      return;
    }

    this.isIntentionalDisconnect = true;
    try {
      await this.connection.close();
      this.connection = null;
      this.emit("disconnected");
      logger.info("[AMQP] Connection closed successfully.");
    } catch (err: any) {
      logger.error("[AMQP] Error closing connection", err.message);
    } finally {
      this.isIntentionalDisconnect = false;
    }
  }

  private async reconnect(): Promise<void> {
    logger.info("[AMQP] reconnecting...");
    await this.connect();
  }
}
