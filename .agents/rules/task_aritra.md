# Developer Task: Aritra Biswas (Network Transport & Connections)

## Your Role
You are responsible for the lowest layer of the backend application: managing raw TCP connections over the LAN and implementing peer discovery.

## Core Tasks
* Use native socket libraries (e.g., Node.js net module) to bind a TCP server to the host's physical LAN interface (e.g., 0.0.0.0).
* Manage the lifecycle of incoming and outgoing TCP socket connections (handling connect, error, and close events).
* Implement a UDP broadcast mechanism for automatic peer discovery on the local subnet.
* Set the TCP_NODELAY socket option to disable Nagle's Algorithm for all chat-related socket connections.

## Constraints
* Do not implement protocol framing or encryption; you must pass the raw byte streams to Arnav's and Shobit's modules.
* Ensure all socket connections are properly cleaned up on disconnect to prevent memory leaks.
