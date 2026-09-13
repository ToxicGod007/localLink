const { HEADER_SIZE } = require('./constants');
const { EventEmitter } = require('events');

class MessageBuffer extends EventEmitter {
  constructor() {
    super();
    this.buffer = Buffer.alloc(0);
  }

  /**
   * Appends incoming chunk to the persistent buffer and attempts to parse messages.
   * Emits 'message' with the parsed header fields and payload.
   */
  push(data) {
    this.buffer = Buffer.concat([this.buffer, data]);
    this._processBuffer();
  }

  _processBuffer() {
    // Loop until we don't have enough data for a full message
    while (this.buffer.length >= HEADER_SIZE) {
      // 4-byte big-endian starting at index 2
      const payloadLength = this.buffer.readUInt32BE(2);
      const totalMessageSize = HEADER_SIZE + payloadLength;

      if (this.buffer.length >= totalMessageSize) {
        // We have exactly enough (or more) for one complete message
        const messageBuffer = this.buffer.subarray(0, totalMessageSize);
        
        const protocolVersion = messageBuffer.readUInt8(0);
        const opcode = messageBuffer.readUInt8(1);
        const sequenceNum = messageBuffer.readUInt32BE(6);
        const sessionId = messageBuffer.subarray(10, 42);
        const payload = messageBuffer.subarray(42);

        this.emit('message', {
          protocolVersion,
          opcode,
          payloadLength,
          sequenceNum,
          sessionId,
          payload
        });

        // Slice off the processed message
        this.buffer = this.buffer.subarray(totalMessageSize);
      } else {
        // Waiting for more data to complete the payload
        break;
      }
    }
  }
}

module.exports = MessageBuffer;
