# Developer Task: Shobit Khanna (Security & Cryptography)

## Your Role
You are responsible for the Presentation Layer privacy. You must encrypt and decrypt all application data to secure the LAN chat against unauthorized access.

## Core Tasks
* Implement an Elliptic Curve Diffie-Hellman (ECDH) key exchange using secp256k1 or X25519 to derive ephemeral session keys when a new TCP connection is established.
* Implement AES-256-GCM authenticated encryption for all chat messages and file chunks.
* Securely handle chunked stream processing for encrypting and decrypting large academic files up to 2 GB without exceeding memory limits.
* Generate a unique 96-bit (12-byte) nonce for every single message. Ensure the authentication tag is strictly validated (128 bits / 16 bytes).

## Constraints
* NEVER reuse a nonce under the same encryption key.
* If the AES-GCM authentication tag fails validation upon decryption, you must immediately discard the payload and throw an error.

> **Note:** Using chunked stream processing for AES-256-GCM is standard practice to securely handle large files while keeping memory usage flat.
