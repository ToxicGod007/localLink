/**
 * @deprecated StreamController is NOT used by the live proxy (server/src/index.js).
 *
 * The real file-transfer path works by receiving base64-encoded chunks from the browser
 * over WebSocket JSON and forwarding them as encrypted TCP packets — no disk I/O needed.
 *
 * StreamController was originally designed to stream a file *from disk* on the server side.
 * It remains here (with its test) for reference, but is dead code in the running application.
 * If a disk-side file transfer mode is ever added, this can be integrated at that point.
 */
const fs = require('fs');
const MessageBuilder = require('./MessageBuilder');
const { OPCODES } = require('./constants');

const CHUNK_SIZE = 65536; // 64 KB limit

class StreamController {
  /**
   * Streams a file to a TCP socket in 64 KB chunks, respecting backpressure.
   * @param {string} filePath - Absolute path to the file
   * @param {net.Socket} socket - Connected TCP socket
   * @param {Buffer} sessionId - 32-byte session ID
   * @param {Function} [encryptionFn] - Optional async function that returns encrypted buffer
   */
  static async transferFile(filePath, socket, sessionId, encryptionFn = null) {
    return new Promise((resolve, reject) => {
      // Create stream constrained to 64KB chunks
      const readStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });
      let sequenceNum = 0;

      readStream.on('data', async (chunk) => {
        try {
          // Pause reading while we process and wait for TCP socket drain
          readStream.pause();

          let encryptedPayload = chunk;
          if (encryptionFn) {
            encryptedPayload = await encryptionFn(chunk);
          }

          const message = MessageBuilder.build(
            OPCODES.FILE_CHUNK,
            sequenceNum++,
            sessionId,
            encryptedPayload
          );

          // socket.write returns false if the kernel buffer is full
          const canContinue = socket.write(message);

          if (!canContinue) {
            // Strict backpressure: wait for drain event before resuming
            socket.once('drain', () => {
              readStream.resume();
            });
          } else {
            readStream.resume();
          }
        } catch (err) {
          readStream.destroy(err);
          reject(err);
        }
      });

      readStream.on('end', () => {
        // Stream completed successfully, send the finish signal
        try {
          const completeMessage = MessageBuilder.build(
            OPCODES.FILE_COMPLETE,
            sequenceNum++,
            sessionId,
            Buffer.alloc(0)
          );
          socket.write(completeMessage);
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      readStream.on('error', (err) => {
        reject(err);
      });
      
      socket.on('error', (err) => {
        readStream.destroy(err);
        reject(err);
      });
    });
  }
}

module.exports = StreamController;
