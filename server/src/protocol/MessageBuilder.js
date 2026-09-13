const { PROTOCOL_VERSION, HEADER_SIZE } = require('./constants');

class MessageBuilder {
  /**
   * Constructs a 42-byte header + payload buffer.
   * [PROTOCOL_VERSION(1B)] [OPCODE(1B)] [PAYLOAD_LENGTH(4B)] [SEQUENCE_NUM(4B)] [SESSION_ID(32B)]
   *
   * @param {number} opcode - Command code
   * @param {number} sequenceNum - Message sequence number
   * @param {Buffer} sessionId - 32-byte session buffer
   * @param {Buffer} payload - Encrypted or raw payload (default: empty buffer)
   * @returns {Buffer} The complete network packet
   */
  static build(opcode, sequenceNum, sessionId, payload = Buffer.alloc(0)) {
    if (!Buffer.isBuffer(payload)) {
      payload = Buffer.from(payload);
    }
    
    if (!Buffer.isBuffer(sessionId) || sessionId.length !== 32) {
      throw new Error('SESSION_ID must be exactly a 32-byte Buffer.');
    }

    const payloadLength = payload.length;
    const header = Buffer.alloc(HEADER_SIZE);
    
    header.writeUInt8(PROTOCOL_VERSION, 0);
    header.writeUInt8(opcode, 1);
    header.writeUInt32BE(payloadLength, 2);
    header.writeUInt32BE(sequenceNum, 6);
    
    sessionId.copy(header, 10);
    
    return Buffer.concat([header, payload]);
  }
}

module.exports = MessageBuilder;
