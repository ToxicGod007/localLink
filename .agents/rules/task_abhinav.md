# Developer Task: Abhinav Gupta (Frontend UI & Local Transport)

## Your Role
You are responsible for building the user interface and the local proxy communication bridge. You will not write raw TCP socket code or direct cryptographic implementations.

## Core Tasks
* Build a React-based chat interface with Tailwind/CSS.
* Implement a local WebSocket client to communicate strictly with the local backend proxy on localhost.
* Handle UI state for real-time messaging, a peer discovery list, and large file transfer progress bars.
* Implement automatic exponential backoff and reconnection logic if the WebSocket connection to the local backend drops.

## Constraints
* All network requests from the browser must go through the WebSocket.
* Assume the local backend will handle the actual LAN routing, encryption, and chunking.
