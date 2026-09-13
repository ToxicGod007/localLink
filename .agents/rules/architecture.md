# Network Protocol & Cryptography Rules

## Protocol Engineering
* Implement a custom length-prefixed binary protocol for all TCP communication.
* Every message must begin with a 42-byte header: PROTOCOL_VERSION (1 byte), OPCODE (1 byte), PAYLOAD_LENGTH (4 bytes, Big Endian), SEQUENCE_NUM (4 bytes), and SESSION_ID (32 bytes).
* Set the TCP_NODELAY socket option to disable Nagle's Algorithm for real-time chat responsiveness.

### Predefined Opcodes
* **Connection & Security**: `0x01` (HANDSHAKE_INIT), `0x02` (HANDSHAKE_ACK)
* **Peer Discovery**: `0x10` (PEER_ANNOUNCE), `0x11` (PEER_OFFLINE)
* **Real-Time Chat**: `0x20` (CHAT_MESSAGE)
* **File Transfers**: `0x30` (FILE_OFFER), `0x31` (FILE_ACCEPT), `0x32` (FILE_REJECT), `0x33` (FILE_CHUNK), `0x34` (FILE_COMPLETE)

## Cryptography (Presentation Layer)
* End-to-End Encryption (E2EE) is mandatory. The LAN is considered hostile.
* Use Elliptic Curve Diffie-Hellman (ECDH) over secp256k1 or X25519 for ephemeral session key exchange.
* Use AES-256-GCM for all payload encryption. The authentication tag must be exactly 128 bits (16 bytes) and the nonce must be exactly 96 bits (12 bytes). NEVER reuse a nonce under the same key.
