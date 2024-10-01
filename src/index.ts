export { AMQPManager } from "./amqp-manager.js";
export { bufferToData, dataToBuffer } from "./utils.js";
// TODO: research on wether it is better to use channel pools or per channel per nodejs process or per channel per publisher or worker:
// doc: https://www.rabbitmq.com/docs/channels
