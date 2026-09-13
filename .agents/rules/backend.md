# Backend Network & Security Rules

## Memory & Stream Management
* DO NOT read multi-gigabyte files entirely into RAM. Use asynchronous file streams and process files in 64 KB (65,536 bytes) chunks.
* Explicit TCP backpressure handling is mandatory. If socket.write() returns false, immediately pause() the file reading stream. Register an event listener for the socket's drain event, and only resume() the stream when the kernel buffer clears.

## Protocol Framing
* Incoming TCP byte streams must be continuously buffered.
* Do not process a payload until the persistent buffer contains at least the 42 bytes required for the header, plus the exact number of bytes specified in the PAYLOAD_LENGTH field.
* Slice completed messages from the front of the buffer and pass them to the cryptographic decryption module.

## Networking
* Expose a listening TCP server socket bound to the host's physical LAN interface (e.g., 0.0.0.0) to accept peer connections.
* Bind the WebSocket server strictly to localhost to bridge communication with the local React frontend.
