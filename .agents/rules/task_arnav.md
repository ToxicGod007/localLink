# Developer Task: Arnav Goel (Protocol Framing & Stream Control)

## Your Role
You are responsible for translating continuous TCP byte streams into discrete messages and managing data flow control for large file transfers.

## Core Tasks
* Implement a custom length-prefixed protocol. Every message must have a 42-byte header: PROTOCOL_VERSION (1B), OPCODE (1B), PAYLOAD_LENGTH (4B Big Endian), SEQUENCE_NUM (4B), and SESSION_ID (32B).
* Build a stateful buffering algorithm that extracts exactly one complete payload based on the PAYLOAD_LENGTH before passing it to the decryption module.
* Implement file chunking logic, processing multi-gigabyte files into discrete 64 KB (65,536 bytes) chunks.
* Implement strict TCP backpressure handling: if socket.write() returns false, immediately pause() the file stream, wait for the socket's drain event, and then resume() the stream.

## Constraints
* Do not load entire files into RAM; you must use asynchronous file streams.

> **Note:** Implementing backpressure via pause() and resume() alongside the drain event is critical to prevent out-of-memory crashes during large transfers.
